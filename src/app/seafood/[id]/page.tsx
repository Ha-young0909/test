import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPairings } from "@/lib/pairings";

async function Pairings({ seafoodId, name }: { seafoodId: number; name: string }) {
  await connection();

  let pairings;
  try {
    pairings = await getPairings(seafoodId, name);
  } catch {
    return <p className="text-sm text-muted">추천 음식을 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>;
  }

  if (pairings.length === 0) {
    return <p className="text-sm text-muted">아직 추천 음식이 없어요.</p>;
  }

  return (
    <ul className="space-y-3">
      {pairings.map((p) => (
        <li key={p.id} className="rounded-2xl border border-line bg-surface p-4">
          <p className="font-bold">{p.name}</p>
          {p.note && <p className="mt-1 text-sm text-muted">{p.note}</p>}
        </li>
      ))}
    </ul>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seafoodId = Number(id);
  if (!Number.isInteger(seafoodId)) notFound();

  const supabase = await createClient();
  const { data: seafood } = await supabase
    .from("seafood")
    .select("id, name, description")
    .eq("id", seafoodId)
    .maybeSingle();
  if (!seafood) notFound();

  return (
    <>
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">{seafood.name}</h1>
        {seafood.description && <p className="text-muted">{seafood.description}</p>}
      </div>
      <section className="space-y-4">
        <h2 className="text-xl font-bold">함께 먹으면 좋은 음식</h2>
        <Suspense fallback={<p className="text-sm text-muted">추천 음식을 준비하는 중…</p>}>
          <Pairings seafoodId={seafood.id} name={seafood.name} />
        </Suspense>
      </section>
    </>
  );
}

export default function SeafoodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 space-y-8 px-6 py-14">
      <Suspense fallback={<p className="text-center text-muted">불러오는 중…</p>}>
        <Detail params={params} />
      </Suspense>
    </main>
  );
}
