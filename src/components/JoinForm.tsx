"use client";

import { useState } from "react";
import { getHostId, saveParticipantId, saveParticipantToken } from "@/lib/session";
import { normalizeNickname } from "@/lib/validate";
import { NICKNAME_MAX_LENGTH, type ApiError, type JoinRoomResponse } from "@/types";

interface Props {
  roomId: string;
  onJoined: (participantId: string) => void;
}

export default function JoinForm({ roomId, onJoined }: Props) {
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = normalizeNickname(nickname);
    if (!clean) {
      setError(`닉네임은 1~${NICKNAME_MAX_LENGTH}자로 입력해 주세요.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${roomId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: clean, hostId: getHostId(roomId) ?? undefined }),
      });
      const data: JoinRoomResponse | ApiError = await res.json();
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "참여하지 못했습니다.");
      }
      saveParticipantId(roomId, data.participantId);
      saveParticipantToken(roomId, data.participantToken);
      onJoined(data.participantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "참여하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
      <label htmlFor="nickname" className="block text-sm font-medium">
        닉네임
      </label>
      <div className="flex gap-2">
        <input
          id="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={NICKNAME_MAX_LENGTH}
          placeholder="친구들이 알아볼 이름"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-transparent px-3 py-2 dark:border-gray-600"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "참여 중..." : "참여하기"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
