// supabase/schema.sql과 맞춘 공용 타입

export type Region = "east" | "west" | "south" | "jeju";

export const REGIONS: readonly Region[] = ["east", "west", "south", "jeju"];

export const REGION_LABELS: Record<Region, string> = {
  east: "동해",
  west: "서해",
  south: "남해",
  jeju: "제주",
};

// 1~12
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

// 추천 라벨: 🟢 지금이 적기 / 🟡 제철이지만 비쌈 / ⚪ 비제철
export type SeasonLabel = "best" | "pricey" | "off";

export interface Seafood {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
}

export interface SeafoodSeason {
  seafoodId: number;
  region: Region;
  month: Month;
}

export interface SeafoodPrice {
  id: number;
  seafoodId: number;
  // null이면 전국 평균
  region: Region | null;
  // 원/kg
  price: number;
  // YYYY-MM-DD
  recordedAt: string;
  source: string | null;
}

export interface Pairing {
  id: number;
  seafoodId: number;
  name: string;
  note: string | null;
  generatedBy: string | null;
  // ISO 8601
  generatedAt: string;
}
