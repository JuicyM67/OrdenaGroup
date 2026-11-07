import "server-only";

import type { Queryable } from "@/server/db/pool";

import { recordConsent } from "./consent";

/**
 * Kundens samtycke till WhatsApp (D-063, Ley 21.719, regel 7).
 *
 * Ingen egen kolumn på `customers`: samtycket är den SENASTE raden med
 * `kind = 'whatsapp'` i den append-only `consent_events` (`granted = true`
 * = samtycke, `false` = återkallat). Saknas en rad har kunden inte
 * samtyckt. När en kund anonymiseras kopplas `consent_events` loss
 * (`customer_id = null`, WP-26) — då finns inget samtycke längre, utan att
 * någon lagringsfunktion behöver ändras.
 */

export async function hasWhatsAppConsentIn(
  q: Queryable,
  businessId: string,
  customerId: string,
): Promise<boolean> {
  const r = await q.query<{ granted: boolean }>(
    `select granted
       from public.consent_events
      where business_id = $1 and customer_id = $2 and kind = 'whatsapp'
      order by created_at desc, id desc
      limit 1`,
    [businessId, customerId],
  );
  return r.rows[0]?.granted === true;
}

/** Loggar ett samtycke (`granted: true`) eller en återkallelse (`false`).
 * Körs i anroparens `withServiceTx` (bara service_role får skriva). */
export async function recordWhatsAppConsentIn(
  q: Queryable,
  input: {
    businessId: string;
    customerId: string;
    granted: boolean;
    version: string;
  },
): Promise<void> {
  await recordConsent(q, {
    businessId: input.businessId,
    customerId: input.customerId,
    subject: "customer",
    kind: "whatsapp",
    version: input.version,
    channel: "web",
    granted: input.granted,
  });
}
