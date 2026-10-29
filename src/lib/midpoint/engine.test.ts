import { describe, expect, it, vi } from "vitest";
import { APPROXIMATE_NAME, computeMidpoint, ESTIMATE_ROUTE, estimateLeg, pickSeeds, type EngineDeps, type Origin } from "./engine";
import type { StationSeed } from "./rank";

const station = (name: string, lng = 127): StationSeed => ({
  kind: "subway", name, address: null, lat: 37.5, lng, lines: ["2호선"],
});
const origins: Origin[] = [
  { participantId: "a", lat: 37.5, lng: 126.9 },
  { participantId: "b", lat: 37.5, lng: 127.1 },
];

function deps(over: Partial<EngineDeps> = {}): EngineDeps {
  return { findSubway: async () => [station("강남역"), station("역삼역", 127.05), station("선릉역", 127.1)], ...over };
}

describe("pickSeeds", () => {
  it("최대 8곳까지만 고른다", () => {
    const many = Array.from({ length: 12 }, (_, i) => station(`S${i}`));
    expect(pickSeeds(many)).toHaveLength(8);
    expect(pickSeeds([station("A")])).toHaveLength(1);
  });
});

describe("estimateLeg", () => {
  it("멀수록 오래 걸리고 경로는 '직선거리 추정'이다", () => {
    const near = estimateLeg({ lat: 37.5, lng: 127 }, { lat: 37.5, lng: 127.01 });
    const far = estimateLeg({ lat: 37.5, lng: 127 }, { lat: 37.5, lng: 127.2 });
    expect(far.minutes).toBeGreaterThan(near.minutes);
    expect(near.route).toBe(ESTIMATE_ROUTE);
  });
});

describe("computeMidpoint", () => {
  it("모든 참여자까지의 직선거리 추정으로 최장 시간이 짧은 순서로 정렬한다", async () => {
    const r = await computeMidpoint(origins, deps());
    expect(r.approximate).toBe(true);
    // 두 사람 사이(127.0)에 가까운 강남역이 최장 시간이 가장 짧다.
    expect(r.stations.map((s) => s.name)).toEqual(["강남역", "역삼역", "선릉역"]);
    expect(r.stations[0].routes.map((x) => x.participantId)).toEqual(["a", "b"]);
    expect(r.stations[0].routes.every((x) => x.route === ESTIMATE_ROUTE)).toBe(true);
    expect(r.stations[0].maxMinutes).toBeLessThanOrEqual(r.stations[1].maxMinutes);
  });

  it("후보가 하나도 없으면 반경을 넓혀 다시 찾는다", async () => {
    const findSubway = vi.fn(async (_c, radius: number) => (radius >= 3000 ? [station("먼역")] : []));
    const r = await computeMidpoint(origins, { findSubway });
    expect(findSubway.mock.calls.map((c) => c[1])).toEqual([1500, 3000]);
    expect(r.stations.map((s) => s.name)).toEqual(["먼역"]);
  });

  it("검색이 실패하면 평균 좌표 한 곳으로 대체한다", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await computeMidpoint(origins, { findSubway: async () => { throw new Error("down"); } });
    expect(r.approximate).toBe(true);
    expect(r.stations).toHaveLength(1);
    expect(r.stations[0]).toMatchObject({ name: APPROXIMATE_NAME, lat: 37.5, lng: 127 });
  });

  it("끝까지 후보를 못 찾아도 평균 좌표 한 곳을 돌려준다", async () => {
    const r = await computeMidpoint(origins, { findSubway: async () => [] });
    expect(r.stations.map((s) => s.name)).toEqual([APPROXIMATE_NAME]);
  });

  it("출발지가 먼 참여자가 있으면 90분 초과를 표시한다", async () => {
    const far: Origin[] = [
      { participantId: "a", lat: 37.5, lng: 126.9 },
      { participantId: "b", lat: 35.1, lng: 129.0 }, // 부산
    ];
    const r = await computeMidpoint(far, deps());
    expect(r.stations[0].over90).toBe(true);
  });
});
