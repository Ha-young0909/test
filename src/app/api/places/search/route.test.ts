import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const req = (q?: string) =>
  new Request(`http://test/api/places/search${q === undefined ? "" : `?q=${encodeURIComponent(q)}`}`);

const doc = (name: string, x = "127.0276", y = "37.4979") => ({
  place_name: name,
  address_name: "서울 강남구",
  x,
  y,
});

function mockKakao(handlers: { keyword?: unknown; address?: unknown }) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    const kind = url.includes("/address.json") ? "address" : "keyword";
    const h = handlers[kind];
    if (h instanceof Error) throw h;
    if (h === undefined) return new Response("{}", { status: 500 });
    return Response.json({ documents: h });
  });
}

beforeEach(() => {
  vi.stubEnv("KAKAO_REST_API_KEY", "test-key");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/places/search", () => {
  it("검색어가 2자 미만이면 카카오를 호출하지 않고 빈 결과", async () => {
    const spy = mockKakao({});
    for (const q of [undefined, "", " ", "a"]) {
      const res = await GET(req(q));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ results: [] });
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it("검색어가 100자를 넘으면 400", async () => {
    expect((await GET(req("가".repeat(101)))).status).toBe(400);
  });

  it("API 키가 없으면 500", async () => {
    vi.stubEnv("KAKAO_REST_API_KEY", "");
    const res = await GET(req("강남역"));
    expect(res.status).toBe(500);
  });

  it("키워드·주소 결과를 합치고 KakaoAK 인증 헤더로 호출한다", async () => {
    const spy = mockKakao({ keyword: [doc("강남역")], address: [doc("강남대로 396", "127.03", "37.50")] });
    const res = await GET(req("강남"));
    const { results } = await res.json();
    expect(results.map((r: { name: string }) => r.name)).toEqual(["강남역", "강남대로 396"]);
    expect(results[0]).toMatchObject({ lat: 37.4979, lng: 127.0276 });
    expect(spy).toHaveBeenCalledTimes(2);
    const init = spy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("KakaoAK test-key");
  });

  it("한쪽 검색만 실패해도 나머지 결과를 돌려준다", async () => {
    mockKakao({ keyword: [doc("강남역")], address: undefined });
    const res = await GET(req("강남역"));
    expect(res.status).toBe(200);
    expect((await res.json()).results).toHaveLength(1);
  });

  it("둘 다 실패하면 502", async () => {
    mockKakao({ keyword: new Error("network"), address: undefined });
    const res = await GET(req("강남역"));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBeTruthy();
  });

  it("좌표가 없는 문서는 걸러내고 최대 8개로 제한한다", async () => {
    const many = Array.from({ length: 10 }, (_, i) => doc(`역${i}`, `127.${i}`, `37.${i}`));
    mockKakao({ keyword: [{ place_name: "좌표없음" }, ...many], address: [] });
    const { results } = await (await GET(req("역삼"))).json();
    expect(results).toHaveLength(8);
    expect(results.some((r: { name: string }) => r.name === "좌표없음")).toBe(false);
  });
});
