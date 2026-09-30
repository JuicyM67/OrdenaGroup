import "server-only";

import type { Queryable } from "@/server/db/pool";

/**
 * Delad behörighetskontroll för `src/server/privacy/` (WP-26): varje
 * mutation kör som `service_role` (vissa skrivningar, t.ex. `consent_events`
 * och `message_outbox`, kräver grants som `authenticated` inte har), så RLS
 * gäller inte — funktionen gör samma kontroll själv, som
 * `public.create_business()` gör med `auth.uid()`.
 */
export async function isOwnerOrAdmin(
  q: Queryable,
  userId: string,
  businessId: string,
): Promise<boolean> {
  const r = await q.query(
    `select 1 from public.memberships
      where business_id = $1 and user_id = $2 and role in ('owner', 'admin')`,
    [businessId, userId],
  );
  return r.rows.length > 0;
}

/**
 * Säkerhetsgranskning WP-26 (punkt 2): kontoradering (begär/ångra) och
 * företagets export är beslut på ägarnivå — `admin` (företagsnivå-rollen,
 * se DATA_MODEL.md) får INTE begära/ångra radering av hela kontot eller
 * exportera hela företagets data. `admin` behåller export/anonymisering av
 * enskilda kunder (`isOwnerOrAdmin`, `customer.ts`), som är en dagligare
 * uppgift.
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
