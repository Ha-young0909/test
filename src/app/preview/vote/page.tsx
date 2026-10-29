"use client";

// D(역 투표) 개발용 미리보기. Supabase·실제 후보 역 없이 목 데이터로 VotePanel 을 확인한다.
// 방 화면(RoomView)에 연결되면 이 페이지는 지운다.

import { useState } from "react";
import VotePanel from "@/components/VotePanel";
import { toggleVote } from "@/lib/vote/logic";
import { MOCK_ME, MOCK_PARTICIPANTS, MOCK_STATIONS, MOCK_VOTES } from "@/lib/vote/mock";

export default function VotePreviewPage() {
  const [votes, setVotes] = useState(MOCK_VOTES);
  const [me, setMe] = useState(MOCK_ME);
  const [closed, setClosed] = useState(false);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 bg-white px-4 py-8 text-[#17201B]">
      <header className="space-y-1">
        <p className="text-xs font-bold text-[#B8381F]">미리보기 · 목 데이터</p>
        <h1 className="text-2xl font-bold">금요일 저녁 모임</h1>
      </header>

      <fieldset className="flex flex-wrap items-center gap-2 rounded-[14px] bg-[#F7F6F2] p-3 text-sm">
        <legend className="sr-only">미리보기 설정</legend>
        <span className="font-bold">보는 사람</span>
        {MOCK_PARTICIPANTS.map((p) => (
          <button
            key={p.id}
            onClick={() => setMe(p.id)}
            aria-pressed={me === p.id}
            className={`min-h-9 rounded-full px-3 font-bold ${
              me === p.id ? "bg-[#17201B] text-white" : "bg-white text-[#4A554F]"
            }`}
          >
            {p.nickname}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1.5">
          <input type="checkbox" checked={closed} onChange={(e) => setClosed(e.target.checked)} />
          마감
        </label>
      </fieldset>

      <VotePanel
        stations={MOCK_STATIONS}
        votes={votes}
        myParticipantId={me}
        closed={closed}
        onToggleVote={(candidateId) => setVotes((prev) => toggleVote(prev, me, candidateId))}
      />
    </main>
  );
}
