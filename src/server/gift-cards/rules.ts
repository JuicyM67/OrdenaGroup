import "server-only";

// WP-77 (D-058): rena regler för presentkort (inga I/O, enhetstestade via
// pgTAP/integrationsfallen). Ångerrätten och datumformatet återanvänds från
// värdebevisen (D-057).
import { GIFT_CARD_PREFIX } from "@/config/gift-cards";
import { VOUCHER_ALPHABET } from "@/server/vouchers/rules";

export {
  canWithdraw,
  formatVoucherDate as formatGiftCardDate,
  withdrawalDeadline,
} from "@/server/vouchers/rules";

/** `PK-XXXX-XXXX-XXXX`: 12 tecken Crockford base32 = 60 bitar. Längre än
 * värdebevisens 8 eftersom koden ensam (utan konto) ger åtkomst till pengar.
 * `rand` ger ett heltal i [0, n) — `crypto.randomInt` i produktion. */
export function generateGiftCardCode(rand: (n: number) => number): string {
  let body = "";
  for (let i = 0; i < 12; i++) {
    body += VOUCHER_ALPHABET[rand(VOUCHER_ALPHABET.length)];
  }
  return `${GIFT_CARD_PREFIX}-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8)}`;
}

/** Samma normalisering som `private.gift_card_normalize_code` (versaler,
 * O→0, I/L→1, utan mellanslag/streck). `null` = fel form. */
export function normalizeGiftCardCode(raw: string): string | null {
  const x = raw
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  if (x.length !== 14) return null;
  const out = `${x.slice(0, 2)}-${x.slice(2, 6)}-${x.slice(6, 10)}-${x.slice(10)}`;
  return GIFT_CARD_CODE_RE.test(out) ? out : null;
}

export const GIFT_CARD_CODE_RE =
  /^[A-Z]{2}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

/** "···4HRT" — de fyra sista tecknen (kassan, kvittot). */
export function maskGiftCardCode(last4: string): string {
  return `···${last4}`;
}

export type GiftCardStatus =
  "active" | "refunding" | "refunded" | "expired" | "disputed" | "depleted";
