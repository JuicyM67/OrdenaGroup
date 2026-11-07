import "server-only";

import type { LocalDate } from "@/lib/format/dates";
import { withServiceTx } from "@/server/db/tx";

import { sameOffer } from "./claim";
import { emitWaitlistEvents, type WaitlistEvent } from "./events";
import { loadWaitlistBusiness, offerWaitingIn } from "./match";

/**
 * D-063: kunden svarade "No, gracias" på `lista_espera_oferta` i WhatsApp.
 *
 * Samma effekt som när hålltiden går ut (`expire.ts`): posten `offered →
 * expired` och — i sekventiellt läge — erbjuds nästa väntande i kön samma
 * dag direkt, i stället för att vänta ut hålltiden. `offer_expires_at`
 * sätts till nu så att länken `/v/[token]` därefter svarar "vencido".
 *
 * `businessId`/`entryId` kommer från vår utkorgsrad (webhooken binder
 * svaret via `context.id`), `offeredMs` från knappens payload: ett svar på
 * ett äldre erbjudande till samma post ändrar ingenting. Idempotent: en
 * post som inte längre är `offered` lämnas orörd.
 */
export type DeclineWaitlistResult =
  { ok: true } | { ok: false; code: "not_offered" | "stale" };

export async function declineWaitlistOfferForEntry(input: {
  businessId: string;
  entryId: string;
  offeredMs: number;
  now: Date;
}): Promise<DeclineWaitlistResult> {
  const { result, events } = await withServiceTx(async (q) => {
    const r = await q.query<{
      status: string;
      day: string;
      offered_ms: number | null;
      expires_ms: number | null;
    }>(
      `select status::text as status, day::text as day,
              extract(epoch from offered_at)::float8 * 1000 as offered_ms,
              extract(epoch from offer_expires_at)::float8 * 1000 as expires_ms
         from public.waitlist_entries
        where business_id = $1 and id = $2
        for update`,
      [input.businessId, input.entryId],
    );
    const e = r.rows[0];
    const none: WaitlistEvent[] = [];
    if (!e || e.status !== "offered") {
      return {
        result: { ok: false, code: "not_offered" } as const,
        events: none,
      };
    }
    if (!sameOffer(e.offered_ms, input.offeredMs)) {
      return { result: { ok: false, code: "stale" } as const, events: none };
    }
    await q.query(
      `update public.waitlist_entries
          set status = 'expired',
              offer_expires_at = least(offer_expires_at, greatest(offered_at, $3::timestamptz))
        where business_id = $1 and id = $2 and status = 'offered'`,
      [input.businessId, input.entryId, input.now],
    );
    const business = await loadWaitlistBusiness(q, input.businessId);
    if (!business || business.mode !== "sequential") {
      return { result: { ok: true } as const, events: none };
    }
    const next = await offerWaitingIn(q, {
      businessId: input.businessId,
      days: [e.day as LocalDate],
      now: input.now,
      business,
    });
    return { result: { ok: true } as const, events: next };
  });
  await emitWaitlistEvents(events);
  return result;
}
