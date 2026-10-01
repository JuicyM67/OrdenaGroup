import "server-only";

import { market } from "@/config/brand";
import type { Queryable } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";

import { customerChannelsFor } from "./enqueue";
import type { OutboxChannel, WaitlistEvent } from "./types";

/**
 * Köar meddelanden för en väntelistehändelse (WP-23, se `./types.ts`s
 * `WaitlistEvent`). Samma D-029-mönster som `enqueue.ts`: bara det som
 * behövs för att BESLUTA vilka rader som ska köas (har kunden e-post, en
 * unik-görande tidsstämpel) läses här — kundens namn/företagets namn/dag/tid
 * läses av workern vid sändningstillfället (`worker.ts`).
 */

type EnqueueContext = {
  hasEmail: boolean;
  /** `waitlist_entries.updated_at` (ms) — dedupe-nyckelns unika del (samma
   * idé som `cancel_requested`/`cancel_declined` i `enqueue.ts`): en entry
   * kan erbjudas/missas flera gånger över sin livstid (sequential: nästa
   * efter utgång; broadcast: en ny dag), och varje sådan övergång sätter
   * `updated_at` på nytt (`private.set_updated_at()`), så den fungerar som
   * ett löpnummer — till skillnad från bokningar har en väntelisterad ingen
   * egen starttid att använda i stället. */
  updatedAtMs: number;
};

async function loadContext(
  q: Queryable,
  businessId: string,
  entryId: string,
): Promise<EnqueueContext | undefined> {
  const r = await q.query<{ has_email: boolean; updated_at_ms: number }>(
    `select (c.email is not null) as has_email,
            extract(epoch from we.updated_at)::float8 * 1000 as updated_at_ms
       from public.waitlist_entries we
       join public.customers c on c.business_id = we.business_id and c.id = we.customer_id
      where we.business_id = $1 and we.id = $2`,
    [businessId, entryId],
  );
  const row = r.rows[0];
  return row
    ? { hasEmail: row.has_email, updatedAtMs: Math.round(row.updated_at_ms) }
    : undefined;
}

/** `<mall>:<kanal>:customer:<entry_id>:<unik-epoch>` — samma form som
 * `enqueue.ts`s `dedupeKey`, men mot `waitlist_entries.id` i stället för
 * `booking_id` (`message_outbox.booking_id` är alltid `null` här, som för
 * kampanjer/fristående meddelanden — se `payload.entryId`). */
function dedupeKey(
  template: string,
  channel: OutboxChannel,
  entryId: string,
  uniqMs: number,
): string {
  return `${template}:${channel}:customer:${entryId}:${Math.floor(uniqMs / 1000)}`;
}

async function insertRow(
  q: Queryable,
  businessId: string,
  entryId: string,
  uniqMs: number,
  row: {
    channel: OutboxChannel;
    template: string;
    payload: Record<string, unknown>;
  },
): Promise<void> {
  await q.query(
    `insert into public.message_outbox
       (business_id, booking_id, channel, recipient_kind, template, payload,
        category, dedupe_key)
     values ($1, null, $2, 'customer', $3, $4::jsonb, 'utility', $5)
     on conflict (dedupe_key) do nothing`,
    [
      businessId,
      row.channel,
      row.template,
      JSON.stringify(row.payload),
      dedupeKey(row.template, row.channel, entryId, uniqMs),
    ],
  );
}

/** Inre steg (för tester): kör i anroparens transaktion. */
export async function enqueueWaitlistEventIn(
  q: Queryable,
  e: WaitlistEvent,
): Promise<void> {
  const ctx = await loadContext(q, e.businessId, e.entryId);
  // Borde inte hända (anropas efter commit) — inget att köa utan entryn.
  if (!ctx) return;
  const { hasEmail, updatedAtMs } = ctx;

  if (e.type === "waitlist_offer") {
    for (const channel of customerChannelsFor(market, hasEmail)) {
      await insertRow(q, e.businessId, e.entryId, updatedAtMs, {
        channel,
        template: "listaEsperaCupo",
        payload: { entryId: e.entryId, token: e.token },
      });
    }
    return;
  }

  // waitlist_taken
  for (const channel of customerChannelsFor(market, hasEmail)) {
    await insertRow(q, e.businessId, e.entryId, updatedAtMs, {
      channel,
      template: "listaEsperaTomada",
      payload: { entryId: e.entryId },
    });
  }
}

/**
 * Anropas EFTER att väntelistetransaktionen committats (kontraktet i
 * `./types.ts`). Öppnar egen `withServiceTx`, idempotent via `dedupe_key`.
 * Kastar aldrig vidare (samma motivering som `enqueueBookingEvent`).
 */
export async function enqueueWaitlistEvent(e: WaitlistEvent): Promise<void> {
  try {
    await withServiceTx((q) => enqueueWaitlistEventIn(q, e));
  } catch {
    // Se kommentaren ovan: sväljs medvetet.
  }
}
