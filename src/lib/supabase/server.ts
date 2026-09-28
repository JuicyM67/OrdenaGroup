import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { readSupabaseAuthEnv } from "./env";

/**
 * Supabase-klient för Server Components, Route Handlers och server actions
 * (D-019: `@supabase/ssr` bara för auth — all annan serverdata går via
 * `src/server/db/`). Läser/skriver sessionscookien via `next/headers`.
 *
 * `setAll` kan kasta när den anropas från en ren Server Component (som inte
 * får sätta cookies) — `src/proxy.ts` uppdaterar sessionen på varje
 * matchande request, så ett förbigånget skriv här stör inte inloggningen.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = readSupabaseAuthEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component: ingen skrivbar cookie-butik. proxy.ts (WP-15)
          // förnyar sessionen på varje request, så det här är ofarligt.
        }
      },
    },
  });
}
