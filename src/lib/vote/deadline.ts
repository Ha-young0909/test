import type { RoomStatus } from "@/types";

export const DEADLINE_MINUTES = [30, 60, 180, 1440] as const;
export type DeadlineMinutes = (typeof DEADLINE_MINUTES)[number];

interface RoomClock {
  status: RoomStatus;
  vote_deadline: string | null;
}

export function isDeadlineMinutes(value: unknown): value is DeadlineMinutes {
  return (DEADLINE_MINUTES as readonly unknown[]).includes(value);
}

/**
 * 투표가 막혔는지 판단한다. 서버 시계(now)로 vote_deadline 을 비교하므로
 * 클라이언트 시계와 무관하다. status 가 closed 이거나 마감 시각이 지났으면 마감.
 */
export function isVotingClosed(room: RoomClock, now: Date = new Date()): boolean {
  if (room.status === "closed") return true;
  if (!room.vote_deadline) return false;
  return new Date(room.vote_deadline).getTime() <= now.getTime();
}

/** 마감까지 남은 밀리초. 마감 시각이 없거나 이미 지났으면 null. */
export function remainingMs(room: RoomClock, now: Date = new Date()): number | null {
  if (room.status === "closed" || !room.vote_deadline) return null;
  const left = new Date(room.vote_deadline).getTime() - now.getTime();
  return left > 0 ? left : null;
}

/** 남은 시간을 "1시간 5분", "12분", "1분 미만" 으로 보여준다. */
export function formatRemaining(ms: number): string {
  if (ms < 60_000) return "1분 미만";
  const totalMinutes = Math.ceil(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}일`);
  if (hours) parts.push(`${hours}시간`);
  if (minutes && !days) parts.push(`${minutes}분`);
  return parts.join(" ");
}

export interface DeadlineChange {
  status: RoomStatus;
  vote_deadline: string | null;
}

/** 방장 요청(minutes·closeNow·reopen 중 정확히 하나)을 rooms 갱신값으로 바꾼다. 잘못된 조합이면 null. */
export function resolveDeadlineChange(
  input: { minutes?: unknown; closeNow?: unknown; reopen?: unknown },
  now: Date = new Date(),
): DeadlineChange | null {
  const chosen = [input.minutes !== undefined, input.closeNow === true, input.reopen === true].filter(Boolean);
  if (chosen.length !== 1) return null;
  if (input.closeNow === true) return { status: "closed", vote_deadline: now.toISOString() };
  if (input.reopen === true) return { status: "voting", vote_deadline: null };
  if (!isDeadlineMinutes(input.minutes)) return null;
  return {
    status: "voting",
    vote_deadline: new Date(now.getTime() + input.minutes * 60_000).toISOString(),
  };
}
