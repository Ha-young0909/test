export interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface KakaoDocument {
  place_name?: string;
  address_name?: string;
  road_address_name?: string;
  road_address?: { address_name?: string } | null;
  x?: string;
  y?: string;
}

// 카카오 응답은 x=경도, y=위도 문자열이다.
export function toPlaceResult(doc: KakaoDocument): PlaceResult | null {
  const lat = Number(doc.y);
  const lng = Number(doc.x);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !doc.y || !doc.x) {
    return null;
  }
  const address =
    doc.road_address_name || doc.road_address?.address_name || doc.address_name || "";
  const name = doc.place_name || address;
  if (!name) return null;
  return { name, address, lat, lng };
}

// 키워드 결과를 우선하고, 같은 좌표·이름 중복은 제거한다.
export function mergeResults(
  lists: PlaceResult[][],
  limit: number,
): PlaceResult[] {
  const seen = new Set<string>();
  const merged: PlaceResult[] = [];
  for (const place of lists.flat()) {
    const key = `${place.name}|${place.lat.toFixed(5)}|${place.lng.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(place);
    if (merged.length >= limit) break;
  }
  return merged;
}

const BASE = "https://dapi.kakao.com/v2/local/search";

export async function searchKakao(
  kind: "keyword" | "address",
  query: string,
  apiKey: string,
): Promise<PlaceResult[]> {
  const url = `${BASE}/${kind}.json?query=${encodeURIComponent(query)}&size=8`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`kakao ${kind} ${res.status}`);
  const body = (await res.json()) as { documents?: KakaoDocument[] };
  return (body.documents ?? [])
    .map(toPlaceResult)
    .filter((p): p is PlaceResult => p !== null);
}
