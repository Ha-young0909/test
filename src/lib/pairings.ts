import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Pairing } from "@/types/seafood";

const MODEL = "claude-haiku-5-5";
const MAX_PAIRINGS = 5;

type GeneratedPairing = { name: string; note: string };

const toPairing = (row: {
  id: number;
  seafood_id: number;
  name: string;
  note: string | null;
  generated_by: string | null;
  generated_at: string;
}): Pairing => ({
  id: row.id,
  seafoodId: row.seafood_id,
  name: row.name,
  note: row.note,
  generatedBy: row.generated_by,
  generatedAt: row.generated_at,
});

async function readCached(seafoodId: number): Promise<Pairing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pairings")
    .select("id, seafood_id, name, note, generated_by, generated_at")
    .eq("seafood_id", seafoodId)
    .order("id");
  if (error) throw error;
  return (data ?? []).map(toPairing);
}

async function generate(seafoodName: string): Promise<GeneratedPairing[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY가 설정되지 않았어요.");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content:
            `횟감 "${seafoodName}"과(와) 함께 먹으면 좋은 음식(곁들임·술·국물 등) ${MAX_PAIRINGS}가지를 추천해줘. ` +
            `JSON 배열만 출력해. 형식: [{"name": "음식명", "note": "어울리는 이유 한 문장"}]`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API 오류: ${res.status}`);

  const body = await res.json();
  const text: string = body.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";
  const json = text.match(/\[[\s\S]*\]/)?.[0];
  if (!json) throw new Error("AI 응답을 해석하지 못했어요.");

  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error("AI 응답 형식이 올바르지 않아요.");

  return parsed
    .filter(
      (p): p is GeneratedPairing =>
        typeof p?.name === "string" && p.name.trim() !== "" && typeof p?.note === "string",
    )
    .slice(0, MAX_PAIRINGS);
}

// 캐시된 추천이 있으면 DB에서 읽고, 없을 때만 AI를 호출해 저장한다.
export async function getPairings(seafoodId: number, seafoodName: string): Promise<Pairing[]> {
  const cached = await readCached(seafoodId);
  if (cached.length > 0) return cached;

  const generated = await generate(seafoodName);
  if (generated.length === 0) return [];

  const { error } = await createAdminClient()
    .from("pairings")
    .insert(
      generated.map((p) => ({
        seafood_id: seafoodId,
        name: p.name.trim(),
        note: p.note.trim(),
        generated_by: MODEL,
      })),
    );
  if (error) throw error;

  return readCached(seafoodId);
}
