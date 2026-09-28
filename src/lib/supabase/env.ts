/**
 * Supabase Auth-konfiguration som är gemensam för server- och
 * webbläsarklienten (WP-15, D-019: `@supabase/ssr` bara för auth). Bara de
 * två publika variablerna (`NEXT_PUBLIC_*`, redan i .env.example) — aldrig
 * `SUPABASE_SERVICE_ROLE_KEY` här (den läses bara av `src/server/db/pool.ts`
 * indirekt via `DATABASE_URL`/`DATABASE_CA_CERT`, se boundaries.test.ts).
 */
export type SupabaseAuthEnv = {
  url: string;
  anonKey: string;
};

export function readSupabaseAuthEnv(): SupabaseAuthEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY saknas (se .env.example)",
    );
  }
  return { url, anonKey };
}
