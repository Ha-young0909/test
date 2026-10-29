"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ResultView from "@/components/ResultView";
import VotePanel from "@/components/VotePanel";
import { getHostId, getParticipantId, getParticipantToken } from "@/lib/session";
import { DEADLINE_MINUTES, formatRemaining, remainingMs } from "@/lib/vote/deadline";
import { toggleVote } from "@/lib/vote/logic";
import type { VoteStateResponse } from "@/lib/vote/types";

const POLL_MS = 4000;
const LABELS: Record<number, string> = { 30: "30분", 60: "1시간", 180: "3시간", 1440: "하루" };

/** 후보 역 투표 + 결과 + 마감. 방 화면(RoomView)은 <VoteSection roomId={...} /> 만 붙이면 된다. */
export default function VoteSection({ roomId }: { roomId: string }) {
  const [state, setState] = useState<VoteStateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skew, setSkew] = useState(0); // 서버 시각 - 내 시계
  const [nowMs, setNowMs] = useState(() => Date.now());
  const pending = useRef(0); // 진행 중인 내 요청 수. 있으면 폴링 결과로 덮어쓰지 않는다.

  // 로딩 문구만 그리는 동안은 서버 렌더와 같으므로 처음부터 localStorage 를 읽어도 된다.
  const [me] = useState(() => ({
    id: getParticipantId(roomId),
    token: getParticipantToken(roomId),
    hostId: getHostId(roomId),
  }));

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/vote`, { cache: "no-store" });
      if (!res.ok) return;
      const data: VoteStateResponse = await res.json();
      if (pending.current > 0) return;
      setSkew(new Date(data.serverTime).getTime() - Date.now());
      setState(data);
    } catch {
      // 일시적인 네트워크 오류는 다음 주기에 다시 시도한다.
    }
  }, [roomId]);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    const clock = setInterval(() => setNowMs(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      clearInterval(clock);
    };
  }, [refresh]);

  async function onToggleVote(candidateId: string) {
    if (!state || !me.id || !me.token || state.closed) return;
    const on = !state.votes.some((v) => v.participantId === me.id && v.candidateId === candidateId);
    const before = state;
    setState({ ...state, votes: toggleVote(state.votes, me.id, candidateId) }); // 먼저 반영
    setError(null);
    pending.current++;
    try {
      const res = await fetch(`/api/rooms/${roomId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: me.id, participantToken: me.token, candidateId, on }),
      });
      if (!res.ok) {
        setState(before);
        setError((await res.json().catch(() => null))?.error ?? "투표에 실패했어요.");
      }
    } catch {
      setState(before);
      setError("네트워크 오류로 투표하지 못했어요.");
    } finally {
      pending.current--;
      refresh();
    }
  }

  async function changeDeadline(payload: Record<string, unknown>) {
    if (!me.hostId) return;
    setError(null);
    const res = await fetch(`/api/rooms/${roomId}/deadline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: me.hostId, ...payload }),
    });
    if (!res.ok) setError((await res.json().catch(() => null))?.error ?? "마감 설정에 실패했어요.");
    refresh();
  }

  if (!state) return <p className="text-sm text-gray-500">후보 역을 불러오는 중…</p>;

  const now = new Date(nowMs + skew);
  const left = remainingMs({ status: state.status, vote_deadline: state.voteDeadline }, now);

  return (
    <div className="flex flex-col gap-5">
      {me.hostId ? (
        <section aria-label="투표 마감 설정" className="flex flex-col gap-2 rounded-[14px] bg-[#F7F6F2] p-3 text-sm text-[#17201B]">
          <p className="font-bold">
            {state.closed ? "투표가 마감됐어요" : left ? `마감까지 ${formatRemaining(left)}` : "마감 시간이 없어요"}
          </p>
          <div className="flex flex-wrap gap-2">
            {state.closed ? (
              <button onClick={() => changeDeadline({ reopen: true })} className="min-h-10 rounded-full border-[1.5px] border-[#17201B] bg-white px-3 font-bold">
                다시 열기
              </button>
            ) : (
              <>
                {DEADLINE_MINUTES.map((m) => (
                  <button key={m} onClick={() => changeDeadline({ minutes: m })} className="min-h-10 rounded-full border-[1.5px] border-[#D9DDD4] bg-white px-3 font-bold hover:border-[#17201B]">
                    {LABELS[m]} 뒤
                  </button>
                ))}
                <button onClick={() => changeDeadline({ closeNow: true })} className="min-h-10 rounded-full bg-[#E8553D] px-3 font-bold text-white">
                  지금 마감
                </button>
              </>
            )}
          </div>
        </section>
      ) : (
        <p className="text-sm text-[#4A554F]">
          {state.closed ? "투표가 마감됐어요." : left ? `마감까지 ${formatRemaining(left)} 남았어요.` : ""}
        </p>
      )}

      {error && <p role="alert" className="rounded-[14px] bg-[#FDECEA] px-4 py-3 text-sm text-[#B8381F]">{error}</p>}

      <VotePanel
        stations={state.stations}
        votes={state.votes}
        myParticipantId={me.token ? me.id : null}
        onToggleVote={onToggleVote}
        closed={state.closed}
      />
      <ResultView stations={state.stations} votes={state.votes} closed={state.closed} />
    </div>
  );
}
