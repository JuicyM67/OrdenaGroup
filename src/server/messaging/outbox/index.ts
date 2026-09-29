import "server-only";

/**
 * WP-16: allt utgående bokningsmeddelande går via `message_outbox` (regel
 * hård 4). `enqueue.ts` skriver kön (efter commit, kastar aldrig vidare),
 * `worker.ts` tömmer den (`FOR UPDATE SKIP LOCKED`, backoff, dedupe),
 * `kick.ts` ger "inom 1 min" utan att vänta på cron. Se docs/tech/
 * INTEGRATIONS.md §5 och docs/decisions/DECISIONS.md (D-029/D-030).
 */
export { enqueueBookingEvent, enqueueBookingEventIn } from "./enqueue";
export { kickOutbox } from "./kick";
export { nextRetry, processOutbox } from "./worker";
export type { ProcessOutboxResult, RetryDecision } from "./worker";
export type { BookingEvent, OutboxChannel, OutboxRecipientKind } from "./types";
