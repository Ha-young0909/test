import { beforeEach, describe, expect, it, vi } from "vitest";

const ROOM = "00000000-0000-4000-8000-000000000001";
const HOST = "00000000-0000-4000-8000-0000000000aa";
const P1 = "00000000-0000-4000-8000-0000000000b1";
const P2 = "00000000-0000-4000-8000-0000000000b2";

const tables = {
  room: vi.fn(),
  participants: vi.fn(),
  top: vi.fn(),
  stored: vi.fn(),
  caller: vi.fn(),
};
const upsertCandidates = vi.fn();
const deleteIn = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: () => ({
    from: (table: string) => {
      if (table === "rooms") return { select: () => ({ eq: () => ({ maybeSingle: tables.room }) }) };
      if (table === "participants") {
        return {
          select: (cols: string) =>
            cols === "token"
              ? { eq: () => ({ eq: () => ({ maybeSingle: tables.caller }) }) }
              : { eq: tables.participants },
        };
      }
      return {
        select: (cols: string) =>
          cols === "name"
            ? { eq: () => ({ eq: () => ({ maybeSingle: tables.top }) }) }
            : { eq: tables.stored },
        upsert: upsertCandidates,
        delete: () => ({ in: deleteIn }),
      };
    },
  }),
}));

import { resetLocks } from "@/lib/midpoint/lock";
import { POST } from "./route";

const TOKEN = "00000000-0000-4000-8000-0000000000d1";

const ctx = (id = ROOM) => ({ params: Promise.resolve({ id }) });
const req = (body: unknown) => new Request("http://test", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  resetLocks();
  for (const fn of [...Object.values(tables), upsertCandidates, deleteIn]) fn.mockReset();
  tables.room.mockResolvedValue({ data: { id: ROOM, host_id: HOST }, error: null });
  tables.participants.mockResolvedValue({
    data: [
      { id: P1, origin_lat: 37.5, origin_lng: 126.9 },
      { id: P2, origin_lat: 37.5, origin_lng: 127.1 },
    ],
    error: null,
  });
  tables.caller.mockResolvedValue({ data: { token: TOKEN }, error: null });
  tables.top.mockResolvedValue({ data: { name: "이전역" }, error: null });
  tables.stored.mockResolvedValue({ data: [{ id: "old", kind: "subway", name: "이전역" }], error: null });
  upsertCandidates.mockResolvedValue({ error: null });
  deleteIn.mockResolvedValue({ error: null });
  vi.stubEnv("KAKAO_REST_API_KEY", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/rooms/[id]/midpoint", () => {
  it("호출자 정보가 없거나 형식이 틀리면 400", async () => {
    expect((await POST(req({}), ctx())).status).toBe(400);
    expect((await POST(req({ hostId: "x" }), ctx())).status).toBe(400);
  });

  it("방이 없으면 404, 방장이 아니면 403", async () => {
    tables.room.mockResolvedValueOnce({ data: null, error: null });
    expect((await POST(req({ hostId: HOST }), ctx())).status).toBe(404);
    const res = await POST(req({ hostId: "00000000-0000-4000-8000-0000000000cc" }), ctx());
    expect(res.status).toBe(403);
    expect(upsertCandidates).not.toHaveBeenCalled();
  });

  it("출발지를 입력한 참여자가 2명 미만이면 400", async () => {
    tables.participants.mockResolvedValue({ data: [{ id: P1, origin_lat: 37.5, origin_lng: 127 }, { id: P2, origin_lat: null, origin_lng: null }], error: null });
    const res = await POST(req({ hostId: HOST }), ctx());
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("INVALID_INPUT");
  });

  it("카카오 키가 없으면 평균 좌표 폴백으로 후보를 저장하고 approximate 를 알린다", async () => {
    const res = await POST(req({ hostId: HOST }), ctx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.approximate).toBe(true);
    expect(body.stations).toHaveLength(1);
    expect(body.stations[0]).toMatchObject({ name: "대략적인 중간 지점", lat: 37.5, lng: 127 });
    expect(body.previousTop).toBe("이전역");
    expect(body.topChanged).toBe(true);
    expect(upsertCandidates).toHaveBeenCalledWith(
      [expect.objectContaining({ room_id: ROOM, number: 1, approximate: true, kind: "subway" })],
      { onConflict: "room_id,kind,name" },
    );
    expect(deleteIn).toHaveBeenCalledWith("id", ["old"]); // 후보에서 빠진 이전 1순위만 지운다
  });

  it("카카오에서 찾은 역을 직선거리 추정 시간으로 순위 매겨 저장한다", async () => {
    vi.stubEnv("KAKAO_REST_API_KEY", "test-key");
    const doc = (name: string, x: string) => ({ place_name: `${name} 2호선`, category_name: "교통,수송 > 지하철,전철 > 수도권2호선", x, y: "37.5" });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ documents: [doc("먼역", "127.08"), doc("가운데역", "127.0")] }));
    const body = await (await POST(req({ hostId: HOST }), ctx())).json();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toContain("category_group_code=SW8");
    expect(body.approximate).toBe(false);
    expect(body.stations.map((s: { name: string }) => s.name)).toEqual(["가운데역", "먼역"]);
    expect(body.stations[0].routes.every((r: { route: string }) => r.route === "직선거리 추정")).toBe(true);
    expect(upsertCandidates.mock.calls[0][0][0]).toMatchObject({ number: 1, name: "가운데역", approximate: false });
    fetchSpy.mockRestore();
  });

  it("처음 계산이면 topChanged 가 false", async () => {
    tables.top.mockResolvedValue({ data: null, error: null });
    tables.stored.mockResolvedValue({ data: [], error: null });
    const body = await (await POST(req({ hostId: HOST }), ctx())).json();
    expect(body.topChanged).toBe(false);
    expect(body.previousTop).toBeNull();
    expect(deleteIn).not.toHaveBeenCalled();
  });

  it("참여자도 자기 토큰으로 호출할 수 있다", async () => {
    const res = await POST(req({ participantId: P1, participantToken: TOKEN }), ctx());
    expect(res.status).toBe(200);
  });

  it("참여자 토큰이 다르거나 방의 참여자가 아니면 403", async () => {
    const other = "00000000-0000-4000-8000-0000000000d2";
    expect((await POST(req({ participantId: P1, participantToken: other }), ctx())).status).toBe(403);
    tables.caller.mockResolvedValueOnce({ data: null, error: null });
    expect((await POST(req({ participantId: P1, participantToken: TOKEN }), ctx())).status).toBe(403);
    expect(upsertCandidates).not.toHaveBeenCalled();
  });

  it("쿨다운 안에 다시 호출하면 429 와 Retry-After", async () => {
    expect((await POST(req({ hostId: HOST }), ctx())).status).toBe(200);
    const res = await POST(req({ hostId: HOST }), ctx());
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).not.toBeNull();
    expect((await res.json()).code).toBe("RATE_LIMITED");
  });

  it("실패해도 잠금이 풀린다", async () => {
    tables.top.mockRejectedValueOnce(new Error("db down"));
    const failed = await POST(req({ hostId: HOST }), ctx());
    expect(failed.status).toBe(500);
    expect((await failed.json()).error).not.toContain("db down");
    expect((await POST(req({ hostId: HOST }), ctx())).status).not.toBe(500);
  });
});
