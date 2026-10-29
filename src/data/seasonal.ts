// Supabase 연결 전까지 쓰는 샘플 데이터
export type Seafood = {
  name: string;
  months: number[];
  pairings: string[];
};

export const SEAFOOD: Seafood[] = [
  { name: "방어", months: [11, 12, 1, 2], pairings: ["초고추장", "소주", "미역국"] },
  { name: "대하", months: [9, 10, 11], pairings: ["소금구이", "화이트 와인"] },
  { name: "광어", months: [12, 1, 2, 3], pairings: ["쌈 채소", "매운탕"] },
  { name: "전어", months: [9, 10], pairings: ["깻잎", "막걸리"] },
  { name: "멍게", months: [3, 4, 5], pairings: ["참기름", "청주"] },
  { name: "민어", months: [6, 7, 8], pairings: ["민어탕", "부침개"] },
];

export const inSeason = (month: number) =>
  SEAFOOD.filter((s) => s.months.includes(month));
