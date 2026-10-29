import "server-only";
import { createClient } from "@supabase/supabase-js";

// 쓰기 전용 service role 클라이언트. 서버에서만 import 할 수 있다.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
