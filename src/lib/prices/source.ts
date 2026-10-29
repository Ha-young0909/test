// 공공 API에서 어종별 일별 가격(원/kg)을 가져오는 어댑터.
// 제공처를 바꿀 때는 이 파일의 parseItems만 고치면 된다.

export type RawPrice = {
  name: string;
  price: number; // 원/kg
  region?: string; // 지역별 가격이 있을 때만
};

// 응답 JSON에서 { 품목명, 가격 } 배열을 뽑는다. 제공처 확정 후 필드명을 맞춘다.
export function parseItems(body: unknown): RawPrice[] {
  const rows = (body as { items?: unknown[] })?.items;
  if (!Array.isArray(rows)) throw new Error("시세 응답 형식이 올바르지 않아요.");

  return rows.flatMap((row) => {
    const r = row as Record<string, unknown>;
    const name = String(r.itemName ?? "").trim();
    const price = Number(String(r.avgPrice ?? "").replace(/,/g, ""));
    if (!name || !Number.isFinite(price) || price <= 0) return [];
    return [{ name, price: Math.round(price), region: r.region ? String(r.region) : undefined }];
  });
}

export async function fetchRawPrices(date: string): Promise<RawPrice[]> {
  const endpoint = process.env.PRICE_API_URL;
  const key = process.env.PRICE_API_KEY;
  if (!endpoint || !key) {
    throw new Error("PRICE_API_URL / PRICE_API_KEY가 설정되지 않았어요.");
  }

  const url = new URL(endpoint);
  url.searchParams.set("serviceKey", key);
  url.searchParams.set("date", date);
  url.searchParams.set("returnType", "json");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`시세 API 응답 오류: ${res.status}`);
  return parseItems(await res.json());
}

// 같은 어종의 여러 지역·시장 가격을 전국 평균 하나로 합친다.
export function averageByName(items: RawPrice[]): Map<string, number> {
  const sums = new Map<string, { total: number; count: number }>();
  for (const { name, price } of items) {
    const s = sums.get(name) ?? { total: 0, count: 0 };
    s.total += price;
    s.count += 1;
    sums.set(name, s);
  }
  return new Map([...sums].map(([n, s]) => [n, Math.round(s.total / s.count)]));
}
