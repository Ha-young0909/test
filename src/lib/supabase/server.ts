import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serverClient: SupabaseClient | null = null;

/**
 * 서버 전용 service role 클라이언트. RLS 를 우회하므로 Route Handler /
 * Server Component 에서만 import 한다. 클라이언트 컴포넌트에서 import 금지.
 */
export function getServerSupabase(): SupabaseClient {
  if (serverClient) return serverClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았습니다.");
  }
  serverClient = createClient(url, serviceKey, { auth: { persistSession: false } });
  return serverClient;
}
