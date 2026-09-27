import "server-only";

import type pg from "pg";

import { getPool, type Queryable } from "./pool";

/**
 * Transaktioner med rollbyte (D-019). `set local` gäller bara inom
 * transaktionen, vilket är det som fungerar i Supavisor transaction mode:
 * anslutningen lämnas tillbaka som `postgres` efter commit/rollback.
 *
 * - `withServiceTx`: publika flöden, cron och webhooks. `service_role`
 *   förbigår RLS, så varje fråga mot en tenant-tabell MÅSTE filtrera på
 *   `business_id` (ARCHITECTURE princip 3, gränstest).
 * - `withOwnerTx(userId)`: ägarens åtgärder med en verifierad session (WP-15).
 *   `authenticated` + JWT-claims gör att RLS (`private.is_member`) gäller
 *   även på servern.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Gränser per transaktion (bara `set local`): en enskild sats, väntan på
 * ett lås (rad, exclusion constraint eller advisory lock) och en öppen
 * transaktion utan aktivitet. Överskridet lås ger 55P03 → infrastrukturfel.
 */
const LIMITS =
  "set local statement_timeout = '10s'; set local lock_timeout = '3s'; set local idle_in_transaction_session_timeout = '15s'";

function wrap(client: pg.PoolClient): Queryable {
  return {
    query: async <R extends object>(
      text: string,
      values?: readonly unknown[],
    ) => {
      const r = await client.query<R>(text, values as unknown[] | undefined);
      return { rows: r.rows, rowCount: r.rowCount };
    },
  };
}

async function runTx<T>(
  setup: (client: pg.PoolClient) => Promise<void>,
  fn: (q: Queryable) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  let broken: Error | undefined;
  try {
    await client.query("begin");
    try {
      await setup(client);
      const value = await fn(wrap(client));
      await client.query("commit");
      return value;
    } catch (e) {
      try {
        await client.query("rollback");
      } catch (rollbackError) {
        // Anslutningen är i okänt skick: släng den i stället för att återanvända.
        broken =
          rollbackError instanceof Error
            ? rollbackError
            : new Error("rollback misslyckades");
      }
      throw e;
    }
  } finally {
    client.release(broken);
  }
}

export function withServiceTx<T>(fn: (q: Queryable) => Promise<T>): Promise<T> {
  return runTx(async (client) => {
    await client.query(`set local role service_role; ${LIMITS}`);
  }, fn);
}

export function withOwnerTx<T>(
  userId: string,
  fn: (q: Queryable) => Promise<T>,
): Promise<T> {
  if (!UUID.test(userId)) {
    return Promise.reject(new TypeError("withOwnerTx: userId är inte en uuid"));
  }
  return runTx(async (client) => {
    await client.query(`set local role authenticated; ${LIMITS}`);
    // Både claims-objektet och de enskilda nycklarna sätts lokalt:
    // auth.uid() läser `request.jwt.claim.sub` först, så ett värde som
    // blivit kvar på sessionsnivå får aldrig vinna över ägarens id.
    await client.query(
      `select set_config('request.jwt.claims', $1, true),
              set_config('request.jwt.claim.sub', $2, true),
              set_config('request.jwt.claim.role', 'authenticated', true)`,
      [JSON.stringify({ sub: userId, role: "authenticated" }), userId],
    );
  }, fn);
}

let savepointSeq = 0;

/**
 * Kör `fn` i en savepoint. Fel rullar tillbaka bara savepointen och kastas
 * vidare; transaktionen kan fortsätta (används för "Cualquiera" efter 23P01).
 */
export async function savepoint<T>(
  q: Queryable,
  fn: () => Promise<T>,
): Promise<T> {
  savepointSeq = (savepointSeq + 1) % 1_000_000;
  const name = `sp_${savepointSeq}`;
  await q.query(`savepoint ${name}`);
  try {
    const value = await fn();
    await q.query(`release savepoint ${name}`);
    return value;
  } catch (e) {
    await q.query(`rollback to savepoint ${name}`);
    await q.query(`release savepoint ${name}`);
    throw e;
  }
}
