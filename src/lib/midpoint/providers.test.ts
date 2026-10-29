import { describe, expect, it } from "vitest";
import { groupStations } from "./kakao";

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
