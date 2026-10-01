import "server-only";

/** WP-30 (F13): horas flash. Ägarvägar i `./slots.ts`, publika i `./public.ts`,
 * tomt-läge-förslagen (UX-granskning) i `./gaps.ts`. */
export {
  cancelFlashSlot,
  createFlashSlot,
  listFlashSlots,
  type CancelFlashSlotResult,
  type CreateFlashSlotInput,
  type CreateFlashSlotResult,
  type FlashSlotItem,
} from "./slots";
export {
  flashForSlot,
  flashPrice,
  flashSelection,
  isFlashIdShape,
  loadActiveFlashSlotsIn,
  type PublicFlashSlot,
} from "./public";
export { listFreeGaps, listFreeGapsIn, type FreeGap } from "./gaps";
