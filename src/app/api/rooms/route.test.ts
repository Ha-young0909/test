import { beforeEach, describe, expect, it, vi } from "vitest";

const single = vi.fn();
const insert = vi.fn(() => ({ select: () => ({ single }) }));
vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: () => ({ from: () => ({ insert }) }),
}));

import { POST } from "./route";

const req = (body: unknown) =>
  new Request("http://test/api/rooms", { method: "POST", body: JSON.stringify(body) });

describe("POST /api/rooms", () => {
  beforeEach(() => {
    single.mockReset();
    insert.mockClear();
  });

  it("방을 만들고 roomId 와 hostId 를 돌려준다", async () => {
    single.mockResolvedValue({ data: { id: "room-1", host_id: "host-1" }, error: null });
    const res = await POST(req({}));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ roomId: "room-1", hostId: "host-1" });
    expect(insert).toHaveBeenCalledWith({ name: null });
  });

  it("모임 이름을 다듬어 저장한다", async () => {
    single.mockResolvedValue({ data: { id: "r", host_id: "h" }, error: null });
    await POST(req({ name: "  금요일 저녁 모임 " }));
    expect(insert).toHaveBeenCalledWith({ name: "금요일 저녁 모임" });
  });

  it("빈 이름·20자 초과 이름은 400", async () => {
    for (const name of ["   ", "가".repeat(21)]) {
      const res = await POST(req({ name }));
      expect(res.status).toBe(400);
    }
    expect(insert).not.toHaveBeenCalled();
  });

  it("DB 오류는 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    single.mockResolvedValue({ data: null, error: new Error("db down") });
    const res = await POST(req({}));
    expect(res.status).toBe(500);
  });
});
