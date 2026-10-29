import { describe, expect, it } from "vitest";
import { toPlaceResult } from "@/app/api/places/search/kakao";
import { isValidCoord } from "@/lib/validate";

// 검색 결과(B)가 출발지 저장 API(A)의 좌표 검증을 통과하는지 확인하는 계약 테스트.
const place = (name: string, x: string, y: string) => toPlaceResult({ place_name: name, x, y })!;

describe("출발지 검색 결과 ↔ 좌표 검증", () => {
  it.each([
    ["서울 홍대입구역", "126.9244", "37.5572"],
    ["부산역", "129.0415", "35.1150"],
    ["제주공항", "126.4930", "33.5113"],
    ["독도", "131.8686", "37.2395"],
    ["마라도", "126.2670", "33.1144"],
  ])("%s 는 저장 가능한 좌표다", (name, x, y) => {
    const p = place(name, x, y);
    expect(isValidCoord(p.lat, p.lng)).toBe(true);
  });

  it("위도·경도가 뒤바뀌면 거부된다 (x=경도, y=위도)", () => {
    expect(isValidCoord(126.9244, 37.5572)).toBe(false);
  });

  it("해외 좌표는 거부된다", () => {
    const tokyo = place("도쿄역", "139.7671", "35.6812");
    expect(isValidCoord(tokyo.lat, tokyo.lng)).toBe(false);
  });

  it("'현재 위치' 선택도 같은 규칙을 따른다", () => {
    expect(isValidCoord(37.5665, 126.978)).toBe(true);
    expect(isValidCoord(0, 0)).toBe(false);
  });
});
