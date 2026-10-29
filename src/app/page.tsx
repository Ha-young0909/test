import { Suspense } from "react";
import { connection } from "next/server";
import { inSeason } from "@/data/seasonal";
import type { Seafood } from "@/data/seasonal";
import RegionTabs from "@/components/RegionTabs";
import SeafoodCard from "@/components/SeafoodCard";
import { REGIONS, REGION_LABELS, type Region, type SeasonLabel } from "@/types/seafood";

// TODO: feature/season-score(C)의 순수 함수로 교체
const labelFor = (s: Seafood): SeasonLabel => (s.price <= s.normalPrice ? "best" : "pricey");

const parseRegion = (v: string | string[] | undefined): Region =>
  REGIONS.find((r) => r === v) ?? "east";

async function Recommendation({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  await connection();
  const region = parseRegion((await searchParams).region);
  const month = new Date().getMonth() + 1;
  const items = inSeason(month, region);

  return (
    <>
      <div className="space-y-2.5 text-center">
        <p className="text-sm font-bold tracking-wide text-brand">
          {month}월 · {REGION_LABELS[region]}의 제철
        </p>
        <h1 className="text-4xl font-bold">오늘의 횟감 추천</h1>
      </div>
      <div className="mt-7">
        <RegionTabs current={region} />
      </div>
      {items.length === 0 ? (
        <p className="mt-10 rounded-3xl border border-dashed border-line py-14 text-center text-muted">
          이번 달 {REGION_LABELS[region]} 권역의 제철 횟감 정보가 아직 없어요.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {items.map((s) => (
            <SeafoodCard key={s.name} item={s} label={labelFor(s)} />
          ))}
        </div>
      )}
      <p className="mt-6 text-center text-xs text-muted">가격은 예시입니다.</p>
    </>
  );
}

function Loading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="mx-auto h-24 w-2/3 animate-pulse rounded-2xl bg-line" />
      <div className="h-14 animate-pulse rounded-2xl bg-line" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-44 animate-pulse rounded-3xl bg-line" />
        <div className="h-44 animate-pulse rounded-3xl bg-line" />
      </div>
    </div>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
      <Suspense fallback={<Loading />}>
        <Recommendation searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
