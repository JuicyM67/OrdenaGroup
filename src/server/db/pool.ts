import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import pg from "pg";

/**
 * En lat `pg.Pool` från `DATABASE_URL` (D-019). Lokalt och i CI är det den
 * lokala Supabase-containern (127.0.0.1:54322). På Vercel går URL:en via
 * Supavisor i transaction mode (port 6543, WP-05): därför används inga
 * sessionsberoende funktioner — inga namngivna prepared statements, inget
 * `set` utanför en transaktion (bara `set local` i `tx.ts`) och inga
 * advisory locks på sessionsnivå.
 *
 * Det här är den ENDA filen som läser `DATABASE_URL` (gränstest i
 * `src/server/boundaries.test.ts`). Anslutningen är `postgres`, en stark
 * hemlighet (R4 i WP-10): varje transaktion byter roll direkt i `tx.ts`.
 */

export type QueryResultLike<R> = { rows: R[]; rowCount: number | null };

/** Minsta gränssnitt för frågor, så att tester kan räkna eller fånga dem. */
export interface Queryable {
  query<R extends object = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<QueryResultLike<R>>;
}

let pool: pg.Pool | undefined;

/** Litet antal anslutningar per serverless-instans (R5). */
const DEFAULT_MAX = 3;

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

export type DatabaseEnv = {
  DATABASE_URL?: string | undefined;
  DATABASE_CA_CERT?: string | undefined;
  DATABASE_POOL_MAX?: string | undefined;
};

function poolMax(raw: string | undefined): number {
  const n = raw === undefined ? DEFAULT_MAX : Number(raw);
  return Number.isInteger(n) && n > 0 && n <= 20 ? n : DEFAULT_MAX;
}

/**
 * Poolens konfiguration från env (ren funktion, testbar). Lokal värd
 * (127.0.0.1/localhost) kör utan TLS. Alla andra värdar kräver TLS med
 * verifierat certifikat mot `DATABASE_CA_CERT` (PEM, Supabase root CA);
 * utan den vägrar servern starta. ssl-parametrar i URL:en tas bort, så att
 * t.ex. `sslmode=require` aldrig kan ersätta verifieringen. Fel nämner
 * aldrig URL:en eller lösenordet.
 */
export function poolConfig(env: DatabaseEnv): pg.PoolConfig {
  const raw = env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL saknas (bara servern, se .env.example)");
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("DATABASE_URL är inte en giltig URL");
  }
  const base = {
    max: poolMax(env.DATABASE_POOL_MAX),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  };
  if (LOCAL_HOSTS.has(url.hostname)) {
    return { ...base, connectionString: raw };
  }
  const ca = env.DATABASE_CA_CERT?.replace(/\\n/g, "\n").trim();
  if (!ca || !ca.includes("-----BEGIN CERTIFICATE-----")) {
    throw new Error(
      "DATABASE_CA_CERT saknas eller är inte PEM: TLS med verifierat certifikat krävs mot en databas som inte är lokal",
    );
  }
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("ssl")) url.searchParams.delete(key);
  }
  return {
    ...base,
    connectionString: url.toString(),
    ssl: { ca, rejectUnauthorized: true },
  };
}

export function getPool(): pg.Pool {
  if (pool) return pool;
  pool = new pg.Pool(
    poolConfig({
      DATABASE_URL: process.env.DATABASE_URL,
      DATABASE_CA_CERT: process.env.DATABASE_CA_CERT,
      DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX,
    }),
  );
  // Ett fel på en vilande anslutning (t.ex. omstartad databas) får inte
  // krascha processen. pg tar själv bort anslutningen ur poolen; nästa
  // fråga får en ny. Inget loggas här (inga persondata i loggar).
  pool.on("error", () => undefined);
  return pool;
}

/** För tester och skript: stänger poolen så att processen kan avslutas. */
export async function closePool(): Promise<void> {
  const p = pool;
  pool = undefined;
  if (p) await p.end();
}

let storageAdmin: SupabaseClient | undefined;

/**
 * Storage-adminklient (säkerhetsgranskning WP-26, punkt B2): `purgeBusiness`
 * (src/server/privacy/business.ts) måste radera business-media/<bid>/ via
 * den RIKTIGA Storage-API:n (`list()` + `remove()`), inte ett SQL-delete mot
 * `storage.objects` — ett sådant delete kringgår bara statement-triggern
 * `storage.protect_delete()` (se supabase/tests/101_business_media_storage.
 * test.sql) och tar bort METADATARADEN, men i en molnbackend (S3) lämnar det
 * själva filen kvar. `remove()` kräver service role-nyckeln.
 *
 * `SUPABASE_SERVICE_ROLE_KEY` läses bara HÄR (samma gränstest som
 * `DATABASE_URL`, se filkommentaren ovan) — ingen sessionsklient
 * (`@supabase/ssr`, som bara hanterar auth, WP-15): det här är en
 * fristående admin-klient utan cookie/session, byggd en gång per process.
 */
export function getStorageAdminClient(): SupabaseClient {
  if (storageAdmin) return storageAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY saknas (bara servern, se .env.example)",
    );
  }
  storageAdmin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return storageAdmin;
}

/** För tester: tvingar en ny klient nästa gång (t.ex. efter att ha bytt env). */
export function resetStorageAdminClient(): void {
  storageAdmin = undefined;
}
