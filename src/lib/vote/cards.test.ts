import { describe, expect, it } from "vitest";
import { buildStationCards } from "./cards";

const cand = (over: object = {}) => ({
  id: "c1", kind: "subway" as const, number: 2, name: "강남역", lat: 37.5, lng: 127,
  lines: ["2호선"], max_minutes: 30, avg_minutes: 25, over90: false, restaurants: [], spots: [], ...over,
});

describe("buildStationCards", () => {
  it("번호 순으로 정렬하고 번호를 순위로 쓴다", () => {
    const cards = buildStationCards([cand({ id: "b", number: 2 }), cand({ id: "a", number: 1, name: "홍대입구역" })], []);
    expect(cards.map((c) => [c.id, c.rank])).toEqual([["a", 1], ["b", 2]]);
  });
  it("역 이름이 같은 이동 시간만 내 경로로 붙인다", () => {
    const [card] = buildStationCards([cand()], [
      { participant_id: "p1", station_name: "강남역", minutes: 20, route: "2호선" },
      { participant_id: "p1", station_name: "홍대입구역", minutes: 10, route: "2호선" },
    ]);
    expect(card.routes).toEqual([{ participantId: "p1", route: "2호선", minutes: 20 }]);
  });
  it("맛집·갈만한 곳의 category 를 type 으로, 별점 없으면 null", () => {
    const [card] = buildStationCards(
      [cand({ restaurants: [{ name: "국밥", category: "한식", rating: 4.2, walkMinutes: 3 }], spots: [{ name: "공원", category: "공원", walkMinutes: 5 }] })],
      [],
    );
    expect(card.restaurants[0]).toEqual({ name: "국밥", type: "한식", rating: 4.2, walkMinutes: 3 });
    expect(card.spots[0].rating).toBeNull();
  });
});
