"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/schema";

/**
 * Browser-side Supabase client. Uses the anon key only; RLS enforces access.
 */
export function supabaseBrowser() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
