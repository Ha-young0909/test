// Supabase 연결 전까지 쓰는 샘플 데이터 (가격은 예시값, 원/kg)
export type Seafood = {
  name: string;
  months: number[];
  price: number;
  pairings: string[];
};

export const SEAFOOD: Seafood[] = [
  { name: "방어", months: [11, 12, 1, 2], price: 38000, pairings: ["초고추장", "소주", "미역국"] },
  { name: "대하", months: [9, 10, 11], price: 45000, pairings: ["소금구이", "화이트 와인"] },
  { name: "광어", months: [12, 1, 2, 3], price: 28000, pairings: ["쌈 채소", "매운탕"] },
  { name: "전어", months: [9, 10], price: 18000, pairings: ["깻잎", "막걸리"] },
  { name: "멍게", months: [3, 4, 5], price: 15000, pairings: ["참기름", "청주"] },
  { name: "민어", months: [6, 7, 8], price: 55000, pairings: ["민어탕", "부침개"] },
];

export const inSeason = (month: number) =>
  SEAFOOD.filter((s) => s.months.includes(month));

// 지금 제철인 횟감을 앞에 두고 나머지를 뒤에 붙인다
export const orderedForMonth = (month: number) => [
  ...inSeason(month),
  ...SEAFOOD.filter((s) => !s.months.includes(month)),
];
