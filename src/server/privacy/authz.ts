import "server-only";

import type { Queryable } from "@/server/db/pool";

/**
 * Delad behörighetskontroll för `src/server/privacy/` (WP-26): varje
 * mutation kör som `service_role` (vissa skrivningar, t.ex. `consent_events`
 * och `message_outbox`, kräver grants som `authenticated` inte har), så RLS
 * gäller inte — funktionen gör samma kontroll själv, som
 * `public.create_business()` gör med `auth.uid()`.
 *
 * WP-46 (D-034): export, radering och anonymisering — av hela företaget
 * OCH av enskilda kunder — är BARA ägarens sak. `admin` är en reserverad
 * plattformsroll och `staff` har aldrig tillgång, oavsett flaggor
 * (Ägarens svar punkt 3). Tidigare `isOwnerOrAdmin` är borttagen.
 */
export async function isOwner(
  q: Queryable,
  userId: string,
  businessId: string,
): Promise<boolean> {
  const r = await q.query(
    `select 1 from public.memberships
      where business_id = $1 and user_id = $2 and role = 'owner'`,
    [businessId, userId],
  );
  return r.rows.length > 0;
}

/**
 * `null` = ägaren. Annars felkoden: `"forbidden"` för en medlem som inte är
 * ägaren (personal, admin), `"unauthorized"` för den som inte är medlem
 * alls (samma kod som tidigare för ett annat företag).
 */
export async function ownerDenial(
  q: Queryable,
  userId: string,
  businessId: string,
): Promise<"unauthorized" | "forbidden" | null> {
  if (await isOwner(q, userId, businessId)) return null;
  const r = await q.query(
    `select 1 from public.memberships where business_id = $1 and user_id = $2`,
    [businessId, userId],
  );
  return r.rows.length > 0 ? "forbidden" : "unauthorized";
}
