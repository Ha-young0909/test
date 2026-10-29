import { describe, expect, it } from "vitest";
import { countByTab, countVotes, filterStations, hasVoted, myRoute, pickWinner, toggleVote } from "./logic";
import { MOCK_STATIONS, MOCK_VOTES } from "./mock";
import type { StationCardData, VoteMark } from "./types";

describe("filterStations", () => {
  it("전체 탭은 모든 역을 순위 순으로 준다", () => {
    const shuffled = [...MOCK_STATIONS].reverse();
    expect(filterStations(shuffled, "all").map((s) => s.rank)).toEqual([1, 2, 3, 4, 5]);
  });
  it("지하철·버스 탭은 해당 종류만 준다", () => {
    expect(filterStations(MOCK_STATIONS, "subway").every((s) => s.kind === "subway")).toBe(true);
    expect(filterStations(MOCK_STATIONS, "bus").every((s) => s.kind === "bus")).toBe(true);
  });
});

describe("countByTab", () => {
  it("탭별 개수를 센다", () => expect(countByTab(MOCK_STATIONS)).toEqual({ all: 5, subway: 3, bus: 2 }));
});

describe("toggleVote", () => {
  it("안 찍은 역은 표를 추가한다", () => {
    const next = toggleVote([], "p1", "s1");
    expect(next).toEqual([{ participantId: "p1", candidateId: "s1" }]);
  });
  it("이미 찍은 역을 다시 누르면 내 표만 취소한다", () => {
    const votes: VoteMark[] = [
      { participantId: "p1", candidateId: "s1" },
      { participantId: "p2", candidateId: "s1" },
    ];
    expect(toggleVote(votes, "p1", "s1")).toEqual([{ participantId: "p2", candidateId: "s1" }]);
  });
  it("여러 역에 중복 투표할 수 있다", () => {
    const votes = toggleVote(toggleVote([], "p1", "s1"), "p1", "s2");
    expect(hasVoted(votes, "p1", "s1")).toBe(true);
    expect(hasVoted(votes, "p1", "s2")).toBe(true);
  });
  it("원본 배열을 바꾸지 않는다", () => {
    const votes: VoteMark[] = [];
    toggleVote(votes, "p1", "s1");
    expect(votes).toEqual([]);
  });
});

describe("countVotes", () => {
  it("역별 득표 수를 센다", () => {
    const counts = countVotes(MOCK_VOTES);
    expect(counts["st-1"]).toBe(2);
    expect(counts["st-3"]).toBe(1);
  });
});

describe("myRoute", () => {
  it("내 경로를 찾는다", () => expect(myRoute(MOCK_STATIONS[0], "me")?.minutes).toBe(24));
  it("참여자 ID가 없으면 null", () => expect(myRoute(MOCK_STATIONS[0], null)).toBeNull());
});

describe("pickWinner", () => {
  const a = { ...MOCK_STATIONS[0], id: "a", rank: 1 } as StationCardData;
  const b = { ...MOCK_STATIONS[1], id: "b", rank: 2 } as StationCardData;

  it("득표가 가장 많은 역을 고른다", () => {
    const votes: VoteMark[] = [
      { participantId: "p1", candidateId: "b" },
      { participantId: "p2", candidateId: "b" },
      { participantId: "p1", candidateId: "a" },
    ];
    expect(pickWinner([a, b], votes)?.id).toBe("b");
  });
  it("동률이면 순위가 높은 역을 고른다", () => {
    const votes: VoteMark[] = [
      { participantId: "p1", candidateId: "b" },
      { participantId: "p2", candidateId: "a" },
    ];
    expect(pickWinner([b, a], votes)?.id).toBe("a");
  });
  it("표가 없으면 1순위, 후보가 없으면 null", () => {
    expect(pickWinner([b, a], [])?.id).toBe("a");
    expect(pickWinner([], [])).toBeNull();
  });
});
