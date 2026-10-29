import { beforeEach, describe, expect, it, vi } from "vitest";

const ROOM = "00000000-0000-4000-8000-000000000001";
const room = vi.fn();
const tables: Record<string, unknown> = {};

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: () => ({
    from: (table: string) => ({
      select: () => {
        const q: Record<string, unknown> = {};
        q.eq = () => q;
        q.maybeSingle = room;
        q.then = (res: (v: unknown) => void) => res(tables[table]);
        return q;
      },
    }),
  }),
}));

import { GET } from "./route";

const ctx = { params: Promise.resolve({ id: ROOM }) };
const get = () => GET(new Request("http://test"), ctx);

beforeEach(() => {
  room.mockReset();
  tables.candidates = {
    data: [{ id: "c1", kind: "subway", number: 1, name: "강남역", lat: 37.5, lng: 127, lines: ["2호선"], max_minutes: 30, avg_minutes: 25, over90: false, approximate: true, restaurants: [], spots: [] }],
    error: null,
  };
  tables.travel_times = { data: [{ participant_id: "p1", station_name: "강남역", minutes: 20, route: "2호선" }], error: null };
  tables.votes = { data: [{ participant_id: "p1", candidate_id: "c1" }], error: null };
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/rooms/[id]/vote", () => {
  it("역 카드·표·마감 상태를 한 번에 돌려준다", async () => {
    room.mockResolvedValue({ data: { status: "voting", vote_deadline: null }, error: null });
    const body = await (await get()).json();
    expect(body.stations[0].routes).toEqual([{ participantId: "p1", route: "2호선", minutes: 20 }]);
    expect(body.votes).toEqual([{ participantId: "p1", candidateId: "c1" }]);
    expect(body.closed).toBe(false);
    expect(body.approximate).toBe(true);
    expect(typeof body.serverTime).toBe("string");
  });

  it("마감 시각이 지나면 closed 로 판단한다", async () => {
    room.mockResolvedValue({ data: { status: "voting", vote_deadline: "2020-01-01T00:00:00Z" }, error: null });
    expect((await (await get()).json()).closed).toBe(true);
  });

  it("없는 방이면 404", async () => {
    room.mockResolvedValue({ data: null, error: null });
    expect((await get()).status).toBe(404);
  });
});
