"use client";

import { useCallback, useEffect, useState } from "react";
import JoinForm from "@/components/JoinForm";
import Map from "@/components/Map";
import OriginSearch, { type Origin } from "@/components/OriginSearch";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { getHostId, getParticipantId } from "@/lib/session";
import {
  MAX_PARTICIPANTS,
  MIN_PARTICIPANTS,
  type ApiError,
  type Participant,
  type Room,
  type UpdateOriginResponse,
} from "@/types";

const POLL_MS = 4000;

type Load =
  | { state: "loading" }
  | { state: "notFound" }
  | { state: "error"; message: string }
  | { state: "ready"; room: Room; participants: Participant[] };

export default function RoomView({ roomId }: { roomId: string }) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [myId, setMyId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const db = getBrowserSupabase();
      const [roomRes, partRes] = await Promise.all([
        db.from("rooms").select("id, name, category, status, created_at").eq("id", roomId).maybeSingle(),
        db.from("participants").select("*").eq("room_id", roomId).order("created_at"),
      ]);
      if (roomRes.error) throw roomRes.error;
      if (partRes.error) throw partRes.error;
      if (!roomRes.data) {
        setLoad({ state: "notFound" });
        return;
      }
      setLoad({ state: "ready", room: roomRes.data as Room, participants: partRes.data as Participant[] });
    } catch (err) {
      setLoad((prev) =>
        prev.state === "ready"
          ? prev // 일시적 실패는 마지막 화면을 유지한다
          : { state: "error", message: err instanceof Error ? err.message : "불러오지 못했습니다." },
      );
    }
  }, [roomId]);

  // localStorage 는 브라우저에서만 읽을 수 있어 마운트 후에 반영한다.
  useEffect(() => {
    setMyId(getParticipantId(roomId));
    setIsHost(getHostId(roomId) !== null);
  }, [roomId]);

  // 표 변경·참여자 입장이 보이도록 주기적으로 재조회한다 (Realtime 은 D 가 투표에 붙인다).
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  async function saveOrigin(origin: Origin) {
    if (!myId) throw new Error("먼저 닉네임으로 참여해 주세요.");
    const res = await fetch(`/api/rooms/${roomId}/participants`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: myId, lat: origin.lat, lng: origin.lng, label: origin.name }),
    });
    const data: UpdateOriginResponse | ApiError = await res.json();
    if (!res.ok || "error" in data) {
      throw new Error("error" in data ? data.error : "출발지를 저장하지 못했습니다.");
    }
    await refresh();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("링크를 복사하세요", window.location.href);
    }
  }

  if (load.state === "loading") {
    return <Shell>불러오는 중...</Shell>;
  }
  if (load.state === "notFound") {
    return <Shell>존재하지 않는 방입니다. 링크를 다시 확인해 주세요.</Shell>;
  }
  if (load.state === "error") {
    return <Shell>방을 불러오지 못했습니다: {load.message}</Shell>;
  }

  const { room, participants } = load;
  const pins = participants.flatMap((p) =>
    p.origin_lat !== null && p.origin_lng !== null
      ? [{ nickname: p.nickname, lat: p.origin_lat, lng: p.origin_lng, isMe: p.id === myId }]
      : [],
  );
  const me = participants.find((p) => p.id === myId);
  const mapSection = (
    <section aria-label="친구들의 출발지" className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold">친구들의 출발지</h2>
        <span className="text-[13px] text-gray-500">{pins.length}명 입력 완료</span>
      </div>
      <Map participants={pins} />
    </section>
  );
  const joined = myId !== null && participants.some((p) => p.id === myId);
  const full = participants.length >= MAX_PARTICIPANTS;
  const canFind = participants.length >= MIN_PARTICIPANTS;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{room.name ?? (room.status === "collecting" ? "약속 방" : "투표")}</h1>
        <button
          onClick={copyLink}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
        >
          {copied ? "복사됨!" : "초대 링크 복사"}
        </button>
      </header>

      <section aria-label="참여자" className="space-y-2">
        <h2 className="font-semibold">
          참여자 {participants.length}/{MAX_PARTICIPANTS}
        </h2>
        <ul className="space-y-1">
          {participants.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-800">
              <span>{p.nickname}</span>
              {p.is_host && <Badge>방장</Badge>}
              {p.id === myId && <Badge>나</Badge>}
              <span className="ml-auto truncate text-sm text-gray-500">
                {p.origin_label ?? "출발지 미입력"}
              </span>
            </li>
          ))}
          {participants.length === 0 && <li className="text-sm text-gray-500">아직 아무도 없어요.</li>}
        </ul>
      </section>

      {!joined && !full && <JoinForm roomId={roomId} onJoined={setMyId} />}
      {!joined && full && <p className="text-sm text-red-600">방이 가득 찼어요. (최대 {MAX_PARTICIPANTS}명)</p>}

      {room.status === "collecting" ? (
        <section className="space-y-5">
          {joined && <OriginSearch onSubmit={saveOrigin} registeredLabel={me?.origin_label} />}
          {mapSection}
          {/* C: 중간 지점 찾기 버튼이 여기에 연결된다. */}
          {isHost && (
            <button
              disabled
              title={canFind ? "곧 추가됩니다" : `참여자가 ${MIN_PARTICIPANTS}명 이상 필요해요`}
              className="w-full rounded-xl bg-gray-300 px-4 py-3 font-semibold text-gray-600"
            >
              중간 지점 찾기 {canFind ? "" : `(${MIN_PARTICIPANTS}명 이상 필요)`}
            </button>
          )}
        </section>
      ) : (
        <section className="space-y-5">
          {mapSection}
          {/* D: 후보 목록·투표·결과(VotePanel, ResultView)가 여기에 연결된다. */}
          <p className="text-sm text-gray-500">투표 화면은 곧 추가됩니다.</p>
        </section>
      )}
    </main>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center px-6 text-center">{children}</main>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-200">
      {children}
    </span>
  );
}
