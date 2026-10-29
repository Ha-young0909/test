import { describe, expect, it } from "vitest";
import { mergeResults, toPlaceResult } from "./kakao";

describe("toPlaceResult", () => {
  it("x=경도, y=위도로 변환하고 도로명 주소를 우선한다", () => {
    expect(
      toPlaceResult({
        place_name: "강남역",
        address_name: "서울 강남구 역삼동",
        road_address_name: "서울 강남구 강남대로 396",
        x: "127.0276",
        y: "37.4979",
      }),
    ).toEqual({
      name: "강남역",
      address: "서울 강남구 강남대로 396",
      lat: 37.4979,
      lng: 127.0276,
    });
  });

  it("주소 검색 결과는 주소를 이름으로 쓴다", () => {
    const r = toPlaceResult({ address_name: "서울 중구 세종대로 110", x: "126.97", y: "37.56" });
    expect(r?.name).toBe("서울 중구 세종대로 110");
  });

  it("좌표가 없거나 잘못되면 null", () => {
    expect(toPlaceResult({ place_name: "x" })).toBeNull();
    expect(toPlaceResult({ place_name: "x", x: "abc", y: "1" })).toBeNull();
  });
});

describe("mergeResults", () => {
  const a = { name: "A", address: "", lat: 37.1, lng: 127.1 };
  const b = { name: "B", address: "", lat: 37.2, lng: 127.2 };

  it("중복을 제거하고 개수를 제한한다", () => {
    expect(mergeResults([[a, b], [a]], 8)).toEqual([a, b]);
    expect(mergeResults([[a, b]], 1)).toEqual([a]);
  });
});
