import { countVotes, pickWinner } from "@/lib/vote/logic";
import type { StationCardData, VoteMark } from "@/lib/vote/types";

interface ResultViewProps {
  stations: StationCardData[];
  votes: VoteMark[];
  /** 마감되면 최다 득표 역을 확정해서 보여준다. */
  closed: boolean;
}

/** 역별 득표 현황. 번호는 지도 핀 번호(순위)와 같다. */
export default function ResultView({ stations, votes, closed }: ResultViewProps) {
  if (stations.length === 0) return null;
  const counts = countVotes(votes);
  const total = votes.length;
  const winner = closed && total > 0 ? pickWinner(stations, votes) : null;
  const rows = [...stations].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0) || a.rank - b.rank);

  return (
    <section aria-label="투표 결과" className="flex flex-col gap-3 text-[#17201B]">
      <h2 className="text-sm font-bold">지금까지 결과</h2>

      {closed && (
        <p role="status" className="rounded-[14px] bg-[#17201B] px-4 py-3 text-sm font-bold text-white">
          {winner ? `${winner.rank}번 ${winner.name}으로 확정됐어요 🎉` : "투표가 마감됐어요. 아무도 투표하지 않았어요."}
        </p>
      )}

      <ol className="flex flex-col gap-2">
        {rows.map((s) => {
          const n = counts[s.id] ?? 0;
          const isWinner = winner?.id === s.id;
          return (
            <li key={s.id} className="flex items-center gap-2 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#17201B] text-xs font-extrabold text-white">
                {s.rank}
              </span>
              <span className={`w-28 shrink-0 truncate ${isWinner ? "font-extrabold" : "font-medium"}`}>{s.name}</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#ECEEE7]" aria-hidden>
                <span
                  className={`block h-full rounded-full ${isWinner ? "bg-[#E8553D]" : "bg-[#17201B]"}`}
                  style={{ width: total ? `${(n / total) * 100}%` : "0%" }}
                />
              </span>
              <span className="w-10 text-right font-bold">{n}표</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
