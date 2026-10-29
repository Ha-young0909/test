import { beforeEach, describe, expect, it } from "vitest";
import { acquireRoom, COOLDOWN_MS, releaseRoom, resetLocks } from "./lock";

beforeEach(resetLocks);

describe("acquireRoom", () => {
  it("처음에는 바로 시작할 수 있다", () => {
    expect(acquireRoom("a", 1000)).toBeNull();
  });

  it("실행 중이면 같은 방은 막고 다른 방은 허용한다", () => {
    acquireRoom("a", 1000);
    expect(acquireRoom("a", 1001)).toBe(1);
    expect(acquireRoom("b", 1001)).toBeNull();
  });

  it("끝난 직후에는 쿨다운 동안 막고, 지나면 허용한다", () => {
    acquireRoom("a", 1000);
    releaseRoom("a", 1500);
    expect(acquireRoom("a", 1500 + COOLDOWN_MS - 1)).toBeGreaterThan(0);
    expect(acquireRoom("a", 1500 + COOLDOWN_MS)).toBeNull();
  });
});
