import { NextResponse } from "next/server";
import { errorResponse, readJson, serverError } from "@/lib/api";
import { getServerSupabase } from "@/lib/supabase/server";
import { isCategory, normalizeGroupName } from "@/lib/validate";
import type { CreateRoomResponse } from "@/types";

export async function POST(request: Request) {
  const body = (await readJson(request)) ?? {};
  if (body.category !== undefined && !isCategory(body.category)) {
    return errorResponse(400, "카테고리가 올바르지 않습니다.", "INVALID_INPUT");
  }

  let name: string | null = null;
  if (body.name !== undefined) {
    name = normalizeGroupName(body.name);
    if (name === null) return errorResponse(400, "모임 이름이 올바르지 않습니다.", "INVALID_INPUT");
  }

  try {
    const { data, error } = await getServerSupabase()
      .from("rooms")
      .insert({ name, category: body.category ?? null })
      .select("id, host_id")
      .single();
    if (error) throw error;
    return NextResponse.json<CreateRoomResponse>(
      { roomId: data.id, hostId: data.host_id },
      { status: 201 },
    );
  } catch (err) {
    return serverError(err);
  }
}
