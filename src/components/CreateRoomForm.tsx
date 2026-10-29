"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveHostId } from "@/lib/session";
import { normalizeGroupName } from "@/lib/validate";
import { GROUP_NAME_MAX_LENGTH, type ApiError, type CreateRoomResponse } from "@/types";

/** 방장 첫 화면: 모임 이름을 정하고 초대 링크를 공유하면 방이 만들어진다. */
export default function CreateRoomForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function shareLink(roomId: string, groupName: string) {
    const url = `${window.location.origin}/room/${roomId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: groupName, text: `${groupName} 출발지를 입력해 주세요`, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // 공유 창을 닫았거나 클립보드가 막힌 경우. 방은 이미 만들어졌으므로 방 화면의 복사 버튼을 쓰면 된다.
    }
  }

  async function createAndShare(event: React.FormEvent) {
    event.preventDefault();
    const groupName = normalizeGroupName(name);
    if (!groupName) {
      setError(`모임 이름을 1~${GROUP_NAME_MAX_LENGTH}자로 입력해 주세요.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName }),
      });
      const data: CreateRoomResponse | ApiError = await res.json();
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "방을 만들지 못했습니다.");
      }
      saveHostId(data.roomId, data.hostId);
      await shareLink(data.roomId, groupName);
      router.push(`/room/${data.roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "방을 만들지 못했습니다.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={createAndShare} className="flex w-full max-w-sm flex-col gap-4 text-left">
      <div className="flex flex-col gap-2">
        <label htmlFor="group-name" className="text-sm font-bold">
          모임 이름
        </label>
        <input
          id="group-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={GROUP_NAME_MAX_LENGTH}
          placeholder="예) 금요일 저녁 모임"
          className="h-14 rounded-xl border-2 border-gray-900 bg-white px-4 text-lg text-gray-900 dark:border-gray-300"
        />
        <p className="text-sm text-gray-500">친구들 화면 맨 위에 이 이름이 보여요.</p>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="h-14 rounded-xl bg-gray-900 text-lg font-bold text-white transition hover:bg-gray-700 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
      >
        {loading ? "만드는 중..." : "링크 공유하기"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
