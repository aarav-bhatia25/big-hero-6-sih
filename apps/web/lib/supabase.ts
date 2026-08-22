import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const globalForSupabase = globalThis as unknown as { supabase?: SupabaseClient | null };

/**
 * Server-side Supabase client (service_role — bypasses RLS).
 * Returns null when env vars are absent so routes fall back to mock data
 * instead of crashing the dev server.
 */
export function getSupabase(): SupabaseClient | null {
  if (globalForSupabase.supabase !== undefined) return globalForSupabase.supabase;

  if (!url || !serviceKey) {
    console.warn(
      "[prahari] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — running on mock data."
    );
    globalForSupabase.supabase = null;
    return null;
  }

  globalForSupabase.supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return globalForSupabase.supabase;
}

export const isSupabaseConfigured = Boolean(url && serviceKey);
