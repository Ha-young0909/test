import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { averageByName, fetchRawPrices } from "@/lib/prices/source";

// Vercel Cron이 하루 한 번 호출한다. (vercel.json 참고)
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = new Date(Date.now() + 9 * 60 * 60 * 1000) // KST
    .toISOString()
    .slice(0, 10);

  try {
    // 실패하면 아무것도 쓰지 않으므로 이전 시세가 그대로 남는다.
    const averages = averageByName(await fetchRawPrices(today));

    const db = createAdminClient();
    const { data: seafood, error: listError } = await db
      .from("seafood")
      .select("id, name");
    if (listError) throw listError;

    const rows = (seafood ?? []).flatMap((s) => {
      const price = averages.get(s.name);
      return price ? [{ seafood_id: s.id, price, recorded_at: today }] : [];
    });

    if (rows.length > 0) {
      const { error } = await db
        .from("seafood_prices")
        .upsert(rows, { onConflict: "seafood_id,recorded_at" });
      if (error) throw error;
    }

    return NextResponse.json({ date: today, saved: rows.length, total: seafood?.length ?? 0 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "수집 중 오류가 발생했어요.";
    console.error("[collect-prices]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
