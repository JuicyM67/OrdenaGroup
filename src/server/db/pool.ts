import "server-only";

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

function poolMax(): number {
  const raw = process.env.DATABASE_POOL_MAX;
  const n = raw === undefined ? DEFAULT_MAX : Number(raw);
  return Number.isInteger(n) && n > 0 && n <= 20 ? n : DEFAULT_MAX;
}

export function getPool(): pg.Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Värdet nämns aldrig i felet.
    throw new Error("DATABASE_URL saknas (bara servern, se .env.example)");
  }
  pool = new pg.Pool({
    connectionString,
    max: poolMax(),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
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
