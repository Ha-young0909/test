import { GROUP_NAME_MAX_LENGTH, NICKNAME_MAX_LENGTH } from "@/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** 앞뒤 공백을 제거한 닉네임을 돌려주고, 규칙에 맞지 않으면 null. */
export function normalizeNickname(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const nickname = value.trim();
  if (nickname.length < 1 || nickname.length > NICKNAME_MAX_LENGTH) return null;
  return nickname;
}

/** 대한민국 범위 안의 좌표인지 확인한다 (잘못된 입력 차단용으로 느슨하게). */
export function isValidCoord(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 33 &&
    lat <= 39 &&
    lng >= 124 &&
    lng <= 132
  );
}

/** 앞뒤 공백을 제거한 모임 이름을 돌려주고, 규칙에 맞지 않으면 null. */
export function normalizeGroupName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (name.length < 1 || name.length > GROUP_NAME_MAX_LENGTH) return null;
  return name;
}
