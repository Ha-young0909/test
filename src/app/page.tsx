import { Suspense } from "react";
import { connection } from "next/server";
import { inSeason } from "@/data/seasonal";
import RestaurantFinder from "@/components/RestaurantFinder";

async function SeasonalList() {
  await connection();
  const month = new Date().getMonth() + 1;
  const items = inSeason(month);

  return (
    <>
      <h1 className="text-3xl font-bold">🐟 {month}월 제철 횟감</h1>
      <p className="mt-2 text-zinc-500">
        지금 가장 맛있는 횟감과 가까운 횟집, 어울리는 음식을 추천해요.
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {items.map((s) => (
          <li key={s.name} className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
            <h2 className="text-xl font-semibold">{s.name}</h2>
            <p className="mt-2 text-sm text-zinc-500">
              함께 먹으면 좋은 음식: {s.pairings.join(", ")}
            </p>
            <RestaurantFinder />
          </li>
        ))}
      </ul>
    </>
  );
}

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10">
      <Suspense fallback={<p className="text-zinc-500">제철 횟감을 불러오는 중…</p>}>
        <SeasonalList />
      </Suspense>
    </main>
  );
}
