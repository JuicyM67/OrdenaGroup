import "server-only";

import type { Queryable } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";
import { classifyWhatsAppError } from "@/server/messaging/whatsapp/errors";

import { nextRetry } from "./worker";

/**
 * D-063: WhatsApp-webhookens statusar mot utkorgen. Raden hittas på
 * `wa_message_id` (Metas `wamid`, unikt) — inget annat i webhooken används
 * för att välja rad. Ordningen statusar kommer i är inte garanterad (read
 * kan komma före delivered); varje uppdatering är monoton och idempotent.
 *
 * - `delivered`/`read`: tidsstämpel + `payload` töms (token behövs inte
 *   längre för någon reserv, D-029).
 * - `failed` (bara medan raden är `sent` och inte levererad):
 *   tillfälligt fel → nytt WhatsApp-försök med utkorgens backoff;
 *   permanent (eller sista försöket) → e-post om kunden har en och meddelandet
 *   går att skicka som e-post (token kvar när mallen kräver länk), annars
 *   `dead`. Felkoden sparas som `wa_<kod>`, aldrig Metas feltext.
 */

export type WhatsAppStatusKind = "sent" | "delivered" | "read" | "failed";

export type WhatsAppStatusUpdate = {
  waMessageId: string;
  status: WhatsAppStatusKind;
  at: Date;
  errorCode?: number | undefined;
};

export type WhatsAppStatusOutcome =
  "updated" | "ignored" | "retry" | "fallback" | "dead";

/** Mallar vars e-postversion kräver kundens token (länk i mejlet). */
const TOKEN_TEMPLATES: ReadonlySet<string> = new Set([
  "reservaConfirmada",
  "recordatorio",
  "reservaMovida",
  "listaEsperaCupo",
]);

type LockedRow = {
  id: string;
  business_id: string;
  booking_id: string | null;
  waitlist_entry_id: string | null;
  status: string;
  channel: string;
  attempts: number;
  template: string;
  payload: Record<string, unknown> | null;
  delivered_at: Date | null;
};

async function lockByWaMessageId(
  q: Queryable,
  waMessageId: string,
): Promise<LockedRow | undefined> {
  const r = await q.query<LockedRow>(
    `select id, business_id, booking_id, waitlist_entry_id, status::text as status,
            channel::text as channel, attempts, template, payload, delivered_at
       from public.message_outbox
      where wa_message_id = $1
      for update`,
    [waMessageId],
  );
  return r.rows[0];
}

/** Har radens kund (via bokningen eller väntelisteposten) en e-post? */
async function customerHasEmailIn(
  q: Queryable,
  row: LockedRow,
): Promise<boolean> {
  if (row.booking_id) {
    const r = await q.query<{ has_email: boolean }>(
      `select (c.email is not null and c.anonymized_at is null) as has_email
         from public.bookings bk
         join public.customers c on c.business_id = bk.business_id and c.id = bk.customer_id
        where bk.business_id = $1 and bk.id = $2`,
      [row.business_id, row.booking_id],
    );
    return r.rows[0]?.has_email === true;
  }
  if (row.waitlist_entry_id) {
    const r = await q.query<{ has_email: boolean }>(
      `select (c.email is not null and c.anonymized_at is null) as has_email
         from public.waitlist_entries we
         join public.customers c on c.business_id = we.business_id and c.id = we.customer_id
        where we.business_id = $1 and we.id = $2`,
      [row.business_id, row.waitlist_entry_id],
    );
    return r.rows[0]?.has_email === true;
  }
  return false;
}

async function fallbackOrDeadIn(
  q: Queryable,
  row: LockedRow,
  code: string,
): Promise<"fallback" | "dead"> {
  const payload = row.payload ?? {};
  const tokenOk =
    !TOKEN_TEMPLATES.has(row.template) || typeof payload.token === "string";
  if (tokenOk && (await customerHasEmailIn(q, row))) {
    // `attempts = 0`: claim räknar upp till 1 för e-postens första försök.
    await q.query(
      `update public.message_outbox
          set channel = 'email', status = 'queued', sent_at = null,
              attempts = 0, next_attempt_at = now(), fallback_reason = $3,
              error = $3, provider_message_id = null
        where id = $1 and business_id = $2`,
      [row.id, row.business_id, code],
    );
    return "fallback";
  }
  await q.query(
    `update public.message_outbox
        set status = 'dead', sent_at = null, error = $3, payload = '{}'::jsonb
      where id = $1 and business_id = $2`,
    [row.id, row.business_id, code],
  );
  return "dead";
}

export async function applyWhatsAppStatusIn(
  q: Queryable,
  u: WhatsAppStatusUpdate,
): Promise<WhatsAppStatusOutcome> {
  const row = await lockByWaMessageId(q, u.waMessageId);
  // Okänt id, eller raden har redan bytt till e-post: inget att göra.
  if (!row || row.channel !== "whatsapp") return "ignored";

  switch (u.status) {
    case "sent":
      return "ignored";
    case "delivered": {
      await q.query(
        `update public.message_outbox
            set delivered_at = coalesce(delivered_at, $3), payload = '{}'::jsonb
          where id = $1 and business_id = $2`,
        [row.id, row.business_id, u.at],
      );
      return "updated";
    }
    case "read": {
      await q.query(
        `update public.message_outbox
            set read_at = coalesce(read_at, $3),
                delivered_at = coalesce(delivered_at, $3),
                payload = '{}'::jsonb
          where id = $1 and business_id = $2`,
        [row.id, row.business_id, u.at],
      );
      return "updated";
    }
    case "failed": {
      if (row.status !== "sent" || row.delivered_at !== null) return "ignored";
      const c = classifyWhatsAppError({ code: u.errorCode });
      const retry = nextRetry(row.attempts);
      if (c.kind === "temporary" && retry.status === "queued") {
        await q.query(
          `update public.message_outbox
              set status = 'queued', sent_at = null, error = $3,
                  next_attempt_at = now() + make_interval(mins => $4::int)
            where id = $1 and business_id = $2`,
          [row.id, row.business_id, c.code, retry.delayMinutes],
        );
        return "retry";
      }
      return fallbackOrDeadIn(q, row, c.code);
    }
    /* c8 ignore next 2 */
    default:
      return "ignored";
  }
}

export async function applyWhatsAppStatus(
  u: WhatsAppStatusUpdate,
): Promise<WhatsAppStatusOutcome> {
  return withServiceTx((q) => applyWhatsAppStatusIn(q, u));
}

/** Det webhooken behöver för ett knappsvar: vår egen rad för meddelandet
 * kunden svarade på, och kundens nummer att jämföra avsändaren med. */
export type WhatsAppReplyTarget = {
  rowId: string;
  businessId: string;
  template: string;
  bookingId: string | null;
  waitlistEntryId: string | null;
  customerPhone: string | null;
};

export async function findWhatsAppReplyTarget(
  waMessageId: string,
): Promise<WhatsAppReplyTarget | undefined> {
  return withServiceTx(async (q) => {
    const r = await q.query<{
      id: string;
      business_id: string;
      template: string;
      booking_id: string | null;
      waitlist_entry_id: string | null;
      recipient_kind: string;
    }>(
      `select id, business_id, template, booking_id, waitlist_entry_id,
              recipient_kind::text as recipient_kind
         from public.message_outbox
        where wa_message_id = $1`,
      [waMessageId],
    );
    const row = r.rows[0];
    if (!row || row.recipient_kind !== "customer") return undefined;
    let phone: string | null = null;
    if (row.booking_id) {
      const c = await q.query<{ phone_e164: string | null }>(
        `select c.phone_e164
           from public.bookings bk
           join public.customers c on c.business_id = bk.business_id and c.id = bk.customer_id
          where bk.business_id = $1 and bk.id = $2 and c.anonymized_at is null`,
        [row.business_id, row.booking_id],
      );
      phone = c.rows[0]?.phone_e164 ?? null;
    } else if (row.waitlist_entry_id) {
      const c = await q.query<{ phone_e164: string | null }>(
        `select c.phone_e164
           from public.waitlist_entries we
           join public.customers c on c.business_id = we.business_id and c.id = we.customer_id
          where we.business_id = $1 and we.id = $2 and c.anonymized_at is null`,
        [row.business_id, row.waitlist_entry_id],
      );
      phone = c.rows[0]?.phone_e164 ?? null;
    }
    return {
      rowId: row.id,
      businessId: row.business_id,
      template: row.template,
      bookingId: row.booking_id,
      waitlistEntryId: row.waitlist_entry_id,
      customerPhone: phone,
    };
  });
}
