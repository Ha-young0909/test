import type { Region } from "@/types/seafood";

// Supabase 연결 전까지 쓰는 샘플 데이터 (가격은 예시값, 원/kg)
export type Seafood = {
  name: string;
  months: number[];
  regions: Region[];
  price: number;
  // 평년가 (샘플). 실제로는 시세 이력에서 계산한다
  normalPrice: number;
  pairings: string[];
};

export const SEAFOOD: Seafood[] = [
  { name: "방어", months: [11, 12, 1, 2], regions: ["east", "south", "jeju"], price: 38000, normalPrice: 40000, pairings: ["초고추장", "소주", "미역국"] },
  { name: "대하", months: [9, 10, 11], regions: ["west"], price: 45000, normalPrice: 38000, pairings: ["소금구이", "화이트 와인"] },
  { name: "광어", months: [12, 1, 2, 3], regions: ["east", "west", "south", "jeju"], price: 28000, normalPrice: 29000, pairings: ["쌈 채소", "매운탕"] },
  { name: "전어", months: [9, 10], regions: ["west", "south"], price: 18000, normalPrice: 16000, pairings: ["깻잎", "막걸리"] },
  { name: "멍게", months: [3, 4, 5], regions: ["east", "south"], price: 15000, normalPrice: 15000, pairings: ["참기름", "청주"] },
  { name: "민어", months: [6, 7, 8], regions: ["west", "south"], price: 55000, normalPrice: 52000, pairings: ["민어탕", "부침개"] },
];

export const inSeason = (month: number, region: Region) =>
  SEAFOOD.filter((s) => s.months.includes(month) && s.regions.includes(region));
