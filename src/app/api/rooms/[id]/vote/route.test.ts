import { beforeEach, describe, expect, it, vi } from "vitest";

const ROOM = "00000000-0000-4000-8000-000000000001";
const PID = "00000000-0000-4000-8000-0000000000bb";
const TOKEN = "00000000-0000-4000-8000-0000000000cc";
const CAND = "00000000-0000-4000-8000-0000000000dd";

const me = vi.fn();
const room = vi.fn();
const candidate = vi.fn();
const upsert = vi.fn();
const deleteLast = vi.fn();

const chain = (last: unknown) => {
  const q: Record<string, unknown> = {};
  q.eq = () => q;
  q.select = () => q;
  q.maybeSingle = last;
  return q;
};

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: () => ({
    from: (table: string) => {
      if (table === "participants") return { select: () => chain(me) };
      if (table === "rooms") return { select: () => chain(room) };
      if (table === "candidates") return { select: () => chain(candidate) };
      return {
        upsert,
        delete: () => {
          const q: Record<string, unknown> = {};
          q.eq = () => q;
          q.then = (res: (v: unknown) => void) => res(deleteLast());
          return q;
        },
      };
    },
  }),
}));

import { POST } from "./route";

const ctx = { params: Promise.resolve({ id: ROOM }) };
const req = (body: unknown) => new Request("http://test", { method: "POST", body: JSON.stringify(body) });
const valid = { participantId: PID, participantToken: TOKEN, candidateId: CAND, on: true };

beforeEach(() => {
  for (const fn of [me, room, candidate, upsert, deleteLast]) fn.mockReset();
  me.mockResolvedValue({ data: { id: PID }, error: null });
  room.mockResolvedValue({ data: { status: "voting", vote_deadline: null }, error: null });
  candidate.mockResolvedValue({ data: { id: CAND }, error: null });
  upsert.mockResolvedValue({ error: null });
  deleteLast.mockReturnValue({ error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/rooms/[id]/vote", () => {
  it("투표하면 votes 에 행을 넣는다", async () => {
    const res = await POST(req(valid), ctx);
    expect(res.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      { participant_id: PID, candidate_id: CAND, room_id: ROOM },
      { onConflict: "participant_id,candidate_id", ignoreDuplicates: true },
    );
  });

  it("on:false 면 내 표를 지운다", async () => {
    const res = await POST(req({ ...valid, on: false }), ctx);
    expect(res.status).toBe(200);
    expect(deleteLast).toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("토큰이 맞지 않으면 403", async () => {
    me.mockResolvedValue({ data: null, error: null });
    expect((await POST(req(valid), ctx)).status).toBe(403);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("마감 시각이 지나면 거부한다", async () => {
    room.mockResolvedValue({ data: { status: "voting", vote_deadline: "2020-01-01T00:00:00Z" }, error: null });
    const res = await POST(req(valid), ctx);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("VOTE_CLOSED");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("closed 상태면 취소도 거부한다", async () => {
    room.mockResolvedValue({ data: { status: "closed", vote_deadline: null }, error: null });
    expect((await POST(req({ ...valid, on: false }), ctx)).status).toBe(409);
    expect(deleteLast).not.toHaveBeenCalled();
  });

  it("다른 방의 후보 역이면 404", async () => {
    candidate.mockResolvedValue({ data: null, error: null });
    expect((await POST(req(valid), ctx)).status).toBe(404);
  });

  it("잘못된 본문은 400", async () => {
    expect((await POST(req({ ...valid, on: "yes" }), ctx)).status).toBe(400);
    expect((await POST(req({ ...valid, candidateId: "x" }), ctx)).status).toBe(400);
  });
});
