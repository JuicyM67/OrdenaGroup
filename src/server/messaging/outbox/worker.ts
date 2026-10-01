import "server-only";

import { formulario } from "@/i18n";
import { APP_LOCALE, APP_TZ, formatDate, formatTime } from "@/lib/format/dates";
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
import { sendSms } from "@/server/messaging/sms";

import { isOwnerMobile } from "./enqueue";
import { OutboxSendError } from "./errors";
import type { OutboxChannel, OutboxRecipientKind } from "./types";

/**
 * Workern (WP-16 steg 2): `FOR UPDATE SKIP LOCKED`, backoff 1/5/15/60 min,
 * `dead` efter 5 försök, idempotens via `dedupe_key`. Läser kunddata/
 * bokningskort vid sändningstillfället (D-029) — inget av det lagras i
 * `message_outbox`. Ingen `console.*` (boundaries.test.ts); fel skrivs bara
 * som en kort kod i `message_outbox.error`, aldrig persondata.
 */

const DEFAULT_LIMIT = 25;
const MAX_ATTEMPTS = 5;
const BACKOFF_MINUTES = [1, 5, 15, 60] as const;
const STUCK_SENDING_MINUTES = 10;

type ClaimedRow = {
  id: string;
  businessId: string;
  bookingId: string | null;
  channel: OutboxChannel;
  recipientKind: OutboxRecipientKind;
  template: string;
  payload: Record<string, unknown>;
  attempts: number;
  dedupeKey: string;
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
                 m.template, m.payload, m.attempts, m.dedupe_key`,
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
  negocio: string;
  /** WP-56: `businesses.phone` (E.164 eller null). */
  negocioTelefono: string | null;
  slug: string;
  address: string | null;
  cancelWindowHours: number;
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
  negocio: string;
  negocio_telefono: string | null;
  slug: string;
  address: string | null;
  cancel_window_hours: number;
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
              b.name as negocio, b.phone as negocio_telefono,
              b.slug, b.address, b.cancel_window_hours,
              c.name as cliente, c.phone_e164, c.email,
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
      negocio: row.negocio,
      negocioTelefono: row.negocio_telefono,
      slug: row.slug,
      address: row.address,
      cancelWindowHours: row.cancel_window_hours,
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
// WP-55: `mensajeLibre` — mensaje libre desde la ficha del cliente
// (`/app/clientes/[id]`, `sendCustomerMessage`). Sin `booking_id`: el cliente
// se busca vía `payload.customerId` (mismo patrón D-029 que
// `loadMemberWelcomeContext` arriba) — solo `payload.text` (el texto que
// escribió el dueño/staff) va en la fila, nunca el teléfono. Se cancela si el
// cliente fue anonimizado o perdió el teléfono entre el encolado y el envío.
// ---------------------------------------------------------------------------

type FreeMessageContext = {
  sendable: boolean;
  phone: string | null;
  negocio: string;
};

async function loadFreeMessageContext(
  businessId: string,
  customerId: string,
): Promise<FreeMessageContext | undefined> {
  return withServiceTx(async (q) => {
    const r = await q.query<{
      sendable: boolean;
      phone_e164: string | null;
      negocio: string;
    }>(
      `select (c.anonymized_at is null and c.phone_e164 is not null) as sendable,
              c.phone_e164, b.name as negocio
         from public.customers c
         join public.businesses b on b.id = c.business_id
        where c.business_id = $1 and c.id = $2`,
      [businessId, customerId],
    );
    const row = r.rows[0];
    return row
      ? { sendable: row.sendable, phone: row.phone_e164, negocio: row.negocio }
      : undefined;
  });
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
  return `${appUrl()}/app/invitacion/${token}`;
}

function bookAgainLink(slug: string): string {
  return `${appUrl()}/${slug}`;
}

function agendaLink(): string {
  return `${appUrl()}/app/agenda`;
}

/** WP-56: `${APP_URL}/app/solicitudes/{bookingId}` (svara med ett tryck). */
function solicitudLink(bookingId: string): string {
  return `${appUrl()}/app/solicitudes/${bookingId}`;
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

/** Priset att betala och (WP-54) medlemsrabatten. `discount_clp` sätts bara
 * av medlemsrabatten vid skapandet (`src/server/bookings/create.ts`), så
 * `discountClp > 0` = "Precio socio" i kortet. */
function precioFields(ctx: MessageContext): {
  precio: string;
  descuentoSocio?: string;
} {
  const precio = formatMoney(Math.max(ctx.priceClp - ctx.discountClp, 0));
  return ctx.discountClp > 0
    ? { precio, descuentoSocio: formatMoney(ctx.discountClp) }
    : { precio };
}

/** SMS-varianten: "$16.200 (-$1.800)" med ASCII "-" (GSM-7; "−" skulle
 * tvinga hela sms:et till UCS-2). */
function precioSocioSms(ctx: MessageContext): { precioSocio?: string } {
  if (ctx.discountClp <= 0) return {};
  const precio = formatMoney(Math.max(ctx.priceClp - ctx.discountClp, 0));
  return {
    precioSocio: `${precio} (-${formatMoney(ctx.discountClp)})`,
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

async function sendCustomerSms(
  ctx: MessageContext,
  row: ClaimedRow,
  token: string,
): Promise<string> {
  const to = ctx.phone;
  const { fecha, hora } = fechaHora(ctx);
  switch (row.template) {
    case "reservaConfirmada": {
      const r = await sendSms({
        to,
        template: "reservaConfirmada",
        data: {
          negocio: ctx.negocio,
          fecha,
          hora,
          link: manageLink(token),
          ...precioSocioSms(ctx),
        },
        idempotencyKey: row.dedupeKey,
      });
      return r.id;
    }
    case "recordatorio": {
      const r = await sendSms({
        to,
        template: "recordatorio",
        data: { negocio: ctx.negocio, fecha, hora, link: manageLink(token) },
        idempotencyKey: row.dedupeKey,
      });
      return r.id;
    }
    case "reservaMovida": {
      const r = await sendSms({
        to,
        template: "reservaMovida",
        data: { negocio: ctx.negocio, fecha, hora, link: manageLink(token) },
        idempotencyKey: row.dedupeKey,
      });
      return r.id;
    }
    case "reservaCancelada": {
      const r = await sendSms({
        to,
        template: "reservaCancelada",
        data: {
          negocio: ctx.negocio,
          fecha,
          hora,
          link: bookAgainLink(ctx.slug),
        },
        idempotencyKey: row.dedupeKey,
      });
      return r.id;
    }
    case "solicitudRechazada": {
      const r = await sendSms({
        to,
        template: "solicitudRechazada",
        data: {
          negocio: ctx.negocio,
          fecha,
          hora,
          link: bookAgainLink(ctx.slug),
        },
        idempotencyKey: row.dedupeKey,
      });
      return r.id;
    }
    case "solicitudVencida": {
      const r = await sendSms({
        to,
        template: "solicitudVencida",
        data: {
          negocio: ctx.negocio,
          fecha,
          hora,
          link: bookAgainLink(ctx.slug),
        },
        idempotencyKey: row.dedupeKey,
      });
      return r.id;
    }
    case "cancelacionRechazada": {
      const r = await sendSms({
        to,
        template: "cancelacionRechazada",
        data: { negocio: ctx.negocio, fecha, hora, ...negocioTelefono(ctx) },
        idempotencyKey: row.dedupeKey,
      });
      return r.id;
    }
    default:
      throw new OutboxSendError("unknown_template");
  }
}

/** WP-56: ägar-sms (SE) till `businesses.phone`. Numret läses vid
 * sändning (D-029); är det inte (längre) en mobil returneras `null` och
 * raden avbryts tyst (ägaren har ändå e-posten). */
async function sendOwnerSms(
  ctx: MessageContext,
  row: ClaimedRow,
): Promise<string | null> {
  if (!row.bookingId) throw new OutboxSendError("no_booking_id");
  if (!ctx.negocioTelefono || !isOwnerMobile(ctx.negocioTelefono)) return null;
  const { fecha, hora } = fechaHora(ctx);
  const data = {
    cliente: ctx.cliente,
    fecha,
    hora,
    link: solicitudLink(row.bookingId),
  };
  switch (row.template) {
    case "nuevaSolicitud": {
      const r = await sendSms({
        to: ctx.negocioTelefono,
        template: "nuevaSolicitudDueno",
        data,
        idempotencyKey: row.dedupeKey,
      });
      return r.id;
    }
    case "solicitudCancelacion": {
      const r = await sendSms({
        to: ctx.negocioTelefono,
        template: "solicitudCancelacionDueno",
        data,
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

/** Ägaren får e-post (sms bara via `sendOwnerSms`, WP-56). Flera ägare i
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

/** Al personal invitado (WP-46, D-034): único canal e-post en v1 (sin sms,
 * igual que el plan §4 descarta WhatsApp/SMS acá). `invitadoPor` viene del
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

/** `null` = inget att skicka (WP-56: ägar-sms utan mobilnummer). */
async function sendRow(
  ctx: MessageContext,
  row: ClaimedRow,
): Promise<string | null> {
  if (row.recipientKind === "owner") {
    return row.channel === "sms" ? sendOwnerSms(ctx, row) : sendOwner(ctx, row);
  }
  const token = typeof row.payload.token === "string" ? row.payload.token : "";
  return row.channel === "email"
    ? sendCustomerEmail(ctx, row, token)
    : sendCustomerSms(ctx, row, token);
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

/** WP-55: `mensajeLibre` — `payload.text` es el mensaje tal cual lo escribió
 * el dueño/staff (`sendCustomerMessage` ya lo validó, ≤ 320 caracteres); acá
 * solo se antepone `negocio` como remitente (`sms.mensajeLibre`). */
async function processFreeMessageRow(
  row: ClaimedRow,
): Promise<"sent" | "cancelled"> {
  const customerId =
    typeof row.payload.customerId === "string" ? row.payload.customerId : "";
  const texto = typeof row.payload.text === "string" ? row.payload.text : "";
  if (!customerId || !texto) throw new OutboxSendError("invalid_payload");
  const ctx = await loadFreeMessageContext(row.businessId, customerId);
  if (!ctx) throw new OutboxSendError("no_customer");
  // El cliente pudo ser anonimizado o perder el teléfono entre el encolado y
  // el envío — el mensaje queda inactual.
  if (!ctx.sendable || !ctx.phone) {
    await finalizeCancelled(row);
    return "cancelled";
  }
  const r = await sendSms({
    to: ctx.phone,
    template: "mensajeLibre",
    data: { negocio: ctx.negocio, texto },
    idempotencyKey: row.dedupeKey,
  });
  await finalizeSent(row, r.id);
  return "sent";
}

async function processRow(
  row: ClaimedRow,
): Promise<"sent" | "queued" | "dead" | "cancelled"> {
  try {
    if (row.template === "bienvenidaMiembro") {
      return await processMemberWelcomeRow(row);
    }
    if (row.template === "mensajeLibre") {
      return await processFreeMessageRow(row);
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
    const providerId = await sendRow(ctx, row);
    if (providerId === null) {
      await finalizeCancelled(row);
      return "cancelled";
    }
    await finalizeSent(row, providerId);
    return "sent";
  } catch (e) {
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
