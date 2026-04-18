import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS — use ONLY in:
 *   - webhook handlers that have verified the caller's signature
 *   - cron jobs / background workers
 *   - platform_super_admin code paths
 * Never import from a user-facing route that trusts the session.
 *
 * Returns an untyped client in Phase 1; replaced with generated types
 * once `supabase gen types typescript` lands.
 */
let cached: SupabaseClient | null = null;
export function supabaseService(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL missing");
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
