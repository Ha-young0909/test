import { describe, expect, it } from "vitest";
import { samplePlacesFor } from "./places";

describe("samplePlacesFor", () => {
  it("맛집 2곳과 갈만한 곳 2곳을 만든다", () => {
    const { restaurants, spots } = samplePlacesFor("을지로3가역", "subway");
    expect(restaurants).toHaveLength(2);
    expect(spots).toHaveLength(2);
    for (const r of restaurants) {
      expect(r.rating).toBeGreaterThanOrEqual(3.8);
      expect(r.rating).toBeLessThanOrEqual(4.8);
      expect(r.walkMinutes).toBeGreaterThan(0);
    }
  });
  it("같은 역은 항상 같은 결과다", () => {
    expect(samplePlacesFor("강남역", "subway")).toEqual(samplePlacesFor("강남역", "subway"));
  });
  it("역 이름의 '역'은 장소 이름에서 뺀다", () => {
    expect(samplePlacesFor("강남역", "subway").restaurants[0].name.startsWith("강남 ")).toBe(true);
  });
});
