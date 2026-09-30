import "server-only";

import { formulario } from "@/i18n";
import { APP_LOCALE, APP_TZ, formatDate, formatTime } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import type {
  AnswerValue,
  QuestionKind,
} from "@/lib/validation/booking-questions";
import { listBookingAnswersIn } from "@/server/booking-questions/answers";
import { pgErrorCode } from "@/server/db/errors";
import { withServiceTx } from "@/server/db/tx";
import { sendEmail, type EmailTemplateMap } from "@/server/messaging/email";
import { sendSms } from "@/server/messaging/sms";

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
              b.name as negocio, b.slug, b.address, b.cancel_window_hours,
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

function bookAgainLink(slug: string): string {
  return `${appUrl()}/${slug}`;
}

function agendaLink(): string {
  return `${appUrl()}/app/agenda`;
}

function fechaHora(ctx: MessageContext): { fecha: string; hora: string } {
  const start = new Date(ctx.startMs);
  return {
    fecha: formatDate(start, APP_TZ, "weekdayDayMonthLongLower", APP_LOCALE),
    hora: formatTime(start, APP_TZ),
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
    precio: formatMoney(Math.max(ctx.priceClp - ctx.discountClp, 0)),
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
    precio: formatMoney(Math.max(ctx.priceClp - ctx.discountClp, 0)),
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
        data: { negocio: ctx.negocio, fecha, hora, link: manageLink(token) },
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
    default:
      throw new OutboxSendError("unknown_template");
  }
}

/** Ägaren får alltid e-post (aldrig sms, utanför scope). Flera ägare i
 * samma företag (sällsynt) får var sin sändning, egna idempotensnycklar
 * (annars kan Resends dedupe råka hoppa över en av dem). */
async function sendOwner(
  ctx: MessageContext,
  row: ClaimedRow,
): Promise<string> {
  if (
    row.template !== "nuevaReservaDueno" &&
    row.template !== "cancelacionDueno" &&
    row.template !== "nuevaSolicitud"
  ) {
    throw new OutboxSendError("unknown_template");
  }
  // Säkert efter kontrollen ovan (bara de här tre mallarna når hit).
  const template = row.template as
    "nuevaReservaDueno" | "cancelacionDueno" | "nuevaSolicitud";
  const emails = await ownerEmailsFor(row.businessId);
  if (emails.length === 0) throw new OutboxSendError("no_owner_email");
  // `cancelacionDueno` nunca muestra las respuestas (WP-40); `nuevaSolicitud`
  // sí, igual que `nuevaReservaDueno` (misma vista de una reserva entrante).
  const answers =
    template === "cancelacionDueno"
      ? []
      : await duenoAnswers(row.businessId, row.bookingId);
  const data = duenoData(ctx, answers);
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

async function sendRow(ctx: MessageContext, row: ClaimedRow): Promise<string> {
  if (row.recipientKind === "owner") return sendOwner(ctx, row);
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

async function processRow(
  row: ClaimedRow,
): Promise<"sent" | "queued" | "dead" | "cancelled"> {
  try {
    if (!row.bookingId) throw new OutboxSendError("no_booking_id");
    const ctx = await loadContext(row.businessId, row.bookingId);
    if (!ctx) throw new OutboxSendError("no_booking");
    // En påminnelse för en bokning som inte längre är confirmed skickas
    // aldrig (t.ex. avbokad/flyttad utan att den här raden hunnit avbrytas).
    if (row.template === "recordatorio" && ctx.bookingStatus !== "confirmed") {
      await finalizeCancelled(row);
      return "cancelled";
    }
    const providerId = await sendRow(ctx, row);
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
