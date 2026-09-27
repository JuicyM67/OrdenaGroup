import "server-only";

import { pgErrorCode } from "@/server/db/errors";
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

/**
 * Kör `fn` i rätt transaktion för aktören: kund → service role (explicit
 * business_id i varje fråga), ägare → authenticated + RLS.
 *
 * - Ett förväntat fel (`{ ok: false }`) rullar tillbaka allt som `fn` skrivit
 *   (t.ex. en ny kundrad när bokningen blev `slot_taken`) och returneras.
 * - Oväntade fel blir `SchedulingInfraError` med bara SQLSTATE (inga värden,
 *   ingen SQL, ingen token).
 */
export async function runAs<T, E extends string>(
  actor: Actor,
  fn: (q: Queryable) => Promise<Result<T, E>>,
): Promise<Result<T, E>> {
  const guarded = async (q: Queryable) => {
    const r = await fn(q);
    if (!r.ok) throw new Rollback(r);
    return r;
  };
  try {
    return actor.kind === "owner"
      ? await withOwnerTx(actor.userId, guarded)
      : await withServiceTx(guarded);
  } catch (e) {
    if (e instanceof Rollback) return (e as Rollback<E>).result;
    if (e instanceof SchedulingInfraError) throw e;
    throw new SchedulingInfraError(pgErrorCode(e));
  }
}
