import type { NearbyPlace, StationKind } from "@/types";

// 별점 출처가 정해지기 전까지 쓰는 예시 데이터. 이름·별점은 모두 가짜 값이다.
// 같은 역은 항상 같은 결과가 나오도록 역 이름으로 결정한다.

const RESTAURANTS = [
  { suffix: "국밥집", category: "한식" },
  { suffix: "칼국수", category: "한식" },
  { suffix: "초밥집", category: "일식" },
  { suffix: "파스타집", category: "양식" },
  { suffix: "마라탕", category: "중식" },
  { suffix: "고깃집", category: "고기" },
];
const SPOTS = [
  { suffix: "카페", category: "카페" },
  { suffix: "공원", category: "공원" },
  { suffix: "쇼핑몰", category: "쇼핑" },
  { suffix: "미술관", category: "전시" },
  { suffix: "서점", category: "서점" },
  { suffix: "산책로", category: "산책" },
];

function hash(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** 후보 역 하나에 붙일 예시 맛집 2곳과 갈만한 곳 2곳. */
export function samplePlacesFor(
  stationName: string,
  kind: StationKind,
): { restaurants: NearbyPlace[]; spots: NearbyPlace[] } {
  const label = kind === "bus" ? stationName : stationName.replace(/역$/, "");
  const h = hash(`${kind}:${stationName}`);
  const pick = <T,>(pool: T[], offset: number): T[] => [pool[(h + offset) % pool.length], pool[(h + offset + 3) % pool.length]];

  const restaurants = pick(RESTAURANTS, 0).map((r, i) => ({
    name: `${label} ${r.suffix} (예시)`,
    category: r.category,
    rating: Math.round((3.8 + ((h >>> (i + 2)) % 10) / 10) * 10) / 10,
    walkMinutes: 2 + ((h >>> i) % 7),
  }));
  const spots = pick(SPOTS, 1).map((s, i) => ({
    name: `${label} ${s.suffix} (예시)`,
    category: s.category,
    rating: null,
    walkMinutes: 3 + ((h >>> (i + 4)) % 8),
  }));
  return { restaurants, spots };
}
