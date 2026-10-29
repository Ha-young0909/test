import { NextResponse } from "next/server";
import { errorResponse, readJson, serverError } from "@/lib/api";
import { getServerSupabase } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validate";
import { computeMidpoint, type Origin } from "@/lib/midpoint/engine";
import { findSubwayStations } from "@/lib/midpoint/kakao";
import { acquireRoom, releaseRoom } from "@/lib/midpoint/lock";
import { MIN_PARTICIPANTS, type MidpointResponse, type MidpointStation } from "@/types";

type Ctx = { params: Promise<{ id: string }> };

// 카카오 역 검색과 DB 저장만 하므로 길어도 몇 초면 끝난다.
export const maxDuration = 10;

/**
 * 방장 또는 방 참여자가 호출하면 참여자 출발지로 후보 역을 다시 계산해 candidates 에 저장하고 순위를 돌려준다.
 * 같은 이름의 역은 행(과 그 표)을 유지한 채 갱신하고, 후보에서 빠진 역만 지운다.
 */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await readJson(request);
  const asHost = body !== null && isUuid(body.hostId);
  const asParticipant = body !== null && isUuid(body.participantId) && isUuid(body.participantToken);
  if (!isUuid(id) || !body || (!asHost && !asParticipant)) {
    return errorResponse(400, "호출자 정보가 올바르지 않습니다.", "INVALID_INPUT");
  }

  let locked = false;
  try {
    const db = getServerSupabase();
    const { data: room, error: roomError } = await db.from("rooms").select("id, host_id").eq("id", id).maybeSingle();
    if (roomError) throw roomError;
    if (!room) return errorResponse(404, "존재하지 않는 방입니다.", "ROOM_NOT_FOUND");
    if (asHost) {
      if (room.host_id !== body.hostId) return errorResponse(403, "방장 정보가 올바르지 않습니다.", "FORBIDDEN");
    } else {
      const { data: caller, error: callerError } = await db
        .from("participants")
        .select("token")
        .eq("id", body.participantId as string)
        .eq("room_id", id)
        .maybeSingle();
      if (callerError) throw callerError;
      if (!caller || caller.token !== body.participantToken) {
        return errorResponse(403, "이 방의 참여자만 중간 지점을 찾을 수 있어요.", "FORBIDDEN");
      }
    }

    const wait = acquireRoom(id);
    if (wait !== null) {
      return NextResponse.json(
        { error: "중간 지점을 계산 중이에요. 잠시 후 다시 시도해 주세요.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(wait) } },
      );
    }
    locked = true;

    const { data: people, error: peopleError } = await db
      .from("participants")
      .select("id, origin_lat, origin_lng")
      .eq("room_id", id);
    if (peopleError) throw peopleError;
    const origins: Origin[] = (people ?? []).flatMap((p) =>
      p.origin_lat !== null && p.origin_lng !== null
        ? [{ participantId: p.id as string, lat: p.origin_lat as number, lng: p.origin_lng as number }]
        : [],
    );
    if (origins.length < MIN_PARTICIPANTS) {
      return errorResponse(400, `출발지를 입력한 참여자가 ${MIN_PARTICIPANTS}명 이상 필요해요.`, "INVALID_INPUT");
    }

    const { data: topRow, error: topError } = await db
      .from("candidates")
      .select("name")
      .eq("room_id", id)
      .eq("number", 1)
      .maybeSingle();
    if (topError) throw topError;
    const previousTop = (topRow?.name as string | undefined) ?? null;

    const kakaoKey = process.env.KAKAO_REST_API_KEY;
    const result = await computeMidpoint(origins, {
      findSubway: async (center, radius) => {
        if (!kakaoKey) throw new Error("KAKAO_REST_API_KEY 가 설정되지 않았습니다.");
        return findSubwayStations(center, radius, kakaoKey);
      },
    });

    const { error: upsertError } = await db.from("candidates").upsert(
      result.stations.map((s, i) => ({
        room_id: id,
        kind: s.kind,
        number: i + 1,
        name: s.name,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        lines: s.lines,
        max_minutes: s.maxMinutes,
        avg_minutes: s.avgMinutes,
        over90: s.over90,
        approximate: result.approximate,
      })),
      { onConflict: "room_id,kind,name" },
    );
    if (upsertError) throw upsertError;

    // 후보에서 빠진 역(과 그 역의 표)만 지운다.
    const { data: stored, error: storedError } = await db.from("candidates").select("id, kind, name").eq("room_id", id);
    if (storedError) throw storedError;
    const keep = new Set(result.stations.map((s) => `${s.kind}|${s.name}`));
    const staleIds = (stored ?? []).filter((c) => !keep.has(`${c.kind}|${c.name}`)).map((c) => c.id as string);
    if (staleIds.length > 0) {
      const { error } = await db.from("candidates").delete().in("id", staleIds);
      if (error) throw error;
    }

    const stations: MidpointStation[] = result.stations.map((s) => ({
      name: s.name,
      kind: s.kind,
      lines: s.lines,
      lat: s.lat,
      lng: s.lng,
      maxMinutes: s.maxMinutes,
      avgMinutes: s.avgMinutes,
      over90: s.over90,
      routes: s.routes,
    }));
    const top = stations[0]?.name ?? null;
    return NextResponse.json<MidpointResponse>({
      stations,
      approximate: result.approximate,
      topChanged: previousTop !== null && top !== null && previousTop !== top,
      previousTop,
    });
  } catch (err) {
    return serverError(err);
  } finally {
    if (locked) releaseRoom(id);
  }
}
