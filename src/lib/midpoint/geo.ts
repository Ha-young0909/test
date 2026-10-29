export interface LatLng {
  lat: number;
  lng: number;
}

/** 좌표들의 평균 (한국 범위에서는 단순 평균으로 충분하다). */
export function centroid(points: LatLng[]): LatLng {
  const n = points.length;
  return {
    lat: points.reduce((sum, p) => sum + p.lat, 0) / n,
    lng: points.reduce((sum, p) => sum + p.lng, 0) / n,
  };
}

/** 두 좌표 사이의 직선거리(m). */
export function distanceM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 도보 시간(분). 시속 약 4km. */
export function walkMinutes(meters: number): number {
  return Math.max(1, Math.ceil(meters / 67));
}

/** 직선거리로 추정한 대중교통 이동 시간(분): 우회율 1.4, 시속 24km, 대기·환승 10분. */
export function estimateTransitMinutes(meters: number): number {
  return Math.round((meters * 1.4) / 400 + 10);
}
