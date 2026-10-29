"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveHostId } from "@/lib/session";
import type { ApiError, CreateRoomResponse } from "@/types";

export default function CreateRoomButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createRoom() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data: CreateRoomResponse | ApiError = await res.json();
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "방을 만들지 못했습니다.");
      }
      saveHostId(data.roomId, data.hostId);
      router.push(`/room/${data.roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "방을 만들지 못했습니다.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={createRoom}
        disabled={loading}
        className="rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow transition hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? "만드는 중..." : "방 만들기"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
