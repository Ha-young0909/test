import { describe, expect, it } from "vitest";
import { formatRemaining, isVotingClosed, remainingMs, resolveDeadlineChange } from "./deadline";

const NOW = new Date("2026-10-30T12:00:00.000Z");
const at = (min: number) => new Date(NOW.getTime() + min * 60_000).toISOString();

describe("isVotingClosed", () => {
  it("마감 시각이 없으면 열려 있다", () => {
    expect(isVotingClosed({ status: "voting", vote_deadline: null }, NOW)).toBe(false);
  });
  it("마감 시각 전이면 열려 있고 이후면 닫힌다", () => {
    expect(isVotingClosed({ status: "voting", vote_deadline: at(1) }, NOW)).toBe(false);
    expect(isVotingClosed({ status: "voting", vote_deadline: at(0) }, NOW)).toBe(true);
    expect(isVotingClosed({ status: "voting", vote_deadline: at(-1) }, NOW)).toBe(true);
  });
  it("status 가 closed 면 마감 시각과 무관하게 닫힌다", () => {
    expect(isVotingClosed({ status: "closed", vote_deadline: at(60) }, NOW)).toBe(true);
  });
});

describe("remainingMs / formatRemaining", () => {
  it("남은 시간을 계산하고 마감 후에는 null", () => {
    expect(remainingMs({ status: "voting", vote_deadline: at(30) }, NOW)).toBe(30 * 60_000);
    expect(remainingMs({ status: "voting", vote_deadline: at(-5) }, NOW)).toBeNull();
    expect(remainingMs({ status: "closed", vote_deadline: at(30) }, NOW)).toBeNull();
  });
  it("보기 좋게 표시한다", () => {
    expect(formatRemaining(10_000)).toBe("1분 미만");
    expect(formatRemaining(12 * 60_000)).toBe("12분");
    expect(formatRemaining(65 * 60_000)).toBe("1시간 5분");
    expect(formatRemaining(3 * 60 * 60_000)).toBe("3시간");
    expect(formatRemaining(1440 * 60_000)).toBe("1일");
  });
});

describe("resolveDeadlineChange", () => {
  it("분 단위 마감 설정", () => {
    expect(resolveDeadlineChange({ minutes: 60 }, NOW)).toEqual({ status: "voting", vote_deadline: at(60) });
  });
  it("즉시 마감", () => {
    expect(resolveDeadlineChange({ closeNow: true }, NOW)).toEqual({ status: "closed", vote_deadline: NOW.toISOString() });
  });
  it("다시 열기", () => {
    expect(resolveDeadlineChange({ reopen: true }, NOW)).toEqual({ status: "voting", vote_deadline: null });
  });
  it("허용되지 않은 분·빈 요청·중복 지정은 거부", () => {
    expect(resolveDeadlineChange({ minutes: 45 }, NOW)).toBeNull();
    expect(resolveDeadlineChange({}, NOW)).toBeNull();
    expect(resolveDeadlineChange({ minutes: 30, closeNow: true }, NOW)).toBeNull();
  });
});
