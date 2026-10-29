"use client";

import { useRef, useState } from "react";
import type { Seafood } from "@/data/seasonal";

export default function SeafoodSlider({
  items,
  month,
}: {
  items: Seafood[];
  month: number;
}) {
  const [index, setIndex] = useState(0);
  const startX = useRef(0);
  const count = items.length;

  const go = (i: number) => setIndex((i + count) % count);

  return (
    <div className="space-y-6">
      <div
        className="overflow-hidden rounded-3xl border border-line bg-surface"
        onTouchStart={(e) => {
          startX.current = e.changedTouches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - startX.current;
          if (dx < -40) go(index + 1);
          else if (dx > 40) go(index - 1);
        }}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {items.map((s) => {
            const now = s.months.includes(month);
            return (
              <article key={s.name} className="flex w-full shrink-0 flex-col">
                <div className="relative flex h-80 items-center justify-center bg-brand/15 text-sm font-medium text-brand-strong">
                  [{s.name} 사진]
                  <span className="absolute left-4 top-4 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-bold text-background">
                    {now ? "지금 제철" : "제철"} · {s.months[0]}~{s.months[s.months.length - 1]}월
                  </span>
                </div>
                <div className="space-y-5 p-7">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h2 className="text-3xl font-bold">{s.name}</h2>
                    <span className="text-2xl font-bold text-accent">
                      {s.price.toLocaleString("ko-KR")}
                      <span className="text-sm font-medium text-muted"> 원/kg</span>
                    </span>
                  </div>
                  <hr className="border-line" />
                  <div className="space-y-2.5">
                    <p className="text-sm font-medium text-muted">같이 먹으면 좋은 음식</p>
                    <ul className="flex flex-wrap gap-2">
                      {s.pairings.map((p) => (
                        <li
                          key={p}
                          className="rounded-full bg-brand/10 px-4 py-2 text-sm font-medium text-brand-strong"
                        >
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => go(index - 1)}
          aria-label="이전 횟감"
          className="h-12 w-12 rounded-full border border-line bg-surface text-xl"
        >
          ←
        </button>
        <div className="flex items-center">
          {items.map((s, i) => (
            <button
              key={s.name}
              onClick={() => go(i)}
              aria-label={`${s.name} 보기`}
              className="flex h-11 w-7 items-center justify-center"
            >
              <span
                className={`block h-2.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-brand" : "w-2.5 bg-line"
                }`}
              />
            </button>
          ))}
        </div>
        <button
          onClick={() => go(index + 1)}
          aria-label="다음 횟감"
          className="h-12 w-12 rounded-full bg-brand text-xl text-white dark:text-background"
        >
          →
        </button>
      </div>
    </div>
  );
}
