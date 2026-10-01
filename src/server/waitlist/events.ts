import "server-only";

import {
  enqueueWaitlistEvent,
  type WaitlistEvent,
} from "@/server/messaging/outbox";

/**
 * WP-23: väntelistans händelser, köas EFTER commit (som bokningens,
 * `src/server/bookings/events.ts`). Typen är exakt `WaitlistEvent` från
 * `src/server/messaging/outbox/types.ts` (kontraktet med integrations-
 * engineer):
 *
 * - `waitlist_offer`: en tid har frigjorts och erbjuds kunden i posten
 *   `entryId` (status `offered`). `token` är klartext-token för
 *   `/v/[token]` (bara här, bara SHA-256 i databasen). Tid/tjänst/hålltid
 *   läses med `getWaitlistOffer(token, now)` (`./claim.ts`).
 * - `waitlist_taken`: tiden kunden erbjöds togs av någon annan (broadcast)
 *   — posten är nu `expired`. Ingen token (länken svarar "taken").
 */
export type { WaitlistEvent };

/** Anropas EFTER commit, en gång per händelse. Kastar aldrig. */
export async function emitWaitlistEvents(
  events: readonly WaitlistEvent[],
): Promise<void> {
  for (const e of events) await enqueueWaitlistEvent(e);
}
