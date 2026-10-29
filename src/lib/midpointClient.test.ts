import { describe, expect, it, vi } from "vitest";
import { describeTopChange, requestMidpoint } from "./midpointClient";

const ok = { stations: [], approximate: false };
const json = (body: unknown, init?: ResponseInit) => Response.json(body, init);

describe("requestMidpoint", () => {
  it("성공하면 응답을 돌려준다", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(ok));
    expect(await requestMidpoint("r", { hostId: "h" }, { fetchFn })).toEqual(ok);
    expect(fetchFn).toHaveBeenCalledWith("/api/rooms/r/midpoint", expect.objectContaining({ method: "POST" }));
  });

  it("429 는 Retry-After 만큼 기다렸다가 다시 시도한다", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(json({ error: "계산 중" }, { status: 429, headers: { "Retry-After": "2" } }))
      .mockResolvedValueOnce(json(ok));
    expect(await requestMidpoint("r", { hostId: "h" }, { fetchFn, sleep })).toEqual(ok);
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it("계속 429 면 마지막 오류 문구로 throw 한다", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fetchFn = vi.fn().mockImplementation(async () => json({ error: "계산 중" }, { status: 429 }));
    await expect(requestMidpoint("r", { hostId: "h" }, { fetchFn, sleep })).rejects.toThrow("계산 중");
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("다른 오류는 재시도 없이 throw 한다", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json({ error: "권한 없음" }, { status: 403 }));
    await expect(requestMidpoint("r", { hostId: "h" }, { fetchFn })).rejects.toThrow("권한 없음");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe("describeTopChange", () => {
  it("1순위가 바뀐 경우에만 문구를 만든다", () => {
    expect(describeTopChange("강남역", "역삼역")).toBe("1순위가 역삼역(으)로 바뀌었어요");
    expect(describeTopChange("강남역", "강남역")).toBeNull();
    expect(describeTopChange(null, "강남역")).toBeNull();
  });
});
