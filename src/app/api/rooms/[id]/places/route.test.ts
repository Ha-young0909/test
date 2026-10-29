import { beforeEach, describe, expect, it, vi } from "vitest";

const ROOM = "00000000-0000-4000-8000-000000000001";
const HOST = "00000000-0000-4000-8000-0000000000aa";

const roomRow = vi.fn();
const candidatesRows = vi.fn();
const updateSingle = vi.fn();
const update = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: () => ({
    from: (table: string) => {
      if (table === "rooms") {
        const q: Record<string, unknown> = {};
        q.select = () => q;
        q.eq = () => q;
        q.maybeSingle = roomRow;
        return q;
      }
      return {
        select: () => ({ eq: candidatesRows }),
        update: (v: unknown) => {
          update(v);
          return { eq: () => ({ select: () => ({ single: updateSingle }) }) };
        },
      };
    },
  }),
}));

import { POST } from "./route";

const ctx = { params: Promise.resolve({ id: ROOM }) };
const req = (body: unknown) => new Request("http://test", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  for (const fn of [roomRow, candidatesRows, updateSingle, update]) fn.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/rooms/[id]/places", () => {
  it("방장이 아니면 403", async () => {
    roomRow.mockResolvedValue({ data: null, error: null });
    expect((await POST(req({ hostId: HOST }), ctx)).status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("비어 있는 후보 역만 채운다", async () => {
    roomRow.mockResolvedValue({ data: { id: ROOM }, error: null });
    candidatesRows.mockResolvedValue({
      data: [
        { id: "a", name: "강남역", kind: "subway", restaurants: [], spots: [] },
        { id: "b", name: "홍대입구역", kind: "subway", restaurants: [{ name: "x" }], spots: [] },
      ],
      error: null,
    });
    updateSingle.mockResolvedValue({ data: { id: "a", restaurants: [1, 2], spots: [1, 2] }, error: null });
    const res = await POST(req({ hostId: HOST }), ctx);
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledTimes(1);
    expect((await res.json()).candidates).toHaveLength(2);
  });

  it("hostId 가 없으면 400", async () => {
    expect((await POST(req({}), ctx)).status).toBe(400);
  });
});
