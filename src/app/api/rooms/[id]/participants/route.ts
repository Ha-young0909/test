import { NextResponse } from "next/server";
import { errorResponse, readJson, serverError } from "@/lib/api";
import { getServerSupabase } from "@/lib/supabase/server";
import { isUuid, isValidCoord, normalizeNickname } from "@/lib/validate";
import type { JoinRoomResponse, UpdateOriginResponse } from "@/types";

type Ctx = { params: Promise<{ id: string }> };

/** 닉네임으로 방에 가입한다. 출발지(lat/lng/label)는 이 시점에 없어도 된다. */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await readJson(request);
  const nickname = normalizeNickname(body?.nickname);
  if (!isUuid(id) || !body || !nickname) {
    return errorResponse(400, "닉네임은 1~12자로 입력해 주세요.", "INVALID_INPUT");
  }

  const hasOrigin = body.lat !== undefined || body.lng !== undefined;
  if (hasOrigin && !isValidCoord(body.lat, body.lng)) {
    return errorResponse(400, "출발지 좌표가 올바르지 않습니다.", "INVALID_INPUT");
  }

  try {
    const db = getServerSupabase();
    const { data: room, error: roomError } = await db
      .from("rooms")
      .select("id, host_id")
      .eq("id", id)
      .maybeSingle();
    if (roomError) throw roomError;
    if (!room) return errorResponse(404, "존재하지 않는 방입니다.", "ROOM_NOT_FOUND");

    const { data, error } = await db
      .from("participants")
      .insert({
        room_id: id,
        nickname,
        is_host: isUuid(body.hostId) && body.hostId === room.host_id,
        origin_label: typeof body.label === "string" ? body.label : null,
        origin_lat: hasOrigin ? body.lat : null,
        origin_lng: hasOrigin ? body.lng : null,
      })
      .select("id, token")
      .single();

    if (error) {
      if (error.code === "23505") {
        return errorResponse(409, "이미 사용 중인 닉네임입니다.", "NICKNAME_TAKEN");
      }
      if (error.message.includes("ROOM_FULL")) {
        return errorResponse(409, "방이 가득 찼습니다. (최대 6명)", "ROOM_FULL");
      }
      throw error;
    }
    return NextResponse.json<JoinRoomResponse>({ participantId: data.id, participantToken: data.token }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}

/** 출발지를 저장·변경한다. 바뀐 출발지의 이동 시간 캐시는 무효이므로 지운다. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await readJson(request);
  if (
    !isUuid(id) ||
    !body ||
    !isUuid(body.participantId) ||
    !isUuid(body.participantToken) ||
    !isValidCoord(body.lat, body.lng) ||
    typeof body.label !== "string"
  ) {
    return errorResponse(400, "출발지 정보가 올바르지 않습니다.", "INVALID_INPUT");
  }

  try {
    const db = getServerSupabase();
    const { data, error } = await db
      .from("participants")
      .update({ origin_lat: body.lat, origin_lng: body.lng, origin_label: body.label })
      .eq("id", body.participantId)
      .eq("token", body.participantToken)
      .eq("room_id", id)
      .select("id");
    if (error) throw error;
    if (data.length === 0) {
      return errorResponse(403, "본인 확인에 실패했습니다.", "FORBIDDEN");
    }
    const { error: cacheError } = await db
      .from("travel_times")
      .delete()
      .eq("participant_id", body.participantId);
    if (cacheError) throw cacheError;
    return NextResponse.json<UpdateOriginResponse>({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
