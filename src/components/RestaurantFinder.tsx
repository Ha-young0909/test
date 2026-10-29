"use client";

import { useState } from "react";
import type { Restaurant } from "@/app/api/restaurants/route";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; restaurants: Restaurant[] };

function formatDistance(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`;
}

export default function RestaurantFinder() {
  const [state, setState] = useState<State>({ status: "idle" });

  function search() {
    if (!navigator.geolocation) {
      setState({ status: "error", message: "이 브라우저는 위치 기능을 지원하지 않아요." });
      return;
    }
    setState({ status: "loading" });

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `/api/restaurants?lat=${coords.latitude}&lng=${coords.longitude}`,
          );
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setState({ status: "done", restaurants: data.restaurants });
        } catch (e) {
          setState({
            status: "error",
            message: e instanceof Error ? e.message : "검색에 실패했어요.",
          });
        }
      },
      () =>
        setState({
          status: "error",
          message: "위치 권한을 허용해야 가까운 횟집을 찾을 수 있어요.",
        }),
      { timeout: 10000 },
    );
  }

  return (
    <div className="mt-4">
      <button
        onClick={search}
        disabled={state.status === "loading"}
        className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-700 disabled:opacity-60"
      >
        {state.status === "loading" ? "찾는 중…" : "가까운 횟집 찾기"}
      </button>

      {state.status === "error" && (
        <p className="mt-3 text-sm text-red-600">{state.message}</p>
      )}

      {state.status === "done" &&
        (state.restaurants.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">반경 5km 내 횟집이 없어요.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {state.restaurants.map((r) => (
              <li key={r.id} className="text-sm">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium hover:underline"
                >
                  {r.name}
                </a>{" "}
                <span className="text-zinc-500">
                  · {formatDistance(r.distance)} · {r.address}
                </span>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
