import "server-only";

import { market } from "@/config/brand";
import { parsePhoneFor } from "@/lib/format/phone";
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

type EnqueueContext = {
  startMs: number;
  hasEmail: boolean;
  /** WP-56: `businesses.phone` är ett mobilnummer (ägar-sms möjligt). */
  ownerMobile: boolean;
  /** Bokningsradens `updated_at` (ms) — dedupe-nyckelns unika del för
   * `cancel_requested`/`cancel_declined` (WP-31-fix): till skillnad från
   * övriga händelser ändras inte bokningens starttid här, så `startMs`
   * ensamt skulle göra en ny förfrågan efter ett nekande till en dubblett
   * (`on conflict do nothing`). Varje statusändring (till/från
   * `cancel_requested`) sätter `updated_at` på nytt via
   * `private.set_updated_at()`, så den fungerar som ett löpnummer. */
  updatedAtMs: number;
};

/** WP-56: ägar-sms bara till ett mobilnummer i installationens land. */
export function isOwnerMobile(phone: string | null): boolean {
  if (!phone) return false;
  return parsePhoneFor(market, phone, { allow: "mobile" }).ok;
}

async function loadContext(
  q: Queryable,
  businessId: string,
  bookingId: string,
): Promise<EnqueueContext | undefined> {
  const r = await q.query<{
    start_ms: number;
    has_email: boolean;
    business_phone: string | null;
    updated_at_ms: number;
  }>(
    `select extract(epoch from lower(bk.period))::float8 * 1000 as start_ms,
            (c.email is not null) as has_email,
            b.phone as business_phone,
            extract(epoch from bk.updated_at)::float8 * 1000 as updated_at_ms
       from public.bookings bk
       join public.customers c on c.business_id = bk.business_id and c.id = bk.customer_id
       join public.businesses b on b.id = bk.business_id
      where bk.business_id = $1 and bk.id = $2`,
    [businessId, bookingId],
  );
  const row = r.rows[0];
  return row
    ? {
        startMs: Math.round(row.start_ms),
        hasEmail: row.has_email,
        ownerMobile: isOwnerMobile(row.business_phone),
        updatedAtMs: Math.round(row.updated_at_ms),
      }
    : undefined;
}

/** `<mall>:<kanal>:<mottagare>:<booking_id>:<unik-epoch>` (WP-16.md §4).
 * För de flesta händelser är `uniqMs` bokningens NUVARANDE starttid (efter
 * en ev. flytt), så en flytt får ett nytt dedupe_key medan ett omförsök av
 * SAMMA händelse (samma start) inte skapar en dubblett. `cancel_requested`/
 * `cancel_declined` skickar i stället bokningsradens `updated_at` (WP-31-
 * fix): starttiden ändras inte där, så en ny förfrågan efter ett nekande
 * måste skilja sig på något annat för att inte tystas av
 * `on conflict do nothing`. */
function dedupeKey(
  template: string,
  channel: OutboxChannel,
  recipient: OutboxRecipientKind,
  bookingId: string,
  uniqMs: number,
): string {
  return `${template}:${channel}:${recipient}:${bookingId}:${Math.floor(uniqMs / 1000)}`;
}

async function insertRow(
  q: Queryable,
  businessId: string,
  bookingId: string,
  uniqMs: number,
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
        uniqMs,
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
  uniqMs: number,
  template: string,
  hasEmail: boolean,
  payload: Record<string, unknown>,
): Promise<void> {
  for (const channel of customerChannels(hasEmail)) {
    await insertRow(q, businessId, bookingId, uniqMs, {
      channel,
      recipientKind: "customer",
      template,
      payload,
    });
  }
}

/** Bara e-post, oavsett marknad (`solicitudRecibida`: "Ägarens svar" 2 —
 * SE också bara e-post för "förfrågan mottagen", till skillnad från
 * `reservaConfirmada` som får sms i SE). Ingen rad om kunden saknar e-post. */
async function queueCustomerEmailOnly(
  q: Queryable,
  businessId: string,
  bookingId: string,
  uniqMs: number,
  template: string,
  hasEmail: boolean,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!hasEmail) return;
  await insertRow(q, businessId, bookingId, uniqMs, {
    channel: "email",
    recipientKind: "customer",
    template,
    payload,
  });
}

/** Ägaren får alltid e-post, aldrig sms (utanför scope, WP-16-planen §2). */
async function queueOwnerMessage(
  q: Queryable,
  businessId: string,
  bookingId: string,
  uniqMs: number,
  template: string,
): Promise<void> {
  await insertRow(q, businessId, bookingId, uniqMs, {
    channel: "email",
    recipientKind: "owner",
    template,
    payload: {},
  });
}

/** WP-56: ägar-sms (bara SE, ClickSend, till `businesses.phone`) med länk
 * till `/app/solicitudes/{id}` — köas bara om numret är en mobil, annars
 * hoppas det tyst över (ägaren får ändå e-posten). Workern slår upp numret
 * vid sändning (D-029), inget nummer i kön. */
async function queueOwnerSms(
  q: Queryable,
  businessId: string,
  bookingId: string,
  uniqMs: number,
  template: string,
  ownerMobile: boolean,
): Promise<void> {
  if (market !== "SE" || !ownerMobile) return;
  await insertRow(q, businessId, bookingId, uniqMs, {
    channel: "sms",
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
  const { startMs, hasEmail, ownerMobile, updatedAtMs } = ctx;

  if (e.type === "created") {
    if (e.status === "requested") {
      // WP-45 (D-033): en förfrågan blockerar tiden men är inte bekräftad —
      // kunden får bara "solicitud recibida" (ingen `reservaConfirmada`,
      // ingen påminnelse), ägaren får "nueva solicitud" att ta ställning
      // till. Bekräftelsen/påminnelsen köas separat när ägaren bekräftar
      // (`e.type === "confirmed"`).
      await queueCustomerEmailOnly(
        q,
        e.businessId,
        e.bookingId,
        startMs,
        "solicitudRecibida",
        hasEmail,
        { token: e.token },
      );
      await queueOwnerMessage(
        q,
        e.businessId,
        e.bookingId,
        startMs,
        "nuevaSolicitud",
      );
      await queueOwnerSms(
        q,
        e.businessId,
        e.bookingId,
        startMs,
        "nuevaSolicitud",
        ownerMobile,
      );
      return;
    }
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
    // En förfrågan som kunden flyttar (`r/[token]`) förblir `requested`:
    // ingen påminnelse förrän ägaren bekräftar den (WP-45, "Ägarens svar").
    if (e.status === "confirmed") {
      await queueReminder(
        q,
        e.businessId,
        e.bookingId,
        startMs,
        hasEmail,
        e.token,
      );
    }
    return;
  }

  if (e.type === "confirmed") {
    // Ägaren bekräftade en förfrågan (`requested → confirmed`): samma
    // bekräftelse + 24 h-påminnelse som en ny bokning som redan var
    // `confirmed` (WP-45 steg 3) — men inget ägarmejl (ägaren agerade själv).
    await queueCustomerMessage(
      q,
      e.businessId,
      e.bookingId,
      startMs,
      "reservaConfirmada",
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

  if (e.type === "declined") {
    // Nekad (av ägaren) eller utgången (av svepet): kunden får besked med
    // länk till `/{slug}` för att boka igen — aldrig "reserva cancelada"
    // (den förfrågan blev aldrig en bekräftad reserva).
    const template =
      e.reason === "expired" ? "solicitudVencida" : "solicitudRechazada";
    // `e.message` (ägarens valfria motiv, bara vid `reason: "declined"`):
    // skickas som `motivo` bara på e-postraden, aldrig sms — kortare kanal,
    // och SE:s "nekad"/"utgången" går redan ut på både e-post och sms
    // (Ägarens svar 2) utan att motivet behöver följa med dit. Sparas
    // aldrig i `bookings`: bara i den här radens payload, som rensas efter
    // sändning (D-029, worker.ts `finalizeSent`).
    for (const channel of customerChannels(hasEmail)) {
      const payload =
        channel === "email" && e.message ? { motivo: e.message } : {};
      await insertRow(q, e.businessId, e.bookingId, startMs, {
        channel,
        recipientKind: "customer",
        template,
        payload,
      });
    }
    return;
  }

  if (e.type === "cancel_requested") {
    // WP-56: kunden begärde avbokning — tiden är kvar (påminnelsen också)
    // tills företaget svarar. Ägaren: e-post (båda marknader) + sms (SE).
    // dedupe_key bär bokningens `updated_at` (WP-31-fix), inte starttiden:
    // en andra förfrågan för samma tid efter ett nekande sätter `updated_at`
    // på nytt (statusen växlar fram och tillbaka) och får alltså ett nytt
    // meddelande i stället för att tystas av `on conflict do nothing`.
    await queueOwnerMessage(
      q,
      e.businessId,
      e.bookingId,
      updatedAtMs,
      "solicitudCancelacion",
    );
    await queueOwnerSms(
      q,
      e.businessId,
      e.bookingId,
      updatedAtMs,
      "solicitudCancelacion",
      ownerMobile,
    );
    return;
  }

  if (e.type === "cancel_declined") {
    // WP-56: avbokningen godkändes inte — kunden: e-post + sms (SE).
    // Samma skäl som ovan: `updated_at`, inte starttiden, i dedupe_key.
    await queueCustomerMessage(
      q,
      e.businessId,
      e.bookingId,
      updatedAtMs,
      "cancelacionRechazada",
      hasEmail,
      {},
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
