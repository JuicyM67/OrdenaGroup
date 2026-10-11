import "server-only";

// WP-69 (D-057): rena regler för värdebevis (inga I/O, enhetstestade).
import {
  addLocalDays,
  formatDate,
  localDayRange,
  toLocalDate,
  type TimeZone,
} from "@/lib/format/dates";

/** Crockford base32 utan I, L, O och U (förväxlas lätt vid uppläsning). */
export const VOUCHER_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** `XX-XXXX-XXXX`: varumärkets prefix + 8 tecken (~10¹² kombinationer). `rand`
 * ger ett heltal i [0, n) — `crypto.randomInt` i produktion. */
export function generateVoucherCode(
  prefix: string,
  rand: (n: number) => number,
): string {
  if (!/^[A-Z]{2}$/.test(prefix)) throw new Error("voucher: ogiltigt prefix");
  let body = "";
  for (let i = 0; i < 8; i++) {
    body += VOUCHER_ALPHABET[rand(VOUCHER_ALPHABET.length)];
  }
  return `${prefix}-${body.slice(0, 4)}-${body.slice(4)}`;
}

export const VOUCHER_CODE_RE =
  /^[A-Z]{2}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

/** Ångerrätt 14 dagar (lag 2005:59): köpdagen + 14 kalenderdagar i företagets
 * tidszon, t.o.m. 23:59 den sista dagen. */
export const WITHDRAWAL_DAYS = 14;

export function withdrawalDeadline(purchasedAt: Date, tz: TimeZone): Date {
  const last = addLocalDays(toLocalDate(purchasedAt, tz), WITHDRAWAL_DAYS);
  return localDayRange(last, tz).end;
}

export function canWithdraw(
  purchasedAt: Date,
  now: Date,
  tz: TimeZone,
): boolean {
  return now.getTime() < withdrawalDeadline(purchasedAt, tz).getTime();
}

/** Besöket (bokningens start) måste ligga före värdebevisets utgång. */
export function visitWithinValidity(start: Date, expiresAt: Date): boolean {
  return start.getTime() < expiresAt.getTime();
}

export type VoucherStatus =
  "active" | "reserved" | "redeemed" | "refunded" | "expired" | "disputed";

/** "24 oktober 2027" — sista giltighetsdagen i företagets tidszon (D-018). */
export function formatVoucherDate(instant: Date, tz: TimeZone): string {
  const year = toLocalDate(instant, tz).slice(0, 4);
  return `${formatDate(instant, tz, "dayMonthLong")} ${year}`;
}
