import { distanceM, walkMinutes, type LatLng } from "./geo";
import type { Leg, StationSeed } from "./rank";

const BASE = "https://api.odsay.com/v1/api";

/** ODsay 호출 실패(키 오류·한도 초과·네트워크 등). 잡히면 평균 좌표 폴백으로 넘어간다. */
export class OdsayError extends Error {}

export interface OdsayConfig {
  apiKey: string;
  /** 웹 플랫폼 키는 ODsay 콘솔에 등록한 URL 과 같은 Origin 헤더가 있어야 인증된다. */
  origin: string;
}

interface OdsayErrorBody {
  code?: string | number;
  msg?: string;
  message?: string;
}

async function call(path: string, params: Record<string, string>, config: OdsayConfig): Promise<Record<string, unknown>> {
  const query = new URLSearchParams({ ...params, apiKey: config.apiKey });
  let res: Response;
  try {
    res = await fetch(`${BASE}/${path}?${query}`, {
      headers: { Origin: config.origin, Referer: config.origin },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    throw new OdsayError(`odsay ${path} 요청 실패: ${err instanceof Error ? err.message : err}`);
  }
  if (!res.ok) throw new OdsayError(`odsay ${path} ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

/** 오류 본문은 객체이기도 배열이기도 하다. 없으면 null. */
export function readError(body: Record<string, unknown>): OdsayErrorBody | null {
  const raw = body.error;
  const first = Array.isArray(raw) ? raw[0] : raw;
  return first && typeof first === "object" ? (first as OdsayErrorBody) : null;
}

// ---- 주변 버스 정류장 ----

interface OdsayStationDoc {
  stationName?: string;
  x?: number;
  y?: number;
}

/** 이름이 같은 정류장(상·하행)은 중심에 가까운 한 곳만 남긴다. */
export function toBusSeeds(docs: OdsayStationDoc[], center: LatLng): StationSeed[] {
  const byName = new Map<string, StationSeed>();
  for (const doc of docs) {
    const name = doc.stationName?.trim();
    if (!name || !Number.isFinite(doc.x) || !Number.isFinite(doc.y)) continue;
    const seed: StationSeed = { kind: "bus", name, address: null, lat: doc.y as number, lng: doc.x as number, lines: [] };
    const prev = byName.get(name);
    if (!prev || distanceM(center, seed) < distanceM(center, prev)) byName.set(name, seed);
  }
  return [...byName.values()].sort((a, b) => distanceM(center, a) - distanceM(center, b));
}

/** 중심 좌표 반경 안의 버스 정류장 (ODsay pointSearch, stationClass=1), 가까운 순. */
export async function findBusStops(center: LatLng, radiusM: number, config: OdsayConfig): Promise<StationSeed[]> {
  const body = await call(
    "pointSearch",
    { x: String(center.lng), y: String(center.lat), radius: String(Math.min(radiusM, 5000)), stationClass: "1" },
    config,
  );
  const error = readError(body);
  if (error) {
    // 반경 안에 정류장이 없을 때도 오류로 오므로 빈 목록으로 본다.
    if (String(error.code) === "-99") return [];
    throw new OdsayError(`odsay pointSearch ${error.code}: ${error.msg ?? error.message}`);
  }
  const result = body.result as { station?: OdsayStationDoc[] } | undefined;
  return toBusSeeds(result?.station ?? [], center);
}

// ---- 길찾기 ----

interface SubPath {
  trafficType: number;
  lane?: { name?: string; busNo?: string }[];
}
interface PathDoc {
  info?: { totalTime?: number };
  subPath?: SubPath[];
}

/** 탑승 구간만 이어 붙인 노선 문자열. 도보뿐이면 '도보'. */
export function describeRoute(subPath: SubPath[]): string {
  const parts = subPath.flatMap((leg) => {
    const lane = leg.lane?.[0];
    if (leg.trafficType === 1 && lane?.name) return [lane.name.replace(/^수도권\s*/, "")];
    if (leg.trafficType === 2 && lane?.busNo) return [`${lane.busNo}번`];
    return [];
  });
  return parts.length > 0 ? parts.join(" → ") : "도보";
}

/** 후보 경로 중 가장 빠른 것의 시간과 노선. 경로가 없으면 null. */
export function pickFastest(paths: PathDoc[]): Leg | null {
  let best: Leg | null = null;
  for (const path of paths) {
    const minutes = path.info?.totalTime;
    if (typeof minutes !== "number" || !Number.isFinite(minutes)) continue;
    if (!best || minutes < best.minutes) best = { minutes, route: describeRoute(path.subPath ?? []) };
  }
  return best;
}

/**
 * 출발지 → 후보 역 대중교통 이동 시간과 노선 (ODsay searchPubTransPathT).
 * 700m 이내(-98)는 도보로 계산하고, 경로 없음(-99·-8)은 null, 그 밖의 오류는 OdsayError.
 */
export async function getTransitLeg(from: LatLng, to: LatLng, config: OdsayConfig): Promise<Leg | null> {
  const body = await call(
    "searchPubTransPathT",
    { SX: String(from.lng), SY: String(from.lat), EX: String(to.lng), EY: String(to.lat) },
    config,
  );
  const error = readError(body);
  if (error) {
    const code = String(error.code);
    if (code === "-98") return { minutes: walkMinutes(distanceM(from, to)), route: "도보" };
    if (code === "-99" || code === "-8") return null;
    throw new OdsayError(`odsay searchPubTransPathT ${code}: ${error.msg ?? error.message}`);
  }
  const result = body.result as { path?: PathDoc[] } | undefined;
  return pickFastest(result?.path ?? []);
}
