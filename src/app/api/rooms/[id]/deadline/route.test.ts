import { beforeEach, describe, expect, it, vi } from "vitest";

const ROOM = "00000000-0000-4000-8000-000000000001";
const HOST = "00000000-0000-4000-8000-0000000000aa";

const selectResult = vi.fn();
const update = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: () => ({
    from: () => ({
      update: (v: unknown) => {
        update(v);
        return { eq: () => ({ eq: () => ({ select: selectResult }) }) };
      },
    }),
  }),
}));

import { POST } from "./route";

const ctx = { params: Promise.resolve({ id: ROOM }) };
const req = (body: unknown) => new Request("http://test", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  selectResult.mockReset();
  update.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/rooms/[id]/deadline", () => {
  it("분 단위로 마감 시각을 설정한다", async () => {
    selectResult.mockResolvedValue({ data: [{ status: "voting", vote_deadline: "2026-10-30T13:00:00Z" }], error: null });
    const res = await POST(req({ hostId: HOST, minutes: 60 }), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ voteDeadline: "2026-10-30T13:00:00Z", status: "voting" });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "voting" }));
  });

  it("즉시 마감하면 closed 로 바꾼다", async () => {
    selectResult.mockResolvedValue({ data: [{ status: "closed", vote_deadline: "x" }], error: null });
    await POST(req({ hostId: HOST, closeNow: true }), ctx);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "closed" }));
  });

  it("다시 열면 마감 시각을 비운다", async () => {
    selectResult.mockResolvedValue({ data: [{ status: "voting", vote_deadline: null }], error: null });
    await POST(req({ hostId: HOST, reopen: true }), ctx);
    expect(update).toHaveBeenCalledWith({ status: "voting", vote_deadline: null });
  });

  it("방장이 아니면 403", async () => {
    selectResult.mockResolvedValue({ data: [], error: null });
    expect((await POST(req({ hostId: HOST, closeNow: true }), ctx)).status).toBe(403);
  });

  it("허용되지 않은 분이나 빈 요청은 400 이며 DB 를 건드리지 않는다", async () => {
    expect((await POST(req({ hostId: HOST, minutes: 45 }), ctx)).status).toBe(400);
    expect((await POST(req({ hostId: HOST }), ctx)).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
});
