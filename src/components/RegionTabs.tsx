import Link from "next/link";
import { REGIONS, REGION_LABELS, type Region } from "@/types/seafood";

export default function RegionTabs({ current }: { current: Region }) {
  return (
    <nav aria-label="권역 선택" className="grid grid-cols-4 gap-1.5 rounded-2xl border border-line bg-surface p-1.5">
      {REGIONS.map((r) => (
        <Link
          key={r}
          href={`/?region=${r}`}
          aria-current={r === current ? "page" : undefined}
          className={`rounded-xl py-3 text-center text-sm font-bold transition-colors ${
            r === current ? "bg-brand text-white dark:text-background" : "text-muted hover:bg-brand/10"
          }`}
        >
          {REGION_LABELS[r]}
        </Link>
      ))}
    </nav>
  );
}
