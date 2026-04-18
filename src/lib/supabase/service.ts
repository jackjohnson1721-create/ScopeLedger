import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/schema";

/**
 * Service-role Supabase client. Bypasses RLS — use ONLY in:
 *   - webhook handlers that have verified the caller's signature
 *   - cron jobs / background workers
 *   - platform_super_admin code paths
 * Never import from a user-facing route that trusts the session.
 */
let cached: SupabaseClient<Database> | null = null;
export function supabaseService(): SupabaseClient<Database> {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL missing");
  }
  cached = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
