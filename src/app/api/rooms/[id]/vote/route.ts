import { NextResponse } from "next/server";
import { errorResponse, readJson, serverError } from "@/lib/api";
import { getServerSupabase } from "@/lib/supabase/server";
import { isVotingClosed } from "@/lib/vote/deadline";
import { isUuid } from "@/lib/validate";
import type { VoteResponse } from "@/types";

type Ctx = { params: Promise<{ id: string }> };

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
