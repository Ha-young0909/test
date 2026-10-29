import { centroid, distanceM, estimateTransitMinutes, type LatLng } from "./geo";
import { rankStations, summarize, type CachedLeg, type Leg, type StationResult, type StationSeed } from "./rank";

export const APPROXIMATE_NAME = "대략적인 중간 지점";

const SEARCH_RADII_M = [1500, 3000, 6000];
const MAX_CANDIDATES = 8;
const MAX_SUBWAY = 5;
const CONCURRENCY = 3; // ODsay 는 동시 호출이 많으면 429 를 돌려준다
const CACHE_MATCH_M = 50;

export interface Origin extends LatLng {
  participantId: string;
}

export interface EngineDeps {
  findSubway(center: LatLng, radiusM: number): Promise<StationSeed[]>;
  findBus(center: LatLng, radiusM: number): Promise<StationSeed[]>;
  /** null 은 경로 없음. API 실패는 throw 한다. */
  travel(from: LatLng, to: StationSeed): Promise<Leg | null>;
}

export interface FreshLeg {
  participantId: string;
  station: StationSeed;
  leg: Leg;
}

export interface EngineResult {
  stations: StationResult[];
  approximate: boolean;
  /** 이번에 ODsay 로 새로 조회한 구간. 호출자가 캐시에 저장한다. */
  fresh: FreshLeg[];
}

export const legKey = (participantId: string, stationName: string) => `${participantId}|${stationName}`;

/** 지하철역을 우선(최대 5곳)하고 나머지를 버스 정류장으로 채워 최대 8곳. 지하철역과 이름이 같은 정류장은 뺀다. */
export function pickSeeds(subway: StationSeed[], bus: StationSeed[]): StationSeed[] {
  const subwayNames = new Set(subway.map((s) => s.name));
  const buses = bus.filter((b) => !subwayNames.has(b.name));
  const subwayCount = Math.min(subway.length, MAX_SUBWAY, MAX_CANDIDATES - Math.min(buses.length, 3));
  return [...subway.slice(0, subwayCount), ...buses.slice(0, MAX_CANDIDATES - subwayCount)];
}

/** 버스 후보의 노선은 참여자들이 이 정류장에 내리려고 타는 버스 번호로 채운다. */
function withBusLines(station: StationResult): StationResult {
  if (station.kind !== "bus") return station;
  const lines = new Set<string>();
  for (const { route } of station.routes) {
    const last = route.split(" → ").pop() ?? "";
    if (last.endsWith("번")) lines.add(last.slice(0, -1));
  }
  return { ...station, lines: [...lines] };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  let failed = false;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (!failed && next < items.length) {
      const i = next++;
      try {
        out[i] = await fn(items[i]);
      } catch (err) {
        failed = true; // 남은 호출을 더 보내지 않는다
        throw err;
      }
    }
  });
  await Promise.all(workers);
  return out;
}

async function searchSeeds(center: LatLng, deps: EngineDeps): Promise<StationSeed[]> {
  for (const radius of SEARCH_RADII_M) {
    const [subway, bus] = await Promise.allSettled([deps.findSubway(center, radius), deps.findBus(center, radius)]);
    const seeds = pickSeeds(
      subway.status === "fulfilled" ? subway.value : [],
      bus.status === "fulfilled" ? bus.value : [],
    );
    if (seeds.length > 0) return seeds;
    if (subway.status === "rejected" && bus.status === "rejected") return [];
  }
  return [];
}

/** 평균 좌표 폴백: 후보 역까지 직선거리로 시간을 추정한다. 후보를 못 찾으면 평균 좌표 한 곳. */
function approximate(origins: Origin[], center: LatLng, seeds: StationSeed[]): EngineResult {
  const candidates: StationSeed[] =
    seeds.length > 0
      ? seeds
      : [{ kind: "subway", name: APPROXIMATE_NAME, address: null, ...center, lines: [] }];
  const stations = candidates.map((seed) => {
    const legs = new Map<string, Leg>(
      origins.map((o) => [o.participantId, { minutes: estimateTransitMinutes(distanceM(o, seed)), route: "직선거리 추정" }]),
    );
    return withBusLines(summarize(seed, legs));
  });
  return { stations: rankStations(stations), approximate: true, fresh: [] };
}

/**
 * 중간 지점 계산. 참여자 평균 좌표 주변 후보 역을 찾고, 후보마다 모든 참여자의 이동 시간을 구해 순위를 매긴다.
 * cache 에 있는 구간은 다시 조회하지 않는다. API 실패·후보 없음은 평균 좌표 폴백(approximate)으로 돌려준다.
 */
export async function computeMidpoint(origins: Origin[], deps: EngineDeps, cache: Map<string, CachedLeg>): Promise<EngineResult> {
  const center = centroid(origins);
  const seeds = await searchSeeds(center, deps);
  if (seeds.length === 0) return approximate(origins, center, seeds);

  const pairs = seeds.flatMap((seed) => origins.map((origin) => ({ seed, origin })));
  let results: (Leg | null)[];
  const fresh: FreshLeg[] = [];
  try {
    results = await mapLimit(pairs, CONCURRENCY, async ({ seed, origin }) => {
      const cached = cache.get(legKey(origin.participantId, seed.name));
      if (cached && distanceM(cached, seed) < CACHE_MATCH_M) return cached;
      const leg = await deps.travel(origin, seed);
      if (leg) fresh.push({ participantId: origin.participantId, station: seed, leg });
      return leg;
    });
  } catch (err) {
    console.error("이동 시간 조회 실패, 평균 좌표 방식으로 대체합니다.", err);
    return approximate(origins, center, seeds);
  }

  const stations = seeds.flatMap((seed, i) => {
    const legs = results.slice(i * origins.length, (i + 1) * origins.length);
    // 한 명이라도 갈 수 없는 후보는 순위에서 뺀다.
    if (legs.some((leg) => leg === null)) return [];
    return [withBusLines(summarize(seed, new Map(origins.map((o, j) => [o.participantId, legs[j] as Leg]))))];
  });
  if (stations.length === 0) return approximate(origins, center, seeds);
  return { stations: rankStations(stations), approximate: false, fresh };
}
