import "server-only";

/**
 * WP-87 (D-073): formuläret "Vender tarjeta de regalo" i Caja (server action,
 * bara servern). Beloppet i hela pesos. Felkoderna översätts i
 * `src/i18n/es-CL.regalo.ts` (`regalo.caja.errores`). Databasen
 * (`private.gift_card_issue_in_store`) kontrollerar beloppet, metoden och
 * designen en gång till.
 */
import { z } from "zod";

import {
  GIFT_CARD_GREETING_MAX,
  GIFT_CARD_MAX_CLP,
  GIFT_CARD_MIN_CLP,
  GIFT_CARD_NAME_MAX,
  GIFT_CARD_SALE_METHODS,
  GIFT_CARD_THEMES,
} from "@/config/gift-cards";
import { parseMoney } from "@/lib/format/money";

/** Länkar i hälsningen nekas (plattformen skickar fri text till en godtycklig
 * adress — ingen länkspridning via tarjetas de regalo). */
const URL_RE =
  /(https?:\/\/|www\.|\b[a-z0-9-]+\.(cl|com|net|org|io|info|biz|ru|xyz|link|ly|me|app|shop|top)\b)/i;

export function greetingHasUrl(text: string): boolean {
  return URL_RE.test(text);
}

const optionalName = z
  .string()
  .trim()
  .max(GIFT_CARD_NAME_MAX, { error: "name" })
  .transform((v) => (v === "" ? null : v));

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.email({ error: "email" }).max(254, { error: "email" }).nullable());

export const giftCardSaleSchema = z.object({
  amount: z
    .number({ error: "amount" })
    .int({ error: "amount" })
    .min(GIFT_CARD_MIN_CLP, { error: "amount" })
    .max(GIFT_CARD_MAX_CLP, { error: "amount" }),
  method: z.enum(GIFT_CARD_SALE_METHODS, { error: "method" }),
  theme: z.enum(GIFT_CARD_THEMES, { error: "theme" }),
  recipientName: optionalName,
  recipientEmail: optionalEmail,
  greeting: z
    .string()
    .trim()
    .max(GIFT_CARD_GREETING_MAX, { error: "greeting" })
    .refine((v) => !greetingHasUrl(v), { error: "greeting_url" })
    .transform((v) => (v === "" ? null : v)),
  buyerName: optionalName,
  buyerEmail: optionalEmail,
});

export type GiftCardSale = z.output<typeof giftCardSaleSchema>;
export type GiftCardSaleErrorCode =
  | "amount"
  | "method"
  | "theme"
  | "name"
  | "email"
  | "greeting"
  | "greeting_url";

/** FormData → schemaindata. Förvalt belopp (`amount`) eller "custom" +
 * `customAmount` ("$25.000", "25000"). Ett oläsbart belopp blir `NaN`
 * (felkoden `amount`). */
export function giftCardSaleInput(fd: FormData): Record<string, unknown> {
  const s = (k: string): string => {
    const v = fd.get(k);
    return typeof v === "string" ? v : "";
  };
  const raw = s("amount") === "custom" ? s("customAmount") : s("amount");
  const parsed = parseMoney(raw);
  return {
    amount: parsed.ok ? parsed.value : Number.NaN,
    method: s("method"),
    theme: s("theme"),
    recipientName: s("recipientName"),
    recipientEmail: s("recipientEmail"),
    greeting: s("greeting"),
    buyerName: s("buyerName"),
    buyerEmail: s("buyerEmail"),
  };
}
