import "server-only";

import { randomUUID } from "node:crypto";

import { withOwnerTx, withServiceTx } from "@/server/db/tx";
import { hitRateLimit } from "@/server/db/rate-limit";

import { kickOutbox } from "./kick";

/**
 * WP-55: "Enviar mensaje" en la ficha del cliente (`/app/clientes/[id]`,
 * SE/`MARKET=SE` — CL usa `wa.me` del lado del cliente, sin pasar por acá,
 * ver `customer-detail-screen.tsx`/`message-dialog.tsx`). Encola el SMS
 * `mensajeLibre` en `message_outbox` (`channel = 'sms'`, `category =
 * 'service'`: no es una plantilla de reserva ni de marketing) y dispara
 * `kickOutbox` para que salga dentro de 1 min (regla dura 4).
 *
 * Comportamiento: samma D-029-mönster som `enqueueMemberWelcome` (adressen
 * ALDRIG en el `payload`, solo `customerId` — el worker busca el teléfono al
 * enviar, `worker.ts` `loadFreeMessageContext`). `payload.text` sí va en la
 * fila (es el mensaje en sí, no una dirección) y se vacía después del envío
 * como cualquier otra fila (`finalizeSent`, D-029).
 *
 * Behörighet: kontrolleras HÄR (inte bara hos anroparen) i en `withOwnerTx`
 * (RLS + `has_perm`), samma regel som `enqueueMemberWelcome`/att sätta
 * "Socio" på kundkortet — ägare eller `can_manage_all_bookings`.
 *
 * Rate limit: 30 mensajes libres por hora y por negocio (pilotblockerare,
 * WP-27-mönster) — evita que una cuenta comprometida o un doble-click
 * dispare un spam de SMS. Independiente de la cuota de marketing (esto no es
 * marketing, D-016: solo las plantillas `marketing` en INTEGRATIONS.md
 * requieren `consent_marketing_at`/cuota).
 */
export type SendCustomerMessageInput = {
  businessId: string;
  customerId: string;
  /** El miembro logueado (auth.uid()) que aprieta "Enviar". */
  actorUserId: string;
  text: string;
};

export type SendCustomerMessageError =
  | "forbidden" // sin permiso, cliente no visible, o anonimizado
  | "no_phone" // el cliente no tiene un celular válido
  | "empty" // texto vacío (después de trim)
  | "too_long" // > MAX_MESSAGE_LENGTH caracteres
  | "rate_limited";

export type SendCustomerMessageResult =
  | { ok: true }
  | { ok: false; error: SendCustomerMessageError };

/** Mismo tope que el textarea del diálogo (`message-dialog.tsx`). */
export const MAX_MESSAGE_LENGTH = 320;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CustomerRow = {
  allowed: boolean;
  has_phone: boolean;
};

export async function sendCustomerMessage(
  input: SendCustomerMessageInput,
): Promise<SendCustomerMessageResult> {
  const text = input.text.trim();
  if (text.length === 0) return { ok: false, error: "empty" };
  if (text.length > MAX_MESSAGE_LENGTH) return { ok: false, error: "too_long" };
  if (!UUID.test(input.businessId) || !UUID.test(input.customerId)) {
    return { ok: false, error: "forbidden" };
  }

  const row = await withOwnerTx(input.actorUserId, async (q) => {
    const r = await q.query<CustomerRow>(
      `select private.has_perm(c.business_id, 'can_manage_all_bookings') as allowed,
              (c.phone_e164 is not null) as has_phone
         from public.customers c
        where c.business_id = $1 and c.id = $2 and c.anonymized_at is null`,
      [input.businessId, input.customerId],
    );
    return r.rows[0];
  });
  if (!row?.allowed) return { ok: false, error: "forbidden" };
  if (!row.has_phone) return { ok: false, error: "no_phone" };

  // Hashas inuti hitRateLimit (rate-limit.ts) — businessId är redan ogenomskinligt
  // (uuid), men subjektet hashas ändå av samma anledning som IP/telefon/e-post.
  const allowed = await hitRateLimit({
    scope: "customer_message:business",
    subject: input.businessId,
    windowSeconds: 3600,
    max: 30,
  });
  if (!allowed) return { ok: false, error: "rate_limited" };

  const dedupeKey = `mensajeLibre:sms:customer:${input.customerId}:${randomUUID()}`;
  await withServiceTx((q) =>
    q.query(
      `insert into public.message_outbox
         (business_id, booking_id, channel, recipient_kind, template, payload,
          category, dedupe_key)
       values ($1, null, 'sms', 'customer', 'mensajeLibre', $2::jsonb,
               'service', $3)`,
      [
        input.businessId,
        JSON.stringify({ customerId: input.customerId, text }),
        dedupeKey,
      ],
    ),
  );
  await kickOutbox();
  return { ok: true };
}
