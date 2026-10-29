import { centroid, distanceM, estimateTransitMinutes, type LatLng } from "./geo";
import { rankStations, summarize, type Leg, type StationResult, type StationSeed } from "./rank";

export const APPROXIMATE_NAME = "대략적인 중간 지점";

const SEARCH_RADII_M = [1500, 3000, 6000];
const MAX_CANDIDATES = 8;

export interface Origin extends LatLng {
  participantId: string;
}

export interface EngineDeps {
  /** 중심 좌표 반경 안의 지하철역, 가까운 순. */
  findSubway(center: LatLng, radiusM: number): Promise<StationSeed[]>;
}

export interface ComputedLeg {
  participantId: string;
  station: StationSeed;
  leg: Leg;
}

export interface EngineResult {
  stations: StationResult[];
  /** 후보 역을 하나도 못 찾아 평균 좌표 한 곳으로 대체했는지. */
  approximate: boolean;
  /** 참여자 × 후보 역 이동 시간. 호출자가 travel_times 에 저장한다. */
  legs: ComputedLeg[];
}

/** 출발지에서 역까지 직선거리로 추정한 이동 시간과 설명. */
export function straightLineLeg(from: LatLng, to: LatLng): Leg {
  const meters = distanceM(from, to);
  return { minutes: estimateTransitMinutes(meters), route: `직선 ${(meters / 1000).toFixed(1)}km` };
}

async function searchSeeds(center: LatLng, deps: EngineDeps): Promise<StationSeed[]> {
  for (const radius of SEARCH_RADII_M) {
    try {
      const seeds = (await deps.findSubway(center, radius)).slice(0, MAX_CANDIDATES);
      if (seeds.length > 0) return seeds;
    } catch (err) {
      console.error("지하철역 검색 실패", err);
      return [];
    }
  }
  return [];
}

/**
 * 중간 지점 계산. 참여자 평균 좌표 주변 지하철역을 찾고(없으면 반경 확대), 후보마다 모든 참여자의
 * 직선거리 기반 이동 시간을 구해 순위를 매긴다. 후보를 못 찾으면 평균 좌표 한 곳(approximate)으로 대체한다.
 */
export async function computeMidpoint(origins: Origin[], deps: EngineDeps): Promise<EngineResult> {
  const center = centroid(origins);
  const found = await searchSeeds(center, deps);
  const approximate = found.length === 0;
  const seeds: StationSeed[] = approximate
    ? [{ kind: "subway", name: APPROXIMATE_NAME, address: null, ...center, lines: [] }]
    : found;

  const legs: ComputedLeg[] = [];
  const stations = seeds.map((seed) => {
    const byPerson = new Map<string, Leg>();
    for (const origin of origins) {
      const leg = straightLineLeg(origin, seed);
      byPerson.set(origin.participantId, leg);
      legs.push({ participantId: origin.participantId, station: seed, leg });
    }
    return summarize(seed, byPerson);
  });
  return { stations: rankStations(stations), approximate, legs: approximate ? [] : legs };
}
