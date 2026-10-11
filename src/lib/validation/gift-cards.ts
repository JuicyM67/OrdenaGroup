import "server-only";

/**
 * WP-77 (D-058): köpformuläret för presentkort (server action, bara servern).
 * Beloppet i hela kronor; servern räknar öre och avgift. Leveransdagens
 * intervall (i dag … i dag + 90 i företagets tidszon) kontrolleras av servern
 * och databasen (`gift_card_open_order`). Felkoderna översätts i
 * `src/i18n/*.regalo.ts` (`regalo.errores`).
 */
import { z } from "zod";

import {
  GIFT_CARD_GREETING_MAX,
  GIFT_CARD_MAX_SEK,
  GIFT_CARD_MIN_SEK,
  GIFT_CARD_NAME_MAX,
  GIFT_CARD_THEMES,
} from "@/config/gift-cards";

/** Länkar i hälsningen nekas (plattformen skickar fri text till en godtycklig
 * adress — ingen länkspridning via presentkort). */
const URL_RE =
  /(https?:\/\/|www\.|\b[a-z0-9-]+\.(se|com|nu|net|org|io|info|biz|ru|xyz|link|ly|me|app|shop|top)\b)/i;

export function greetingHasUrl(text: string): boolean {
  return URL_RE.test(text);
}

const name = z
  .string()
  .trim()
  .min(1, { error: "name" })
  .max(GIFT_CARD_NAME_MAX, { error: "name" });

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.email({ error: "email" }).max(254, { error: "email" }).nullable());

export const giftCardFormSchema = z.object({
  amountSek: z.coerce
    .number({ error: "amount" })
    .int({ error: "amount" })
    .min(GIFT_CARD_MIN_SEK, { error: "amount" })
    .max(GIFT_CARD_MAX_SEK, { error: "amount" }),
  theme: z.enum(GIFT_CARD_THEMES, { error: "theme" }),
  recipientName: name,
  recipientEmail: optionalEmail,
  greeting: z
    .string()
    .trim()
    .max(GIFT_CARD_GREETING_MAX, { error: "greeting" })
    .refine((v) => !greetingHasUrl(v), { error: "greeting_url" })
    .transform((v) => (v === "" ? null : v)),
  deliverOn: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), {
      error: "date",
    })
    .transform((v) => (v === "" ? null : v)),
  buyerName: name,
  buyerEmail: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "email" }).max(254, { error: "email" })),
  terms: z.literal("on", { error: "terms" }),
});

export type GiftCardForm = z.output<typeof giftCardFormSchema>;
export type GiftCardFormErrorCode =
  | "amount"
  | "theme"
  | "name"
  | "email"
  | "greeting"
  | "greeting_url"
  | "date"
  | "terms";

/** FormData → schemaindata. Förvalt belopp (`amount`) eller "custom" +
 * `customAmount`. */
export function giftCardFormInput(fd: FormData): Record<string, unknown> {
  const s = (k: string): string => {
    const v = fd.get(k);
    return typeof v === "string" ? v : "";
  };
  const amount = s("amount");
  return {
    amountSek: amount === "custom" ? s("customAmount") : amount,
    theme: s("theme"),
    recipientName: s("recipientName"),
    recipientEmail: s("recipientEmail"),
    greeting: s("greeting"),
    deliverOn: s("deliverOn"),
    buyerName: s("buyerName"),
    buyerEmail: s("buyerEmail"),
    terms: s("terms"),
  };
}
