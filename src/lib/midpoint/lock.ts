// 방별 동시 실행 방지와 쿨다운. 서버리스 인스턴스마다 따로 동작하는 최선 노력 장치다.
// 카카오 호출을 아끼고, 같은 방의 계산이 겹쳐 후보 저장이 엉키는 일을 줄인다.
export const COOLDOWN_MS = 2000;

const rooms = new Map<string, { running: boolean; finishedAt: number }>();

/** 계산을 시작할 수 있으면 null, 아니면 기다려야 하는 초를 돌려준다. */
export function acquireRoom(roomId: string, now = Date.now()): number | null {
  const state = rooms.get(roomId);
  if (state?.running) return 1;
  if (state && now - state.finishedAt < COOLDOWN_MS) {
    return Math.ceil((COOLDOWN_MS - (now - state.finishedAt)) / 1000);
  }
  rooms.set(roomId, { running: true, finishedAt: state?.finishedAt ?? 0 });
  return null;
}

export function releaseRoom(roomId: string, now = Date.now()) {
  rooms.set(roomId, { running: false, finishedAt: now });
  if (rooms.size > 500) {
    for (const [key, v] of rooms) if (!v.running && now - v.finishedAt > COOLDOWN_MS) rooms.delete(key);
  }
}

/** 테스트용: 모든 방 상태를 지운다. */
export function resetLocks() {
  rooms.clear();
}
