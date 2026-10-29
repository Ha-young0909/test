import { NextResponse } from "next/server";
import { errorResponse, readJson, serverError } from "@/lib/api";
import { getServerSupabase } from "@/lib/supabase/server";
import { resolveDeadlineChange } from "@/lib/vote/deadline";
import { isUuid } from "@/lib/validate";
import type { DeadlineResponse } from "@/types";

type Ctx = { params: Promise<{ id: string }> };

/** 방장이 투표 마감 시간을 정하거나(30분·1시간·3시간·하루), 즉시 마감하거나, 다시 연다. */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await readJson(request);
  if (!isUuid(id) || !body || !isUuid(body.hostId)) {
    return errorResponse(400, "요청이 올바르지 않습니다.", "INVALID_INPUT");
  }
  const change = resolveDeadlineChange(body);
  if (!change) {
    return errorResponse(400, "minutes(30·60·180·1440), closeNow, reopen 중 하나만 보내 주세요.", "INVALID_INPUT");
  }

  try {
    const { data, error } = await getServerSupabase()
      .from("rooms")
      .update(change)
      .eq("id", id)
      .eq("host_id", body.hostId)
      .select("status, vote_deadline");
    if (error) throw error;
    if (data.length === 0) {
      return errorResponse(403, "방장만 마감을 설정할 수 있습니다.", "FORBIDDEN");
    }
    return NextResponse.json<DeadlineResponse>({
      voteDeadline: data[0].vote_deadline,
      status: data[0].status,
    });
  } catch (err) {
    return serverError(err);
  }
}
