import "server-only";

import { randomBytes } from "node:crypto";

import { market } from "@/config/brand";
import { hashOfferToken } from "@/server/bookings/offer";
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx, withServiceTx } from "@/server/db/tx";
import { hitRateLimit } from "@/server/db/rate-limit";
import { kickOutbox } from "@/server/messaging/outbox";
import { renderSms } from "@/server/messaging/sms";

import { audienceStatsIn, resolveAudienceIn } from "./audience";
import {
  campaignInputSchema,
  type CampaignChannel,
  type CampaignInput,
  type CampaignListItem,
} from "./types";

/**
 * WP-31 (F14): "Nuevo envío" — förhandsvisning och skarpt utskick.
 * Behörighet: ägare eller `can_manage_all_bookings` (planens ord), prövad
 * HÄR i en `withOwnerTx` (RLS + `has_perm`), aldrig bara hos anroparen.
 *
 * Säkerhet: inget skickas från en agent (regel hård 8) — `sendCampaign`
 * skriver bara `message_outbox`-rader, den riktiga sändningen sker i
 * workern (`/api/cron/outbox`, fejk-läge tills ClickSend/Resend-nycklarna
 * finns, se `src/server/messaging/{email,sms}/send.ts`).
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pilotblockerare: högst 2 kampanjer/timme/företag, högst 2000 mottagare
 * per utskick (planens uttryckliga gränser). */
const RATE_LIMIT_WINDOW_SECONDS = 3600;
const RATE_LIMIT_MAX_PER_HOUR = 2;
/** Delad med `winback.ts` (samma gräns, ett dagligt cron-utskick). */
export const MAX_RECIPIENTS = 2000;

export type PreviewCampaignResult =
  | {
      ok: true;
      recipients: number;
      skippedNoConsent: number;
      smsPartsPerMessage: number | null;
      smsTotal: number | null;
    }
  | { ok: false; code: "forbidden" | "invalid_input" };

export type SendCampaignError =
  | "forbidden"
  | "invalid_input"
  | "no_recipients"
  | "sms_not_available"
  | "rate_limited"
  | "unexpected";

export type SendCampaignResult =
  | { ok: true; campaignId: string; queued: number }
  | { ok: false; code: SendCampaignError };

type PermissionRow = { allowed: boolean; negocio: string; slug: string };

async function loadPermissionAndBusiness(
  userId: string,
  businessId: string,
): Promise<PermissionRow | undefined> {
  return withOwnerTx(userId, async (q) => {
    const r = await q.query<PermissionRow>(
      `select private.has_perm(b.id, 'can_manage_all_bookings') as allowed,
              b.name as negocio, b.slug
         from public.businesses b
        where b.id = $1`,
      [businessId],
    );
    return r.rows[0];
  });
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000").replace(
    /\/$/,
    "",
  );
}

/** En placeholder-token (samma längd som den riktiga, base64url av 32 byte,
 * 43 tecken) — bara för att räkna tecken/segment i förhandsvisningen; den
 * riktiga token:en skapas i `sendCampaign` per mottagare. */
const PLACEHOLDER_TOKEN = "A".repeat(43);

function smsPreviewParts(
  negocio: string,
  slug: string,
  message: string,
): number {
  const reservarUrl = `${appUrl()}/${slug}?o=${PLACEHOLDER_TOKEN}`;
  const bajaUrl = `${appUrl()}/baja/${PLACEHOLDER_TOKEN}`;
  const rendered = renderSms("campanaMarketing", market, {
    negocio,
    texto: message,
    link: reservarUrl,
    bajaLink: bajaUrl,
  });
  return rendered.segments;
}

export async function previewCampaign(
  userId: string,
  businessId: string,
  input: CampaignInput,
): Promise<PreviewCampaignResult> {
  if (!UUID.test(userId) || !UUID.test(businessId)) {
    return { ok: false, code: "forbidden" };
  }
  const parsed = campaignInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  const perm = await loadPermissionAndBusiness(userId, businessId);
  if (!perm?.allowed) return { ok: false, code: "forbidden" };

  const stats = await withOwnerTx(userId, (q) =>
    audienceStatsIn(q, businessId, parsed.data.audience, parsed.data.channel),
  );
  const smsPartsPerMessage =
    parsed.data.channel === "sms"
      ? smsPreviewParts(perm.negocio, perm.slug, parsed.data.message)
      : null;
  return {
    ok: true,
    recipients: stats.recipients,
    skippedNoConsent: stats.skippedNoConsent,
    smsPartsPerMessage,
    smsTotal:
      smsPartsPerMessage === null
        ? null
        : smsPartsPerMessage * stats.recipients,
  };
}

function createOfferToken(): { token: string; hash: Buffer } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashOfferToken(token) };
}

/**
 * Skriver kampanjen + mottagarraderna + utkorgsraderna, allt i en
 * `withServiceTx` (`message_outbox` kräver service_role, D-029).
 * Återanvänds av `sendCampaign` (ägarens knapp) och `runWinback` (cron,
 * `createdBy` är då en ägare slagen upp av `winback.ts`, ingen agent/
 * mänsklig aktör krävs).
 */
type WriteCampaignInput = {
  businessId: string;
  createdBy: string;
  name: string;
  channel: CampaignChannel;
  audienceJson: string;
  message: string;
  offerPct: number | null;
  offerText: string | null;
  offerValidUntil: string | null;
  customerIds: string[];
};

/** Inre steg: kör i anroparens transaktion (`q`). Delad av `sendCampaign`
 * (egen `withServiceTx`, se `writeCampaign` nedan) och `winback.ts` (som
 * behöver skriva kampanjen OCH `customers.last_winback_at` ATOMISKT, i
 * samma transaktion — säkerhetsgranskning WP-31). */
async function writeCampaignIn(
  q: Queryable,
  input: WriteCampaignInput,
): Promise<{ campaignId: string; queued: number }> {
  const campaignRow = await q.query<{ id: string }>(
    `insert into public.campaigns
       (business_id, name, channel, audience, message, offer_pct, offer_text,
        offer_valid_until, status, sent_at, created_by)
     values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, 'sent', now(), $9)
     returning id`,
    [
      input.businessId,
      input.name,
      input.channel,
      input.audienceJson,
      input.message,
      input.offerPct,
      input.offerText,
      input.offerValidUntil,
      input.createdBy,
    ],
  );
  const campaignId = campaignRow.rows[0]?.id;
  if (!campaignId) throw new Error("writeCampaignIn: campaña no insertada");
  if (input.customerIds.length === 0) {
    return { campaignId, queued: 0 };
  }

  // `Set` skyddar mot en dubblett i `customerIds` (skulle annars få två
  // mottagarrader men bara en rad kvar i `tokenByCustomerId` nedan, så fel
  // token kunde hamna i en av utkorgsraderna).
  const uniqueCustomerIds = Array.from(new Set(input.customerIds));
  const tokensByCustomer = uniqueCustomerIds.map((customerId) => ({
    customerId,
    ...createOfferToken(),
  }));
  // Hash:en som hex-TEXT, inte en `bytea[]`-parameter direkt (`pg` har
  // ingen inbyggd array-kodare för `Buffer[]`): `decode(..., 'hex')` i
  // SQL:en gör om den till `bytea` per rad.
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
    payloads.push(JSON.stringify({ campaignRecipientId: row.id, token }));
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

/** `sendCampaign`: öppnar en egen `withServiceTx` (ägarens behörighet redan
 * kontrollerad i en separat `withOwnerTx`-läsning innan den här anropas). */
function writeCampaign(
  input: WriteCampaignInput,
): Promise<{ campaignId: string; queued: number }> {
  return withServiceTx((q) => writeCampaignIn(q, input));
}

export async function sendCampaign(
  userId: string,
  businessId: string,
  input: CampaignInput,
): Promise<SendCampaignResult> {
  if (!UUID.test(userId) || !UUID.test(businessId)) {
    return { ok: false, code: "forbidden" };
  }
  const parsed = campaignInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  if (parsed.data.channel === "sms" && market !== "SE") {
    return { ok: false, code: "sms_not_available" };
  }
  const perm = await loadPermissionAndBusiness(userId, businessId);
  if (!perm?.allowed) return { ok: false, code: "forbidden" };

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
    const { campaignId, queued } = await writeCampaign({
      businessId,
      createdBy: userId,
      name: parsed.data.name,
      channel: parsed.data.channel,
      audienceJson: JSON.stringify(parsed.data.audience),
      message: parsed.data.message,
      offerPct: parsed.data.offerPct ?? null,
      offerText: parsed.data.offerText ?? null,
      offerValidUntil: parsed.data.offerValidUntil ?? null,
      customerIds,
    });
    void kickOutbox();
    return { ok: true, campaignId, queued };
  } catch {
    return { ok: false, code: "unexpected" };
  }
}

export async function listCampaigns(
  userId: string,
  businessId: string,
): Promise<CampaignListItem[]> {
  if (!UUID.test(userId) || !UUID.test(businessId)) return [];
  return withOwnerTx(userId, async (q) => {
    const perm = await q.query<{ allowed: boolean }>(
      `select private.has_perm($1, 'can_manage_all_bookings') as allowed`,
      [businessId],
    );
    if (!perm.rows[0]?.allowed) return [];
    const r = await q.query<{
      id: string;
      name: string;
      channel: CampaignChannel;
      sent_at: string;
      recipients: string;
      redeemed: string;
    }>(
      `select c.id, c.name, c.channel, c.sent_at,
              count(cr.id) as recipients,
              count(cr.id) filter (where cr.redeemed_at is not null) as redeemed
         from public.campaigns c
         left join public.campaign_recipients cr
           on cr.business_id = c.business_id and cr.campaign_id = c.id
        where c.business_id = $1 and c.status = 'sent'
        group by c.id, c.name, c.channel, c.sent_at
        order by c.sent_at desc, c.id desc`,
      [businessId],
    );
    return r.rows.map((row) => ({
      id: row.id,
      name: row.name,
      channel: row.channel,
      sentAt: row.sent_at,
      recipients: Number(row.recipients),
      redeemed: Number(row.redeemed),
    }));
  });
}

export async function countInactiveCustomers(
  userId: string,
  businessId: string,
  days: number,
): Promise<number> {
  if (!UUID.test(userId) || !UUID.test(businessId)) return 0;
  if (!Number.isInteger(days) || days <= 0) return 0;
  return withOwnerTx(userId, async (q) => {
    const perm = await q.query<{ allowed: boolean }>(
      `select private.has_perm($1, 'can_manage_all_bookings') as allowed`,
      [businessId],
    );
    if (!perm.rows[0]?.allowed) return 0;
    const { countInactiveCustomersIn } = await import("./audience");
    return countInactiveCustomersIn(q, businessId, days);
  });
}

export type WriteCampaignAsSystemInput = {
  businessId: string;
  createdBy: string;
  name: string;
  channel: CampaignChannel;
  audience: { kind: "selected"; customerIds: string[] };
  message: string;
  offerPct: number | null;
  offerText: string | null;
  offerValidUntil: string | null;
};

/** Används bara av `winback.ts` (cron, ingen inloggad ägare) — samma
 * skrivsteg som `sendCampaign`, men utan `withOwnerTx`-behörighetskollen
 * (anroparen har redan valt ut `customerIds` själv) och utan rate limit
 * (ett pass/dag/företag, planens egen spärr "högst en gång var 90:e dag"
 * per kund, `customers.last_winback_at`).
 *
 * Inre steg (för `winback.ts`, säkerhetsgranskning WP-31): tar `q` så att
 * `customers.last_winback_at` kan sättas i SAMMA transaktion som kampanjen/
 * utkorgsraderna skrivs — annars kunde ett avbrott mellan de två stegen
 * sätta `last_winback_at` utan att något meddelande faktiskt köades, eller
 * tvärtom köa ett meddelande utan att `last_winback_at` sätts (en kund som
 * får winback varje dag resten av pilotperioden). */
export async function writeCampaignAsSystemIn(
  q: Queryable,
  input: WriteCampaignAsSystemInput,
): Promise<{ campaignId: string; queued: number }> {
  return writeCampaignIn(q, {
    businessId: input.businessId,
    createdBy: input.createdBy,
    name: input.name,
    channel: input.channel,
    audienceJson: JSON.stringify(input.audience),
    message: input.message,
    offerPct: input.offerPct,
    offerText: input.offerText,
    offerValidUntil: input.offerValidUntil,
    customerIds: input.audience.customerIds,
  });
}
