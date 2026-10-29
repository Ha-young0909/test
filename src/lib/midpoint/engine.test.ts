import { describe, expect, it, vi } from "vitest";
import { APPROXIMATE_NAME, ESTIMATE_ROUTE, computeMidpoint, estimateLeg, type EngineDeps, type Origin } from "./engine";
import { distanceM, estimateTransitMinutes } from "./geo";
import type { StationSeed } from "./rank";

const station = (kind: "subway" | "bus", name: string, lng = 127): StationSeed => ({
  kind, name, address: null, lat: 37.5, lng, lines: kind === "subway" ? ["2호선"] : [],
});
const origins: Origin[] = [
  { participantId: "a", lat: 37.5, lng: 126.9 },
  { participantId: "b", lat: 37.5, lng: 127.1 },
];

function deps(over: Partial<EngineDeps> = {}): EngineDeps {
  return {
    findSubway: async () => [station("subway", "강남역"), station("subway", "역삼역", 127.01), station("subway", "논현역", 127.02)],
    ...over,
  };
}

describe("estimateLeg", () => {
  it("직선거리로 이동 시간을 추정하고 추정임을 표시한다", () => {
    const from = { lat: 37.5, lng: 126.9 };
    const to = { lat: 37.5, lng: 127.0 };
    const leg = estimateLeg(from, to);
    expect(leg.minutes).toBe(estimateTransitMinutes(distanceM(from, to)));
    expect(leg.route).toBe(ESTIMATE_ROUTE);
    expect(estimateLeg(from, from).minutes).toBe(10); // 같은 자리여도 대기·환승 10분
  });
});

describe("computeMidpoint (직선거리 기반)", () => {
  it("모든 참여자의 추정 시간으로 최장 시간이 짧은 순으로 순위를 매긴다", async () => {
    const r = await computeMidpoint(origins, deps());
    expect(r.approximate).toBe(false);
    // 두 참여자(126.9, 127.1)의 한가운데에 가까운 후보가 1순위
    expect(r.stations.map((s) => s.name)).toEqual(["강남역", "역삼역", "논현역"]);
    expect(r.stations[0].routes.map((x) => x.participantId)).toEqual(["a", "b"]);
    expect(r.stations[0].routes.every((x) => x.route === ESTIMATE_ROUTE)).toBe(true);
    expect(r.stations[0].maxMinutes).toBeLessThanOrEqual(r.stations[1].maxMinutes);
  });

  it("외부 이동 시간 API 없이 같은 입력이면 같은 결과를 돌려준다", async () => {
    const a = await computeMidpoint(origins, deps());
    const b = await computeMidpoint(origins, deps());
    expect(b).toEqual(a);
  });

  it("후보는 최대 8곳까지만 쓴다", async () => {
    const many = Array.from({ length: 12 }, (_, i) => station("subway", `S${i}`, 127 + i / 1000));
    const r = await computeMidpoint(origins, deps({ findSubway: async () => many }));
    expect(r.stations).toHaveLength(8);
  });

  it("추정 시간이 90분을 넘는 참여자가 있으면 over90", async () => {
    const far: Origin[] = [
      { participantId: "a", lat: 37.5, lng: 126.2 },
      { participantId: "b", lat: 37.5, lng: 127.1 },
    ];
    const r = await computeMidpoint(far, deps());
    expect(r.stations[0].over90).toBe(r.stations[0].maxMinutes > 90);
    expect(r.stations.some((s) => s.over90)).toBe(true);
  });

  it("후보를 하나도 못 찾으면 반경을 넓혀 다시 찾는다", async () => {
    const findSubway = vi.fn(async (_c, radius: number) => (radius >= 3000 ? [station("subway", "먼역")] : []));
    const r = await computeMidpoint(origins, deps({ findSubway }));
    expect(findSubway.mock.calls.map((c) => c[1])).toEqual([1500, 3000]);
    expect(r.stations.map((s) => s.name)).toEqual(["먼역"]);
  });

  it("검색이 실패하면 평균 좌표 한 곳으로 대체한다", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await computeMidpoint(origins, deps({ findSubway: async () => { throw new Error("down"); } }));
    expect(r.approximate).toBe(true);
    expect(r.stations).toHaveLength(1);
    expect(r.stations[0]).toMatchObject({ name: APPROXIMATE_NAME, lat: 37.5, lng: 127 });
  });

  it("반경을 모두 넓혀도 역이 없으면 평균 좌표 한 곳으로 대체한다", async () => {
    const r = await computeMidpoint(origins, deps({ findSubway: async () => [] }));
    expect(r.approximate).toBe(true);
    expect(r.stations[0].name).toBe(APPROXIMATE_NAME);
  });
});
