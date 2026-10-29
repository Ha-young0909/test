import { NextResponse } from "next/server";
import { errorResponse, readJson, serverError } from "@/lib/api";
import { getServerSupabase } from "@/lib/supabase/server";
import { buildStationCards } from "@/lib/vote/cards";
import { isVotingClosed } from "@/lib/vote/deadline";
import { isUuid } from "@/lib/validate";
import type { VoteResponse } from "@/types";
import type { VoteStateResponse } from "@/lib/vote/types";

type Ctx = { params: Promise<{ id: string }> };

/** 투표 화면에 필요한 모든 것: 역 카드, 표, 마감 상태. 서버 시각을 함께 보내 클라이언트 시계 오차를 보정한다. */
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return errorResponse(400, "방 ID 가 올바르지 않습니다.", "INVALID_INPUT");

  try {
    const db = getServerSupabase();
    const { data: room, error: roomError } = await db
      .from("rooms")
      .select("status, vote_deadline")
      .eq("id", id)
      .maybeSingle();
    if (roomError) throw roomError;
    if (!room) return errorResponse(404, "존재하지 않는 방입니다.", "ROOM_NOT_FOUND");

    const [candidates, travelTimes, votes] = await Promise.all([
      db.from("candidates").select("*").eq("room_id", id),
      db.from("travel_times").select("participant_id, station_name, minutes, route").eq("room_id", id),
      db.from("votes").select("participant_id, candidate_id").eq("room_id", id),
    ]);
    for (const r of [candidates, travelTimes, votes]) if (r.error) throw r.error;

    const now = new Date();
    return NextResponse.json<VoteStateResponse>({
      stations: buildStationCards(candidates.data ?? [], travelTimes.data ?? []),
      votes: (votes.data ?? []).map((v) => ({ participantId: v.participant_id, candidateId: v.candidate_id })),
      status: room.status,
      voteDeadline: room.vote_deadline,
      closed: isVotingClosed(room, now),
      approximate: (candidates.data ?? []).some((c) => c.approximate),
      serverTime: now.toISOString(),
    });
  } catch (err) {
    return serverError(err);
  }
}

/** 역에 투표하거나(on: true) 내 표를 취소한다(on: false). 여러 역에 중복 투표할 수 있다. */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await readJson(request);
  if (
    !isUuid(id) ||
    !body ||
    !isUuid(body.participantId) ||
    !isUuid(body.participantToken) ||
    !isUuid(body.candidateId) ||
    typeof body.on !== "boolean"
  ) {
    return errorResponse(400, "투표 요청이 올바르지 않습니다.", "INVALID_INPUT");
  }

  try {
    const db = getServerSupabase();

    const { data: me, error: meError } = await db
      .from("participants")
      .select("id")
      .eq("id", body.participantId)
      .eq("token", body.participantToken)
      .eq("room_id", id)
      .maybeSingle();
    if (meError) throw meError;
    if (!me) return errorResponse(403, "본인 확인에 실패했습니다.", "FORBIDDEN");

    const { data: room, error: roomError } = await db
      .from("rooms")
      .select("status, vote_deadline")
      .eq("id", id)
      .maybeSingle();
    if (roomError) throw roomError;
    if (!room) return errorResponse(404, "존재하지 않는 방입니다.", "ROOM_NOT_FOUND");
    if (isVotingClosed(room)) return errorResponse(409, "투표가 마감되었습니다.", "FORBIDDEN");

    if (body.on) {
      const { data: candidate, error: candError } = await db
        .from("candidates")
        .select("id")
        .eq("id", body.candidateId)
        .eq("room_id", id)
        .maybeSingle();
      if (candError) throw candError;
      if (!candidate) return errorResponse(404, "후보 역을 찾을 수 없습니다.", "INVALID_INPUT");

      const { error } = await db.from("votes").upsert(
        { participant_id: body.participantId, candidate_id: body.candidateId, room_id: id },
        { onConflict: "participant_id,candidate_id", ignoreDuplicates: true },
      );
      if (error) throw error;
    } else {
      const { error } = await db
        .from("votes")
        .delete()
        .eq("participant_id", body.participantId)
        .eq("candidate_id", body.candidateId)
        .eq("room_id", id);
      if (error) throw error;
    }
    return NextResponse.json<VoteResponse>({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
