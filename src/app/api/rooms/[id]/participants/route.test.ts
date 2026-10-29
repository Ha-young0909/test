import { beforeEach, describe, expect, it, vi } from "vitest";

const ROOM = "00000000-0000-4000-8000-000000000001";
const HOST = "00000000-0000-4000-8000-0000000000aa";
const PID = "00000000-0000-4000-8000-0000000000bb";

const maybeSingle = vi.fn();
const single = vi.fn();
const insert = vi.fn(() => ({ select: () => ({ single }) }));
const updateSelect = vi.fn();
const update = vi.fn(() => ({ eq: () => ({ eq: () => ({ select: updateSelect }) }) }));
const deleteEq = vi.fn();
const del = vi.fn(() => ({ eq: deleteEq }));

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: () => ({
    from: (table: string) => {
      if (table === "rooms") {
        return { select: () => ({ eq: () => ({ maybeSingle }) }) };
      }
      if (table === "travel_times") return { delete: del };
      return { insert, update };
    },
  }),
}));

import { PATCH, POST } from "./route";

const ctx = (id = ROOM) => ({ params: Promise.resolve({ id }) });
const req = (method: string, body: unknown) =>
  new Request("http://test", { method, body: JSON.stringify(body) });

beforeEach(() => {
  for (const fn of [maybeSingle, single, insert, updateSelect, update, deleteEq, del]) fn.mockReset();
  insert.mockImplementation(() => ({ select: () => ({ single }) }));
  update.mockImplementation(() => ({ eq: () => ({ eq: () => ({ select: updateSelect }) }) }));
  del.mockImplementation(() => ({ eq: deleteEq }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/rooms/[id]/participants (참여)", () => {
  it("닉네임만으로 참여하면 출발지 없이 가입된다", async () => {
    maybeSingle.mockResolvedValue({ data: { id: ROOM, host_id: HOST }, error: null });
    single.mockResolvedValue({ data: { id: PID }, error: null });
    const res = await POST(req("POST", { nickname: " 민수 " }), ctx());
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ participantId: PID });
    expect(insert).toHaveBeenCalledWith({
      room_id: ROOM,
      nickname: "민수",
      is_host: false,
      origin_label: null,
      origin_lat: null,
      origin_lng: null,
    });
  });

  it("방장 토큰이 일치하면 is_host 로 저장한다", async () => {
    maybeSingle.mockResolvedValue({ data: { id: ROOM, host_id: HOST }, error: null });
    single.mockResolvedValue({ data: { id: PID }, error: null });
    await POST(req("POST", { nickname: "방장", hostId: HOST }), ctx());
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ is_host: true }));
  });

  it("방장 토큰이 다르면 is_host 가 아니다", async () => {
    maybeSingle.mockResolvedValue({ data: { id: ROOM, host_id: HOST }, error: null });
    single.mockResolvedValue({ data: { id: PID }, error: null });
    await POST(req("POST", { nickname: "가짜", hostId: "00000000-0000-4000-8000-0000000000cc" }), ctx());
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ is_host: false }));
  });

  it("출발지를 함께 보내면 좌표와 라벨을 저장한다", async () => {
    maybeSingle.mockResolvedValue({ data: { id: ROOM, host_id: HOST }, error: null });
    single.mockResolvedValue({ data: { id: PID }, error: null });
    await POST(req("POST", { nickname: "지수", lat: 37.5, lng: 127, label: "강남역" }), ctx());
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ origin_lat: 37.5, origin_lng: 127, origin_label: "강남역" }),
    );
  });

  it("닉네임이 없거나 12자 초과면 400", async () => {
    for (const nickname of [undefined, "", "   ", "a".repeat(13)]) {
      expect((await POST(req("POST", { nickname }), ctx())).status).toBe(400);
    }
    expect(insert).not.toHaveBeenCalled();
  });

  it("방 ID 가 uuid 가 아니면 400", async () => {
    expect((await POST(req("POST", { nickname: "a" }), ctx("nope"))).status).toBe(400);
  });

  it("좌표가 한국 범위 밖이면 400", async () => {
    const res = await POST(req("POST", { nickname: "a", lat: 0, lng: 0 }), ctx());
    expect(res.status).toBe(400);
  });

  it("lat 만 보내도 400", async () => {
    expect((await POST(req("POST", { nickname: "a", lat: 37.5 }), ctx())).status).toBe(400);
  });

  it("없는 방은 404 ROOM_NOT_FOUND", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await POST(req("POST", { nickname: "a" }), ctx());
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("ROOM_NOT_FOUND");
  });

  it("중복 닉네임(23505)은 409 NICKNAME_TAKEN", async () => {
    maybeSingle.mockResolvedValue({ data: { id: ROOM, host_id: HOST }, error: null });
    single.mockResolvedValue({ data: null, error: { code: "23505", message: "dup" } });
    const res = await POST(req("POST", { nickname: "a" }), ctx());
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("NICKNAME_TAKEN");
  });

  it("7번째 참여자(ROOM_FULL)는 409", async () => {
    maybeSingle.mockResolvedValue({ data: { id: ROOM, host_id: HOST }, error: null });
    single.mockResolvedValue({ data: null, error: { code: "P0001", message: "ROOM_FULL" } });
    const res = await POST(req("POST", { nickname: "a" }), ctx());
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("ROOM_FULL");
  });

  it("그 외 DB 오류는 500", async () => {
    maybeSingle.mockResolvedValue({ data: { id: ROOM, host_id: HOST }, error: null });
    single.mockResolvedValue({ data: null, error: { code: "XX", message: "boom" } });
    expect((await POST(req("POST", { nickname: "a" }), ctx())).status).toBe(500);
  });
});

describe("PATCH /api/rooms/[id]/participants (출발지 저장)", () => {
  const body = { participantId: PID, lat: 37.5, lng: 127, label: "강남역" };

  it("출발지를 저장하고 이동 시간 캐시를 지운다", async () => {
    updateSelect.mockResolvedValue({ data: [{ id: PID }], error: null });
    deleteEq.mockResolvedValue({ error: null });
    const res = await PATCH(req("PATCH", body), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith({ origin_lat: 37.5, origin_lng: 127, origin_label: "강남역" });
    expect(deleteEq).toHaveBeenCalledWith("participant_id", PID);
  });

  it("다른 방의 참여자면 404 이고 캐시를 지우지 않는다", async () => {
    updateSelect.mockResolvedValue({ data: [], error: null });
    const res = await PATCH(req("PATCH", body), ctx());
    expect(res.status).toBe(404);
    expect(del).not.toHaveBeenCalled();
  });

  it("입력이 잘못되면 400", async () => {
    const bad = [
      { ...body, participantId: "x" },
      { ...body, lat: 0 },
      { ...body, label: 1 },
      {},
    ];
    for (const b of bad) expect((await PATCH(req("PATCH", b), ctx())).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("캐시 삭제 실패는 500", async () => {
    updateSelect.mockResolvedValue({ data: [{ id: PID }], error: null });
    deleteEq.mockResolvedValue({ error: new Error("fail") });
    expect((await PATCH(req("PATCH", body), ctx())).status).toBe(500);
  });
});
