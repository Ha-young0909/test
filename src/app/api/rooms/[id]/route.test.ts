import { beforeEach, describe, expect, it, vi } from "vitest";

const ROOM = "00000000-0000-4000-8000-000000000001";
const HOST = "00000000-0000-4000-8000-0000000000aa";

const select = vi.fn();
const eqHost = vi.fn(() => ({ select }));
const update = vi.fn(() => ({ eq: () => ({ eq: eqHost }) }));
vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: () => ({ from: () => ({ update }) }),
}));

import { PATCH } from "./route";

const ctx = (id = ROOM) => ({ params: Promise.resolve({ id }) });
const req = (body: unknown) =>
  new Request("http://test", { method: "PATCH", body: JSON.stringify(body) });

beforeEach(() => {
  select.mockReset();
  update.mockClear();
  eqHost.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("PATCH /api/rooms/[id] (방장 전용 변경)", () => {
  it("방장이 상태를 voting 으로 바꾼다", async () => {
    select.mockResolvedValue({ data: [{ id: ROOM }], error: null });
    const res = await PATCH(req({ hostId: HOST, status: "voting" }), ctx());
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ status: "voting" });
    expect(eqHost).toHaveBeenCalledWith("host_id", HOST);
  });

  it("방장 토큰이 맞지 않으면(갱신 0행) 403", async () => {
    select.mockResolvedValue({ data: [], error: null });
    const res = await PATCH(req({ hostId: HOST, status: "voting" }), ctx());
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("FORBIDDEN");
  });

  it("hostId 가 없거나 uuid 가 아니면 400", async () => {
    expect((await PATCH(req({ status: "voting" }), ctx())).status).toBe(400);
    expect((await PATCH(req({ hostId: "x", status: "voting" }), ctx())).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("알 수 없는 상태는 400", async () => {
    expect((await PATCH(req({ hostId: HOST, status: "done" }), ctx())).status).toBe(400);
  });

  it("변경할 값이 없으면 400", async () => {
    expect((await PATCH(req({ hostId: HOST }), ctx())).status).toBe(400);
  });

  it("본문이 깨진 JSON 이면 400", async () => {
    const bad = new Request("http://test", { method: "PATCH", body: "{oops" });
    expect((await PATCH(bad, ctx())).status).toBe(400);
  });

  it("DB 오류는 500", async () => {
    select.mockResolvedValue({ data: null, error: new Error("down") });
    expect((await PATCH(req({ hostId: HOST, status: "voting" }), ctx())).status).toBe(500);
  });

  // 문서(CLAUDE.md)에는 있으나 코드·스키마에 아직 없는 항목. 구현되면 테스트로 바꾼다.
  it.todo("status 'closed' 로 즉시 마감하고 다시 열 수 있다");
  it.todo("vote_deadline(30분·1시간·3시간·하루)을 설정한다");
});
