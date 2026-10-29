"use client";

import { useEffect, useRef, useState } from "react";

export interface MapPoint {
  lat: number;
  lng: number;
}
export interface ParticipantPin extends MapPoint {
  nickname: string;
}
export interface StationPin extends MapPoint {
  name: string;
}
export interface CandidatePin extends MapPoint {
  number: number;
  name: string;
}

interface MapProps {
  participants?: ParticipantPin[];
  station?: StationPin | null;
  candidates?: CandidatePin[];
  className?: string;
}

// 사용하는 카카오 지도 SDK 부분만 최소로 선언한다.
interface KakaoLatLng {
  getLat(): number;
  getLng(): number;
}
interface KakaoBounds {
  extend(latlng: KakaoLatLng): void;
}
interface KakaoOverlay {
  setMap(map: KakaoMapInstance | null): void;
}
interface KakaoMapInstance {
  setBounds(bounds: KakaoBounds, ...padding: number[]): void;
  setCenter(latlng: KakaoLatLng): void;
  relayout(): void;
}
interface KakaoMaps {
  load(cb: () => void): void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoBounds;
  Map: new (el: HTMLElement, opts: { center: KakaoLatLng; level: number }) => KakaoMapInstance;
  CustomOverlay: new (opts: {
    position: KakaoLatLng;
    content: HTMLElement;
    yAnchor?: number;
    zIndex?: number;
  }) => KakaoOverlay;
}
declare global {
  interface Window {
    kakao?: { maps: KakaoMaps };
  }
}

const DEFAULT_CENTER: MapPoint = { lat: 37.5665, lng: 126.978 }; // 서울시청

let sdkPromise: Promise<KakaoMaps> | null = null;

function loadKakaoSdk(): Promise<KakaoMaps> {
  if (sdkPromise) return sdkPromise;
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!key) {
    return Promise.reject(new Error("NEXT_PUBLIC_KAKAO_JS_KEY가 설정되지 않았습니다."));
  }
  sdkPromise = new Promise<KakaoMaps>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false`;
    script.async = true;
    script.onload = () => {
      const kakao = window.kakao;
      if (!kakao) return reject(new Error("카카오 지도 SDK를 불러오지 못했습니다."));
      kakao.maps.load(() => resolve(kakao.maps));
    };
    script.onerror = () => {
      sdkPromise = null;
      script.remove();
      reject(new Error("카카오 지도 SDK를 불러오지 못했습니다. 등록된 도메인인지 확인해 주세요."));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

// 닉네임 등 사용자 입력이 들어가므로 textContent로만 채운다.
function pin(kind: "participant" | "station" | "candidate", label: string, text?: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;pointer-events:none;";

  const dot = document.createElement("div");
  const colors = { participant: "#2563eb", station: "#dc2626", candidate: "#16a34a" };
  dot.style.cssText = `min-width:26px;height:26px;padding:0 6px;border-radius:13px;background:${colors[kind]};color:#fff;font:700 13px/26px sans-serif;text-align:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);white-space:nowrap;`;
  dot.textContent = label;
  wrap.appendChild(dot);

  if (text) {
    const tag = document.createElement("div");
    tag.style.cssText =
      "margin-top:2px;padding:1px 6px;border-radius:4px;background:rgba(255,255,255,.95);color:#111;font:12px/1.4 sans-serif;box-shadow:0 1px 3px rgba(0,0,0,.3);white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;";
    tag.textContent = text;
    wrap.appendChild(tag);
  }
  return wrap;
}

export default function Map({ participants = [], station = null, candidates = [], className }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const overlaysRef = useRef<KakaoOverlay[]>([]);
  const [maps, setMaps] = useState<KakaoMaps | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadKakaoSdk()
      .then((m) => !cancelled && setMaps(m))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!maps || !containerRef.current) return;
    if (!mapRef.current) {
      mapRef.current = new maps.Map(containerRef.current, {
        center: new maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
        level: 7,
      });
    }
    const map = mapRef.current;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const bounds = new maps.LatLngBounds();
    let count = 0;
    const add = (p: MapPoint, content: HTMLElement, zIndex: number) => {
      const position = new maps.LatLng(p.lat, p.lng);
      const overlay = new maps.CustomOverlay({ position, content, yAnchor: 1, zIndex });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
      bounds.extend(position);
      count += 1;
    };

    participants.forEach((p) => add(p, pin("participant", p.nickname.slice(0, 1) || "?", p.nickname), 1));
    candidates.forEach((c) => add(c, pin("candidate", String(c.number), c.name), 2));
    if (station) add(station, pin("station", "역", station.name), 3);

    map.relayout();
    if (count > 1) {
      map.setBounds(bounds, 60, 60, 60, 60);
    } else if (count === 1) {
      const only = station ?? candidates[0] ?? participants[0];
      map.setCenter(new maps.LatLng(only.lat, only.lng));
    }
  }, [maps, participants, station, candidates]);

  if (error) {
    return (
      <div
        role="alert"
        className={`flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-600 ${className ?? "h-80"}`}
      >
        지도를 표시할 수 없습니다. {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`rounded-lg bg-gray-100 ${className ?? "h-80 w-full"}`}
      aria-label="약속 장소 지도"
    />
  );
}
