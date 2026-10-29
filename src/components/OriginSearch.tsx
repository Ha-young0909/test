"use client";

import { useEffect, useRef, useState } from "react";

export interface Origin {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface OriginSearchProps {
  onSelect: (origin: Origin) => void;
  disabled?: boolean;
}

export default function OriginSearch({ onSelect, disabled }: OriginSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Origin[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Origin | null>(null);
  const [locating, setLocating] = useState(false);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "검색에 실패했습니다.");
        setResults(body.results);
        setSearched(true);
      } catch (e) {
        if (controller.signal.aborted) return;
        setResults([]);
        setError(e instanceof Error ? e.message : "검색에 실패했습니다.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function choose(origin: Origin) {
    skipNextSearch.current = true;
    setQuery(origin.name);
    setResults([]);
    setSearched(false);
    setError(null);
    setSelected(origin);
    onSelect(origin);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("이 브라우저는 위치 기능을 지원하지 않습니다. 장소를 검색해 주세요.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        choose({
          name: "현재 위치",
          address: "현재 위치",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        setLocating(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "위치 권한이 거부되었습니다. 장소를 검색해 주세요."
            : "현재 위치를 가져오지 못했습니다. 장소를 검색해 주세요.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  return (
    <div className="w-full">
      <label htmlFor="origin-search" className="mb-1 block text-sm font-medium">
        출발지
      </label>
      <div className="flex gap-2">
        <input
          id="origin-search"
          type="search"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            if (e.target.value.trim().length < 2) {
              setResults([]);
              setSearched(false);
              setLoading(false);
            }
          }}
          placeholder="주소 또는 장소 검색 (예: 홍대입구역)"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={disabled || locating}
          className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {locating ? "확인 중…" : "현재 위치 사용"}
        </button>
      </div>

      {loading && <p className="mt-2 text-sm text-gray-500">검색 중…</p>}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {!loading && !error && searched && results.length === 0 && (
        <p className="mt-2 text-sm text-gray-500">검색 결과가 없습니다. 다른 키워드로 찾아보세요.</p>
      )}

      {results.length > 0 && (
        <ul className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white">
          {results.map((r) => (
            <li key={`${r.name}-${r.lat}-${r.lng}`}>
              <button
                type="button"
                onClick={() => choose(r)}
                className="block w-full px-3 py-2 text-left hover:bg-gray-50"
              >
                <span className="block text-sm font-medium">{r.name}</span>
                <span className="block text-xs text-gray-500">{r.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <p className="mt-2 text-sm text-green-700">
          선택됨: {selected.name}
          {selected.address && selected.address !== selected.name ? ` (${selected.address})` : ""}
        </p>
      )}
    </div>
  );
}
