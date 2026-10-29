import { Suspense } from "react";
import { connection } from "next/server";
import { orderedForMonth } from "@/data/seasonal";
import SeafoodSlider from "@/components/SeafoodSlider";

async function Recommendation() {
  await connection();
  const month = new Date().getMonth() + 1;

  return (
    <>
      <div className="space-y-2.5 text-center">
        <p className="text-sm font-bold tracking-wide text-brand">{month}월의 제철</p>
        <h1 className="text-4xl font-bold">오늘의 횟감 추천</h1>
      </div>
      <div className="mt-7">
        <SeafoodSlider items={orderedForMonth(month)} month={month} />
      </div>
      <p className="mt-6 text-center text-xs text-muted">
        옆으로 밀거나 화살표를 눌러 다음 횟감을 보세요. 가격은 예시입니다.
      </p>
    </>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-14">
      <Suspense fallback={<p className="text-center text-muted">제철 횟감을 불러오는 중…</p>}>
        <Recommendation />
      </Suspense>
    </main>
  );
}
