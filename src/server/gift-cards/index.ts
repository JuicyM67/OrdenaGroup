import "server-only";

// WP-77 (D-058): presentkort (köp via Stripe Connect, delinlösen online och i kassan).
export {
  businessCanSellGiftCards,
  confirmGiftCardReturn,
  createGiftCardCheckout,
  fulfillGiftCardSession,
  giftCardsEnabled,
  loadGiftCardReturn,
  runGiftCardSweep,
} from "./checkout";
export {
  isGiftCardTokenShape,
  loadGiftCardByToken,
  loadMyGiftCards,
  withdrawGiftCard,
} from "./account";
export type { GiftCardView, MyGiftCard } from "./account";
export {
  loadBusinessGiftCards,
  loadTillBookings,
  lookupGiftCardAtTill,
  redeemGiftCardAtTill,
} from "./caja";
export type {
  BusinessGiftCardSummary,
  TillBooking,
  TillLookup,
  TillLookupResult,
  TillRedeemResult,
} from "./caja";
export { dispatchGiftCardEvent } from "./webhook";
