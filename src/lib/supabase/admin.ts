import { createClient } from "@supabase/supabase-js";

// 쓰기 전용 서버 클라이언트 (RLS 우회). 수집 API Route에서만 사용한다.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았어요.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
