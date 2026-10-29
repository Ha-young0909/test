"use client";

import { useEffect, useRef, useState } from "react";

export interface Origin {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface OriginSearchProps {
  /** "내 출발지 등록하기"를 눌렀을 때 호출한다. 실패하면 throw 해서 메시지를 보여 준다. */
  onSubmit: (origin: Origin) => Promise<void> | void;
  /** 이미 등록한 출발지 이름. 있으면 버튼 문구가 "출발지 변경하기"가 된다. */
  registeredLabel?: string | null;
  disabled?: boolean;
}

export default function OriginSearch({ onSubmit, registeredLabel, disabled }: OriginSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Origin[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Origin | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
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
    setDone(false);
  }

  async function submit() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(selected);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "출발지를 저장하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
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
    <div className="flex w-full flex-col gap-2 text-[#17201B]">
      <label htmlFor="origin-search" className="text-sm font-bold">
        내 출발지
      </label>
      <div className="relative flex">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#4A554F"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
          className="absolute top-[18px] left-4"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          id="origin-search"
          type="search"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setDone(false);
            if (e.target.value.trim().length < 2) {
              setResults([]);
              setSearched(false);
              setLoading(false);
            }
          }}
          placeholder="주소나 장소를 검색하세요"
          autoComplete="off"
          className="h-14 min-w-0 flex-1 rounded-[14px] border-[1.5px] border-[#17201B] bg-white pr-4 pl-[46px] text-base placeholder:text-[#6B7570] focus:outline-2 focus:outline-offset-2 focus:outline-[#E8553D]"
        />
      </div>

      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={disabled || locating}
        className="flex min-h-11 items-center gap-1.5 self-start text-sm font-bold text-[#B8381F] disabled:opacity-50"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#B8381F"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="8" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
        {locating ? "위치 확인 중…" : "현재 위치 사용"}
      </button>

      {loading && <p className="text-sm text-[#4A554F]">검색 중…</p>}
      {error && (
        <p role="alert" className="text-sm text-[#B8381F]">
          {error}
        </p>
      )}
      {!loading && !error && searched && results.length === 0 && (
        <p className="text-sm text-[#4A554F]">검색 결과가 없습니다. 다른 키워드로 찾아보세요.</p>
      )}

      {results.length > 0 && (
        <ul className="max-h-64 overflow-y-auto rounded-[14px] border-[1.5px] border-[#17201B] bg-white">
          {results.map((r) => (
            <li key={`${r.name}-${r.lat}-${r.lng}`} className="border-b border-[#E9ECE4] last:border-b-0">
              <button
                type="button"
                onClick={() => choose(r)}
                className="block min-h-11 w-full px-4 py-2 text-left hover:bg-[#F7F6F2]"
              >
                <span className="block text-sm font-bold">{r.name}</span>
                <span className="block text-xs text-[#4A554F]">{r.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {registeredLabel && !selected && (
        <p className="text-sm text-[#4A554F]">현재 등록된 출발지: {registeredLabel}</p>
      )}
      {selected && (
        <p className="text-sm text-[#4A554F]">
          선택됨: <b className="text-[#17201B]">{selected.name}</b>
          {selected.address && selected.address !== selected.name ? ` (${selected.address})` : ""}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={disabled || !selected || submitting}
        className="mt-1 h-14 rounded-[14px] bg-[#17201B] text-[17px] font-bold text-white disabled:bg-[#9AA29D]"
      >
        {submitting ? "등록 중…" : done ? "등록 완료!" : registeredLabel ? "출발지 변경하기" : "내 출발지 등록하기"}
      </button>
    </div>
  );
}
