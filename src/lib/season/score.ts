export type Region = "동해" | "서해" | "남해" | "제주";

export type SeasonLabel = "적기" | "비쌈" | "비제철";

export type SeasonScoreInput = {
  month: number; // 1~12
  seasonMonths: number[]; // 해당 어종·권역의 제철 월 (연말 걸침 가능: [11, 12, 1, 2])
  currentPrice: number | null; // 최근 시세 (원/kg), 결측이면 null
  normalPrice: number | null; // 평년가 (원/kg), 없으면 null
};

export type SeasonScore = {
  label: SeasonLabel;
  emoji: string;
};

// 시세가 평년가의 이 배율 이하이면 "적기", 넘으면 "비쌈"
export const PRICE_TOLERANCE_RATIO = 1;

// 가격 정보가 없을 때 제철이면 "적기"로 본다 (비싼지 알 수 없으므로 제철만 반영)
export const MISSING_PRICE_LABEL: SeasonLabel = "적기";

export const LABEL_EMOJI: Record<SeasonLabel, string> = {
  적기: "🟢",
  비쌈: "🟡",
  비제철: "⚪",
};

const hasPrice = (price: number | null): price is number =>
  price !== null && Number.isFinite(price) && price > 0;

export function getSeasonLabel({
  month,
  seasonMonths,
  currentPrice,
  normalPrice,
}: SeasonScoreInput): SeasonLabel {
  if (!seasonMonths.includes(month)) return "비제철";
  if (!hasPrice(currentPrice) || !hasPrice(normalPrice)) return MISSING_PRICE_LABEL;
  return currentPrice <= normalPrice * PRICE_TOLERANCE_RATIO ? "적기" : "비쌈";
}

export function getSeasonScore(input: SeasonScoreInput): SeasonScore {
  const label = getSeasonLabel(input);
  return { label, emoji: LABEL_EMOJI[label] };
}
