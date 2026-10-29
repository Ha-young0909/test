import { describe, expect, it } from "vitest";
import { isCategory, isUuid, isValidCoord, normalizeNickname } from "./validate";

describe("normalizeNickname", () => {
  it("공백을 제거한다", () => expect(normalizeNickname("  민수 ")).toBe("민수"));
  it("빈 값·공백만은 거부한다", () => {
    expect(normalizeNickname("")).toBeNull();
    expect(normalizeNickname("   ")).toBeNull();
  });
  it("12자 초과·문자열 아님은 거부한다", () => {
    expect(normalizeNickname("a".repeat(13))).toBeNull();
    expect(normalizeNickname(123)).toBeNull();
  });
  it("12자는 허용한다", () => expect(normalizeNickname("a".repeat(12))).toBe("a".repeat(12)));
});

describe("isUuid", () => {
  it("올바른 uuid 만 통과한다", () => {
    expect(isUuid("00000000-0000-4000-8000-000000000001")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});

describe("isCategory", () => {
  it("정해진 카테고리만 통과한다", () => {
    expect(isCategory("cafe")).toBe(true);
    expect(isCategory("pizza")).toBe(false);
  });
});

describe("isValidCoord", () => {
  it("서울 좌표는 통과한다", () => expect(isValidCoord(37.5665, 126.978)).toBe(true));
  it("범위 밖·숫자 아님·NaN 은 거부한다", () => {
    expect(isValidCoord(0, 0)).toBe(false);
    expect(isValidCoord("37", "126")).toBe(false);
    expect(isValidCoord(NaN, 126)).toBe(false);
  });
});
