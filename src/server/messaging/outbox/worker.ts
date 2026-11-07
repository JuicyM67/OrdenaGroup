import "server-only";

import { appHref } from "@/config/routes";
import { formulario } from "@/i18n";
import {
  APP_LOCALE,
  APP_TZ,
  formatDate,
  formatLocalDate,
  formatTime,
  type LocalDate,
} from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import { formatPhone, type E164 } from "@/lib/format/phone";
import type {
  AnswerValue,
  QuestionKind,
} from "@/lib/validation/booking-questions";
import { listBookingAnswersIn } from "@/server/booking-questions/answers";
import { pgErrorCode } from "@/server/db/errors";
import { withServiceTx } from "@/server/db/tx";
import { sendEmail, type EmailTemplateMap } from "@/server/messaging/email";
import { whatsappPossible } from "@/server/messaging/whatsapp/channel";
import { sendWhatsAppTemplate } from "@/server/messaging/whatsapp/client";
import { WhatsAppSendError } from "@/server/messaging/whatsapp/errors";
import {
  buildTemplate,
  firstName,
  isWhatsAppOutboxTemplate,
  type BuiltTemplate,
} from "@/server/messaging/whatsapp/templates";
import { hasWhatsAppConsentIn } from "@/server/privacy/whatsapp-consent";

import { OutboxFinalError, OutboxSendError } from "./errors";
import type { OutboxChannel, OutboxRecipientKind } from "./types";

/**
 * Workern (WP-16 steg 2): `FOR UPDATE SKIP LOCKED`, backoff 1/5/15/60 min,
 * `dead` efter 5 försök, idempotens via `dedupe_key`. Läser kunddata/
 * bokningskort vid sändningstillfället (D-029) — inget av det lagras i
 * `message_outbox`. Ingen `console.*` (boundaries.test.ts); fel skrivs bara
 * som en kort kod i `message_outbox.error`, aldrig persondata.
 *
 * Kanaler: `email` och (D-063) `whatsapp` för kundens bokningsmeddelanden
 * (`routeCustomerRow`). `message_channel` har kvar värdet `sms` i
 * databasen; en sådan rad avbryts (`processRow`, D-062).
 *
 * WhatsApp (D-063): kanalen avgörs på nytt vid sändningen — samtycke,
 * chilenskt mobilnummer, konfiguration och godkänd mall
 * (`whatsapp/channel.ts`). Permanent fel → samma rad byter till e-post i
 * samma pass (`fallback_reason`). Tillfälligt fel → backoff; sista försöket
 * blir e-post i stället för `dead`. En rad som skickats via WhatsApp
 * behåller `payload` (token för e-postreserven) tills webhooken rapporterar
 * delivered/read/failed, högst `WHATSAPP_PAYLOAD_HOURS`.
 */

const DEFAULT_LIMIT = 25;
const MAX_ATTEMPTS = 5;
const BACKOFF_MINUTES = [1, 5, 15, 60] as const;
const STUCK_SENDING_MINUTES = 10;
/** D-063/D-029: så länge en WhatsApp-rad får behålla token för reserven. */
const WHATSAPP_PAYLOAD_HOURS = 24;

type ClaimedRow = {
  id: string;
  businessId: string;
  bookingId: string | null;
  /** Ändras i minnet när raden byter kanal (`routeCustomerRow`). */
  channel: OutboxChannel;
  recipientKind: OutboxRecipientKind;
  template: string;
  payload: Record<string, unknown>;
  attempts: number;
  dedupeKey: string;
  /** D-063: satt = raden har redan fallit tillbaka från WhatsApp. */
  fallbackReason: string | null;
  /** D-063: väntelistans post (överlever att payload töms). */
  waitlistEntryId: string | null;
};

type RawClaimRow = {
  id: string;
  business_id: string;
  booking_id: string | null;
  channel: OutboxChannel;
  recipient_kind: OutboxRecipientKind;
  template: string;
  payload: Record<string, unknown> | null;
  attempts: number;
  dedupe_key: string;
  fallback_reason?: string | null;
  waitlist_entry_id?: string | null;
};

async function claimBatch(
  limit: number,
  bookingId: string | undefined,
): Promise<ClaimedRow[]> {
  return withServiceTx(async (q) => {
    // Rader som fastnat i "sending" (t.ex. en avbruten funktion) återköas
    // utan att räkna om attempts (redan räknat vid claim-steget nedan).
    await q.query(
      `update public.message_outbox
          set status = 'queued'
        where status = 'sending'
          and updated_at < now() - interval '${STUCK_SENDING_MINUTES} minutes'`,
    );
    // D-063/D-029: en WhatsApp-rad som aldrig fick leveransstatus behåller
    // inte kundens token längre än så här (reserven är ändå inaktuell då).
    await q.query(
      `update public.message_outbox
          set payload = '{}'::jsonb
        where channel = 'whatsapp' and status = 'sent'
          and payload <> '{}'::jsonb
          and sent_at < now() - interval '${WHATSAPP_PAYLOAD_HOURS} hours'`,
    );
    const params: unknown[] = bookingId ? [limit, bookingId] : [limit];
    const bookingFilter = bookingId ? "and booking_id = $2" : "";
    const r = await q.query<RawClaimRow>(
      `with next as (
         select id
           from public.message_outbox
          where status in ('queued', 'failed')
            and next_attempt_at <= now()
            ${bookingFilter}
          order by next_attempt_at
          limit $1
          for update skip locked
       )
       update public.message_outbox m
          set status = 'sending', attempts = attempts + 1
         from next
        where m.id = next.id
       returning m.id, m.business_id, m.booking_id, m.channel, m.recipient_kind,
                 m.template, m.payload, m.attempts, m.dedupe_key,
                 m.fallback_reason, m.waitlist_entry_id`,
      params,
    );
    return r.rows.map((x) => ({
      id: x.id,
      businessId: x.business_id,
      bookingId: x.booking_id,
      channel: x.channel,
      recipientKind: x.recipient_kind,
      template: x.template,
      payload: x.payload ?? {},
      attempts: x.attempts,
      dedupeKey: x.dedupe_key,
      fallbackReason: x.fallback_reason ?? null,
      waitlistEntryId: x.waitlist_entry_id ?? null,
    }));
  });
}

// ---------------------------------------------------------------------------
// Kontext (kunddata/bokningskort), läst av workern vid sändning (D-029)
// ---------------------------------------------------------------------------

type MessageContext = {
  bookingStatus: string;
  startMs: number;
  priceClp: number;
  discountClp: number;
  /** WP-31: rabatten kommer från en erbjudandelänk (inte medlemskap). */
  discountIsOffer: boolean;
  negocio: string;
  /** WP-56: `businesses.phone` (E.164 eller null). */
  negocioTelefono: string | null;
  slug: string;
  address: string | null;
  cancelWindowHours: number;
  /** D-063: kanalvalet (WhatsApp-samtycket är per kundrad). */
  customerId: string;
  cliente: string;
  phone: string;
  email: string | null;
  servicio: string;
  profesional: string;
};

type RawContextRow = {
  booking_status: string;
  start_ms: number;
  price_clp: number;
  discount_clp: number;
  discount_is_offer: boolean;
  negocio: string;
  negocio_telefono: string | null;
  slug: string;
  address: string | null;
  cancel_window_hours: number;
  customer_id: string;
  cliente: string;
  phone_e164: string;
  email: string | null;
  servicio: string;
  profesional: string;
};

async function loadContext(
  businessId: string,
  bookingId: string,
): Promise<MessageContext | undefined> {
  return withServiceTx(async (q) => {
    const r = await q.query<RawContextRow>(
      `select bk.status::text as booking_status,
              extract(epoch from lower(bk.period))::float8 * 1000 as start_ms,
              bk.price_clp, bk.discount_clp,
              bk.campaign_recipient_id is not null as discount_is_offer,
              b.name as negocio, b.phone as negocio_telefono,
              b.slug, b.address, b.cancel_window_hours,
              c.id as customer_id, c.name as cliente, c.phone_e164, c.email,
              s.name as servicio, st.name as profesional
         from public.bookings bk
         join public.businesses b on b.id = bk.business_id
         join public.customers c on c.business_id = bk.business_id and c.id = bk.customer_id
         join public.services s on s.business_id = bk.business_id and s.id = bk.service_id
         join public.staff st on st.business_id = bk.business_id and st.id = bk.staff_id
        where bk.business_id = $1 and bk.id = $2`,
      [businessId, bookingId],
    );
    const row = r.rows[0];
    if (!row) return undefined;
    return {
      bookingStatus: row.booking_status,
      startMs: Math.round(row.start_ms),
      priceClp: row.price_clp,
      discountClp: row.discount_clp,
      discountIsOffer: row.discount_is_offer,
      negocio: row.negocio,
      negocioTelefono: row.negocio_telefono,
      slug: row.slug,
      address: row.address,
      cancelWindowHours: row.cancel_window_hours,
      customerId: row.customer_id,
      cliente: row.cliente,
      phone: row.phone_e164,
      email: row.email,
      servicio: row.servicio,
      profesional: row.profesional,
    };
  });
}

async function ownerEmailsFor(businessId: string): Promise<string[]> {
  return withServiceTx(async (q) => {
    const r = await q.query<{ email: string }>(
      `select email from private.owner_emails($1) as email`,
      [businessId],
    );
    return r.rows.map((x) => x.email);
  });
}

// ---------------------------------------------------------------------------
// Inbjudan (WP-46, D-034): `recipient_kind = 'invitee'`. Adressen/företagets
// namn slås upp via `payload.invitationId` (ingen adress i utkorgen) — samma
// D-029-mönster som `loadContext`/`ownerEmailsFor` ovan, men mot
// `member_invitations` i stället för `bookings`. `invitadoPor` (den
// agerande ägarens visningsnamn) kommer INTE härifrån: den skrevs redan in i
// `payload` av `src/server/team/invitations.ts` (servern kan inte läsa
// `auth.users` direkt, se den filens kommentar).
// ---------------------------------------------------------------------------

type InvitationContext = {
  email: string;
  negocio: string;
  /** Varken accepterad, återkallad eller utgången — annars skickas mejlet
   * aldrig (samma idé som `REQUEST_ONLY_TEMPLATES` nedan för bokningar). */
  isPending: boolean;
};

type RawInvitationContextRow = {
  email: string;
  negocio: string;
  is_pending: boolean;
};

async function loadInvitationContext(
  businessId: string,
  invitationId: string,
): Promise<InvitationContext | undefined> {
  return withServiceTx(async (q) => {
    const r = await q.query<RawInvitationContextRow>(
      `select mi.email,
              b.name as negocio,
              (mi.accepted_at is null and mi.revoked_at is null
                and mi.expires_at > now()) as is_pending
         from public.member_invitations mi
         join public.businesses b on b.id = mi.business_id
        where mi.business_id = $1 and mi.id = $2`,
      [businessId, invitationId],
    );
    const row = r.rows[0];
    return row
      ? { email: row.email, negocio: row.negocio, isPending: row.is_pending }
      : undefined;
  });
}

// ---------------------------------------------------------------------------
// WP-54: `bienvenidaMiembro` — ingen bokning (`booking_id` null), kunden slås
// upp via `payload.customerId` (ingen adress i kön, D-029). Skickas bara om
// kunden FORTFARANDE är medlem, inte anonymiserad och har e-post.
// ---------------------------------------------------------------------------

type MemberWelcomeContext = {
  sendable: boolean;
  email: string | null;
  cliente: string;
  negocio: string;
  slug: string;
  pct: number | null;
  benefitText: string | null;
};

async function loadMemberWelcomeContext(
  businessId: string,
  customerId: string,
): Promise<MemberWelcomeContext | undefined> {
  return withServiceTx(async (q) => {
    const r = await q.query<{
      sendable: boolean;
      email: string | null;
      cliente: string;
      negocio: string;
      slug: string;
      member_discount_pct: number | null;
      member_benefit_text: string | null;
    }>(
      `select (c.is_member and c.anonymized_at is null) as sendable,
              c.email, c.name as cliente,
              b.name as negocio, b.slug,
              b.member_discount_pct, b.member_benefit_text
         from public.customers c
         join public.businesses b on b.id = c.business_id
        where c.business_id = $1 and c.id = $2`,
      [businessId, customerId],
    );
    const row = r.rows[0];
    return row
      ? {
          sendable: row.sendable,
          email: row.email,
          cliente: row.cliente,
          negocio: row.negocio,
          slug: row.slug,
          pct: row.member_discount_pct,
          benefitText: row.member_benefit_text,
        }
      : undefined;
  });
}

// ---------------------------------------------------------------------------
// WP-31 (F14): `campanaMarketing` — en kampanjutskick-rad, ingen bokning
// (`booking_id` null). `payload.campaignRecipientId` + `payload.token`
// (klartext-token, D-029 — bara hashen finns i `campaign_recipients`, se
// `src/server/campaigns/send.ts`). Kontrolleras sendbar HÄR, vid
// sändningstillfället (kunden kan ha svarat BAJA eller blivit anonymiserad
// mellan köning och sändning) — inte bara när raden köades.
// ---------------------------------------------------------------------------

type CampaignContext = {
  sendable: boolean;
  email: string | null;
  negocio: string;
  slug: string;
  texto: string;
  offerPct: number | null;
  offerText: string | null;
  /** "YYYY-MM-DD" eller `null`. */
  offerValidUntil: string | null;
};

async function loadCampaignContext(
  businessId: string,
  campaignRecipientId: string,
): Promise<CampaignContext | undefined> {
  return withServiceTx(async (q) => {
    const r = await q.query<{
      sendable: boolean;
      email: string | null;
      negocio: string;
      slug: string;
      texto: string;
      offer_pct: number | null;
      offer_text: string | null;
      offer_valid_until: string | null;
    }>(
      `select (cu.anonymized_at is null and cu.consent_marketing_at is not null) as sendable,
              cu.email,
              b.name as negocio, b.slug,
              c.message as texto, c.offer_pct, c.offer_text,
              c.offer_valid_until::text as offer_valid_until
         from public.campaign_recipients cr
         join public.campaigns c on c.business_id = cr.business_id and c.id = cr.campaign_id
         join public.businesses b on b.id = cr.business_id
         join public.customers cu
           on cu.business_id = cr.business_id and cu.id = cr.customer_id
        where cr.business_id = $1 and cr.id = $2`,
      [businessId, campaignRecipientId],
    );
    const row = r.rows[0];
    return row
      ? {
          sendable: row.sendable,
          email: row.email,
          negocio: row.negocio,
          slug: row.slug,
          texto: row.texto,
          offerPct: row.offer_pct,
          offerText: row.offer_text,
          offerValidUntil: row.offer_valid_until,
        }
      : undefined;
  });
}

// ---------------------------------------------------------------------------
// WP-23: `listaEsperaCupo`/`listaEsperaTomada` — en väntelisterad, ingen
// bokning (`booking_id` null). `payload.entryId` slår upp kunden/entryn
// (D-029, samma mönster som `loadCampaignContext`); `listaEsperaCupo` har
// också `payload.token` (klartext, för `/v/[token]`).
//
// `listaEsperaCupo` läser den erbjudna tiden med `getWaitlistOffer` (`@/
// server/waitlist`, scheduling-engineer) — entryn har bara `day date`, den
// specifika lediga tiden räknas om på servern varje gång (samma som "Ta
// tiden" gör), inte en frusen kolumn. `getWaitlistOffer` returnerar bara
// `ok: false` om erbjudandet inte längre gäller (taget/utgånget/bokat/
// ogiltigt) — raden avbryts då tyst, precis som `REQUEST_ONLY_TEMPLATES` för
// bokningar.
// ---------------------------------------------------------------------------

type WaitlistCustomerContext = {
  /** "YYYY-MM-DD" — dagen kunden väntar på. */
  day: string;
  sendable: boolean;
  customerId: string;
  cliente: string;
  phone: string | null;
  email: string | null;
  negocio: string;
};

async function loadWaitlistCustomerContext(
  businessId: string,
  entryId: string,
): Promise<WaitlistCustomerContext | undefined> {
  return withServiceTx(async (q) => {
    const r = await q.query<{
      day: string;
      sendable: boolean;
      customer_id: string;
      cliente: string;
      phone_e164: string | null;
      email: string | null;
      negocio: string;
    }>(
      `select we.day::text as day,
              (c.anonymized_at is null) as sendable,
              c.id as customer_id, c.name as cliente, c.phone_e164, c.email,
              b.name as negocio
         from public.waitlist_entries we
         join public.customers c on c.business_id = we.business_id and c.id = we.customer_id
         join public.businesses b on b.id = we.business_id
        where we.business_id = $1 and we.id = $2`,
      [businessId, entryId],
    );
    const row = r.rows[0];
    return row
      ? {
          day: row.day,
          sendable: row.sendable,
          customerId: row.customer_id,
          cliente: row.cliente,
          phone: row.phone_e164,
          email: row.email,
          negocio: row.negocio,
        }
      : undefined;
  });
}

async function processWaitlistCupoRow(
  row: ClaimedRow,
  ctx: WaitlistCustomerContext,
): Promise<"sent" | "cancelled"> {
  const token = typeof row.payload.token === "string" ? row.payload.token : "";
  if (!token) throw new OutboxSendError("invalid_payload");
  const { getWaitlistOffer } = await import("@/server/waitlist");
  const result = await getWaitlistOffer(token, new Date());
  if (!result.ok) {
    await finalizeCancelled(row);
    return "cancelled";
  }
  const offer = result.offer;
  const start = new Date(offer.start);
  const fecha = formatDate(
    start,
    APP_TZ,
    "weekdayDayMonthLongLower",
    APP_LOCALE,
  );
  const hora = formatTime(start, APP_TZ);
  const minutos = Math.max(
    1,
    Math.ceil((new Date(offer.expiresAt).getTime() - Date.now()) / 60_000),
  );
  const routed = await routeCustomerRow(row, {
    customerId: ctx.customerId,
    phone: ctx.phone,
    hasEmail: ctx.email !== null,
    build: () =>
      buildTemplate("lista_espera_oferta", {
        negocio: offer.businessName,
        cliente: firstName(ctx.cliente),
        servicio: offer.serviceName,
        fecha,
        hora,
        minutos,
        startMs: start.getTime(),
        offeredMs: new Date(offer.offeredAt).getTime(),
      }),
  });
  if (routed !== "email") return routed;
  if (!ctx.email) {
    await finalizeCancelled(row);
    return "cancelled";
  }
  const r = await sendEmail({
    to: ctx.email,
    template: "listaEsperaCupo",
    data: {
      negocio: offer.businessName,
      servicio: offer.serviceName,
      fecha,
      hora,
      minutos,
      confirmarUrl: waitlistOfferLink(token),
    },
    idempotencyKey: row.dedupeKey,
  });
  await finalizeSent(row, r.id);
  return "sent";
}

/** `listaEsperaTomada`: ren avisering, ingen token/länk — meningsfull
 * oavsett entryns nuvarande status (kunden kan ha fått flera erbjudanden
 * sen dess). */
async function processWaitlistTomadaRow(
  row: ClaimedRow,
  ctx: WaitlistCustomerContext,
): Promise<"sent" | "cancelled"> {
  const dia = formatLocalDate(
    ctx.day as LocalDate,
    "weekdayDayMonthLongLower",
    APP_LOCALE,
  );
  const routed = await routeCustomerRow(row, {
    customerId: ctx.customerId,
    phone: ctx.phone,
    hasEmail: ctx.email !== null,
    build: () =>
      buildTemplate("lista_espera_tomada", {
        negocio: ctx.negocio,
        cliente: firstName(ctx.cliente),
        fecha: dia,
      }),
  });
  if (routed !== "email") return routed;
  if (!ctx.email) {
    await finalizeCancelled(row);
    return "cancelled";
  }
  const r = await sendEmail({
    to: ctx.email,
    template: "listaEsperaTomada",
    data: { cliente: ctx.cliente, negocio: ctx.negocio, fecha: dia },
    idempotencyKey: row.dedupeKey,
  });
  await finalizeSent(row, r.id);
  return "sent";
}

async function processWaitlistRow(
  row: ClaimedRow,
): Promise<"sent" | "cancelled"> {
  // D-063: `waitlist_entry_id` som reserv — en WhatsApp-rad som föll
  // tillbaka till e-post efter att payload tömts har bara kolumnen kvar.
  const entryId =
    typeof row.payload.entryId === "string"
      ? row.payload.entryId
      : (row.waitlistEntryId ?? "");
  if (!entryId) throw new OutboxSendError("invalid_payload");
  const ctx = await loadWaitlistCustomerContext(row.businessId, entryId);
  if (!ctx) throw new OutboxSendError("no_customer");
  // Ingen e-post avgörs först efter kanalvalet (WhatsApp kan räcka).
  if (!ctx.sendable) {
    await finalizeCancelled(row);
    return "cancelled";
  }
  return row.template === "listaEsperaCupo"
    ? processWaitlistCupoRow(row, ctx)
    : processWaitlistTomadaRow(row, ctx);
}

// ---------------------------------------------------------------------------
// Länkar och mallars data
// ---------------------------------------------------------------------------

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000").replace(
    /\/$/,
    "",
  );
}

function manageLink(token: string): string {
  return `${appUrl()}/r/${token}`;
}

/** `${APP_URL}/app/invitacion/${token}` (WP-46 plan, paso 4). */
function invitationAcceptLink(token: string): string {
  return `${appUrl()}${appHref("appInvitacion", token)}`;
}

function bookAgainLink(slug: string): string {
  return `${appUrl()}/${slug}`;
}

function agendaLink(): string {
  return `${appUrl()}${appHref("appAgenda")}`;
}

/** WP-56: `${APP_URL}/app/solicitudes/{bookingId}` (svara med ett tryck). */
function solicitudLink(bookingId: string): string {
  return `${appUrl()}${appHref("appSolicitud", bookingId)}`;
}

/** WP-31: `${APP_URL}/{slug}?o=<token>` — erbjudandelänken (gäller som en
 * vanlig "Reservar"-länk även utan erbjudande, se `offer.ts`: en ogiltig/
 * icke-rabatterande token bokar bara utan rabatt). */
function offerLink(slug: string, token: string): string {
  return `${appUrl()}/${slug}?o=${token}`;
}

/** WP-31: `${APP_URL}/baja/<token>` — avregistreringslänken (regel hård 7,
 * alltid med i en kampanj). */
function bajaLink(token: string): string {
  return `${appUrl()}${appHref("baja", token)}`;
}

/** WP-65 (D-045): `${APP_URL}/resena/<token>`. */
function reviewLink(token: string): string {
  return `${appUrl()}${appHref("resena", token)}`;
}

/** WP-23: `${APP_URL}/v/<token>` — väntelistans erbjudandelänk ("Ta
 * tiden", `claimWaitlistOffer`). */
function waitlistOfferLink(token: string): string {
  return `${appUrl()}/v/${token}`;
}

/** WP-30: `${APP_URL}/{slug}?flash=<id>` — horas flash-länken i en
 * kampanj (`sendFlashCampaign`), i stället för `offerLink`s `?o=<token>`:
 * rabatten ligger på själva tiden (`flash_slots.discount_pct`), inte på en
 * erbjudande-token. */
function flashLink(slug: string, flashSlotId: string): string {
  return `${appUrl()}/${slug}?flash=${flashSlotId}`;
}

/** WP-56: företagets telefon för "kontakta oss", formaterad. */
function negocioTelefono(ctx: MessageContext): { telefono?: string } {
  return ctx.negocioTelefono
    ? { telefono: formatPhone(ctx.negocioTelefono as E164) }
    : {};
}

function fechaHora(ctx: MessageContext): { fecha: string; hora: string } {
  const start = new Date(ctx.startMs);
  return {
    fecha: formatDate(start, APP_TZ, "weekdayDayMonthLongLower", APP_LOCALE),
    hora: formatTime(start, APP_TZ),
  };
}

/** Priset att betala och rabatten (WP-54 medlem / WP-31 erbjudande, största
 * vinner i `src/server/bookings/create.ts`). `discountClp > 0` = "Precio
 * socio" eller (`campaign_recipient_id` satt) "Precio con oferta". */
function precioFields(ctx: MessageContext): {
  precio: string;
  descuentoSocio?: string;
  descuentoOferta?: boolean;
} {
  const precio = formatMoney(Math.max(ctx.priceClp - ctx.discountClp, 0));
  if (ctx.discountClp <= 0) return { precio };
  return {
    precio,
    descuentoSocio: formatMoney(ctx.discountClp),
    ...(ctx.discountIsOffer ? { descuentoOferta: true } : {}),
  };
}

function reservaConfirmadaData(
  ctx: MessageContext,
  token: string,
): EmailTemplateMap["reservaConfirmada"] {
  const { fecha, hora } = fechaHora(ctx);
  return {
    cliente: ctx.cliente,
    negocio: ctx.negocio,
    servicio: ctx.servicio,
    fecha,
    hora,
    profesional: ctx.profesional,
    direccion: ctx.address ?? undefined,
    ...precioFields(ctx),
    horasCancelacion: ctx.cancelWindowHours,
    linkGestion: manageLink(token),
  };
}

function recordatorioData(
  ctx: MessageContext,
  token: string,
): EmailTemplateMap["recordatorio"] {
  const { fecha, hora } = fechaHora(ctx);
  return {
    cliente: ctx.cliente,
    negocio: ctx.negocio,
    servicio: ctx.servicio,
    fecha,
    hora,
    linkGestion: manageLink(token),
  };
}

function reservaMovidaData(
  ctx: MessageContext,
  token: string,
): EmailTemplateMap["reservaMovida"] {
  const { fecha, hora } = fechaHora(ctx);
  return {
    cliente: ctx.cliente,
    negocio: ctx.negocio,
    servicio: ctx.servicio,
    fecha,
    hora,
    profesional: ctx.profesional,
    linkGestion: manageLink(token),
  };
}

function reservaCanceladaData(
  ctx: MessageContext,
): EmailTemplateMap["reservaCancelada"] {
  const { fecha, hora } = fechaHora(ctx);
  return {
    cliente: ctx.cliente,
    negocio: ctx.negocio,
    fecha,
    hora,
    linkNuevaReserva: bookAgainLink(ctx.slug),
  };
}

function solicitudRecibidaData(
  ctx: MessageContext,
  token: string,
): EmailTemplateMap["solicitudRecibida"] {
  const { fecha, hora } = fechaHora(ctx);
  return {
    cliente: ctx.cliente,
    negocio: ctx.negocio,
    servicio: ctx.servicio,
    fecha,
    hora,
    profesional: ctx.profesional,
    direccion: ctx.address ?? undefined,
    ...precioFields(ctx),
    linkGestion: manageLink(token),
  };
}

/** `reservaCancelada`/`solicitudRechazada`/`solicitudVencida` delar exakt
 * samma fält (namn på länken till förnyad bokning är det enda som skiljer
 * mallarna, inte datat). */
function linkNuevaReservaData(
  ctx: MessageContext,
): EmailTemplateMap["solicitudRechazada"] {
  return reservaCanceladaData(ctx);
}

/** Texten för ett svar i ägarens mejl (WP-40, D-031) — egen, liten kopia av
 * `src/components/booking/answer-format.ts`s `formatAnswerValue` (samma
 * logik, olika körtidskontext: workern importerar aldrig klientkomponenter,
 * se filkommentaren ovan). */
function formatAnswerForEmail(a: {
  kind: QuestionKind;
  value: AnswerValue;
}): string {
  switch (a.kind) {
    case "yes_no":
      return a.value === true ? formulario.siNo.si : formulario.siNo.no;
    case "multi_choice":
      return Array.isArray(a.value) ? a.value.join(", ") : String(a.value);
    default:
      return String(a.value);
  }
}

/** Svaren på bokningsfrågorna, redan formaterade för `cardRows` (WP-40). Bara
 * `nuevaReservaDueno` anropar den här — `cancelacionDueno` visar aldrig svar. */
async function duenoAnswers(
  businessId: string,
  bookingId: string | null,
): Promise<{ label: string; value: string }[]> {
  if (!bookingId) return [];
  const byBooking = await withServiceTx((q) =>
    listBookingAnswersIn(q, businessId, [bookingId]),
  );
  return (byBooking[bookingId] ?? []).map((a) => ({
    label: a.label,
    value: formatAnswerForEmail(a),
  }));
}

function duenoData(
  ctx: MessageContext,
  answers: readonly { label: string; value: string }[],
): EmailTemplateMap["nuevaReservaDueno"] {
  const { fecha, hora } = fechaHora(ctx);
  return {
    negocio: ctx.negocio,
    cliente: ctx.cliente,
    servicio: ctx.servicio,
    fecha,
    hora,
    agendaUrl: agendaLink(),
    ...(answers.length > 0 ? { answers } : {}),
  };
}

// ---------------------------------------------------------------------------
// Sändning
// ---------------------------------------------------------------------------

async function sendCustomerEmail(
  ctx: MessageContext,
  row: ClaimedRow,
  token: string,
): Promise<string> {
  if (!ctx.email) throw new OutboxSendError("no_email");
  const to = ctx.email;
  switch (row.template) {
    case "reservaConfirmada": {
      const r = await sendEmail({
        to,
        template: "reservaConfirmada",
        data: reservaConfirmadaData(ctx, token),
        idempotencyKey: row.dedupeKey,
      });
      return r.id;
    }
    case "recordatorio": {
      const r = await sendEmail({
        to,
        template: "recordatorio",
        data: recordatorioData(ctx, token),
        idempotencyKey: row.dedupeKey,
      });
      return r.id;
    }
    case "reservaMovida": {
      const r = await sendEmail({
        to,
        template: "reservaMovida",
        data: reservaMovidaData(ctx, token),
        idempotencyKey: row.dedupeKey,
      });
      return r.id;
    }
    case "reservaCancelada": {
      const r = await sendEmail({
        to,
        template: "reservaCancelada",
        data: reservaCanceladaData(ctx),
        idempotencyKey: row.dedupeKey,
      });
      return r.id;
    }
    case "solicitudRecibida": {
      const r = await sendEmail({
        to,
        template: "solicitudRecibida",
        data: solicitudRecibidaData(ctx, token),
        idempotencyKey: row.dedupeKey,
      });
      return r.id;
    }
    case "solicitudRechazada": {
      // WP-45: `motivo` (ägarens valfria fritextmotiv) läses ur payloaden,
      // precis som `token` ovan — sparas aldrig någon annanstans, och
      // payloaden rensas efter sändning (D-029, finalizeSent nedan).
      const motivo =
        typeof row.payload.motivo === "string" ? row.payload.motivo : undefined;
      const r = await sendEmail({
        to,
        template: "solicitudRechazada",
        data: { ...linkNuevaReservaData(ctx), ...(motivo ? { motivo } : {}) },
        idempotencyKey: row.dedupeKey,
      });
      return r.id;
    }
    case "solicitudVencida": {
      const r = await sendEmail({
        to,
        template: "solicitudVencida",
        data: linkNuevaReservaData(ctx),
        idempotencyKey: row.dedupeKey,
      });
      return r.id;
    }
    case "solicitudResena": {
      const r = await sendEmail({
        to,
        template: "solicitudResena",
        data: {
          cliente: ctx.cliente,
          negocio: ctx.negocio,
          servicio: ctx.servicio,
          resenaUrl: reviewLink(token),
        },
        idempotencyKey: row.dedupeKey,
      });
      return r.id;
    }
    case "cancelacionRechazada": {
      const { fecha, hora } = fechaHora(ctx);
      const r = await sendEmail({
        to,
        template: "cancelacionRechazada",
        data: {
          cliente: ctx.cliente,
          negocio: ctx.negocio,
          fecha,
          hora,
          ...negocioTelefono(ctx),
        },
        idempotencyKey: row.dedupeKey,
      });
      return r.id;
    }
    default:
      throw new OutboxSendError("unknown_template");
  }
}

type OwnerEmailTemplate =
  | "nuevaReservaDueno"
  | "cancelacionDueno"
  | "nuevaSolicitud"
  | "solicitudCancelacion";

const OWNER_EMAIL_TEMPLATES: ReadonlySet<string> = new Set<OwnerEmailTemplate>([
  "nuevaReservaDueno",
  "cancelacionDueno",
  "nuevaSolicitud",
  "solicitudCancelacion",
]);

/** Ägaren får e-post. Flera ägare i
 * samma företag (sällsynt) får var sin sändning, egna idempotensnycklar
 * (annars kan Resends dedupe råka hoppa över en av dem). */
async function sendOwner(
  ctx: MessageContext,
  row: ClaimedRow,
): Promise<string> {
  if (!OWNER_EMAIL_TEMPLATES.has(row.template)) {
    throw new OutboxSendError("unknown_template");
  }
  // Säkert efter kontrollen ovan.
  const template = row.template as OwnerEmailTemplate;
  const emails = await ownerEmailsFor(row.businessId);
  if (emails.length === 0) throw new OutboxSendError("no_owner_email");
  // `cancelacionDueno`/`solicitudCancelacion` nunca muestran las respuestas
  // (WP-40); `nuevaSolicitud` sí, igual que `nuevaReservaDueno`.
  const answers =
    template === "cancelacionDueno" || template === "solicitudCancelacion"
      ? []
      : await duenoAnswers(row.businessId, row.bookingId);
  const base = duenoData(ctx, answers);
  // WP-56: avbokningsförfrågan → knappen går till `/app/solicitudes/{id}`.
  const data =
    template === "solicitudCancelacion" && row.bookingId
      ? { ...base, agendaUrl: solicitudLink(row.bookingId) }
      : base;
  const ids: string[] = [];
  for (const [i, to] of emails.entries()) {
    const r = await sendEmail({
      to,
      template,
      data,
      idempotencyKey: `${row.dedupeKey}:o${i}`,
    });
    ids.push(r.id);
  }
  return ids.join(",");
}

/** Al personal invitado (WP-46, D-034): único canal e-post en v1 (el plan §4
 * descarta WhatsApp acá). `invitadoPor` viene del
 * `payload` (escrito por `src/server/team/invitations.ts` al encolar, ver
 * el comentario en ese archivo) — nunca de una consulta a `auth.users`. */
async function sendInvitee(
  ctx: InvitationContext,
  row: ClaimedRow,
): Promise<string> {
  if (row.template !== "invitacionEquipo") {
    throw new OutboxSendError("unknown_template");
  }
  const token = typeof row.payload.token === "string" ? row.payload.token : "";
  const invitadoPor =
    typeof row.payload.invitadoPor === "string" ? row.payload.invitadoPor : "";
  if (!token) throw new OutboxSendError("invalid_payload");
  const r = await sendEmail({
    to: ctx.email,
    template: "invitacionEquipo",
    data: {
      negocio: ctx.negocio,
      invitadoPor,
      acceptUrl: invitationAcceptLink(token),
    },
    idempotencyKey: row.dedupeKey,
  });
  return r.id;
}

async function sendRow(ctx: MessageContext, row: ClaimedRow): Promise<string> {
  if (row.recipientKind === "owner") return sendOwner(ctx, row);
  const token = typeof row.payload.token === "string" ? row.payload.token : "";
  return sendCustomerEmail(ctx, row, token);
}

// ---------------------------------------------------------------------------
// WhatsApp (D-063): kanalval vid sändningen och reserv till e-post
// ---------------------------------------------------------------------------

/** Bokningens WhatsApp-mall med kontraktets parametrar, eller `null` när
 * den inte kan byggas (t.ex. token saknas för knappen) → e-post. */
function bookingWhatsAppTemplate(
  ctx: MessageContext,
  row: ClaimedRow,
  token: string,
): BuiltTemplate | null {
  const { fecha, hora } = fechaHora(ctx);
  const cliente = firstName(ctx.cliente);
  switch (row.template) {
    case "reservaConfirmada":
      return token
        ? buildTemplate("reserva_confirmada", {
            negocio: ctx.negocio,
            cliente,
            servicio: ctx.servicio,
            fecha,
            hora,
            profesional: ctx.profesional,
            horasCancelacion: ctx.cancelWindowHours,
            token,
          })
        : null;
    case "recordatorio":
      return buildTemplate("recordatorio_24h", {
        negocio: ctx.negocio,
        cliente,
        servicio: ctx.servicio,
        fecha,
        hora,
      });
    case "reservaCancelada":
      return buildTemplate("reserva_cancelada", {
        negocio: ctx.negocio,
        cliente,
        fecha,
        hora,
        slug: ctx.slug,
      });
    case "reservaMovida":
      return token
        ? buildTemplate("reserva_movida", {
            negocio: ctx.negocio,
            cliente,
            fecha,
            hora,
            profesional: ctx.profesional,
            token,
          })
        : null;
    default:
      return null;
  }
}

async function hasWhatsAppConsent(
  businessId: string,
  customerId: string,
): Promise<boolean> {
  return withServiceTx((q) => hasWhatsAppConsentIn(q, businessId, customerId));
}

/** Skickat via WhatsApp: `payload` behålls (token till en ev. e-postreserv
 * när webhooken säger `failed`), töms vid delivered/read eller efter
 * `WHATSAPP_PAYLOAD_HOURS`. Ett tomt id (ska inte hända) ger `null`. */
async function finalizeSentWhatsApp(
  row: ClaimedRow,
  providerId: string,
): Promise<void> {
  const id = providerId === "" ? null : providerId;
  await withServiceTx((q) =>
    q.query(
      `update public.message_outbox
          set status = 'sent', sent_at = now(), channel = 'whatsapp',
              provider_message_id = $3, wa_message_id = $3, error = null,
              delivered_at = null, read_at = null
        where id = $1 and business_id = $2`,
      [row.id, row.businessId, id],
    ),
  );
  row.channel = "whatsapp";
}

/** Byter raden till e-post. `reason` satt (en WhatsApp-felkod) = WhatsApp
 * försöks aldrig igen för raden, och e-posten räknas som första försöket. */
async function switchRowToEmail(
  row: ClaimedRow,
  reason: string | null,
): Promise<void> {
  await withServiceTx((q) =>
    q.query(
      // Aldrig skickad via WhatsApp (bara inte längre tillåten): ingen
      // felkod — utom om raden redan har ett wamid från ett tidigare
      // försök, då måste den märkas (constraint
      // message_outbox_wa_message_id_whatsapp).
      reason === null
        ? `update public.message_outbox
              set channel = 'email',
                  fallback_reason = case when wa_message_id is not null
                                         then 'wa_ineligible'
                                         else fallback_reason end
            where id = $1 and business_id = $2`
        : `update public.message_outbox
              set channel = 'email', fallback_reason = $3, error = $3,
                  attempts = 1
            where id = $1 and business_id = $2`,
      reason === null
        ? [row.id, row.businessId]
        : [row.id, row.businessId, reason],
    ),
  );
  row.channel = "email";
  if (reason !== null) {
    row.fallbackReason = reason;
    row.attempts = 1;
  }
}

type RouteInfo = {
  customerId: string;
  phone: string | null;
  hasEmail: boolean;
  build: () => BuiltTemplate | null;
};

/**
 * D-063: skickar kundraden via WhatsApp när det får ske just nu, annars
 * `"email"` (anroparen fortsätter med e-posten i samma pass). En rad köad
 * som `whatsapp` som inte längre får gå på WhatsApp blir e-post om kunden
 * har en, annars avbryts den. Tillfälligt fel kastas vidare till backoff
 * (`finalizeFailed`) — utom på sista försöket, då blir det e-post. Permanent
 * fel → e-post direkt; utan e-post är raden slut (`dead`).
 */
async function routeCustomerRow(
  row: ClaimedRow,
  info: RouteInfo,
): Promise<"sent" | "cancelled" | "email"> {
  const possible =
    row.fallbackReason === null && whatsappPossible(row.template, info.phone);
  const consent = possible
    ? await hasWhatsAppConsent(row.businessId, info.customerId)
    : false;
  const template = possible && consent ? info.build() : null;
  if (!template || !info.phone) {
    if (row.channel === "whatsapp") {
      if (!info.hasEmail) {
        await finalizeCancelled(row);
        return "cancelled";
      }
      await switchRowToEmail(row, null);
    }
    return "email";
  }
  try {
    const r = await sendWhatsAppTemplate({ to: info.phone, template });
    await finalizeSentWhatsApp(row, r.id);
    return "sent";
  } catch (e) {
    if (!(e instanceof WhatsAppSendError)) throw e;
    const lastAttempt = row.attempts >= MAX_ATTEMPTS;
    if (e.kind === "temporary" && !lastAttempt) throw e;
    if (!info.hasEmail) throw new OutboxFinalError(e.code);
    await switchRowToEmail(row, e.code);
    return "email";
  }
}

// ---------------------------------------------------------------------------
// Backoff och avslut
// ---------------------------------------------------------------------------

export type RetryDecision =
  { status: "queued"; delayMinutes: number } | { status: "dead" };

/** 1/5/15/60 min, `dead` efter 5 försök (ren funktion, testbar). */
export function nextRetry(attempts: number): RetryDecision {
  if (attempts >= MAX_ATTEMPTS) return { status: "dead" };
  const index = Math.min(Math.max(attempts - 1, 0), BACKOFF_MINUTES.length - 1);
  // Fallback (aldrig nått: index är alltid inom arrayen) håller typen `number`.
  const delayMinutes = BACKOFF_MINUTES[index] ?? 60;
  return { status: "queued", delayMinutes };
}

function errorCodeOf(e: unknown): string {
  const code = pgErrorCode(e);
  if (code) return code;
  if (e instanceof OutboxSendError) return e.code;
  if (e instanceof WhatsAppSendError) return e.code;
  if (e instanceof Error) {
    const m = /HTTP (\d+)/.exec(e.message);
    if (m) return `http_${m[1]}`;
  }
  return "unknown";
}

async function finalizeSent(
  row: ClaimedRow,
  providerId: string,
): Promise<void> {
  await withServiceTx((q) =>
    q.query(
      `update public.message_outbox
          set status = 'sent', sent_at = now(), provider_message_id = $3,
              payload = '{}'::jsonb, error = null
        where id = $1 and business_id = $2`,
      [row.id, row.businessId, providerId],
    ),
  );
}

async function finalizeCancelled(row: ClaimedRow): Promise<void> {
  await withServiceTx((q) =>
    q.query(
      `update public.message_outbox
          set status = 'cancelled', payload = '{}'::jsonb
        where id = $1 and business_id = $2`,
      [row.id, row.businessId],
    ),
  );
}

/** Slut utan fler försök (t.ex. permanent WhatsApp-fel och ingen e-post). */
async function finalizeDead(row: ClaimedRow, code: string): Promise<"dead"> {
  await withServiceTx((q) =>
    q.query(
      `update public.message_outbox
          set status = 'dead', error = $3, payload = '{}'::jsonb
        where id = $1 and business_id = $2`,
      [row.id, row.businessId, code],
    ),
  );
  return "dead";
}

async function finalizeFailed(
  row: ClaimedRow,
  code: string,
): Promise<"queued" | "dead"> {
  const decision = nextRetry(row.attempts);
  await withServiceTx((q) =>
    q.query(
      decision.status === "dead"
        ? `update public.message_outbox
              set status = 'dead', error = $3, payload = '{}'::jsonb
            where id = $1 and business_id = $2`
        : `update public.message_outbox
              set status = 'queued', error = $3,
                  next_attempt_at = now() + make_interval(mins => $4::int)
            where id = $1 and business_id = $2`,
      decision.status === "dead"
        ? [row.id, row.businessId, code]
        : [row.id, row.businessId, code, decision.delayMinutes],
    ),
  );
  return decision.status;
}

/** Mallar som bara är meningsfulla medan bokningen är `requested`. */
const REQUEST_ONLY_TEMPLATES: ReadonlySet<string> = new Set([
  "solicitudRecibida",
  "nuevaSolicitud",
]);

/** WP-56: mallar som bara är meningsfulla i en viss status — avbokningsför-
 * frågan medan den väntar, "inte godkänd" medan bokningen gäller igen. */
const STATUS_ONLY_TEMPLATES: ReadonlyMap<string, readonly string[]> = new Map([
  ["solicitudCancelacion", ["cancel_requested"]],
  ["cancelacionRechazada", ["confirmed", "pending_payment"]],
  // WP-65 (D-045): bara en genomförd bokning (inte No vino/avbokad).
  ["solicitudResena", ["confirmed", "completed"]],
]);

async function processInviteeRow(
  row: ClaimedRow,
): Promise<"sent" | "queued" | "dead" | "cancelled"> {
  const invitationId =
    typeof row.payload.invitationId === "string"
      ? row.payload.invitationId
      : "";
  if (!invitationId) throw new OutboxSendError("invalid_payload");
  const ctx = await loadInvitationContext(row.businessId, invitationId);
  if (!ctx) throw new OutboxSendError("no_invitation");
  // Inbjudan hann accepteras, återkallas eller gå ut innan raden skickades
  // (samma idé som REQUEST_ONLY_TEMPLATES nedan för bokningar) — beskedet
  // är inaktuellt, och (vid accept/revoke) länken/token:en i payloaden är
  // inte längre giltig.
  if (!ctx.isPending) {
    await finalizeCancelled(row);
    return "cancelled";
  }
  const providerId = await sendInvitee(ctx, row);
  await finalizeSent(row, providerId);
  return "sent";
}

async function processMemberWelcomeRow(
  row: ClaimedRow,
): Promise<"sent" | "cancelled"> {
  const customerId =
    typeof row.payload.customerId === "string" ? row.payload.customerId : "";
  if (!customerId) throw new OutboxSendError("invalid_payload");
  const ctx = await loadMemberWelcomeContext(row.businessId, customerId);
  if (!ctx) throw new OutboxSendError("no_customer");
  // Hann kunden sluta vara medlem, anonymiseras eller tappa e-posten innan
  // raden skickades är beskedet inaktuellt.
  if (!ctx.sendable || !ctx.email) {
    await finalizeCancelled(row);
    return "cancelled";
  }
  const benefit = ctx.benefitText?.trim();
  const r = await sendEmail({
    to: ctx.email,
    template: "bienvenidaMiembro",
    data: {
      cliente: ctx.cliente,
      negocio: ctx.negocio,
      ...(benefit ? { beneficioTexto: benefit } : {}),
      ...(ctx.pct !== null ? { pct: ctx.pct } : {}),
      linkReserva: bookAgainLink(ctx.slug),
    },
    idempotencyKey: row.dedupeKey,
  });
  await finalizeSent(row, r.id);
  return "sent";
}

/** WP-31 (F14): `campanaMarketing` — kampanjutskick, ingen bokning. Kontrollerar
 * samtycke/anonymisering/adress på nytt vid sändningen (D-029: tiden mellan
 * köning och sändning kan vara upp till en timme med 50/pass, planen kräver
 * `max 2000 mottagare`). `payload.token` (klartext) används både för
 * erbjudandelänken och avregistreringslänken (samma `campaign_recipients`-
 * token, se `src/server/campaigns/send.ts`). */
/** WP-30: `payload.flashSlotId` (opcional) — presente solo en los envíos de
 * `sendFlashCampaign`. Revalida a la hora de ENVIAR (D-029, igual que el
 * resto del contexto): la flash pudo ser reservada o cancelada entre el
 * encolado y el envío, y entonces el link ya no apunta a nada vigente. */
async function isFlashSlotActive(
  businessId: string,
  flashSlotId: string,
): Promise<boolean> {
  return withServiceTx(async (q) => {
    const r = await q.query<{ active: boolean }>(
      `select (status = 'active') as active
         from public.flash_slots
        where business_id = $1 and id = $2`,
      [businessId, flashSlotId],
    );
    return r.rows[0]?.active ?? false;
  });
}

async function processCampaignRow(
  row: ClaimedRow,
): Promise<"sent" | "cancelled"> {
  const campaignRecipientId =
    typeof row.payload.campaignRecipientId === "string"
      ? row.payload.campaignRecipientId
      : "";
  const token = typeof row.payload.token === "string" ? row.payload.token : "";
  const flashSlotId =
    typeof row.payload.flashSlotId === "string"
      ? row.payload.flashSlotId
      : undefined;
  if (!campaignRecipientId || !token) {
    throw new OutboxSendError("invalid_payload");
  }
  const ctx = await loadCampaignContext(row.businessId, campaignRecipientId);
  if (!ctx) throw new OutboxSendError("no_customer");
  if (!ctx.sendable || !ctx.email) {
    await finalizeCancelled(row);
    return "cancelled";
  }
  if (flashSlotId && !(await isFlashSlotActive(row.businessId, flashSlotId))) {
    await finalizeCancelled(row);
    return "cancelled";
  }
  const reservarUrl = flashSlotId
    ? flashLink(ctx.slug, flashSlotId)
    : offerLink(ctx.slug, token);
  const baja = bajaLink(token);
  const offerValidUntil = ctx.offerValidUntil
    ? formatLocalDate(
        ctx.offerValidUntil as LocalDate,
        "dayMonthLong",
        APP_LOCALE,
      )
    : undefined;
  const r = await sendEmail({
    to: ctx.email,
    template: "campanaMarketing",
    data: {
      negocio: ctx.negocio,
      texto: ctx.texto,
      ...(ctx.offerPct !== null ? { offerPct: ctx.offerPct } : {}),
      ...(ctx.offerText ? { offerText: ctx.offerText } : {}),
      ...(offerValidUntil ? { offerValidUntil } : {}),
      reservarUrl,
      bajaUrl: baja,
    },
    idempotencyKey: row.dedupeKey,
  });
  await finalizeSent(row, r.id);
  return "sent";
}

async function processRow(
  row: ClaimedRow,
): Promise<"sent" | "queued" | "dead" | "cancelled"> {
  try {
    // D-062: `sms` (kvar i databasens enum) köas inte av den här koden;
    // skulle en finnas avbryts den. D-063: `whatsapp` bara för kundens
    // bokningsmallar (`routeCustomerRow` nedan) — allt annat avbryts.
    const whatsappRow =
      row.recipientKind === "customer" &&
      isWhatsAppOutboxTemplate(row.template);
    if (row.channel === "sms" || (row.channel === "whatsapp" && !whatsappRow)) {
      await finalizeCancelled(row);
      return "cancelled";
    }
    if (row.template === "bienvenidaMiembro") {
      return await processMemberWelcomeRow(row);
    }
    if (row.template === "campanaMarketing") {
      return await processCampaignRow(row);
    }
    if (
      row.template === "listaEsperaCupo" ||
      row.template === "listaEsperaTomada"
    ) {
      return await processWaitlistRow(row);
    }
    // `await` explícito (no solo `return processInviteeRow(row)`): un
    // `return <promise>` dentro de un `try` NO deja que el `catch` de abajo
    // atrape un rechazo posterior — hay que esperarlo acá para que
    // `finalizeFailed` siga cubriendo los errores de la rama invitee.
    if (row.recipientKind === "invitee") return await processInviteeRow(row);
    if (!row.bookingId) throw new OutboxSendError("no_booking_id");
    const ctx = await loadContext(row.businessId, row.bookingId);
    if (!ctx) throw new OutboxSendError("no_booking");
    // En påminnelse för en bokning som inte längre är confirmed skickas
    // aldrig (t.ex. avbokad/flyttad utan att den här raden hunnit avbrytas).
    if (row.template === "recordatorio" && ctx.bookingStatus !== "confirmed") {
      await finalizeCancelled(row);
      return "cancelled";
    }
    // WP-45 (säkerhetsgranskning): "solicitud recibida"/"nueva solicitud"
    // gäller bara så länge bokningen fortfarande är en förfrågan — hann den
    // bekräftas, nekas, gå ut eller avbokas innan raden skickades är
    // beskedet inaktuellt (och kundens token i payloaden är redan roterad).
    if (
      REQUEST_ONLY_TEMPLATES.has(row.template) &&
      ctx.bookingStatus !== "requested"
    ) {
      await finalizeCancelled(row);
      return "cancelled";
    }
    const onlyIn = STATUS_ONLY_TEMPLATES.get(row.template);
    if (onlyIn && !onlyIn.includes(ctx.bookingStatus)) {
      await finalizeCancelled(row);
      return "cancelled";
    }
    if (whatsappRow) {
      const token =
        typeof row.payload.token === "string" ? row.payload.token : "";
      const routed = await routeCustomerRow(row, {
        customerId: ctx.customerId,
        phone: ctx.phone,
        hasEmail: ctx.email !== null,
        build: () => bookingWhatsAppTemplate(ctx, row, token),
      });
      if (routed !== "email") return routed;
    }
    const providerId = await sendRow(ctx, row);
    await finalizeSent(row, providerId);
    return "sent";
  } catch (e) {
    if (e instanceof OutboxFinalError) return finalizeDead(row, e.code);
    return finalizeFailed(row, errorCodeOf(e));
  }
}

// ---------------------------------------------------------------------------
// Publikt API
// ---------------------------------------------------------------------------

export type ProcessOutboxResult = {
  claimed: number;
  sent: number;
  cancelled: number;
  queued: number;
  dead: number;
};

/** Ett workerpass: plockar upp till `limit` rader (`FOR UPDATE SKIP LOCKED`)
 * och kör dem i tur och ordning. `bookingId` (från `kickOutbox`) begränsar
 * passet till en enda bokning. */
export async function processOutbox(
  opts: { limit?: number; bookingId?: string } = {},
): Promise<ProcessOutboxResult> {
  const rows = await claimBatch(opts.limit ?? DEFAULT_LIMIT, opts.bookingId);
  const result: ProcessOutboxResult = {
    claimed: rows.length,
    sent: 0,
    cancelled: 0,
    queued: 0,
    dead: 0,
  };
  for (const row of rows) {
    const outcome = await processRow(row);
    result[outcome] += 1;
  }
  return result;
}
