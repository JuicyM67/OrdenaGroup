import "server-only";

import { pgErrorCode } from "@/server/db/errors";
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx, withServiceTx } from "@/server/db/tx";

import { SchedulingInfraError } from "./result";
import type { Actor } from "./types";

/**
 * Kör `fn` i rätt transaktion för aktören: kund → service role (explicit
 * business_id i varje fråga), ägare → authenticated + RLS. Oväntade fel blir
 * `SchedulingInfraError` med bara SQLSTATE (inga värden, ingen SQL, ingen token).
 */
export async function runAs<T>(
  actor: Actor,
  fn: (q: Queryable) => Promise<T>,
): Promise<T> {
  try {
    return actor.kind === "owner"
      ? await withOwnerTx(actor.userId, fn)
      : await withServiceTx(fn);
  } catch (e) {
    if (e instanceof SchedulingInfraError) throw e;
    throw new SchedulingInfraError(pgErrorCode(e));
  }
}
