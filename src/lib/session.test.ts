import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getHostId,
  getParticipantId,
  getParticipantToken,
  saveHostId,
  saveParticipantId,
  saveParticipantToken,
} from "./session";

// node 환경이라 window.localStorage 를 간단히 흉내 낸다.
function stubStorage(overrides: Partial<Storage> = {}) {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    ...overrides,
  };
  vi.stubGlobal("window", { localStorage });
}

describe("session (localStorage)", () => {
  beforeEach(() => stubStorage());
  afterEach(() => vi.unstubAllGlobals());

  it("방별로 참여자·방장 ID 를 따로 저장한다", () => {
    saveParticipantId("r1", "p1");
    saveHostId("r1", "h1");
    saveParticipantId("r2", "p2");
    expect(getParticipantId("r1")).toBe("p1");
    expect(getHostId("r1")).toBe("h1");
    expect(getParticipantId("r2")).toBe("p2");
    expect(getHostId("r2")).toBeNull();
    saveParticipantToken("r1", "t1");
    expect(getParticipantToken("r1")).toBe("t1");
    expect(getParticipantToken("r2")).toBeNull();
  });

  it("localStorage 가 던져도 예외 없이 null/무시", () => {
    const boom = () => {
      throw new Error("blocked");
    };
    stubStorage({ getItem: boom, setItem: boom });
    expect(() => saveHostId("r", "h")).not.toThrow();
    expect(getHostId("r")).toBeNull();
  });
});
