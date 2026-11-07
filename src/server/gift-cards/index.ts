import "server-only";

// WP-87 (D-073): tarjetas de regalo i Chile — försäljning i salongen (Caja),
// inlösen i kassan, kortets länk och svepet (utgång, persondata).
export { sellGiftCard } from "./sell";
export type { SellGiftCardError, SellGiftCardResult } from "./sell";
export {
  businessShowsGiftCards,
  loadBusinessGiftCards,
  loadTillBookings,
  lookupGiftCardAtTill,
  redeemGiftCardAtTill,
  setGiftCardsOnPage,
  voidGiftCard,
} from "./caja";
export type {
  BusinessGiftCard,
  BusinessGiftCardSummary,
  TillBooking,
  TillLookup,
  TillLookupResult,
  TillRedeemResult,
  VoidGiftCardResult,
} from "./caja";
export { loadGiftCardByToken } from "./view";
export type { GiftCardView, GiftCardViewResult } from "./view";
export { runGiftCardSweep } from "./sweep";
