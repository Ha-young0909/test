import Link from "next/link";
import CreateRoomButton from "@/components/CreateRoomButton";

// supabase/seed.sql 의 데모 방 ID 와 같아야 한다.
const DEMO_ROOM_ID = "00000000-0000-4000-8000-000000000001";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold sm:text-4xl">약속 장소 투표 지도</h1>
        <p className="text-gray-600 dark:text-gray-400">
          친구들의 출발지를 모아 대중교통 기준 중간 지점을 찾고,
          <br />
          투표로 약속 장소를 정해요.
        </p>
      </div>
      <CreateRoomButton />
      <Link
        href={`/room/${DEMO_ROOM_ID}`}
        className="text-sm text-gray-500 underline underline-offset-4 hover:text-gray-800 dark:hover:text-gray-200"
      >
        데모 방 둘러보기
      </Link>
    </main>
  );
}
