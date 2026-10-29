import { afterEach, describe, expect, it, vi } from "vitest";
import { mergeResults, searchKakao, toPlaceResult } from "./kakao";

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

describe("searchKakao", () => {
  afterEach(() => vi.restoreAllMocks());

  it("종류별 엔드포인트와 인코딩된 검색어로 호출한다", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ documents: [{ place_name: "A", x: "127", y: "37" }] }));
    const r = await searchKakao("keyword", "홍대 입구", "k");
    expect(r).toEqual([{ name: "A", address: "", lat: 37, lng: 127 }]);
    expect(String(spy.mock.calls[0][0])).toBe(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent("홍대 입구")}&size=8`,
    );
  });

  it("documents가 없으면 빈 배열, HTTP 오류면 예외", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({}));
    expect(await searchKakao("address", "x", "k")).toEqual([]);
    spy.mockResolvedValueOnce(new Response("", { status: 401 }));
    await expect(searchKakao("address", "x", "k")).rejects.toThrow("401");
  });
});

// 실제 카카오 API 스모크 테스트: 키가 있을 때만 실행한다 (.env.local을 불러온 뒤 KAKAO_LIVE=1 npx vitest run kakao).
describe.skipIf(!process.env.KAKAO_LIVE || !process.env.KAKAO_REST_API_KEY)("카카오 실서버", () => {
  it("'강남역' 검색이 서울 좌표를 돌려준다", async () => {
    const r = await searchKakao("keyword", "강남역", process.env.KAKAO_REST_API_KEY!);
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].lat).toBeGreaterThan(37);
    expect(r[0].lat).toBeLessThan(38);
  });
});
