import type { ApiError, MidpointRequest, MidpointResponse } from "@/types";

const MAX_TRIES = 3;
const MAX_WAIT_MS = 5000;

interface Deps {
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * 중간 지점 계산을 요청한다. 같은 방 계산과 겹치면 서버가 429 와 Retry-After 를 주므로
 * 그만큼 기다렸다가 몇 번 다시 시도한다. 끝내 실패하면 throw 한다.
 */
export async function requestMidpoint(
  roomId: string,
  creds: MidpointRequest,
  { fetchFn = fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }: Deps = {},
): Promise<MidpointResponse> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetchFn(`/api/rooms/${roomId}/midpoint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creds),
    });
    if (res.status === 429 && attempt < MAX_TRIES) {
      const seconds = Number(res.headers.get("Retry-After"));
      await sleep(Math.min(Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 1000, MAX_WAIT_MS));
      continue;
    }
    const data: MidpointResponse | ApiError = await res.json();
    if (!res.ok || "error" in data) {
      throw new Error("error" in data ? data.error : "중간 지점을 찾지 못했습니다.");
    }
    return data;
  }
}

/** 1순위 후보가 바뀌었을 때의 안내 문구. 처음 생겼거나 그대로면 null. */
export function describeTopChange(previousTop: string | null, nextTop: string | null): string | null {
  if (!previousTop || !nextTop || previousTop === nextTop) return null;
  return `1순위가 ${nextTop}(으)로 바뀌었어요`;
}
