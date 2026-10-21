import "server-only";

import { z } from "zod";

import { confirmBookingByCustomer } from "@/server/bookings/customer-confirm";
import { withServiceTx } from "@/server/db/tx";
import {
  enqueueCustomerChangeRequestIn,
  enqueueWaitlistEvent,
} from "@/server/messaging/outbox";
import {
  applyWhatsAppStatus,
  findWhatsAppReplyTarget,
  type WhatsAppStatusKind,
} from "@/server/messaging/outbox/whatsapp-status";
import {
  claimWaitlistOfferForEntry,
  declineWaitlistOfferForEntry,
} from "@/server/waitlist";

import { readWhatsAppEnv, type WhatsAppEnv } from "./config";
import { sameWhatsAppNumber } from "./phone";
import { parseButtonPayload } from "./templates";

/**
 * WhatsApp-webhooken (D-063, regel 4). Routen (`src/app/api/webhooks/
 * whatsapp/route.ts`) har redan kontrollerat signaturen över den råa bodyn
 * innan den här filen ser något.
 *
 *  1. **Idempotens:** varje status och varje inkommande meddelande är en egen
 *     händelse i `inbound_events` (`provider = 'whatsapp'`,
 *     `status:<wamid>:<status>` / `msg:<wamid>`). En händelse som redan är
 *     hanterad (`processed_at`) hoppas över; Meta skickar om vid fel, och
 *     `processed_at` sätts först när hanteringen lyckats. Payloaden i
 *     `inbound_events` är bara typen — aldrig telefon, namn eller text.
 *  2. **Statusar** → `applyWhatsAppStatus` (utkorgsraden via `wa_message_id`).
 *  3. **Knappsvar** binds till VÅRT meddelande via `context.id` →
 *     `message_outbox.wa_message_id`, och avsändaren (`from`) måste vara
 *     kundens nummer på den raden. Bokning/väntelistepost/företag kommer
 *     alltid från raden, aldrig från meddelandet — ingen kan bekräfta eller
 *     ta en tid åt någon annan. Payloaden bär bara åtgärden.
 *  4. **Fritext och annat:** sparas inte (bara typen i `inbound_events`).
 */

const statusSchema = z
  .object({
    id: z.string().min(1).max(256),
    status: z.string(),
    timestamp: z.string().optional(),
    errors: z
      .array(z.object({ code: z.number().optional() }).loose())
      .optional(),
  })
  .loose();

const messageSchema = z
  .object({
    id: z.string().min(1).max(256),
    from: z.string().max(32).optional(),
    type: z.string().max(32).optional(),
    context: z
      .object({ id: z.string().max(256).optional() })
      .loose()
      .optional(),
    button: z.object({ payload: z.string().optional() }).loose().optional(),
  })
  .loose();

const valueSchema = z
  .object({
    metadata: z
      .object({ phone_number_id: z.string().optional() })
      .loose()
      .optional(),
    statuses: z.array(z.unknown()).optional(),
    messages: z.array(z.unknown()).optional(),
  })
  .loose();

const bodySchema = z
  .object({
    object: z.string().optional(),
    entry: z
      .array(
        z
          .object({
            changes: z
              .array(
                z
                  .object({ field: z.string().optional(), value: z.unknown() })
                  .loose(),
              )
              .optional(),
          })
          .loose(),
      )
      .optional(),
  })
  .loose();

export type WhatsAppWebhookResult = {
  handled: number;
  duplicates: number;
  ignored: number;
  /** Något köades i utkorgen (anroparen kör `kickOutbox`). */
  queued: boolean;
};

const STATUS_KINDS: ReadonlySet<string> = new Set([
  "sent",
  "delivered",
  "read",
  "failed",
]);

/** `true` = ny (eller tidigare misslyckad) händelse som ska hanteras. */
async function claimEvent(
  eventId: string,
  summary: Record<string, string>,
): Promise<boolean> {
  return withServiceTx(async (q) => {
    const ins = await q.query(
      `insert into public.inbound_events (provider, event_id, payload)
       values ('whatsapp', $1, $2::jsonb)
       on conflict (provider, event_id) do nothing
       returning event_id`,
      [eventId, JSON.stringify(summary)],
    );
    if ((ins.rowCount ?? 0) > 0) return true;
    const done = await q.query<{ processed_at: Date | null }>(
      `select processed_at from public.inbound_events
        where provider = 'whatsapp' and event_id = $1`,
      [eventId],
    );
    return done.rows[0]?.processed_at == null;
  });
}

async function markProcessed(eventId: string): Promise<void> {
  await withServiceTx(async (q) => {
    await q.query(
      `update public.inbound_events set processed_at = now()
        where provider = 'whatsapp' and event_id = $1`,
      [eventId],
    );
  });
}

function timestampMs(ts: string | undefined, now: Date): Date {
  const n = Number(ts);
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000) : now;
}

/** Hanterar ett knappsvar. Returnerar om något köades i utkorgen. */
async function handleButtonReply(
  m: z.infer<typeof messageSchema>,
  now: Date,
): Promise<boolean> {
  const contextId = m.context?.id;
  const action = parseButtonPayload(m.button?.payload);
  if (!contextId || !action) return false;
  const target = await findWhatsAppReplyTarget(contextId);
  if (!target) return false;
  // Bara kunden som fick meddelandet kan svara på det.
  if (!sameWhatsAppNumber(m.from, target.customerPhone)) return false;

  if (target.template === "recordatorio" && target.bookingId) {
    if (action.action === "confirmo") {
      await confirmBookingByCustomer({
        businessId: target.businessId,
        bookingId: target.bookingId,
        now,
      });
      return false;
    }
    if (action.action === "cambiar") {
      const bookingId = target.bookingId;
      return withServiceTx((q) =>
        enqueueCustomerChangeRequestIn(q, {
          businessId: target.businessId,
          bookingId,
          sourceRowId: target.rowId,
        }),
      );
    }
    return false;
  }

  if (target.template === "listaEsperaCupo" && target.waitlistEntryId) {
    if (action.action === "si") {
      const r = await claimWaitlistOfferForEntry({
        businessId: target.businessId,
        entryId: target.waitlistEntryId,
        startMs: action.startMs,
        offeredMs: action.offeredMs,
        now,
      });
      if (r.ok) return true; // bekräftelsen köades av bokningsmotorn
      if (r.code === "taken") {
        // Någon annan hann före: "ya fue tomada" (lista_espera_tomada).
        // dedupe_key (postens updated_at) hindrar en dubblett om motorn
        // redan köat samma besked.
        await enqueueWaitlistEvent({
          type: "waitlist_taken",
          businessId: target.businessId,
          entryId: target.waitlistEntryId,
        });
        return true;
      }
      return false;
    }
    if (action.action === "no") {
      await declineWaitlistOfferForEntry({
        businessId: target.businessId,
        entryId: target.waitlistEntryId,
        offeredMs: action.offeredMs,
        now,
      });
      return true; // sekventiellt läge kan ha erbjudit nästa i kön
    }
  }
  return false;
}

export async function processWhatsAppWebhook(
  body: unknown,
  now: Date,
  env: WhatsAppEnv = readWhatsAppEnv(),
): Promise<WhatsAppWebhookResult> {
  const result: WhatsAppWebhookResult = {
    handled: 0,
    duplicates: 0,
    ignored: 0,
    queued: false,
  };
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    result.ignored += 1;
    return result;
  }
  const ourPhoneId = env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  for (const entry of parsed.data.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") {
        result.ignored += 1;
        continue;
      }
      const value = valueSchema.safeParse(change.value);
      if (!value.success) {
        result.ignored += 1;
        continue;
      }
      // Bara vårt eget nummer (en app kan ha flera nummer kopplade).
      const phoneId = value.data.metadata?.phone_number_id;
      if (ourPhoneId && phoneId !== ourPhoneId) {
        result.ignored += 1;
        continue;
      }

      for (const raw of value.data.statuses ?? []) {
        const st = statusSchema.safeParse(raw);
        if (!st.success || !STATUS_KINDS.has(st.data.status)) {
          result.ignored += 1;
          continue;
        }
        const eventId = `status:${st.data.id}:${st.data.status}`;
        if (
          !(await claimEvent(eventId, {
            kind: "status",
            status: st.data.status,
          }))
        ) {
          result.duplicates += 1;
          continue;
        }
        const outcome = await applyWhatsAppStatus({
          waMessageId: st.data.id,
          status: st.data.status as WhatsAppStatusKind,
          at: timestampMs(st.data.timestamp, now),
          errorCode: st.data.errors?.[0]?.code,
        });
        if (outcome === "fallback" || outcome === "retry") result.queued = true;
        await markProcessed(eventId);
        result.handled += 1;
      }

      for (const raw of value.data.messages ?? []) {
        const m = messageSchema.safeParse(raw);
        if (!m.success) {
          result.ignored += 1;
          continue;
        }
        const type = m.data.type ?? "unknown";
        const eventId = `msg:${m.data.id}`;
        if (!(await claimEvent(eventId, { kind: "message", type }))) {
          result.duplicates += 1;
          continue;
        }
        if (type === "button") {
          if (await handleButtonReply(m.data, now)) result.queued = true;
        }
        // Fritext/media/övrigt: inget sparas utöver typen ovan (regel 7).
        await markProcessed(eventId);
        result.handled += 1;
      }
    }
  }
  return result;
}
