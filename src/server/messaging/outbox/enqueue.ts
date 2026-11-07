import "server-only";

import type { Queryable } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";
import {
  chooseCustomerChannel,
  whatsappPossible,
} from "@/server/messaging/whatsapp/channel";
import { hasWhatsAppConsentIn } from "@/server/privacy/whatsapp-consent";

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
  /** D-063: för kanalvalet (WhatsApp kräver samtycke + chilenskt mobilnr). */
  customerId?: string | undefined;
  phone?: string | null | undefined;
  /** Bokningsradens `updated_at` (ms) — dedupe-nyckelns unika del för
   * `cancel_requested`/`cancel_declined` (WP-31-fix): till skillnad från
   * övriga händelser ändras inte bokningens starttid här, så `startMs`
   * ensamt skulle göra en ny förfrågan efter ett nekande till en dubblett
   * (`on conflict do nothing`). Varje statusändring (till/från
   * `cancel_requested`) sätter `updated_at` på nytt via
   * `private.set_updated_at()`, så den fungerar som ett löpnummer. */
  updatedAtMs: number;
};

async function loadContext(
  q: Queryable,
  businessId: string,
  bookingId: string,
): Promise<EnqueueContext | undefined> {
  const r = await q.query<{
    start_ms: number;
    has_email: boolean;
    updated_at_ms: number;
    customer_id?: string;
    phone_e164?: string | null;
  }>(
    `select extract(epoch from lower(bk.period))::float8 * 1000 as start_ms,
            (c.email is not null) as has_email,
            extract(epoch from bk.updated_at)::float8 * 1000 as updated_at_ms,
            c.id as customer_id, c.phone_e164
       from public.bookings bk
       join public.customers c on c.business_id = bk.business_id and c.id = bk.customer_id
      where bk.business_id = $1 and bk.id = $2`,
    [businessId, bookingId],
  );
  const row = r.rows[0];
  return row
    ? {
        startMs: Math.round(row.start_ms),
        hasEmail: row.has_email,
        updatedAtMs: Math.round(row.updated_at_ms),
        customerId: row.customer_id,
        phone: row.phone_e164,
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

/** Kunden får e-post om hen har en. Mallar utan WhatsApp-version (t.ex.
 * recensionsförfrågan) använder den här direkt; bokningens WhatsApp-mallar
 * går via `customerChannelIn` (D-063). */
export function customerChannels(hasEmail: boolean): OutboxChannel[] {
  return hasEmail ? ["email"] : [];
}

/**
 * D-063: kanalen för ett kundmeddelande vid köningen — WhatsApp om kunden
 * samtyckt, har chilenskt mobilnummer och mallen är godkänd, annars e-post
 * (om den finns), annars ingen rad. Workern avgör på nytt vid sändningen
 * (samtycket sparas efter bokningens commit, och en påminnelse köas 24 h+
 * i förväg), så det här är bara den första gissningen.
 */
export async function customerChannelIn(
  q: Queryable,
  businessId: string,
  ctx: {
    hasEmail: boolean;
    customerId?: string | undefined;
    phone?: string | null | undefined;
  },
  template: string,
): Promise<OutboxChannel | null> {
  const possible = whatsappPossible(template, ctx.phone);
  const consent =
    possible && ctx.customerId
      ? await hasWhatsAppConsentIn(q, businessId, ctx.customerId)
      : false;
  return chooseCustomerChannel({
    template,
    hasEmail: ctx.hasEmail,
    phone: ctx.phone,
    whatsappConsent: consent,
  });
}

async function queueCustomerMessage(
  q: Queryable,
  businessId: string,
  bookingId: string,
  uniqMs: number,
  template: string,
  ctx: EnqueueContext,
  payload: Record<string, unknown>,
): Promise<void> {
  const channel = await customerChannelIn(q, businessId, ctx, template);
  if (!channel) return;
  await insertRow(q, businessId, bookingId, uniqMs, {
    channel,
    recipientKind: "customer",
    template,
    payload,
  });
}

/** Bara e-post (`solicitudRecibida`: "Ägarens svar" 2). Ingen rad om kunden
 * saknar e-post. */
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

/** Ägaren får alltid e-post (WP-16-planen §2). */
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

/** Hoppas över om starten redan är mindre än 24 h bort (WP-16-planen §5). */
async function queueReminder(
  q: Queryable,
  businessId: string,
  bookingId: string,
  startMs: number,
  ctx: EnqueueContext,
  token: string,
): Promise<void> {
  if (startMs - REMINDER_LEAD_MS <= Date.now()) return;
  const nextAttemptAt = new Date(startMs - REMINDER_LEAD_MS);
  const channel = await customerChannelIn(q, businessId, ctx, "recordatorio");
  if (!channel) return;
  await insertRow(q, businessId, bookingId, startMs, {
    channel,
    recipientKind: "customer",
    template: "recordatorio",
    payload: { token },
    nextAttemptAt,
  });
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
  const { startMs, hasEmail, updatedAtMs } = ctx;

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
      return;
    }
    await queueCustomerMessage(
      q,
      e.businessId,
      e.bookingId,
      startMs,
      "reservaConfirmada",
      ctx,
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
    await queueReminder(q, e.businessId, e.bookingId, startMs, ctx, e.token);
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
      ctx,
      { token: e.token },
    );
    // En förfrågan som kunden flyttar (`r/[token]`) förblir `requested`:
    // ingen påminnelse förrän ägaren bekräftar den (WP-45, "Ägarens svar").
    if (e.status === "confirmed") {
      await queueReminder(q, e.businessId, e.bookingId, startMs, ctx, e.token);
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
      ctx,
      { token: e.token },
    );
    await queueReminder(q, e.businessId, e.bookingId, startMs, ctx, e.token);
    return;
  }

  if (e.type === "declined") {
    // Nekad (av ägaren) eller utgången (av svepet): kunden får besked med
    // länk till `/{slug}` för att boka igen — aldrig "reserva cancelada"
    // (den förfrågan blev aldrig en bekräftad reserva).
    const template =
      e.reason === "expired" ? "solicitudVencida" : "solicitudRechazada";
    // `e.message` (ägarens valfria motiv, bara vid `reason: "declined"`):
    // skickas som `motivo` på e-postraden. Sparas aldrig i `bookings`: bara i
    // den här radens payload, som rensas efter sändning (D-029, worker.ts
    // `finalizeSent`).
    await queueCustomerMessage(
      q,
      e.businessId,
      e.bookingId,
      startMs,
      template,
      ctx,
      e.message ? { motivo: e.message } : {},
    );
    return;
  }

  if (e.type === "cancel_requested") {
    // WP-56: kunden begärde avbokning — tiden är kvar (påminnelsen också)
    // tills företaget svarar. Ägaren får e-post.
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
    return;
  }

  if (e.type === "cancel_declined") {
    // WP-56: avbokningen godkändes inte — kunden får e-post.
    // Samma skäl som ovan: `updated_at`, inte starttiden, i dedupe_key.
    await queueCustomerMessage(
      q,
      e.businessId,
      e.bookingId,
      updatedAtMs,
      "cancelacionRechazada",
      ctx,
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
    ctx,
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

/**
 * D-063 (WP-22): kunden svarade "Necesito cambiar" på påminnelsen i
 * WhatsApp → ägaren får e-post (`clienteQuiereCambiar`, samma
 * ägarnotis-mekanism som `nuevaReservaDueno`/`cancelacionDueno`). Kunden får
 * inget automatiskt svar (företaget hör av sig). `sourceRowId` = påminnelsens
 * utkorgsrad: ett svar per påminnelse, en upprepning (samma eller nytt
 * knapptryck) köar inget nytt (`on conflict do nothing`). Bara för en
 * bokning som fortfarande gäller och inte passerat.
 */
export async function enqueueCustomerChangeRequestIn(
  q: Queryable,
  input: {
    businessId: string;
    bookingId: string;
    sourceRowId: string;
    /** Starttiden (s) som påminnelsen gällde (samma regel som Confirmo). */
    startSec: number;
  },
): Promise<boolean> {
  const r = await q.query(
    `insert into public.message_outbox
       (business_id, booking_id, channel, recipient_kind, template, payload,
        category, dedupe_key)
     select bk.business_id, bk.id, 'email', 'owner', 'clienteQuiereCambiar',
            '{}'::jsonb, 'utility', $3
       from public.bookings bk
      where bk.business_id = $1 and bk.id = $2
        and bk.status in ('confirmed', 'pending_payment')
        and lower(bk.period) > now()
        and floor(extract(epoch from lower(bk.period)))::bigint = $4::bigint
     on conflict (dedupe_key) do nothing`,
    [
      input.businessId,
      input.bookingId,
      `clienteQuiereCambiar:email:owner:${input.bookingId}:${input.sourceRowId}`,
      input.startSec,
    ],
  );
  return (r.rowCount ?? 0) === 1;
}
