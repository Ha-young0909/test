import { describe, expect, it } from "vitest";
import { rankStations, summarize, type Leg, type StationSeed } from "./rank";

const seed = (name: string): StationSeed => ({ kind: "subway", name, address: null, lat: 37.5, lng: 127, lines: [] });
const legs = (...minutes: number[]) => new Map<string, Leg>(minutes.map((m, i) => [`p${i}`, { minutes: m, route: "2호선" }]));

describe("summarize", () => {
  it("최장·평균 시간과 참여자별 노선을 계산한다", () => {
    const s = summarize(seed("강남"), legs(30, 50, 40));
    expect(s.maxMinutes).toBe(50);
    expect(s.avgMinutes).toBe(40);
    expect(s.over90).toBe(false);
    expect(s.routes).toEqual([
      { participantId: "p0", route: "2호선", minutes: 30 },
      { participantId: "p1", route: "2호선", minutes: 50 },
      { participantId: "p2", route: "2호선", minutes: 40 },
    ]);
  });

  it("90분은 경고하지 않고 91분부터 경고한다", () => {
    expect(summarize(seed("a"), legs(90, 10)).over90).toBe(false);
    expect(summarize(seed("a"), legs(91, 10)).over90).toBe(true);
  });
});

describe("rankStations", () => {
  it("평균이 낮아도 최장 시간이 짧은 후보가 1순위다", () => {
    const a = summarize(seed("A"), legs(10, 70)); // max 70, avg 40
    const b = summarize(seed("B"), legs(45, 50)); // max 50, avg 48
    expect(rankStations([a, b]).map((s) => s.name)).toEqual(["B", "A"]);
  });

  it("최장 시간이 같으면 평균이 낮은 후보가 앞선다", () => {
    const a = summarize(seed("A"), legs(50, 50));
    const b = summarize(seed("B"), legs(20, 50));
    expect(rankStations([a, b]).map((s) => s.name)).toEqual(["B", "A"]);
  });

  it("동률이면 입력 순서를 유지하고 입력 배열은 바꾸지 않는다", () => {
    const list = [summarize(seed("A"), legs(30, 30)), summarize(seed("B"), legs(30, 30))];
    expect(rankStations(list).map((s) => s.name)).toEqual(["A", "B"]);
    expect(list.map((s) => s.name)).toEqual(["A", "B"]);
  });
});
