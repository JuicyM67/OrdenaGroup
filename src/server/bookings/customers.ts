import "server-only";

import type { E164 } from "@/lib/format/phone";
import type { Queryable } from "@/server/db/pool";

/**
 * Hittar eller skapar kunden på (business_id, phone_e164) i bokningens
 * transaktion, så att en ny kundrad bara finns kvar om bokningen lyckas.
 * FRÅGA 8: en befintlig kunds namn och e-post skrivs aldrig över (ägarens
 * register gäller). Inga consent_*-fält skrivs här (WP-20/WP-26).
 * Anonymiserade kunder återanvänds aldrig.
 */
export async function findOrCreateCustomer(
  q: Queryable,
  businessId: string,
  c: { phone: E164; name: string; email?: string | undefined },
): Promise<string> {
  const inserted = await q.query<{ id: string }>(
    `insert into public.customers (business_id, phone_e164, name, email)
     values ($1, $2, $3, $4)
     on conflict (business_id, phone_e164) do nothing
     returning id`,
    [businessId, c.phone, c.name, c.email ?? null],
  );
  if (inserted.rows[0]) return inserted.rows[0].id;
  const existing = await q.query<{ id: string }>(
    `select id from public.customers
      where business_id = $1 and phone_e164 = $2 and anonymized_at is null`,
    [businessId, c.phone],
  );
  const row = existing.rows[0];
  // Kan bara saknas om raden är anonymiserad men har kvar telefonen (WP-26
  // ska nolla phone_e164 vid anonymisering) eller om RLS döljer den:
  // behandlas som infrastrukturfel, aldrig som en koppling till fel kund.
  if (!row) throw new Error("customers: raden syns inte efter on conflict");
  return row.id;
}
