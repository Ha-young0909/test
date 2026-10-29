import type { Seafood } from "@/data/seasonal";
import type { SeasonLabel } from "@/types/seafood";

const LABEL_STYLE: Record<SeasonLabel, { icon: string; text: string; className: string }> = {
  best: { icon: "🟢", text: "지금이 적기", className: "bg-brand/15 text-brand-strong" },
  pricey: { icon: "🟡", text: "제철이지만 비쌈", className: "bg-accent/15 text-accent" },
  off: { icon: "⚪", text: "비제철", className: "bg-line text-muted" },
};

export default function SeafoodCard({ item, label }: { item: Seafood; label: SeasonLabel }) {
  const style = LABEL_STYLE[label];
  return (
    <article className="space-y-4 rounded-3xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-2xl font-bold">{item.name}</h2>
        <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${style.className}`}>
          {style.icon} {style.text}
        </span>
      </div>
      <p className="text-2xl font-bold text-accent">
        {item.price.toLocaleString("ko-KR")}
        <span className="text-sm font-medium text-muted"> 원/kg</span>
      </p>
      <ul className="flex flex-wrap gap-2">
        {item.pairings.map((p) => (
          <li key={p} className="rounded-full bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand-strong">
            {p}
          </li>
        ))}
      </ul>
    </article>
  );
}
