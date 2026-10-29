import { describe, expect, it } from "vitest";
import { getSeasonLabel, getSeasonScore } from "./score";

const base = { seasonMonths: [11, 12, 1, 2], currentPrice: 30000, normalPrice: 35000 };

describe("getSeasonLabel", () => {
  it("제철이고 시세가 평년가 이하면 적기", () => {
    expect(getSeasonLabel({ ...base, month: 12 })).toBe("적기");
  });

  it("제철이지만 시세가 평년가보다 높으면 비쌈", () => {
    expect(getSeasonLabel({ ...base, month: 12, currentPrice: 40000 })).toBe("비쌈");
  });

  it("시세가 평년가와 같으면 적기", () => {
    expect(getSeasonLabel({ ...base, month: 12, currentPrice: 35000 })).toBe("적기");
  });

  it("비제철이면 시세와 무관하게 비제철", () => {
    expect(getSeasonLabel({ ...base, month: 6 })).toBe("비제철");
    expect(getSeasonLabel({ ...base, month: 6, currentPrice: 1 })).toBe("비제철");
  });

  describe("제철 경계", () => {
    it("첫달·막달은 제철 (연말 걸침 포함)", () => {
      expect(getSeasonLabel({ ...base, month: 11 })).toBe("적기");
      expect(getSeasonLabel({ ...base, month: 2 })).toBe("적기");
    });

    it("첫달 직전·막달 직후는 비제철", () => {
      expect(getSeasonLabel({ ...base, month: 10 })).toBe("비제철");
      expect(getSeasonLabel({ ...base, month: 3 })).toBe("비제철");
    });

    it("연도 안에서 끝나는 제철도 첫달/막달이 제철", () => {
      const input = { ...base, seasonMonths: [3, 4, 5] };
      expect(getSeasonLabel({ ...input, month: 3 })).toBe("적기");
      expect(getSeasonLabel({ ...input, month: 5 })).toBe("적기");
      expect(getSeasonLabel({ ...input, month: 2 })).toBe("비제철");
      expect(getSeasonLabel({ ...input, month: 6 })).toBe("비제철");
    });
  });

  describe("평년가 없음 / 가격 결측", () => {
    it("평년가가 없으면 제철만으로 판단", () => {
      expect(getSeasonLabel({ ...base, month: 12, normalPrice: null })).toBe("적기");
    });

    it("시세가 결측이면 제철만으로 판단", () => {
      expect(getSeasonLabel({ ...base, month: 12, currentPrice: null })).toBe("적기");
    });

    it("0·NaN 가격은 결측으로 취급", () => {
      expect(getSeasonLabel({ ...base, month: 12, currentPrice: 0 })).toBe("적기");
      expect(getSeasonLabel({ ...base, month: 12, normalPrice: NaN })).toBe("적기");
    });

    it("가격이 없어도 비제철은 비제철", () => {
      expect(
        getSeasonLabel({ ...base, month: 6, currentPrice: null, normalPrice: null }),
      ).toBe("비제철");
    });
  });
});

describe("getSeasonScore", () => {
  it("라벨에 맞는 이모지를 돌려준다", () => {
    expect(getSeasonScore({ ...base, month: 12 })).toEqual({ label: "적기", emoji: "🟢" });
    expect(getSeasonScore({ ...base, month: 12, currentPrice: 40000 })).toEqual({ label: "비쌈", emoji: "🟡" });
    expect(getSeasonScore({ ...base, month: 6 })).toEqual({ label: "비제철", emoji: "⚪" });
  });
});
