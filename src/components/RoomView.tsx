"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import JoinForm from "@/components/JoinForm";
import Map from "@/components/Map";
import OriginSearch, { type Origin } from "@/components/OriginSearch";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { findOriginUpdates, snapshotOrigins, type OriginSnapshot } from "@/lib/originChanges";
import { getHostId, getParticipantId, getParticipantToken } from "@/lib/session";
import {
  MAX_PARTICIPANTS,
  MIN_PARTICIPANTS,
  type ApiError,
  type Candidate,
  type Participant,
  type Room,
  type UpdateOriginResponse,
} from "@/types";

const POLL_MS = 4000;

type Load =
  | { state: "loading" }
  | { state: "notFound" }
  | { state: "error"; message: string }
  | { state: "ready"; room: Room; participants: Participant[]; candidates: CandidateRow[] };

type CandidateRow = Pick<
  Candidate,
  "id" | "kind" | "number" | "name" | "lat" | "lng" | "lines" | "avg_minutes" | "over90" | "approximate"
>;
const CANDIDATE_COLUMNS = "id, kind, number, name, lat, lng, lines, avg_minutes, over90, approximate";

export default function RoomView({ roomId }: { roomId: string }) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [myId, setMyId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const prevOrigins = useRef<OriginSnapshot | null>(null);
  const myIdRef = useRef<string | null>(null);
  const prevTop = useRef<string | null | undefined>(undefined);
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const db = getBrowserSupabase();
      const [roomRes, partRes, candRes] = await Promise.all([
        db.from("rooms").select("id, name, status, vote_deadline, created_at").eq("id", roomId).maybeSingle(),
        db.from("participants").select("id, room_id, nickname, is_host, origin_label, origin_lat, origin_lng, created_at").eq("room_id", roomId).order("created_at"),
        db.from("candidates").select(CANDIDATE_COLUMNS).eq("room_id", roomId).order("number"),
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
      const messages: string[] = [];
      if (prevOrigins.current) {
        const names = findOriginUpdates(prevOrigins.current, list, myIdRef.current);
        if (names.length > 0) messages.push(`${names.join(", ")}님이 등록했어요`);
      }
      if (prevTop.current !== undefined && prevTop.current !== null && top !== null && prevTop.current !== top) {
        messages.push(`1순위가 ${top}으로 바뀌었어요`);
      }
      if (messages.length > 0) setNotice(messages.join(" · "));
      prevOrigins.current = snapshotOrigins(list);
      prevTop.current = top;
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
  // 백그라운드 탭에서는 조회를 멈췄다가 다시 보이면 바로 갱신한다.
  useEffect(() => {
    refresh();
    const timer = setInterval(() => {
      if (!document.hidden) refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // 후보 역을 다시 계산한다. 방장은 hostId 로, 참여자는 토큰으로 호출한다.
  async function findMidpoint(silent: boolean) {
    const token = getParticipantToken(roomId);
    const hostId = getHostId(roomId);
    const credentials = hostId ? { hostId } : myId && token ? { participantId: myId, participantToken: token } : null;
    if (!credentials) return;
    setFinding(true);
    if (!silent) setFindError(null);
    try {
      const res = await fetch(`/api/rooms/${roomId}/midpoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      if (!res.ok) {
        const data: ApiError = await res.json().catch(() => ({ error: "" }));
        // 다른 사람이 계산 중(429)이면 그 결과가 곧 재조회로 들어온다.
        if (res.status === 429) return;
        throw new Error(data.error || "중간 지점을 찾지 못했습니다.");
      }
      await refresh();
    } catch (err) {
      if (!silent) setFindError(err instanceof Error ? err.message : "중간 지점을 찾지 못했습니다.");
    } finally {
      setFinding(false);
    }
  }

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
    // 출발지가 바뀌면 순위를 다시 계산한다. 실패해도 출발지 저장은 이미 끝났다.
    void findMidpoint(true);
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
  const candidatePins = candidates.map((c) => ({ number: c.number, name: c.name, lat: c.lat, lng: c.lng }));
  const mapSection = (
    <section aria-label="친구들의 출발지" className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold">친구들의 출발지</h2>
        <span className="text-[13px] text-gray-500">{pins.length}명 입력 완료</span>
      </div>
      <Map participants={pins} candidates={candidatePins} />
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
          <CandidateList candidates={candidates} />
          {isHost && (
            <button
              onClick={() => findMidpoint(false)}
              disabled={!canFind || finding}
              title={canFind ? undefined : `출발지를 입력한 참여자가 ${MIN_PARTICIPANTS}명 이상 필요해요`}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:bg-gray-300 disabled:text-gray-600"
            >
              {finding ? "찾는 중…" : candidates.length > 0 ? "중간 지점 다시 찾기" : "중간 지점 찾기"}
              {!canFind && ` (출발지 ${MIN_PARTICIPANTS}명 이상 필요)`}
            </button>
          )}
          {findError && (
            <p role="alert" className="text-sm text-red-600">
              {findError}
            </p>
          )}
        </section>
      ) : (
        <section className="space-y-5">
          {mapSection}
          <ParticipantList participants={participants} myId={myId} />
          <CandidateList candidates={candidates} />
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

// 후보 역 순위 미리보기. 노선별 내 이동 시간과 투표는 D 의 VotePanel 이 맡는다.
function CandidateList({ candidates }: { candidates: CandidateRow[] }) {
  if (candidates.length === 0) return null;
  const approximate = candidates.some((c) => c.approximate);
  return (
    <section aria-label="후보 역 순위" className="space-y-2">
      <h2 className="font-semibold">중간 지점 후보</h2>
      {approximate && <p className="text-sm text-amber-700">대략적인 중간 지점이에요. 실제 이동 시간과 다를 수 있어요.</p>}
      {candidates.some((c) => c.over90) && (
        <p className="text-sm text-amber-700">이동 시간이 90분을 넘는 친구가 있어요.</p>
      )}
      <ol className="space-y-1">
        {candidates.map((c) => (
          <li key={c.id} className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-800">
            <span className={`w-6 text-center font-bold ${c.number === 1 ? "text-red-600" : ""}`}>{c.number}</span>
            <span>{c.name}</span>
            <Badge>{c.kind === "subway" ? "지하철" : "버스"}</Badge>
            <span className="ml-auto truncate text-sm text-gray-500">
              {c.lines.join("·")}
              {c.avg_minutes !== null && ` · 평균 ${c.avg_minutes}분`}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
