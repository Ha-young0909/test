import type { StationKind } from "@/types";

export const OVER_LIMIT_MINUTES = 90;

export interface Leg {
  minutes: number;
  /** 이용 노선·버스 (직선거리 추정이면 '직선거리 추정'). */
  route: string;
}

export interface StationSeed {
  kind: StationKind;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  lines: string[];
}

export interface StationResult extends StationSeed {
  maxMinutes: number;
  avgMinutes: number;
  over90: boolean;
  routes: { participantId: string; route: string; minutes: number }[];
}

/** 참여자별 이동 시간으로 후보 한 곳의 최장·평균 시간과 90분 초과 여부를 계산한다. */
export function summarize(seed: StationSeed, legs: Map<string, Leg>): StationResult {
  const routes = [...legs].map(([participantId, leg]) => ({ participantId, route: leg.route, minutes: leg.minutes }));
  const times = routes.map((r) => r.minutes);
  const maxMinutes = Math.max(...times);
  return {
    ...seed,
    maxMinutes,
    avgMinutes: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
    over90: maxMinutes > OVER_LIMIT_MINUTES,
    routes,
  };
}

/** 가장 오래 걸리는 사람의 시간이 짧은 순. 같으면 평균, 그래도 같으면 가까운 순서(입력 순서)를 유지한다. */
export function rankStations(stations: StationResult[]): StationResult[] {
  return [...stations].sort((a, b) => a.maxMinutes - b.maxMinutes || a.avgMinutes - b.avgMinutes);
}
