import { createClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL ?? "").trim().replace(/\/rest\/v1\/?$/, "");
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

/**
 * True when real credentials exist. Without them the app falls back to
 * full demo mode: simulated magic link, everything in localStorage.
 */
export const SUPABASE_READY = Boolean(url && key);

export const supabase = SUPABASE_READY
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // magic-link redirects sign in on landing
      },
    })
  : null;
