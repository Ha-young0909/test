import { afterEach, describe, expect, it, vi } from "vitest";
import { findBusStops, getTransitLeg, OdsayError } from "./odsay";

const cfg = { apiKey: "k", origin: "http://localhost:3000" };
const from = { lat: 37.5551, lng: 126.9368 };
const to = { lat: 37.4979, lng: 127.0276 };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => vi.unstubAllGlobals());

describe("getTransitLeg", () => {
  it("등록한 Origin 헤더와 좌표를 실어 호출하고 가장 빠른 경로를 돌려준다", async () => {
    const fetchMock = vi.fn(async () =>
      json({ result: { path: [{ info: { totalTime: 37 }, subPath: [{ trafficType: 1, lane: [{ name: "수도권 2호선" }] }] }] } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    expect(await getTransitLeg(from, to, cfg)).toEqual({ minutes: 37, route: "2호선" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("SX=126.9368");
    expect(url).toContain("EY=37.4979");
    expect((init.headers as Record<string, string>).Origin).toBe("http://localhost:3000");
  });

  it("700m 이내(-98)는 도보로, 경로 없음(-99)은 null 로 처리한다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: { code: "-98", msg: "700m" } })));
    const walk = await getTransitLeg(to, { lat: 37.4981, lng: 127.028 }, cfg);
    expect(walk?.route).toBe("도보");
    expect(walk?.minutes).toBeGreaterThan(0);
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: { code: "-99", msg: "no result" } })));
    expect(await getTransitLeg(from, to, cfg)).toBeNull();
  });

  it("일일 한도 초과·키 오류는 OdsayError 로 알린다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: [{ code: "429", message: "Daily quota exceeded" }] })));
    await expect(getTransitLeg(from, to, cfg)).rejects.toBeInstanceOf(OdsayError);
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: [{ code: "500", message: "[ApiKeyAuthFailed]" }] })));
    await expect(getTransitLeg(from, to, cfg)).rejects.toThrow("ApiKeyAuthFailed");
  });

  it("HTTP 429 는 잠시 후 다시 시도한다", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 429 }))
      .mockResolvedValueOnce(json({ result: { path: [{ info: { totalTime: 20 }, subPath: [] }] } }));
    vi.stubGlobal("fetch", fetchMock);
    const pending = getTransitLeg(from, to, cfg);
    await vi.runAllTimersAsync();
    expect(await pending).toEqual({ minutes: 20, route: "도보" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe("findBusStops", () => {
  it("반경 안에 정류장이 없으면(-99) 빈 목록", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: { code: "-99", msg: "none" } })));
    expect(await findBusStops(to, 1500, cfg)).toEqual([]);
  });

  it("정류장을 가까운 순 시드로 바꾼다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ result: { station: [{ stationName: "강남역8번출구", x: 127.0267, y: 37.4975 }] } })));
    expect(await findBusStops(to, 1500, cfg)).toEqual([
      { kind: "bus", name: "강남역8번출구", address: null, lat: 37.4975, lng: 127.0267, lines: [] },
    ]);
  });
});
