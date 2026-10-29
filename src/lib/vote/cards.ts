import type { Candidate, NearbyPlace as DbPlace, TravelTime } from "@/types";
import type { NearbyPlace, StationCardData } from "./types";

type CandidateRow = Pick<
  Candidate,
  "id" | "kind" | "number" | "name" | "lat" | "lng" | "lines" | "max_minutes" | "avg_minutes" | "over90"
> & { restaurants: DbPlace[] | null; spots: DbPlace[] | null };

type TravelRow = Pick<TravelTime, "participant_id" | "station_name" | "minutes" | "route">;

const toPlace = (p: DbPlace & { rating?: number | null }): NearbyPlace => ({
  name: p.name,
  type: p.category,
  rating: p.rating ?? null,
  walkMinutes: p.walkMinutes,
});

/**
 * DB 의 후보 역 행과 이동 시간 캐시를 역 카드 데이터로 바꾼다.
 * 카드 순위(rank)는 지도 핀 번호와 같도록 candidates.number 를 그대로 쓴다.
 */
export function buildStationCards(candidates: CandidateRow[], travelTimes: TravelRow[]): StationCardData[] {
  return candidates
    .map((c) => ({
      id: c.id,
      rank: c.number,
      name: c.name,
      kind: c.kind,
      lines: c.lines ?? [],
      lat: c.lat,
      lng: c.lng,
      avgMinutes: c.avg_minutes ?? 0,
      maxMinutes: c.max_minutes ?? 0,
      over90: c.over90,
      routes: travelTimes
        .filter((t) => t.station_name === c.name)
        .map((t) => ({ participantId: t.participant_id, route: t.route ?? "", minutes: t.minutes })),
      restaurants: (c.restaurants ?? []).map(toPlace),
      spots: (c.spots ?? []).map(toPlace),
    }))
    .sort((a, b) => a.rank - b.rank);
}
