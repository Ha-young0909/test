import { describe, expect, it, vi } from "vitest";
import { APPROXIMATE_NAME, computeMidpoint, straightLineLeg, type EngineDeps, type Origin } from "./engine";
import type { StationSeed } from "./rank";

const station = (name: string, lng = 127): StationSeed => ({
  kind: "subway", name, address: null, lat: 37.5, lng, lines: ["2호선"],
});
const origins: Origin[] = [
  { participantId: "a", lat: 37.5, lng: 126.9 },
  { participantId: "b", lat: 37.5, lng: 127.1 },
];

const deps = (over: Partial<EngineDeps> = {}): EngineDeps => ({
  findSubway: async () => [station("강남역"), station("역삼역", 127.01), station("논현역", 127.02)],
  ...over,
});

describe("straightLineLeg", () => {
  it("거리가 멀수록 오래 걸리고 설명에 거리를 적는다", () => {
    const near = straightLineLeg({ lat: 37.5, lng: 127 }, { lat: 37.5, lng: 127.01 });
    const far = straightLineLeg({ lat: 37.5, lng: 127 }, { lat: 37.5, lng: 127.1 });
    expect(far.minutes).toBeGreaterThan(near.minutes);
    expect(near.route).toMatch(/^직선 \d+\.\dkm$/);
  });
});

describe("computeMidpoint", () => {
  it("모든 참여자의 직선거리 시간으로 순위를 매긴다", async () => {
    const r = await computeMidpoint(origins, deps());
    expect(r.approximate).toBe(false);
    // 두 사람 가운데(127.0)에 가까운 역일수록 최장 시간이 짧다.
    expect(r.stations.map((s) => s.name)).toEqual(["강남역", "역삼역", "논현역"]);
    expect(r.stations[0].routes.map((x) => x.participantId)).toEqual(["a", "b"]);
    expect(r.stations[0].maxMinutes).toBeLessThanOrEqual(r.stations[1].maxMinutes);
    expect(r.legs).toHaveLength(3 * origins.length);
  });

  it("후보는 최대 8곳까지만 쓴다", async () => {
    const many = Array.from({ length: 12 }, (_, i) => station(`S${i}`, 127 + i / 1000));
    const r = await computeMidpoint(origins, deps({ findSubway: async () => many }));
    expect(r.stations).toHaveLength(8);
  });

  it("90분을 넘는 사람이 있으면 경고 플래그를 켠다", async () => {
    const far = [{ participantId: "a", lat: 37.5, lng: 126.0 }, origins[1]];
    const r = await computeMidpoint(far, deps({ findSubway: async () => [station("강남역")] }));
    expect(r.stations[0].over90).toBe(true);
  });

  it("후보를 하나도 못 찾으면 반경을 넓혀 다시 찾는다", async () => {
    const findSubway = vi.fn(async (_c, radius: number) => (radius >= 3000 ? [station("먼역")] : []));
    const r = await computeMidpoint(origins, deps({ findSubway }));
    expect(findSubway.mock.calls.map((c) => c[1])).toEqual([1500, 3000]);
    expect(r.stations.map((s) => s.name)).toEqual(["먼역"]);
    expect(r.approximate).toBe(false);
  });

  it("끝까지 못 찾으면 평균 좌표 한 곳으로 대체하고 저장할 구간은 없다", async () => {
    const r = await computeMidpoint(origins, deps({ findSubway: async () => [] }));
    expect(r.approximate).toBe(true);
    expect(r.stations).toHaveLength(1);
    expect(r.stations[0]).toMatchObject({ name: APPROXIMATE_NAME, lat: 37.5, lng: 127 });
    expect(r.legs).toEqual([]);
  });

  it("검색이 실패해도 평균 좌표 한 곳으로 대체한다", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await computeMidpoint(origins, deps({ findSubway: async () => { throw new Error("kakao"); } }));
    expect(r.approximate).toBe(true);
    expect(r.stations[0].name).toBe(APPROXIMATE_NAME);
  });
});
