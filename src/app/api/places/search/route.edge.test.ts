import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const req = (q: string) =>
  new Request(`http://test/api/places/search?q=${encodeURIComponent(q)}`);

const ok = () =>
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async () => Response.json({ documents: [{ place_name: "홍대입구역", x: "126.9244", y: "37.5572" }] }),
  );

beforeEach(() => vi.stubEnv("KAKAO_REST_API_KEY", "test-key"));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/places/search 경계값", () => {
  it("정확히 2자부터 검색한다", async () => {
    const spy = ok();
    await GET(req("홍대"));
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("공백을 제외하고 2자 미만이면 호출하지 않는다", async () => {
    const spy = ok();
    const res = await GET(req("  가  "));
    expect(await res.json()).toEqual({ results: [] });
    expect(spy).not.toHaveBeenCalled();
  });

  it("q 파라미터가 없어도 빈 결과", async () => {
    const spy = ok();
    const res = await GET(new Request("http://test/api/places/search"));
    expect(await res.json()).toEqual({ results: [] });
    expect(spy).not.toHaveBeenCalled();
  });

  it("100자는 허용하고 101자는 400", async () => {
    const spy = ok();
    expect((await GET(req("가".repeat(100)))).status).toBe(200);
    expect((await GET(req("가".repeat(101)))).status).toBe(400);
    expect(spy).toHaveBeenCalledTimes(2); // 100자 요청의 키워드·주소 호출만
  });

  it("검색어 앞뒤 공백을 제거해 카카오에 보낸다", async () => {
    const spy = ok();
    await GET(req("  홍대입구역  "));
    const urls = spy.mock.calls.map(([u]) => String(u));
    expect(urls.every((u) => u.includes(`query=${encodeURIComponent("홍대입구역")}&`))).toBe(true);
  });

  it("응답에 API 키가 새어 나가지 않는다", async () => {
    ok();
    const res = await GET(req("홍대입구역"));
    expect(JSON.stringify(await res.json())).not.toContain("test-key");
  });

  it("실패 응답은 내부 오류 내용을 노출하지 않는다", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("secret-internal-detail"));
    const res = await GET(req("홍대입구역"));
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("secret-internal-detail");
  });
});
