import { centroid, distanceM, estimateTransitMinutes, type LatLng } from "./geo";
import { rankStations, summarize, type Leg, type StationResult, type StationSeed } from "./rank";

export const APPROXIMATE_NAME = "대략적인 중간 지점";

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
  /** 후보 역을 못 찾아 평균 좌표 한 곳으로 대체했으면 true. */
  approximate: boolean;
}

export const ESTIMATE_ROUTE = "직선거리 추정";

/** 이동 시간은 외부 API 없이 출발지와 후보 사이의 직선거리로 추정한다. */
export function estimateLeg(from: LatLng, to: LatLng): Leg {
  return { minutes: estimateTransitMinutes(distanceM(from, to)), route: ESTIMATE_ROUTE };
}

/** 가까운 지하철역부터 최대 8곳. 후보가 없으면 반경을 넓혀 다시 찾는다. 시내 버스 정류장은 데이터가 없어 쓰지 않는다. */
async function searchSeeds(center: LatLng, deps: EngineDeps): Promise<StationSeed[]> {
  for (const radius of SEARCH_RADII_M) {
    try {
      const seeds = (await deps.findSubway(center, radius)).slice(0, MAX_CANDIDATES);
      if (seeds.length > 0) return seeds;
    } catch (err) {
      console.error("지하철역 검색 실패, 평균 좌표 방식으로 대체합니다.", err);
      return [];
    }
  }
  return [];
}

/** 후보 역을 하나도 못 찾으면 참여자 평균 좌표 한 곳을 "대략적인 중간 지점"으로 쓴다. */
function centroidFallback(origins: Origin[], center: LatLng): EngineResult {
  return { stations: [summarizeAt({ kind: "subway", name: APPROXIMATE_NAME, address: null, ...center, lines: [] }, origins)], approximate: true };
}

function summarizeAt(seed: StationSeed, origins: Origin[]): StationResult {
  return summarize(seed, new Map(origins.map((o) => [o.participantId, estimateLeg(o, seed)])));
}

/**
 * 중간 지점 계산. 참여자 평균 좌표 주변 후보 지하철역을 찾고, 후보마다 모든 참여자의
 * 직선거리 기반 이동 시간을 추정해 순위를 매긴다. 후보가 없으면 평균 좌표 폴백(approximate)으로 돌려준다.
 */
export async function computeMidpoint(origins: Origin[], deps: EngineDeps): Promise<EngineResult> {
  const center = centroid(origins);
  const seeds = await searchSeeds(center, deps);
  if (seeds.length === 0) return centroidFallback(origins, center);
  return { stations: rankStations(seeds.map((seed) => summarizeAt(seed, origins))), approximate: false };
}
