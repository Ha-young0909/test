import { describe, expect, it, vi } from "vitest";
import { errorResponse, readJson, serverError } from "./api";

const post = (body: string) => new Request("http://test", { method: "POST", body });

describe("readJson", () => {
  it("객체 본문을 돌려준다", async () => expect(await readJson(post('{"a":1}'))).toEqual({ a: 1 }));
  it("깨진 JSON·비객체는 null", async () => {
    expect(await readJson(post("{oops"))).toBeNull();
    expect(await readJson(post("123"))).toBeNull();
    expect(await readJson(post("null"))).toBeNull();
  });
});

describe("errorResponse / serverError", () => {
  it("상태 코드와 에러 형태를 맞춘다", async () => {
    const res = errorResponse(409, "중복", "NICKNAME_TAKEN");
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "중복", code: "NICKNAME_TAKEN" });
  });

  it("예기치 못한 오류는 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = serverError(new Error("boom"));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("boom");
  });
});
