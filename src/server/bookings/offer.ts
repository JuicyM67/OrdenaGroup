import "server-only";

import { createHash } from "node:crypto";

import { parseTimeZone, toLocalDate } from "@/lib/format/dates";
import type { Queryable } from "@/server/db/pool";

import { memberDiscountMinor } from "./member";

/**
 * WP-31 (F14): erbjudandelänken `/{slug}?o=<token>`. Räknas ALLTID på
 * servern (inv. 6): klienten skickar bara tillbaka klartext-token, aldrig
 * procent eller belopp. Bara SHA-256 (32 byte) av token finns i
 * `campaign_recipients.token_hash` (samma mönster som `manage_token_hash`).
 *
 * Giltig = rätt företag, kampanjen har `offer_pct`, idag (företagets
 * tidszon) <= `offer_valid_until` (null = ingen slutdag), ej inlöst, kunden
 * inte anonymiserad. Vid bokning dessutom: bokande kund (business_id +
 * telefon → customer_id) = mottagaren.
 */

/** Hashen som `campaign_recipients.token_hash` ska innehålla (utskicket
 * skapar token och sparar `hashOfferToken(token)`). */
export function hashOfferToken(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{16,128}$/;

/** Formkontroll innan någon fråga körs (skräp i `?o=` slår aldrig mot DB). */
export function isOfferTokenShape(token: unknown): token is string {
  return typeof token === "string" && TOKEN_SHAPE.test(token);
}

export type OfferInfo = {
  recipientId: string;
  customerId: string;
  pct: number;
  text: string | null;
};

type Row = {
  id: string;
  customer_id: string;
  offer_pct: number | null;
  offer_text: string | null;
  valid_until: string | null;
  timezone: string;
};

/**
 * Den giltiga mottagarraden för token i företaget, eller `undefined`.
 * `lock = true` (bokningens transaktion) låser raden (`for update`) så att
 * två samtidiga bokningar med samma token serialiseras — den andra ser då
 * `redeemed_at` satt och bokar utan rabatt.
 */
export async function findValidOfferIn(
  q: Queryable,
  input: { businessId: string; token: string; now: Date; lock?: boolean },
): Promise<OfferInfo | undefined> {
  if (!isOfferTokenShape(input.token)) return undefined;
  const r = await q.query<Row>(
    `select cr.id, cr.customer_id, c.offer_pct, c.offer_text,
            c.offer_valid_until::text as valid_until, b.timezone
       from public.campaign_recipients cr
       join public.campaigns c
         on c.business_id = cr.business_id and c.id = cr.campaign_id
       join public.businesses b on b.id = cr.business_id
       join public.customers cu
         on cu.business_id = cr.business_id and cu.id = cr.customer_id
      where cr.business_id = $1
        and cr.token_hash = $2
        and cr.redeemed_at is null
        and c.offer_pct is not null
        and cu.anonymized_at is null
      ${input.lock ? "for update of cr" : ""}`,
    [input.businessId, hashOfferToken(input.token)],
  );
  const row = r.rows[0];
  if (!row || row.offer_pct === null) return undefined;
  if (row.valid_until !== null) {
    const tz = parseTimeZone(row.timezone);
    if (!tz.ok) return undefined;
    // LocalDate är "YYYY-MM-DD": strängjämförelse = datumjämförelse.
    if (toLocalDate(input.now, tz.value) > row.valid_until) return undefined;
  }
  return {
    recipientId: row.id,
    customerId: row.customer_id,
    pct: row.offer_pct,
    text: row.offer_text?.trim() || null,
  };
}

export type OfferRedemption = {
  recipientId: string;
  discountMinor: number;
};

/**
 * Erbjudanderabatten för just den här kunden i bokningens transaktion
 * (raden låst), eller `undefined` (ogiltig/förbrukad token, fel kund, 0 kr).
 * Aldrig ett fel: kunden bokar då bara utan rabatt.
 */
export async function offerDiscountIn(
  q: Queryable,
  input: {
    businessId: string;
    customerId: string;
    token: string;
    priceMinor: number;
    now: Date;
  },
): Promise<OfferRedemption | undefined> {
  const offer = await findValidOfferIn(q, { ...input, lock: true });
  if (!offer || offer.customerId !== input.customerId) return undefined;
  const discountMinor = memberDiscountMinor(input.priceMinor, offer.pct);
  if (discountMinor <= 0) return undefined;
  return { recipientId: offer.recipientId, discountMinor };
}

/** Markerar mottagarraden som inlöst — en gång (`redeemed_at is null`).
 * Returnerar `false` om någon hann före (kan inte hända när raden är låst
 * av `offerDiscountIn` i samma transaktion, men villkoret är sista spärren). */
export async function redeemOfferIn(
  q: Queryable,
  input: {
    businessId: string;
    recipientId: string;
    bookingId: string;
    now: Date;
  },
): Promise<boolean> {
  const r = await q.query(
    `update public.campaign_recipients
        set redeemed_booking_id = $3, redeemed_at = $4
      where business_id = $1 and id = $2 and redeemed_at is null`,
    [input.businessId, input.recipientId, input.bookingId, input.now],
  );
  return (r.rowCount ?? 0) === 1;
}
