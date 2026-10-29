// 한국농수산식품유통공사 전국 공영도매시장 정산정보 API (공공데이터포털 15141809)
// https://apis.data.go.kr/B552845/katSale
// 제공처를 바꿀 때는 이 파일만 고치면 된다.

export type RawPrice = {
  name: string;
  price: number; // 원/kg
  region?: string; // 지역별 가격이 있을 때만
};

// 응답 항목의 필드명. 포털 페이지에 출력 명세가 비어 있어 명세서(첨부 파일)로 확인이 필요하다.
const FIELDS = {
  name: "gds_sclsf_nm", // 소분류명(품목명)
  price: "avg_pc", // 평균가
  unit: "unit_qty", // 단위 중량(kg)
  market: "whsl_mrkt_nm", // 도매시장명
} as const;

const PAGE_SIZE = 1000;

export function parseItems(body: unknown): RawPrice[] {
  const rows = (body as { response?: { body?: { items?: { item?: unknown[] } } } })
    ?.response?.body?.items?.item;
  if (!Array.isArray(rows)) throw new Error("시세 응답 형식이 올바르지 않아요.");

  return rows.flatMap((row) => {
    const r = row as Record<string, unknown>;
    const name = String(r[FIELDS.name] ?? "").trim();
    const price = Number(String(r[FIELDS.price] ?? "").replace(/,/g, ""));
    const unit = Number(r[FIELDS.unit]) || 1;
    if (!name || !Number.isFinite(price) || price <= 0) return [];
    return [
      {
        name,
        price: Math.round(price / unit),
        region: r[FIELDS.market] ? String(r[FIELDS.market]) : undefined,
      },
    ];
  });
}

async function fetchMarket(endpoint: string, key: string, market: string, date: string) {
  const items: RawPrice[] = [];
  for (let page = 1; ; page++) {
    const url = new URL(endpoint);
    url.searchParams.set("serviceKey", key);
    url.searchParams.set("returnType", "json");
    url.searchParams.set("pageNo", String(page));
    url.searchParams.set("numOfRows", String(PAGE_SIZE));
    url.searchParams.set("cond[trd_clcln_ymd::EQ]", date);
    url.searchParams.set("cond[whsl_mrkt_cd::EQ]", market);

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`시세 API 응답 오류: ${res.status}`);
    const batch = parseItems(await res.json());
    items.push(...batch);
    if (batch.length < PAGE_SIZE) return items;
  }
}

// PRICE_MARKET_CODES: 조회할 도매시장 코드(쉼표 구분). 수산물 소분류만 남기는 필터는 어종 이름 매칭이 대신한다.
export async function fetchRawPrices(date: string): Promise<RawPrice[]> {
  const endpoint = process.env.PRICE_API_URL;
  const key = process.env.PRICE_API_KEY;
  const markets = (process.env.PRICE_MARKET_CODES ?? "").split(",").map((m) => m.trim()).filter(Boolean);
  if (!endpoint || !key || markets.length === 0) {
    throw new Error("PRICE_API_URL / PRICE_API_KEY / PRICE_MARKET_CODES가 설정되지 않았어요.");
  }

  const all = await Promise.all(markets.map((m) => fetchMarket(endpoint, key, m, date)));
  return all.flat();
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
