import { describe, expect, it } from "vitest";
import { findOriginUpdates, snapshotOrigins } from "./originChanges";
import type { Participant } from "@/types";

const p = (id: string, nickname: string, lat: number | null = null, lng: number | null = null): Participant => ({
  id,
  room_id: "r",
  nickname,
  is_host: false,
  origin_label: null,
  origin_lat: lat,
  origin_lng: lng,
  created_at: "",
});

describe("findOriginUpdates", () => {
  it("출발지를 새로 등록한 다른 참여자를 찾는다", () => {
    const prev = snapshotOrigins([p("a", "민수"), p("b", "지은")]);
    expect(findOriginUpdates(prev, [p("a", "민수", 37.5, 127), p("b", "지은")], "me")).toEqual(["민수"]);
  });

  it("출발지를 바꾼 경우도 알린다", () => {
    const prev = snapshotOrigins([p("a", "민수", 37.5, 127)]);
    expect(findOriginUpdates(prev, [p("a", "민수", 37.6, 127)], "me")).toEqual(["민수"]);
  });

  it("변화가 없거나 내 변경이면 알리지 않는다", () => {
    const list = [p("a", "민수", 37.5, 127), p("me", "나", 37.1, 127.1)];
    const prev = snapshotOrigins([p("a", "민수", 37.5, 127), p("me", "나")]);
    expect(findOriginUpdates(prev, list, "me")).toEqual([]);
  });

  it("처음 보는 참여자(입장만)는 알리지 않는다", () => {
    const prev = snapshotOrigins([p("a", "민수", 37.5, 127)]);
    expect(findOriginUpdates(prev, [p("a", "민수", 37.5, 127), p("c", "새친구")], "me")).toEqual([]);
  });
});
