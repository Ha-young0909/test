import { NextResponse } from "next/server";
import { errorResponse, readJson, serverError } from "@/lib/api";
import { getServerSupabase } from "@/lib/supabase/server";
import { samplePlacesFor } from "@/lib/vote/places";
import { isUuid } from "@/lib/validate";
import type { PlacesResponse } from "@/types";

type Ctx = { params: Promise<{ id: string }> };

/**
 * 방의 후보 역마다 근처 맛집·갈만한 곳을 채운다 (방장만).
 * 별점 출처가 정해지기 전이라 예시 데이터를 쓴다. 이미 채워진 역은 건드리지 않는다.
 */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await readJson(request);
  if (!isUuid(id) || !body || !isUuid(body.hostId)) {
    return errorResponse(400, "요청이 올바르지 않습니다.", "INVALID_INPUT");
  }

  try {
    const db = getServerSupabase();
    const { data: room, error: roomError } = await db
      .from("rooms")
      .select("id")
      .eq("id", id)
      .eq("host_id", body.hostId)
      .maybeSingle();
    if (roomError) throw roomError;
    if (!room) return errorResponse(403, "방장만 요청할 수 있습니다.", "FORBIDDEN");

    const { data: candidates, error } = await db.from("candidates").select("*").eq("room_id", id);
    if (error) throw error;

    const result = [];
    for (const c of candidates ?? []) {
      const empty = (c.restaurants ?? []).length === 0 && (c.spots ?? []).length === 0;
      if (!empty) {
        result.push(c);
        continue;
      }
      const places = samplePlacesFor(c.name, c.kind);
      const { data: updated, error: updateError } = await db
        .from("candidates")
        .update(places)
        .eq("id", c.id)
        .select("*")
        .single();
      if (updateError) throw updateError;
      result.push(updated);
    }
    return NextResponse.json<PlacesResponse>({ candidates: result });
  } catch (err) {
    return serverError(err);
  }
}
