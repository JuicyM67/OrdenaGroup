import "server-only";

import { withOwnerTx, withServiceTx } from "@/server/db/tx";

/**
 * WP-54: "Avisar al cliente" — köar mejlet `bienvenidaMiembro` till en kund
 * som just blivit medlem. Transaktionellt besked (kräver inte
 * marknadsföringssamtycke), bara e-post, bara om kunden har e-post.
 *
 * Behörighet: kontrolleras här i en `withOwnerTx` (RLS + `has_perm`), inte
 * bara hos anroparen — samma regel som att sätta "Medlem" på kundkortet
 * (ägare eller `can_manage_all_bookings`). Själva raden skrivs sedan med
 * service role (bara den får INSERT i `message_outbox`).
 *
 * Idempotens: `dedupe_key` innehåller `member_since` — ett dubbelklick (eller
 * ett nytt tryck senare under samma medlemskap) köar inget nytt mejl
 * (`queued: false`); avslutas och förnyas medlemskapet blir det ett nytt.
 *
 * Adressen läggs aldrig i kön (D-029): `payload.customerId`, workern slår
 * upp e-posten vid sändning (`worker.ts`, `loadMemberWelcomeContext`).
 */
export type EnqueueMemberWelcomeInput = {
  businessId: string;
  customerId: string;
  /** Den inloggade (auth.uid()) som trycker på knappen. */
  actorUserId: string;
};

export type EnqueueMemberWelcomeError =
  | "forbidden" // saknar ägare/can_manage_all_bookings, eller kunden syns inte
  | "not_member" // kunden är inte (längre) medlem
  | "no_email"; // kunden saknar e-post

export type EnqueueMemberWelcomeResult =
  | { ok: true; queued: boolean }
  | { ok: false; error: EnqueueMemberWelcomeError };

type CustomerRow = {
  allowed: boolean;
  is_member: boolean;
  has_email: boolean;
  member_since_s: number | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function enqueueMemberWelcome(
  input: EnqueueMemberWelcomeInput,
): Promise<EnqueueMemberWelcomeResult> {
  if (!UUID.test(input.businessId) || !UUID.test(input.customerId)) {
    return { ok: false, error: "forbidden" };
  }
  const row = await withOwnerTx(input.actorUserId, async (q) => {
    const r = await q.query<CustomerRow>(
      `select private.has_perm(c.business_id, 'can_manage_all_bookings') as allowed,
              c.is_member,
              (c.email is not null and btrim(c.email) <> '') as has_email,
              floor(extract(epoch from c.member_since))::float8 as member_since_s
         from public.customers c
        where c.business_id = $1 and c.id = $2 and c.anonymized_at is null`,
      [input.businessId, input.customerId],
    );
    return r.rows[0];
  });
  if (!row?.allowed) return { ok: false, error: "forbidden" };
  if (!row.is_member) return { ok: false, error: "not_member" };
  if (!row.has_email) return { ok: false, error: "no_email" };

  const since = row.member_since_s ?? 0;
  const dedupeKey = `bienvenidaMiembro:email:customer:${input.customerId}:${since}`;
  const inserted = await withServiceTx(async (q) => {
    const r = await q.query(
      `insert into public.message_outbox
         (business_id, booking_id, channel, recipient_kind, template, payload,
          category, dedupe_key)
       values ($1, null, 'email', 'customer', 'bienvenidaMiembro', $2::jsonb,
               'utility', $3)
       on conflict (dedupe_key) do nothing`,
      [
        input.businessId,
        JSON.stringify({ customerId: input.customerId }),
        dedupeKey,
      ],
    );
    return (r.rowCount ?? 0) > 0;
  });
  return { ok: true, queued: inserted };
}
