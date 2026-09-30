import "server-only";

/**
 * WP-45 (D-033): förfrågningar (`bookings.status = 'requested'`) som väntar
 * på att ägaren bekräftar eller nekar dem. Notismodellen är härledd — ingen
 * egen tabell — så den här filen är den enda källan för klockan, Inicio-
 * listan och Agenda/Hoy:s eget utseende.
 *
 * `confirmRequest`/`declineRequest` är tunna omslag runt motorn
 * (`src/server/bookings/confirm.ts`, scheduling-engineer): samma mönster
 * som `moveOwnerBooking` i `manual-booking.ts` — `confirmBooking`/
 * `declineBooking` validerar sin egen indata (`ownerDecisionRequestSchema`)
 * och kör i actorns egen RLS-transaktion (`runAs`), så den här filen
 * öppnar ingen egen `withOwnerTx` för dem.
 */
import { revalidatePath } from "next/cache";

import type { PendingRequestItem } from "@/lib/validation/requests";
import { confirmBooking, declineBooking } from "@/server/bookings/confirm";
import type { BookingError } from "@/server/bookings/types";
import { hasPerm, loadMember, type Member } from "@/server/db/permissions";
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx } from "@/server/db/tx";

import { isoOf } from "./shared";

/** Sidor som visar klockan/listan/agendans popover — revalideras efter varje
 * Bekräfta/Neka så att navigering till någon av dem visar färsk data (WP-45
 * steg 5: "Server actions anropar confirm.ts, revalidatePath efter"). */
function revalidateRequestPages(): void {
  revalidatePath("/app/inicio");
  revalidatePath("/app/hoy");
  revalidatePath("/app/agenda");
  revalidatePath("/app/ajustes");
}

export type { PendingRequestItem };

type Row = {
  id: string;
  client_name: string | null;
  service_name: string;
  start_ms: number;
};

/**
 * Väntande förfrågningar, framtida (`lower(period) > now`), sorterade på
 * starttid. En redan passerad förfrågan är svepets jobb (`expireRequests`,
 * steg 6) — den ska inte dyka upp här bara för att svepet inte hunnit köra.
 */
export async function listPendingRequests(
  userId: string,
  businessId: string,
  now: Date,
): Promise<PendingRequestItem[]> {
  return withOwnerTx(userId, async (q) =>
    listPendingRequestsIn(
      q,
      businessId,
      now,
      await loadMember(q, userId, businessId),
    ),
  );
}

/**
 * WP-46: bara förfrågningar som medlemmen får bekräfta/neka (samma regel
 * som `src/server/bookings/authz.ts`): alla med `can_manage_all_bookings`
 * (och ägaren), annars bara den egna profesionalens, annars inga.
 * `null` = ingen medlem → inga. Returnerar `undefined` = inget filter.
 */
function staffFilter(member: Member | null): string[] | undefined {
  if (hasPerm(member, "can_manage_all_bookings")) return undefined;
  if (member?.staffId && hasPerm(member, "can_manage_own_bookings")) {
    return [member.staffId];
  }
  return [];
}

/** Inre steg (för tester): kör i anroparens transaktion. `member` utelämnad
 * = inget behörighetsfilter (bara tester och ägarens egna vägar). */
export async function listPendingRequestsIn(
  q: Queryable,
  businessId: string,
  now: Date,
  member?: Member | null,
): Promise<PendingRequestItem[]> {
  const only = member === undefined ? undefined : staffFilter(member);
  if (only !== undefined && only.length === 0) return [];
  const r = await q.query<Row>(
    `select bk.id, c.name as client_name, sv.name as service_name,
            extract(epoch from lower(bk.period)) * 1000 as start_ms
       from public.bookings bk
       join public.customers c
         on c.business_id = bk.business_id and c.id = bk.customer_id
       join public.services sv
         on sv.business_id = bk.business_id and sv.id = bk.service_id
      where bk.business_id = $1
        and bk.status = 'requested'
        and lower(bk.period) > $2
        and ($3::uuid[] is null or bk.staff_id = any($3::uuid[]))
      order by lower(bk.period)`,
    [businessId, now, only ?? null],
  );
  return r.rows.map((x) => ({
    id: x.id,
    clientName: x.client_name ?? "",
    service: x.service_name,
    start: isoOf(x.start_ms),
  }));
}

export type RequestActionResult =
  { ok: true } | { ok: false; error: BookingError };

/** Klockan/Inicio-listan/agendans popover: Confirmar. */
export async function confirmRequest(
  userId: string,
  businessId: string,
  now: Date,
  bookingId: string,
): Promise<RequestActionResult> {
  const r = await confirmBooking(
    { bookingId },
    { businessId, actor: { kind: "owner", userId }, now },
  );
  if (!r.ok) return { ok: false, error: r.error };
  revalidateRequestPages();
  return { ok: true };
}

/** Klockan/Inicio-listan/agendans popover: Rechazar. `reason` (ägarens
 * valfria motiv, `RechazarDialog`) går vidare till `declineBooking`
 * (`ownerDecisionRequestSchema.reason`, ≤ 300 tecken) → `solicitudRechazada`
 * (e-post, `motivo`) — sparas aldrig i `bookings`. */
export async function declineRequest(
  userId: string,
  businessId: string,
  now: Date,
  bookingId: string,
  reason?: string,
): Promise<RequestActionResult> {
  const r = await declineBooking(
    { bookingId, ...(reason ? { reason } : {}) },
    { businessId, actor: { kind: "owner", userId }, now },
  );
  if (!r.ok) return { ok: false, error: r.error };
  revalidateRequestPages();
  return { ok: true };
}
