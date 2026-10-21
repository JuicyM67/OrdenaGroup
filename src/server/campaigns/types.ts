import "server-only";

import { z } from "zod";

import type { OutboxChannel } from "@/server/messaging/outbox";

/**
 * WP-31 (F14): "Erbjudanden" (kampanjer) + "Te echamos de menos". Typerna
 * här är kontraktet mot UI:t (ui-engineer bygger `/app/clientes` mot dessa,
 * håll exakt) — samma form som `campaigns.audience`/`message`/`offer_*` i
 * `supabase/migrations/20261001120000_campaigns.sql` (db-engineer).
 */

const uuid = z.guid();

export type CampaignAudience =
  | { kind: "all" }
  | { kind: "members" }
  | { kind: "regulars" }
  | { kind: "inactive"; days: number }
  | { kind: "selected"; customerIds: string[] };

export const campaignAudienceSchema: z.ZodType<CampaignAudience> =
  z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("all") }),
    z.strictObject({ kind: z.literal("members") }),
    z.strictObject({ kind: z.literal("regulars") }),
    z.strictObject({
      kind: z.literal("inactive"),
      days: z.number().int().positive().max(730),
    }),
    z.strictObject({
      kind: z.literal("selected"),
      customerIds: z.array(uuid).min(1).max(2000),
    }),
  ]);

/** Samma kanal som `message_outbox`/`campaigns.channel` (databasens enum har
 * email/sms; WhatsApp finns inte som kampanjkanal i den här fasen). Historiken
 * läser kolumnen som den är. */
export type CampaignChannel = Extract<OutboxChannel, "email" | "sms">;

/** Kanalen för nya utskick: bara e-post (D-062). */
export type NewCampaignChannel = "email";

export type CampaignInput = {
  name: string;
  channel: NewCampaignChannel;
  audience: CampaignAudience;
  message: string;
  offerPct?: number | null;
  offerText?: string | null;
  /** "YYYY-MM-DD". */
  offerValidUntil?: string | null;
};

const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Samma gränser som CHECK-constraints i `20261001120000_campaigns.sql` —
 * valideras här igen (tydligt fel i stället för en rå `23514`) men databasen
 * är den slutgiltiga spärren. */
export const campaignInputSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(200),
    channel: z.literal("email"),
    audience: campaignAudienceSchema,
    message: z.string().trim().min(1),
    offerPct: z.number().int().min(1).max(100).nullish(),
    offerText: z.string().trim().min(1).max(200).nullish(),
    offerValidUntil: z.string().regex(LOCAL_DATE).nullish(),
  })
  .refine((v) => v.message.length <= 1000, {
    path: ["message"],
    message: "message_too_long_email",
  });

export type CampaignListItem = {
  id: string;
  name: string;
  channel: CampaignChannel;
  sentAt: string;
  recipients: number;
  redeemed: number;
};

/**
 * WP-30 (F13): "Skicka till kunder" för en horas flash-tid
 * (`sendFlashCampaign`, `src/server/campaigns/flash.ts`). Samma
 * `audience`/`channel`/`message`-form som `CampaignInput`, men utan
 * `offer_*` — rabatten ligger på själva tiden (`flash_slots.discount_pct`),
 * inte på en erbjudande-token (se den filens kommentar).
 */
export type FlashCampaignInput = {
  flashSlotId: string;
  channel: NewCampaignChannel;
  audience: CampaignAudience;
  message: string;
};

export const flashCampaignInputSchema = z
  .strictObject({
    flashSlotId: uuid,
    channel: z.literal("email"),
    audience: campaignAudienceSchema,
    message: z.string().trim().min(1),
  })
  .refine((v) => v.message.length <= 1000, {
    path: ["message"],
    message: "message_too_long_email",
  });
