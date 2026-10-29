// 로그인이 없으므로 참여자·방장 ID 를 브라우저(localStorage)에 보관한다.
// localStorage 는 차단되거나 던질 수 있으므로 모든 접근을 감싼다.

const key = (kind: "participant" | "host", roomId: string) => `meetpoint:${kind}:${roomId}`;

function read(k: string): string | null {
  try {
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
}

function write(k: string, value: string) {
  try {
    window.localStorage.setItem(k, value);
  } catch {
    // 저장 실패 시 새로고침하면 다시 가입해야 한다. 흐름은 막지 않는다.
  }
}

export const getParticipantId = (roomId: string) => read(key("participant", roomId));
export const saveParticipantId = (roomId: string, id: string) => write(key("participant", roomId), id);
export const getHostId = (roomId: string) => read(key("host", roomId));
export const saveHostId = (roomId: string, id: string) => write(key("host", roomId), id);
