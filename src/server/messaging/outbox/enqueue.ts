import "server-only";

import { market } from "@/config/brand";
import type { Queryable } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";

import type { BookingEvent, OutboxChannel, OutboxRecipientKind } from "./types";

/**
 * Köar meddelanden för en bokningshändelse (WP-16 steg 2). Läser bara vad
 * som krävs för att BESLUTA vilka rader som ska köas (bokningens starttid,
 * om kunden har e-post) — själva kunddatan/bokningskortet läses av workern
 * vid sändning (D-029, `worker.ts`). `payload` bär bara klartext-token när
 * händelsen har en (created/moved); cancelled har ingen (länken är generisk).
 */

const REMINDER_LEAD_MS = 24 * 60 * 60 * 1000;

type EnqueueContext = { startMs: number; hasEmail: boolean };

async function loadContext(
  q: Queryable,
  businessId: string,
  bookingId: string,
): Promise<EnqueueContext | undefined> {
  const r = await q.query<{ start_ms: number; has_email: boolean }>(
    `select extract(epoch from lower(bk.period))::float8 * 1000 as start_ms,
            (c.email is not null) as has_email
       from public.bookings bk
       join public.customers c on c.business_id = bk.business_id and c.id = bk.customer_id
      where bk.business_id = $1 and bk.id = $2`,
    [businessId, bookingId],
  );
  const row = r.rows[0];
  return row
    ? { startMs: Math.round(row.start_ms), hasEmail: row.has_email }
    : undefined;
}

/** `<mall>:<kanal>:<mottagare>:<booking_id>:<start-epoch>` (WP-16.md §4).
 * `startMs` är bokningens NUVARANDE starttid (efter en ev. flytt), så en
 * flytt får ett nytt dedupe_key medan ett omförsök av SAMMA händelse (samma
 * start) inte skapar en dubblett. */
function dedupeKey(
  template: string,
  channel: OutboxChannel,
  recipient: OutboxRecipientKind,
  bookingId: string,
  startMs: number,
): string {
  return `${template}:${channel}:${recipient}:${bookingId}:${Math.floor(startMs / 1000)}`;
}

async function insertRow(
  q: Queryable,
  businessId: string,
  bookingId: string,
  startMs: number,
  row: {
    channel: OutboxChannel;
    recipientKind: OutboxRecipientKind;
    template: string;
    payload: Record<string, unknown>;
    nextAttemptAt?: Date;
  },
): Promise<void> {
  await q.query(
    `insert into public.message_outbox
       (business_id, booking_id, channel, recipient_kind, template, payload,
        category, dedupe_key, next_attempt_at)
     values ($1, $2, $3, $4, $5, $6::jsonb, 'utility', $7, coalesce($8, now()))
     on conflict (dedupe_key) do nothing`,
    [
      businessId,
      bookingId,
      row.channel,
      row.recipientKind,
      row.template,
      JSON.stringify(row.payload),
      dedupeKey(
        row.template,
        row.channel,
        row.recipientKind,
        bookingId,
        startMs,
      ),
      row.nextAttemptAt ?? null,
    ],
  );
}

/** CL: e-post om kunden har en. SE: e-post (om kunden har en) + sms (kunden
 * har alltid telefon, D-025/D-028). Ren funktion (testbar utan att mocka
 * `@/config/brand`); `customerChannels` nedan är den som används i praktiken
 * (installationens marknad, D-025: en marknad per installation). */
export function customerChannelsFor(
  m: "CL" | "SE",
  hasEmail: boolean,
): OutboxChannel[] {
  const channels: OutboxChannel[] = [];
  if (hasEmail) channels.push("email");
  if (m === "SE") channels.push("sms");
  return channels;
}

function customerChannels(hasEmail: boolean): OutboxChannel[] {
  return customerChannelsFor(market, hasEmail);
}

async function queueCustomerMessage(
  q: Queryable,
  businessId: string,
  bookingId: string,
  startMs: number,
  template: string,
  hasEmail: boolean,
  payload: Record<string, unknown>,
): Promise<void> {
  for (const channel of customerChannels(hasEmail)) {
    await insertRow(q, businessId, bookingId, startMs, {
      channel,
      recipientKind: "customer",
      template,
      payload,
    });
  }
}

/** Ägaren får alltid e-post, aldrig sms (utanför scope, WP-16-planen §2). */
async function queueOwnerMessage(
  q: Queryable,
  businessId: string,
  bookingId: string,
  startMs: number,
  template: string,
): Promise<void> {
  await insertRow(q, businessId, bookingId, startMs, {
    channel: "email",
    recipientKind: "owner",
    template,
    payload: {},
  });
}

/** Hoppas över om starten redan är mindre än 24 h bort (WP-16-planen §5). */
async function queueReminder(
  q: Queryable,
  businessId: string,
  bookingId: string,
  startMs: number,
  hasEmail: boolean,
  token: string,
): Promise<void> {
  if (startMs - REMINDER_LEAD_MS <= Date.now()) return;
  const nextAttemptAt = new Date(startMs - REMINDER_LEAD_MS);
  for (const channel of customerChannels(hasEmail)) {
    await insertRow(q, businessId, bookingId, startMs, {
      channel,
      recipientKind: "customer",
      template: "recordatorio",
      payload: { token },
      nextAttemptAt,
    });
  }
}

/** Avbryter väntande påminnelser (queued/failed) för bokningen — flytt
 * (ny påminnelse köas separat) och avbokning (ingen ny). */
async function cancelPendingReminders(
  q: Queryable,
  businessId: string,
  bookingId: string,
): Promise<void> {
  await q.query(
    `update public.message_outbox
        set status = 'cancelled', payload = '{}'::jsonb
      where business_id = $1 and booking_id = $2 and template = 'recordatorio'
        and status in ('queued', 'failed')`,
    [businessId, bookingId],
  );
}

/** Inre steg (för tester): kör i anroparens transaktion. */
export async function enqueueBookingEventIn(
  q: Queryable,
  e: BookingEvent,
): Promise<void> {
  const ctx = await loadContext(q, e.businessId, e.bookingId);
  // Borde inte hända (anropas efter commit) — inget att köa utan bokningen.
  if (!ctx) return;
  const { startMs, hasEmail } = ctx;

  if (e.type === "created") {
    await queueCustomerMessage(
      q,
      e.businessId,
      e.bookingId,
      startMs,
      "reservaConfirmada",
      hasEmail,
      { token: e.token },
    );
    if (e.by === "customer") {
      await queueOwnerMessage(
        q,
        e.businessId,
        e.bookingId,
        startMs,
        "nuevaReservaDueno",
      );
    }
    await queueReminder(
      q,
      e.businessId,
      e.bookingId,
      startMs,
      hasEmail,
      e.token,
    );
    return;
  }

  if (e.type === "moved") {
    await cancelPendingReminders(q, e.businessId, e.bookingId);
    await queueCustomerMessage(
      q,
      e.businessId,
      e.bookingId,
      startMs,
      "reservaMovida",
      hasEmail,
      { token: e.token },
    );
    await queueReminder(
      q,
      e.businessId,
      e.bookingId,
      startMs,
      hasEmail,
      e.token,
    );
    return;
  }

  // cancelled
  await cancelPendingReminders(q, e.businessId, e.bookingId);
  await queueCustomerMessage(
    q,
    e.businessId,
    e.bookingId,
    startMs,
    "reservaCancelada",
    hasEmail,
    {},
  );
  if (e.by === "customer") {
    await queueOwnerMessage(
      q,
      e.businessId,
      e.bookingId,
      startMs,
      "cancelacionDueno",
    );
  }
}

/**
 * Anropas EFTER att bokningstransaktionen committats (kontraktet i
 * `./types.ts`). Öppnar egen `withServiceTx`, idempotent via `dedupe_key`.
 * Kastar aldrig vidare: `src/server` loggar aldrig (`boundaries.test.ts`,
 * ingen persondata i loggar), och innan en rad finns i `message_outbox`
 * finns ingen plats att skriva en felkod på — ett fel här (t.ex. en tappad
 * DB-anslutning) syns i stället som att bekräftelsen uteblir.
 */
export async function enqueueBookingEvent(e: BookingEvent): Promise<void> {
  try {
    await withServiceTx((q) => enqueueBookingEventIn(q, e));
  } catch {
    // Se kommentaren ovan: sväljs medvetet.
  }
}
