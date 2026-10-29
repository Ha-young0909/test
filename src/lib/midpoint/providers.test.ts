import { describe, expect, it } from "vitest";
import { groupStations } from "./kakao";
import { describeRoute, pickFastest, readError, toBusSeeds } from "./odsay";

describe("groupStations (카카오 지하철역)", () => {
  it("환승역의 노선별 문서를 역 하나로 합친다", () => {
    const seeds = groupStations([
      { place_name: "강남역 2호선", category_name: "교통,수송 > 지하철,전철 > 수도권2호선", x: "127.028", y: "37.498" },
      { place_name: "강남역 신분당선", category_name: "교통,수송 > 지하철,전철 > 신분당선", x: "127.0281", y: "37.4967" },
      { place_name: "역삼역 2호선", category_name: "교통,수송 > 지하철,전철 > 수도권2호선", x: "127.036", y: "37.5007" },
    ]);
    expect(seeds.map((s) => [s.name, s.lines])).toEqual([
      ["강남역", ["2호선", "신분당선"]],
      ["역삼역", ["2호선"]],
    ]);
    expect(seeds[0]).toMatchObject({ kind: "subway", lat: 37.498, lng: 127.028 });
  });

  it("좌표가 깨진 문서는 건너뛴다", () => {
    expect(groupStations([{ place_name: "가짜역", x: "abc", y: "37" }, { place_name: "무좌표역" }])).toEqual([]);
  });
});

describe("toBusSeeds (ODsay 정류장)", () => {
  const center = { lat: 37.5, lng: 127 };
  it("같은 이름은 중심에 가까운 쪽 하나만 남기고 가까운 순으로 정렬한다", () => {
    const seeds = toBusSeeds(
      [
        { stationName: "먼정류장", x: 127.01, y: 37.5 },
        { stationName: "강남역", x: 127.002, y: 37.5 },
        { stationName: "강남역", x: 127.0005, y: 37.5 },
      ],
      center,
    );
    expect(seeds.map((s) => [s.name, s.lng])).toEqual([
      ["강남역", 127.0005],
      ["먼정류장", 127.01],
    ]);
    expect(seeds[0].kind).toBe("bus");
  });
});

describe("ODsay 경로 해석", () => {
  it("탑승 구간만 이어 붙인다", () => {
    expect(
      describeRoute([
        { trafficType: 3 },
        { trafficType: 1, lane: [{ name: "수도권 2호선" }] },
        { trafficType: 3 },
        { trafficType: 2, lane: [{ busNo: "472" }] },
      ]),
    ).toBe("2호선 → 472번");
  });

  it("도보뿐이면 '도보'", () => {
    expect(describeRoute([{ trafficType: 3 }])).toBe("도보");
  });

  it("가장 빠른 경로를 고르고, 경로가 없으면 null", () => {
    expect(
      pickFastest([
        { info: { totalTime: 44 }, subPath: [{ trafficType: 2, lane: [{ busNo: "402" }] }] },
        { info: { totalTime: 39 }, subPath: [{ trafficType: 1, lane: [{ name: "수도권 3호선" }] }] },
      ]),
    ).toEqual({ minutes: 39, route: "3호선" });
    expect(pickFastest([])).toBeNull();
  });

  it("오류 본문은 객체와 배열 모두 읽는다", () => {
    expect(readError({ error: { code: "-98", msg: "x" } })?.code).toBe("-98");
    expect(readError({ error: [{ code: "500", message: "y" }] })?.code).toBe("500");
    expect(readError({ result: {} })).toBeNull();
  });
});
