import { distanceM, type LatLng } from "./geo";
import type { StationSeed } from "./rank";

interface KakaoStationDoc {
  place_name?: string;
  category_name?: string;
  road_address_name?: string;
  address_name?: string;
  x?: string;
  y?: string;
}

/** '교통,수송 > 지하철,전철 > 수도권2호선' → '2호선' */
function lineFromCategory(category: string | undefined): string | null {
  const last = category?.split(">").pop()?.trim();
  if (!last) return null;
  const line = last.replace(/^수도권/, "").trim();
  return line && line !== "지하철,전철" ? line : null;
}

/**
 * 카카오 지하철역 문서를 역 단위로 묶는다. 환승역은 노선마다 문서가 따로 오므로
 * '강남역 2호선' · '강남역 신분당선' 을 이름 '강남역', 노선 ['2호선', '신분당선'] 한 곳으로 합친다.
 * 입력은 가까운 순이라고 가정하고 그 순서를 유지한다.
 */
export function groupStations(docs: KakaoStationDoc[]): StationSeed[] {
  const byName = new Map<string, StationSeed>();
  for (const doc of docs) {
    const lat = Number(doc.y);
    const lng = Number(doc.x);
    const full = doc.place_name?.trim();
    if (!full || !doc.x || !doc.y || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const name = full.split(/\s+/)[0];
    const line = lineFromCategory(doc.category_name);
    const found = byName.get(name);
    if (found) {
      if (line && !found.lines.includes(line)) found.lines.push(line);
      continue;
    }
    byName.set(name, {
      kind: "subway",
      name,
      address: doc.road_address_name || doc.address_name || null,
      lat,
      lng,
      lines: line ? [line] : [],
    });
  }
  return [...byName.values()];
}

const CATEGORY_URL = "https://dapi.kakao.com/v2/local/search/category.json";

/** 중심 좌표 반경 안의 지하철역 (카카오 카테고리 SW8), 가까운 순. */
export async function findSubwayStations(center: LatLng, radiusM: number, apiKey: string): Promise<StationSeed[]> {
  const params = new URLSearchParams({
    category_group_code: "SW8",
    x: String(center.lng),
    y: String(center.lat),
    radius: String(Math.min(radiusM, 20000)),
    sort: "distance",
    size: "15",
  });
  const res = await fetch(`${CATEGORY_URL}?${params}`, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`kakao category ${res.status}`);
  const body = (await res.json()) as { documents?: KakaoStationDoc[] };
  return groupStations(body.documents ?? []).sort(
    (a, b) => distanceM(center, a) - distanceM(center, b),
  );
}
