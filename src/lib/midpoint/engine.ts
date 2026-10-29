import { centroid, distanceM, estimateTransitMinutes, type LatLng } from "./geo";
import { rankStations, summarize, type Leg, type StationResult, type StationSeed } from "./rank";

export const APPROXIMATE_NAME = "대략적인 중간 지점";
export const ESTIMATE_ROUTE = "직선거리 추정";

const SEARCH_RADII_M = [1500, 3000, 6000];
const MAX_CANDIDATES = 8;

export interface Origin extends LatLng {
  participantId: string;
}

export interface EngineDeps {
  findSubway(center: LatLng, radiusM: number): Promise<StationSeed[]>;
}

export interface EngineResult {
  stations: StationResult[];
  /** 이동 시간은 항상 직선거리 추정이므로 true. 클라이언트가 "대략적인" 안내를 띄우는 데 쓴다. */
  approximate: true;
}

/** 출발지에서 후보까지의 이동 시간을 직선거리로 추정한다. */
export function estimateLeg(from: LatLng, to: LatLng): Leg {
  return { minutes: estimateTransitMinutes(distanceM(from, to)), route: ESTIMATE_ROUTE };
}

/** 평균 좌표에서 가까운 순으로 오는 지하철역 중 최대 8곳. */
export function pickSeeds(subway: StationSeed[]): StationSeed[] {
  return subway.slice(0, MAX_CANDIDATES);
}

/** 반경을 넓혀 가며 후보 역을 찾는다. 검색이 실패하면 빈 목록. */
async function searchSeeds(center: LatLng, deps: EngineDeps): Promise<StationSeed[]> {
  for (const radius of SEARCH_RADII_M) {
    try {
      const seeds = pickSeeds(await deps.findSubway(center, radius));
      if (seeds.length > 0) return seeds;
    } catch (err) {
      console.error("지하철역 검색 실패, 평균 좌표로 대체합니다.", err);
      return [];
    }
  }
  return [];
}

/**
 * 중간 지점 계산. 참여자 평균 좌표 주변 지하철역을 찾고, 후보마다 모든 참여자의 이동 시간을
 * 직선거리로 추정해 순위를 매긴다. 후보를 못 찾으면 평균 좌표 한 곳을 돌려준다.
 */
export async function computeMidpoint(origins: Origin[], deps: EngineDeps): Promise<EngineResult> {
  const center = centroid(origins);
  const seeds = await searchSeeds(center, deps);
  const candidates: StationSeed[] =
    seeds.length > 0 ? seeds : [{ kind: "subway", name: APPROXIMATE_NAME, address: null, ...center, lines: [] }];
  const stations = candidates.map((seed) =>
    summarize(seed, new Map(origins.map((o) => [o.participantId, estimateLeg(o, seed)]))),
  );
  return { stations: rankStations(stations), approximate: true };
}
