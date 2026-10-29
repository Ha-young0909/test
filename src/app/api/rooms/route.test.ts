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
    expect(insert).toHaveBeenCalledWith({ category: null });
  });

  it("카테고리를 함께 저장한다", async () => {
    single.mockResolvedValue({ data: { id: "r", host_id: "h" }, error: null });
    await POST(req({ category: "cafe" }));
    expect(insert).toHaveBeenCalledWith({ category: "cafe" });
  });

  it("잘못된 카테고리는 400", async () => {
    const res = await POST(req({ category: "pizza" }));
    expect(res.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("DB 오류는 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    single.mockResolvedValue({ data: null, error: new Error("db down") });
    const res = await POST(req({}));
    expect(res.status).toBe(500);
  });
});
