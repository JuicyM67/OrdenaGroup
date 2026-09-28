"use client";

import { createBrowserClient } from "@supabase/ssr";

import { readSupabaseAuthEnv } from "./env";

/**
 * Supabase-klient för klientkomponenter (login-formuläret, WP-15). Bara
 * auth (D-019) — ingen data hämtas via den här klienten.
 */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = readSupabaseAuthEnv();
  return createBrowserClient(url, anonKey);
}
