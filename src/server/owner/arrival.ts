import "server-only";

import { requireBookingPerm } from "@/server/bookings/authz";
import { pgErrorCode } from "@/server/db/errors";
import { loadMember, PermissionDeniedError } from "@/server/db/permissions";
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx } from "@/server/db/tx";

export type ArrivalStatus = "completed" | "no_show";
/** `forbidden` (WP-46): medlemmen får inte röra bokningen. */
export type ArrivalError = "not_found" | "invalid_status" | "forbidden";
export type ArrivalResult = { ok: true } | { ok: false; error: ArrivalError };

/** Bara dessa statusar kan bli Llegó/No vino (samma som `CHANGEABLE` i
 * `src/server/bookings/row.ts`, men här utan väntelistans "freed"-hantering
 * — F8 är utanför WP-21). */
const CHANGEABLE = new Set(["confirmed", "pending_payment"]);

/**
 * Llegó/No vino (WP-21, agenda-popover/NextClientCard). R7: `bookings.status`
 * och kundens `visits_count`/`no_show_count` uppdateras i SAMMA transaktion,
 * annars glider räknarna isär från historiken. Idempotent (samma status två
 * gånger räknar inte om); att byta RIKTNING (Llegó → No vino eller tvärtom)
 * är utanför scope (`invalid_status` — bara "Mover"/korrigering saknas, se
 * event-popover.tsx).
 */
export async function markArrival(
  userId: string,
  businessId: string,
  bookingId: string,
  status: ArrivalStatus,
): Promise<ArrivalResult> {
  try {
    return await withOwnerTx(userId, async (q) => {
      // WP-46: samma regel som att flytta (egen/alla). Kundens räknare
      // (`customers`) kräver dessutom `can_manage_all_bookings` i RLS — en
      // 42501 därifrån blir `forbidden` nedan och rullar tillbaka allt.
      const r = await q.query<{ staff_id: string }>(
        `select staff_id from public.bookings where business_id = $1 and id = $2`,
        [businessId, bookingId],
      );
      const row = r.rows[0];
      if (!row) return { ok: false, error: "not_found" } as const;
      requireBookingPerm(await loadMember(q, userId, businessId), {
        kind: "manage",
        staffId: row.staff_id,
      });
      return markArrivalIn(q, businessId, bookingId, status);
    });
  } catch (e) {
    if (e instanceof PermissionDeniedError || pgErrorCode(e) === "42501") {
      return { ok: false, error: "forbidden" };
    }
    throw e;
  }
}

type Row = { customer_id: string; status: string };

/** Inre steg (för tester): kör i anroparens transaktion. */
export async function markArrivalIn(
  q: Queryable,
  businessId: string,
  bookingId: string,
  status: ArrivalStatus,
): Promise<ArrivalResult> {
  const locked = await q.query<Row>(
    `select customer_id, status::text as status
       from public.bookings
      where business_id = $1 and id = $2
      for update`,
    [businessId, bookingId],
  );
  const row = locked.rows[0];
  if (!row) return { ok: false, error: "not_found" };
  if (row.status === status) return { ok: true }; // idempotent
  if (!CHANGEABLE.has(row.status))
    return { ok: false, error: "invalid_status" };

  await q.query(
    `update public.bookings
        set status = $3::public.booking_status
      where business_id = $1 and id = $2`,
    [businessId, bookingId, status],
  );

  // R7 (docs/tech/DATA_MODEL.md): samma transaktion som statusbytet.
  if (status === "completed") {
    await q.query(
      `update public.customers
          set visits_count = visits_count + 1, last_visit_at = now()
        where business_id = $1 and id = $2`,
      [businessId, row.customer_id],
    );
  } else {
    await q.query(
      `update public.customers
          set no_show_count = no_show_count + 1
        where business_id = $1 and id = $2`,
      [businessId, row.customer_id],
    );
  }

  return { ok: true };
}
