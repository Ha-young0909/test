"use client";

import { useState } from "react";
import { countByTab, countVotes, filterStations, hasVoted, myRoute } from "@/lib/vote/logic";
import type { NearbyPlace, StationCardData, StationTab, VoteMark } from "@/lib/vote/types";

interface VotePanelProps {
  stations: StationCardData[];
  votes: VoteMark[];
  /** 지금 보고 있는 참여자. 없으면 투표 버튼이 막힌다. */
  myParticipantId: string | null;
  /** 투표 버튼을 눌렀을 때. 표 추가·취소는 부모가 처리한다. */
  onToggleVote: (candidateId: string) => void;
  /** 마감되면 true. 투표 버튼이 모두 막힌다. */
  closed?: boolean;
  /** 대략적인 중간 지점(폴백)일 때 안내를 띄운다. */
  approximate?: boolean;
}

const TABS: { key: StationTab; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "subway", label: "지하철" },
  { key: "bus", label: "버스" },
];

export default function VotePanel({
  stations,
  votes,
  myParticipantId,
  onToggleVote,
  closed = false,
  approximate = false,
}: VotePanelProps) {
  const [tab, setTab] = useState<StationTab>("all");
  const tabCounts = countByTab(stations);
  const voteCounts = countVotes(votes);
  const shown = filterStations(stations, tab);
  const myVoteCount = myParticipantId ? votes.filter((v) => v.participantId === myParticipantId).length : 0;

  return (
    <section aria-label="후보 역 투표" className="flex flex-col gap-3 text-[#17201B]">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold">어디서 만날까요?</h2>
        <span className="text-[13px] text-[#4A554F]">
          {closed ? "투표가 마감됐어요" : `여러 곳에 투표할 수 있어요 · 내 표 ${myVoteCount}개`}
        </span>
      </div>

      {approximate && (
        <p role="note" className="rounded-[14px] bg-[#FFF4E5] px-4 py-3 text-sm text-[#7A4B00]">
          이동 시간을 불러오지 못해 <b>대략적인 중간 지점</b>을 보여주고 있어요.
        </p>
      )}

      <div role="tablist" aria-label="역 종류" className="flex gap-2">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`min-h-11 rounded-full border-[1.5px] px-4 text-sm font-bold transition-colors ${
                active
                  ? "border-[#17201B] bg-[#17201B] text-white"
                  : "border-[#D9DDD4] bg-white text-[#4A554F] hover:border-[#17201B]"
              }`}
            >
              {t.label} <span className={active ? "text-white/70" : "text-[#9AA29D]"}>{tabCounts[t.key]}</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-[14px] bg-[#F7F6F2] px-4 py-6 text-center text-sm text-[#4A554F]">
          {tab === "bus" ? "근처 버스 정류장 후보가 없어요." : tab === "subway" ? "근처 지하철역 후보가 없어요." : "아직 후보 역이 없어요."}
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {shown.map((station) => (
            <li key={station.id}>
              <StationCard
                station={station}
                votes={voteCounts[station.id] ?? 0}
                voted={myParticipantId ? hasVoted(votes, myParticipantId, station.id) : false}
                myParticipantId={myParticipantId}
                disabled={closed || !myParticipantId}
                onToggle={() => onToggleVote(station.id)}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function StationCard({
  station,
  votes,
  voted,
  myParticipantId,
  disabled,
  onToggle,
}: {
  station: StationCardData;
  votes: number;
  voted: boolean;
  myParticipantId: string | null;
  disabled: boolean;
  onToggle: () => void;
}) {
  const top = station.rank === 1;
  const mine = myRoute(station, myParticipantId);

  return (
    <article
      className={`rounded-[18px] border-[1.5px] bg-white p-4 ${
        voted ? "border-[#E8553D] shadow-[0_0_0_3px_rgba(232,85,61,0.12)]" : "border-[#E2E5DC]"
      }`}
    >
      <header className="flex items-start gap-3">
        <span
          aria-label={`${station.rank}순위`}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-extrabold ${
            top ? "bg-[#E8553D] text-white" : "bg-[#17201B] text-white"
          }`}
        >
          {station.rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-[17px] font-bold">{station.name}</h3>
            <KindChip kind={station.kind} />
            {top && <span className="text-xs font-bold text-[#B8381F]">가장 공평해요</span>}
          </div>
          <p className="mt-0.5 truncate text-xs text-[#6B7570]">
            {station.kind === "bus" ? "버스 " : ""}
            {station.lines.join(" · ")}
          </p>
        </div>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-2 rounded-[12px] bg-[#F7F6F2] p-3 text-sm">
        <div className="min-w-0">
          <dt className="text-xs text-[#6B7570]">내 경로</dt>
          <dd className="font-bold">
            {mine ? (
              <>
                <span className="block truncate">{mine.route}</span>
                <span className="text-[#E8553D]">{mine.minutes}분</span>
              </>
            ) : (
              <span className="font-normal text-[#6B7570]">출발지를 입력하면 보여요</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[#6B7570]">모두의 평균</dt>
          <dd className="font-bold">{station.avgMinutes}분</dd>
        </div>
      </dl>

      {station.over90 && (
        <p role="note" className="mt-2 text-xs font-bold text-[#B8381F]">
          ⚠ 90분 넘게 걸리는 친구가 있어요
        </p>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <PlaceList title="근처 맛집" places={station.restaurants} />
        <PlaceList title="갈만한 곳" places={station.spots} />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={onToggle}
          disabled={disabled}
          aria-pressed={voted}
          className={`h-12 flex-1 rounded-[14px] text-[15px] font-bold transition-colors disabled:cursor-not-allowed ${
            voted
              ? "bg-[#E8553D] text-white hover:bg-[#D44A33] disabled:bg-[#F2B3A8]"
              : "border-[1.5px] border-[#17201B] bg-white hover:bg-[#F7F6F2] disabled:border-[#C9CEC6] disabled:text-[#9AA29D]"
          }`}
        >
          {voted ? "✓ 투표했어요 (다시 누르면 취소)" : "여기 좋아요"}
        </button>
        <span className="w-14 text-right text-sm font-bold" aria-label={`${votes}표`}>
          {votes}표
        </span>
      </div>
    </article>
  );
}

function KindChip({ kind }: { kind: StationCardData["kind"] }) {
  return kind === "subway" ? (
    <span className="rounded-md bg-[#E6EEFA] px-1.5 py-0.5 text-[11px] font-bold text-[#2457A6]">지하철</span>
  ) : (
    <span className="rounded-md bg-[#E5F3EA] px-1.5 py-0.5 text-[11px] font-bold text-[#1F7A45]">버스</span>
  );
}

function PlaceList({ title, places }: { title: string; places: NearbyPlace[] }) {
  return (
    <div className="min-w-0">
      <h4 className="mb-1 text-xs font-bold text-[#4A554F]">{title}</h4>
      {places.length === 0 ? (
        <p className="text-xs text-[#9AA29D]">정보 없음</p>
      ) : (
        <ul className="space-y-1">
          {places.slice(0, 2).map((p) => (
            <li key={p.name} className="flex items-baseline gap-1.5 text-sm">
              <span className="truncate font-medium">{p.name}</span>
              <span className="shrink-0 text-xs text-[#6B7570]">
                {p.type}
                {p.rating !== null && <> · ★{p.rating.toFixed(1)}</>} · 도보 {p.walkMinutes}분
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
