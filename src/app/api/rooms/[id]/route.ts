import { NextResponse } from "next/server";
import { errorResponse, readJson, serverError } from "@/lib/api";
import { getServerSupabase } from "@/lib/supabase/server";
import { isCategory, isUuid } from "@/lib/validate";
import type { UpdateRoomResponse } from "@/types";

type Ctx = { params: Promise<{ id: string }> };

/** 방장이 방 상태(collecting → voting)나 카테고리를 바꾼다. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await readJson(request);
  if (!isUuid(id) || !body || !isUuid(body.hostId)) {
    return errorResponse(400, "요청이 올바르지 않습니다.", "INVALID_INPUT");
  }

  const update: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (body.status !== "collecting" && body.status !== "voting") {
      return errorResponse(400, "상태가 올바르지 않습니다.", "INVALID_INPUT");
    }
    update.status = body.status;
  }
  if (body.category !== undefined) {
    if (!isCategory(body.category)) {
      return errorResponse(400, "카테고리가 올바르지 않습니다.", "INVALID_INPUT");
    }
    update.category = body.category;
  }
  if (Object.keys(update).length === 0) {
    return errorResponse(400, "변경할 값이 없습니다.", "INVALID_INPUT");
  }

  try {
    const { data, error } = await getServerSupabase()
      .from("rooms")
      .update(update)
      .eq("id", id)
      .eq("host_id", body.hostId)
      .select("id");
    if (error) throw error;
    if (data.length === 0) {
      return errorResponse(403, "방장만 변경할 수 있습니다.", "FORBIDDEN");
    }
    return NextResponse.json<UpdateRoomResponse>({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
