import "server-only";

import type { Queryable } from "./pool";

/**
 * Serialiserar skrivningar av bokningar per profesional med
 * `pg_advisory_xact_lock` (transaktionsnivå: släpps vid commit/rollback,
 * fungerar i Supavisor transaction mode). Två samtidiga inserts som krockar i
 * `no_overlap` kan annars ge deadlock (40P01) i stället för 23P01, eftersom
 * båda väntar på den andras ännu inte committade indexpost.
 *
 * Låsen tas en i taget i sorterad ordning (flera profesionales vid
 * "Cualquiera"), så att två transaktioner aldrig låser i motsatt ordning.
 * Nyckeln är en hash av företag + profesional; en kollision ger bara extra
 * serialisering, aldrig fel resultat (no_overlap har sista ordet).
 */
export async function lockStaffForBooking(
  q: Queryable,
  businessId: string,
  staffIds: readonly string[],
): Promise<void> {
  for (const staffId of [...new Set(staffIds)].sort()) {
    await q.query(
      "select pg_advisory_xact_lock(hashtextextended('booking-staff:' || $1::text || ':' || $2::text, 0))",
      [businessId, staffId],
    );
  }
}
