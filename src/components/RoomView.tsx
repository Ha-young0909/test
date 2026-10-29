"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import JoinForm from "@/components/JoinForm";
import Map from "@/components/Map";
import OriginSearch, { type Origin } from "@/components/OriginSearch";
import VoteSection from "@/components/VoteSection";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { describeTopChange, requestMidpoint } from "@/lib/midpointClient";
import { findOriginUpdates, snapshotOrigins, type OriginSnapshot } from "@/lib/originChanges";
import { getHostId, getParticipantId, getParticipantToken } from "@/lib/session";
import {
  MAX_PARTICIPANTS,
  MIN_PARTICIPANTS,
  type ApiError,
  type Participant,
  type StationKind,
  type Room,
  type UpdateOriginResponse,
} from "@/types";

const POLL_MS = 4000;

/** 방 화면에 필요한 후보 역 요약 (candidates 테이블 일부 컬럼). */
interface CandidateRow {
  id: string;
  number: number;
  kind: StationKind;
  name: string;
  lat: number;
  lng: number;
  lines: string[];
  avg_minutes: number | null;
  over90: boolean;
  approximate: boolean;
}

type Load =
  | { state: "loading" }
  | { state: "notFound" }
  | { state: "error"; message: string }
  | { state: "ready"; room: Room; participants: Participant[]; candidates: CandidateRow[] };

export default function RoomView({ roomId }: { roomId: string }) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [myId, setMyId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const prevOrigins = useRef<OriginSnapshot | null>(null);
  const myIdRef = useRef<string | null>(null);
  const prevTop = useRef<string | null>(null);
  const [finding, setFinding] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const db = getBrowserSupabase();
      const [roomRes, partRes, candRes] = await Promise.all([
        db.from("rooms").select("id, name, status, vote_deadline, created_at").eq("id", roomId).maybeSingle(),
        db.from("participants").select("id, room_id, nickname, is_host, origin_label, origin_lat, origin_lng, created_at").eq("room_id", roomId).order("created_at"),
        db
          .from("candidates")
          .select("id, number, kind, name, lat, lng, lines, avg_minutes, over90, approximate")
          .eq("room_id", roomId)
          .order("number"),
      ]);
      if (roomRes.error) throw roomRes.error;
      if (partRes.error) throw partRes.error;
      if (candRes.error) throw candRes.error;
      if (!roomRes.data) {
        setLoad({ state: "notFound" });
        return;
      }
      const list = partRes.data as Participant[];
      const candidates = (candRes.data ?? []) as CandidateRow[];
      const top = candidates[0]?.name ?? null;
      const topChange = describeTopChange(prevTop.current, top);
      prevTop.current = top;
      if (prevOrigins.current) {
        const names = findOriginUpdates(prevOrigins.current, list, myIdRef.current);
        const parts = [names.length > 0 ? `${names.join(", ")}님이 등록했어요` : null, topChange].filter(Boolean);
        if (parts.length > 0) setNotice(parts.join(" · "));
      }
      prevOrigins.current = snapshotOrigins(list);
      setLoad({ state: "ready", room: roomRes.data as Room, participants: list, candidates });
    } catch (err) {
      setLoad((prev) =>
        prev.state === "ready"
          ? prev // 일시적 실패는 마지막 화면을 유지한다
          : { state: "error", message: err instanceof Error ? err.message : "불러오지 못했습니다." },
      );
    }
  }, [roomId]);

  useEffect(() => {
    myIdRef.current = myId;
  }, [myId]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  // localStorage 는 브라우저에서만 읽을 수 있어 마운트 후에 반영한다.
  useEffect(() => {
    setMyId(getParticipantId(roomId));
    setIsHost(getHostId(roomId) !== null);
  }, [roomId]);

  // 표 변경·참여자 입장이 보이도록 주기적으로 재조회한다 (Realtime 은 D 가 투표에 붙인다).
  useEffect(() => {
    refresh();
    // 백그라운드 탭에서는 재조회를 멈추고, 다시 보이면 바로 한 번 조회한다.
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  async function saveOrigin(origin: Origin) {
    const token = getParticipantToken(roomId);
    if (!myId || !token) throw new Error("먼저 닉네임으로 참여해 주세요.");
    const res = await fetch(`/api/rooms/${roomId}/participants`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: myId, participantToken: token, lat: origin.lat, lng: origin.lng, label: origin.name }),
    });
    const data: UpdateOriginResponse | ApiError = await res.json();
    if (!res.ok || "error" in data) {
      throw new Error("error" in data ? data.error : "출발지를 저장하지 못했습니다.");
    }
    await refresh();
    // 내가 등록했으니 내가 다시 계산한다. 다른 사람 화면은 재조회로 결과를 받는다.
    void findMidpoint({ quiet: true });
  }

  async function findMidpoint({ quiet = false }: { quiet?: boolean } = {}) {
    const hostId = getHostId(roomId);
    const token = getParticipantToken(roomId);
    const creds = hostId ? { hostId } : myId && token ? { participantId: myId, participantToken: token } : null;
    if (!creds) return;
    setFinding(true);
    try {
      await requestMidpoint(roomId, creds);
      await refresh();
    } catch (err) {
      // 출발지가 아직 2명 미만일 때 같은 정상 상황은 조용히 넘긴다.
      if (!quiet) setNotice(err instanceof Error ? err.message : "중간 지점을 찾지 못했습니다.");
    } finally {
      setFinding(false);
    }
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

  const { room, participants, candidates } = load;
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
      <Map participants={pins} candidates={candidates} />
    </section>
  );
  const joined = myId !== null && participants.some((p) => p.id === myId);
  const full = participants.length >= MAX_PARTICIPANTS;
  const canFind = pins.length >= MIN_PARTICIPANTS;

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

      {notice && (
        <p role="status" className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
          {notice}
        </p>
      )}

      {!joined && !full && <JoinForm roomId={roomId} onJoined={setMyId} />}
      {!joined && full && <p className="text-sm text-red-600">방이 가득 찼어요. (최대 {MAX_PARTICIPANTS}명)</p>}

      {room.status === "collecting" ? (
        <section className="space-y-5">
          {joined && <OriginSearch onSubmit={saveOrigin} registeredLabel={me?.origin_label} />}
          {mapSection}
          <ParticipantList participants={participants} myId={myId} />
          {candidates.length > 0 && <CandidateList candidates={candidates} />}
          {isHost && (
            <button
              onClick={() => findMidpoint()}
              disabled={!canFind || finding}
              title={canFind ? undefined : `출발지를 입력한 참여자가 ${MIN_PARTICIPANTS}명 이상 필요해요`}
              className="w-full rounded-xl bg-[#17201B] px-4 py-3 font-semibold text-white disabled:bg-gray-300 disabled:text-gray-600"
            >
              {finding ? "찾는 중..." : `중간 지점 ${candidates.length > 0 ? "다시 " : ""}찾기`}
              {canFind ? "" : ` (${MIN_PARTICIPANTS}명 이상 필요)`}
            </button>
          )}
          {/* 후보가 생기면 바로 투표할 수 있고, 방장이 여기서 마감 시간을 정하면 투표 단계로 넘어간다. */}
          {candidates.length > 0 && <VoteSection roomId={roomId} />}
        </section>
      ) : (
        <section className="space-y-5">
          {mapSection}
          <ParticipantList participants={participants} myId={myId} />
          <VoteSection roomId={roomId} />
        </section>
      )}
    </main>
  );
}

function ParticipantList({ participants, myId }: { participants: Participant[]; myId: string | null }) {
  return (
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
            <span className="ml-auto truncate text-sm text-gray-500">{p.origin_label ?? "출발지 미입력"}</span>
          </li>
        ))}
        {participants.length === 0 && <li className="text-sm text-gray-500">아직 아무도 없어요.</li>}
      </ul>
    </section>
  );
}

function CandidateList({ candidates }: { candidates: CandidateRow[] }) {
  return (
    <section aria-label="후보 역" className="space-y-2">
      <h2 className="text-sm font-bold">후보 역 순위</h2>
      {candidates[0]?.approximate && (
        <p className="text-[13px] text-[#B8381F]">직선거리로 추정한 대략적인 이동 시간이에요. 실제 대중교통 시간과 다를 수 있어요.</p>
      )}
      <ol className="space-y-1.5">
        {candidates.map((c) => (
          <li
            key={c.id}
            className="flex items-center gap-3 rounded-xl border border-[#17201B] bg-white px-3 py-2 text-[#17201B]"
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                c.number === 1 ? "bg-[#E8553D]" : "bg-[#17201B]"
              }`}
            >
              {c.number}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">
                {c.name} <span className="text-xs font-normal text-gray-500">{c.kind === "bus" ? "버스" : "지하철"}</span>
              </p>
              {c.lines.length > 0 && <p className="truncate text-xs text-gray-500">{c.lines.join(" · ")}</p>}
            </div>
            <div className="text-right text-xs">
              {c.avg_minutes !== null && <p>평균 {c.avg_minutes}분</p>}
              {c.over90 && <p className="text-[#B8381F]">90분 초과자 있음</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
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
