import "server-only";

import { market } from "@/config/brand";
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx, withServiceTx } from "@/server/db/tx";
import { hitRateLimit } from "@/server/db/rate-limit";
import { kickOutbox } from "@/server/messaging/outbox";

import { resolveAudienceIn } from "./audience";
import {
  createOfferToken,
  loadPermissionAndBusiness,
  MAX_RECIPIENTS,
  RATE_LIMIT_MAX_PER_HOUR,
  RATE_LIMIT_WINDOW_SECONDS,
} from "./send";
import { flashCampaignInputSchema, type FlashCampaignInput } from "./types";

/**
 * WP-30 (F13): "Skicka till kunder" för en horas flash-tid — återanvänder
 * WP-31:s kampanjinfrastruktur (`campaigns`/`campaign_recipients`/
 * `message_outbox`, samma pilotspärrar) rakt av, men:
 *
 * - Ingen `offer_pct`/`offer_text`/`offer_valid_until` på kampanjraden:
 *   rabatten ligger på SJÄLVA TIDEN (`flash_slots.discount_pct`), inte på
 *   en erbjudande-token som kan lösas in mot vilken tid som helst (D-029-
 *   mönstret för `campaign_recipients.token_hash` gäller ändå — se nedan).
 * - Länken i meddelandet är `{slug}?flash=<flashSlotId>` (`worker.ts`s
 *   `flashLink`), inte `{slug}?o=<token>`. Token:en skapas och sparas ändå
 *   (samma `campaign_recipients.token_hash`-kolumn, NOT NULL): den används
 *   bara för avregistreringslänken (`/baja/<token>`, regel hård 7), aldrig
 *   för att lösa in ett erbjudande.
 * - `payload.flashSlotId` läses av `worker.ts`s `processCampaignRow`, som
 *   då bygger `reservarUrl` med `flashLink` i stället för `offerLink`, och
 *   kontrollerar att tiden fortfarande är `active` innan sändning (D-029).
 *
 * Säkerhet: aldrig ett skarpt utskick härifrån (regel hård 8) — bara
 * `message_outbox`-rader skrivs, den riktiga sändningen sker i workern.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SendFlashCampaignError =
  | "forbidden"
  | "invalid_input"
  | "flash_not_active"
  | "no_recipients"
  | "sms_not_available"
  | "rate_limited"
  | "unexpected";

export type SendFlashCampaignResult =
  | { ok: true; campaignId: string; queued: number }
  | { ok: false; code: SendFlashCampaignError };

async function isFlashSlotActiveForOwner(
  userId: string,
  businessId: string,
  flashSlotId: string,
): Promise<boolean> {
  return withOwnerTx(userId, async (q) => {
    const r = await q.query<{ active: boolean }>(
      `select (status = 'active') as active
         from public.flash_slots
        where business_id = $1 and id = $2`,
      [businessId, flashSlotId],
    );
    return r.rows[0]?.active ?? false;
  });
}

type WriteFlashCampaignInput = {
  businessId: string;
  createdBy: string;
  name: string;
  channel: "email" | "sms";
  audienceJson: string;
  message: string;
  flashSlotId: string;
  customerIds: string[];
};

async function writeFlashCampaignIn(
  q: Queryable,
  input: WriteFlashCampaignInput,
): Promise<{ campaignId: string; queued: number }> {
  const campaignRow = await q.query<{ id: string }>(
    `insert into public.campaigns
       (business_id, name, channel, audience, message, offer_pct, offer_text,
        offer_valid_until, status, sent_at, created_by)
     values ($1, $2, $3, $4::jsonb, $5, null, null, null, 'sent', now(), $6)
     returning id`,
    [
      input.businessId,
      input.name,
      input.channel,
      input.audienceJson,
      input.message,
      input.createdBy,
    ],
  );
  const campaignId = campaignRow.rows[0]?.id;
  if (!campaignId) {
    throw new Error("writeFlashCampaignIn: campaña no insertada");
  }
  if (input.customerIds.length === 0) {
    return { campaignId, queued: 0 };
  }

  const uniqueCustomerIds = Array.from(new Set(input.customerIds));
  const tokensByCustomer = uniqueCustomerIds.map((customerId) => ({
    customerId,
    ...createOfferToken(),
  }));
  const recipientRows = await q.query<{ id: string; customer_id: string }>(
    `insert into public.campaign_recipients
       (business_id, campaign_id, customer_id, token_hash)
     select $1, $2, t.customer_id, decode(t.token_hash_hex, 'hex')
       from unnest($3::uuid[], $4::text[]) as t(customer_id, token_hash_hex)
     returning id, customer_id`,
    [
      input.businessId,
      campaignId,
      tokensByCustomer.map((t) => t.customerId),
      tokensByCustomer.map((t) => t.hash.toString("hex")),
    ],
  );
  const tokenByCustomerId = new Map(
    tokensByCustomer.map((t) => [t.customerId, t.token]),
  );
  const payloads: string[] = [];
  const dedupeKeys: string[] = [];
  for (const row of recipientRows.rows) {
    const token = tokenByCustomerId.get(row.customer_id);
    if (!token) continue; // kan inte hända (samma lista), bara en typsäker vakt
    payloads.push(
      JSON.stringify({
        campaignRecipientId: row.id,
        token,
        flashSlotId: input.flashSlotId,
      }),
    );
    dedupeKeys.push(`campanaMarketing:${input.channel}:customer:${row.id}`);
  }
  const inserted = await q.query(
    `insert into public.message_outbox
       (business_id, booking_id, channel, recipient_kind, template, payload,
        category, dedupe_key)
     select $1, null, $2, 'customer', 'campanaMarketing', t.payload::jsonb, 'marketing', t.dedupe_key
       from unnest($3::text[], $4::text[]) as t(payload, dedupe_key)
     on conflict (dedupe_key) do nothing`,
    [input.businessId, input.channel, payloads, dedupeKeys],
  );
  return { campaignId, queued: inserted.rowCount ?? 0 };
}

function writeFlashCampaign(
  input: WriteFlashCampaignInput,
): Promise<{ campaignId: string; queued: number }> {
  return withServiceTx((q) => writeFlashCampaignIn(q, input));
}

export async function sendFlashCampaign(
  userId: string,
  businessId: string,
  input: FlashCampaignInput,
): Promise<SendFlashCampaignResult> {
  if (!UUID.test(userId) || !UUID.test(businessId)) {
    return { ok: false, code: "forbidden" };
  }
  const parsed = flashCampaignInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  if (parsed.data.channel === "sms" && market !== "SE") {
    return { ok: false, code: "sms_not_available" };
  }
  const perm = await loadPermissionAndBusiness(userId, businessId);
  if (!perm?.allowed) return { ok: false, code: "forbidden" };

  const active = await isFlashSlotActiveForOwner(
    userId,
    businessId,
    parsed.data.flashSlotId,
  );
  if (!active) return { ok: false, code: "flash_not_active" };

  const allowed = await hitRateLimit({
    scope: "campaign:business",
    subject: businessId,
    windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
    max: RATE_LIMIT_MAX_PER_HOUR,
  });
  if (!allowed) return { ok: false, code: "rate_limited" };

  const customerIds = await withOwnerTx(userId, (q) =>
    resolveAudienceIn(
      q,
      businessId,
      parsed.data.audience,
      parsed.data.channel,
      MAX_RECIPIENTS + 1,
    ),
  );
  if (customerIds.length === 0) return { ok: false, code: "no_recipients" };
  if (customerIds.length > MAX_RECIPIENTS) {
    return { ok: false, code: "rate_limited" };
  }

  try {
    const { campaignId, queued } = await writeFlashCampaign({
      businessId,
      createdBy: userId,
      // Ingen titel från ägaren i den här v1:n (skiljer sig från
      // `sendCampaign`s `name`) — "Hora flash" + datumet räcker för
      // historiken (`/app/clientes/utskick`).
      name: "Hora flash",
      channel: parsed.data.channel,
      audienceJson: JSON.stringify(parsed.data.audience),
      message: parsed.data.message,
      flashSlotId: parsed.data.flashSlotId,
      customerIds,
    });
    void kickOutbox();
    return { ok: true, campaignId, queued };
  } catch {
    return { ok: false, code: "unexpected" };
  }
}
