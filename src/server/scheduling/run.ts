import "server-only";

import { isRetryableConflict, pgErrorCode } from "@/server/db/errors";
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx, withServiceTx } from "@/server/db/tx";

import { SchedulingInfraError, type Result } from "./result";
import type { Actor } from "./types";

/** Bär ett förväntat fel ut ur transaktionen så att den rullas tillbaka. */
class Rollback<E extends string> extends Error {
  constructor(readonly result: { ok: false; error: E }) {
    super("rollback");
  }
}

/** Första försöket + ett omförsök av hela transaktionen vid 40P01/40001. */
const MAX_ATTEMPTS = 2;

/**
 * Kör `fn` i rätt transaktion för aktören: kund → service role (explicit
 * business_id i varje fråga), ägare → authenticated + RLS.
 *
 * - Ett förväntat fel (`{ ok: false }`) rullar tillbaka allt som `fn` skrivit
 *   (t.ex. en ny kundrad när bokningen blev `slot_taken`) och returneras.
 * - Deadlock/serialiseringsfel (40P01/40001) kör om hela transaktionen en
 *   gång; krockar den igen returneras `onConflict` (t.ex. `slot_taken`) om
 *   den finns, annars blir det ett infrastrukturfel.
 * - Oväntade fel blir `SchedulingInfraError` med bara SQLSTATE (inga värden,
 *   ingen SQL, ingen token).
 */
export async function runAs<T, E extends string>(
  actor: Actor,
  fn: (q: Queryable) => Promise<Result<T, E>>,
  opts: {
    onConflict?: { ok: false; error: E };
    /** WP-46: 42501 från RLS/triggern (`bookings_guard_status`) när en
     * personalaktör saknar behörighet. Databasen har sista ordet; TS-
     * kontrollen (`src/server/bookings/authz.ts`) speglar samma regler. */
    onForbidden?: { ok: false; error: E };
  } = {},
): Promise<Result<T, E>> {
  const guarded = async (q: Queryable) => {
    const r = await fn(q);
    if (!r.ok) throw new Rollback(r);
    return r;
  };
  for (let attempt = 1; ; attempt++) {
    try {
      return actor.kind === "owner"
        ? await withOwnerTx(actor.userId, guarded)
        : await withServiceTx(guarded);
    } catch (e) {
      if (e instanceof Rollback) return (e as Rollback<E>).result;
      if (e instanceof SchedulingInfraError) throw e;
      if (opts.onForbidden && pgErrorCode(e) === "42501") {
        return opts.onForbidden;
      }
      if (isRetryableConflict(e)) {
        if (attempt < MAX_ATTEMPTS) continue;
        if (opts.onConflict) return opts.onConflict;
      }
      throw new SchedulingInfraError(pgErrorCode(e));
    }
  }
}
