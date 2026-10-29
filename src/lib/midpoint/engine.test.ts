import { describe, expect, it, vi } from "vitest";
import { APPROXIMATE_NAME, computeMidpoint, legKey, pickSeeds, type EngineDeps, type Origin } from "./engine";
import type { CachedLeg, StationSeed } from "./rank";

const station = (kind: "subway" | "bus", name: string, lng = 127): StationSeed => ({
  kind, name, address: null, lat: 37.5, lng, lines: kind === "subway" ? ["2호선"] : [],
});
const origins: Origin[] = [
  { participantId: "a", lat: 37.5, lng: 126.9 },
  { participantId: "b", lat: 37.5, lng: 127.1 },
];

function deps(over: Partial<EngineDeps> = {}): EngineDeps {
  return {
    findSubway: async () => [station("subway", "강남역"), station("subway", "역삼역", 127.01)],
    findBus: async () => [station("bus", "강남역"), station("bus", "논현동정류장", 127.02)],
    travel: async (from, to) => ({ minutes: Math.round(Math.abs(from.lng - to.lng) * 1000), route: to.kind === "bus" ? "472번" : "2호선" }),
    ...over,
  };
}

describe("pickSeeds", () => {
  it("지하철역과 이름이 같은 정류장은 빼고 최대 8곳까지 채운다", () => {
    const subway = Array.from({ length: 6 }, (_, i) => station("subway", `S${i}`));
    const bus = [station("bus", "S0"), ...Array.from({ length: 10 }, (_, i) => station("bus", `B${i}`))];
    const seeds = pickSeeds(subway, bus);
    expect(seeds).toHaveLength(8);
    expect(seeds.some((s) => s.kind === "bus" && s.name === "S0")).toBe(false);
    expect(seeds.filter((s) => s.kind === "subway")).toHaveLength(5);
  });

  it("버스 정류장이 없어도 지하철역만으로 동작한다", () => {
    expect(pickSeeds([station("subway", "A"), station("subway", "B")], [])).toHaveLength(2);
  });
});

describe("computeMidpoint", () => {
  it("모든 참여자의 시간으로 순위를 매기고 버스 후보에 이용 버스를 채운다", async () => {
    const r = await computeMidpoint(origins, deps(), new Map());
    expect(r.approximate).toBe(false);
    // 강남역(127.0): 최장 100, 역삼역(127.01): 최장 110, 논현동(127.02): 최장 120
    expect(r.stations.map((s) => s.name)).toEqual(["강남역", "역삼역", "논현동정류장"]);
    const bus = r.stations.find((s) => s.kind === "bus");
    expect(bus?.lines).toEqual(["472"]);
    expect(r.stations[0].routes.map((x) => x.participantId)).toEqual(["a", "b"]);
    expect(r.stations[0].over90).toBe(true);
    expect(r.fresh).toHaveLength(r.stations.length * origins.length);
  });

  it("캐시에 있는 구간은 ODsay 를 다시 부르지 않는다", async () => {
    const travel = vi.fn(deps().travel);
    const cache = new Map<string, CachedLeg>();
    for (const o of origins) cache.set(legKey(o.participantId, "강남역"), { minutes: 5, route: "캐시", lat: 37.5, lng: 127 });
    const r = await computeMidpoint(origins, deps({ travel }), cache);
    expect(travel.mock.calls.every(([, to]) => to.name !== "강남역")).toBe(true);
    expect(r.stations[0]).toMatchObject({ name: "강남역", maxMinutes: 5 });
    expect(r.fresh.every((f) => f.station.name !== "강남역")).toBe(true);
  });

  it("같은 이름이라도 좌표가 다른 캐시는 쓰지 않는다", async () => {
    const travel = vi.fn(deps().travel);
    const cache = new Map<string, CachedLeg>();
    for (const o of origins) cache.set(legKey(o.participantId, "강남역"), { minutes: 5, route: "캐시", lat: 35, lng: 129 });
    await computeMidpoint(origins, deps({ travel }), cache);
    expect(travel.mock.calls.some(([, to]) => to.name === "강남역")).toBe(true);
  });

  it("갈 수 없는 참여자가 있는 후보는 순위에서 뺀다", async () => {
    const r = await computeMidpoint(
      origins,
      deps({ travel: async (from, to) => (to.name === "강남역" && from.lng > 127 ? null : { minutes: 30, route: "x" }) }),
      new Map(),
    );
    expect(r.stations.map((s) => s.name)).not.toContain("강남역");
    expect(r.approximate).toBe(false);
  });

  it("이동 시간 조회가 실패하면 직선거리 추정으로 대체하고 캐시에 남기지 않는다", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await computeMidpoint(origins, deps({ travel: async () => { throw new Error("quota"); } }), new Map());
    expect(r.approximate).toBe(true);
    expect(r.fresh).toEqual([]);
    expect(r.stations.length).toBeGreaterThan(0);
    expect(r.stations[0].routes[0].route).toBe("직선거리 추정");
  });

  it("후보를 하나도 못 찾으면 반경을 넓혀 다시 찾는다", async () => {
    const findSubway = vi.fn(async (_c, radius: number) => (radius >= 3000 ? [station("subway", "먼역")] : []));
    const r = await computeMidpoint(origins, deps({ findSubway, findBus: async () => [] }), new Map());
    expect(findSubway.mock.calls.map((c) => c[1])).toEqual([1500, 3000]);
    expect(r.stations.map((s) => s.name)).toEqual(["먼역"]);
  });

  it("검색이 모두 실패하면 평균 좌표 한 곳으로 대체한다", async () => {
    const boom = async () => { throw new Error("down"); };
    const r = await computeMidpoint(origins, deps({ findSubway: boom, findBus: boom }), new Map());
    expect(r.approximate).toBe(true);
    expect(r.stations).toHaveLength(1);
    expect(r.stations[0]).toMatchObject({ name: APPROXIMATE_NAME, lat: 37.5, lng: 127 });
  });

  it("지하철 검색만 실패해도 버스 정류장으로 계산한다", async () => {
    const r = await computeMidpoint(origins, deps({ findSubway: async () => { throw new Error("kakao"); } }), new Map());
    expect(r.approximate).toBe(false);
    expect(r.stations.every((s) => s.kind === "bus")).toBe(true);
  });
});
