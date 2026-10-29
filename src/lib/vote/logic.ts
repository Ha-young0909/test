import type { StationCardData, StationRoute, StationTab, VoteMark } from "./types";

/** 탭에 맞는 역만 순위 순서로 돌려준다. */
export function filterStations(stations: StationCardData[], tab: StationTab): StationCardData[] {
  return stations.filter((s) => tab === "all" || s.kind === tab).sort((a, b) => a.rank - b.rank);
}

/** 탭마다 역 개수 */
export function countByTab(stations: StationCardData[]): Record<StationTab, number> {
  return {
    all: stations.length,
    subway: stations.filter((s) => s.kind === "subway").length,
    bus: stations.filter((s) => s.kind === "bus").length,
  };
}

/** 역별 득표 수 */
export function countVotes(votes: VoteMark[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const v of votes) counts[v.candidateId] = (counts[v.candidateId] ?? 0) + 1;
  return counts;
}

export function hasVoted(votes: VoteMark[], participantId: string, candidateId: string): boolean {
  return votes.some((v) => v.participantId === participantId && v.candidateId === candidateId);
}

/**
 * 투표 누르기: 아직 안 찍은 역이면 표를 추가하고, 이미 찍은 역이면 취소한다.
 * 여러 역에 중복 투표할 수 있다. 원본 배열은 바꾸지 않는다.
 */
export function toggleVote(votes: VoteMark[], participantId: string, candidateId: string): VoteMark[] {
  if (hasVoted(votes, participantId, candidateId)) {
    return votes.filter((v) => !(v.participantId === participantId && v.candidateId === candidateId));
  }
  return [...votes, { participantId, candidateId }];
}

/** 이 역까지 가는 내 경로 (없으면 null) */
export function myRoute(station: StationCardData, participantId: string | null): StationRoute | null {
  if (!participantId) return null;
  return station.routes.find((r) => r.participantId === participantId) ?? null;
}

/**
 * 마감 시 확정할 역: 득표가 가장 많은 역, 동률이면 순위가 높은(숫자가 작은) 역.
 * 후보가 없으면 null.
 */
export function pickWinner(stations: StationCardData[], votes: VoteMark[]): StationCardData | null {
  const counts = countVotes(votes);
  let best: StationCardData | null = null;
  for (const s of stations) {
    if (!best) {
      best = s;
      continue;
    }
    const diff = (counts[s.id] ?? 0) - (counts[best.id] ?? 0);
    if (diff > 0 || (diff === 0 && s.rank < best.rank)) best = s;
  }
  return best;
}
