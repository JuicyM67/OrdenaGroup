import "server-only";

/**
 * WP-23 (F8): väntelistan. Se respektive fil för kontrakten.
 * Händelser till utkorgen: `WaitlistEvent` (`./events.ts`).
 */
export {
  claimWaitlistOffer,
  getWaitlistOffer,
  type ClaimWaitlistResult,
  type GetWaitlistOfferResult,
  type WaitlistOfferView,
} from "./claim";
export { emitWaitlistEvents, type WaitlistEvent } from "./events";
export { expireWaitlistOffers, type ExpireWaitlistResult } from "./expire";
export {
  joinWaitlist,
  type JoinWaitlistCode,
  type JoinWaitlistInput,
  type JoinWaitlistResult,
} from "./join";
export { onSlotFreed, type SlotFreedInput } from "./match";
export {
  listWaitlist,
  removeWaitlistEntry,
  type RemoveWaitlistResult,
  type WaitlistItem,
} from "./owner";
