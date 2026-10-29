import type { Participant } from "@/types";

/** 참여자별 출발지 지문. 출발지가 없으면 null. */
export type OriginSnapshot = Map<string, string | null>;

export function snapshotOrigins(participants: Participant[]): OriginSnapshot {
  return new Map(
    participants.map((p) => [
      p.id,
      p.origin_lat !== null && p.origin_lng !== null ? `${p.origin_lat},${p.origin_lng}` : null,
    ]),
  );
}

/** 이전 조회 대비 출발지를 새로 등록·변경한 (내가 아닌) 참여자 닉네임. */
export function findOriginUpdates(
  prev: OriginSnapshot,
  participants: Participant[],
  myId: string | null,
): string[] {
  const next = snapshotOrigins(participants);
  return participants
    .filter((p) => p.id !== myId && next.get(p.id) !== null && prev.has(p.id) && prev.get(p.id) !== next.get(p.id))
    .map((p) => p.nickname);
}
