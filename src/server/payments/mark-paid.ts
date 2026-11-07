import "server-only";

import { z } from "zod";

import { toLocalDate } from "@/lib/format/dates";
import { MONEY_MAX } from "@/lib/format/money";
import { canManageStaffBookings } from "@/server/bookings/authz";
import { pgErrorCode } from "@/server/db/errors";
import { hasPerm, loadMember, type Member } from "@/server/db/permissions";
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx } from "@/server/db/tx";

import { loadBusinessTz } from "./business-tz";

/**
 * WP-24 (F10) · Markera betald / ångra betalning.
 *
 * - Servern bestämmer: bokningen, dess pris och behörigheten läses i samma
 *   transaktion. Klientens belopp är bara en önskan; utelämnat belopp =
 *   bokningens pris minus rabatt minus redan godkända delbetalningar
 *   (t.ex. en förskottsbetalning via Mercado Pago).
 * - Behörighet: får hantera bokningen (egen/alla, samma regel som
 *   `bookings`) ELLER `can_view_reports` (kassan). RLS på `payments`
 *   (20260930200200) har samma regel och sista ordet.
 * - Manuella metoder bara: `cash`, `card_terminal` och `transfer`.
 *   `mercadopago` skapas/ändras aldrig här.
 * - Ångra = status `refunded`, bara samma lokala dag (företagets tidszon)
 *   som betalningen gjordes. Rader raderas aldrig (kassahistorik).
 */

export type ManualPaymentMethod = "cash" | "card_terminal" | "transfer";

export type MarkBookingPaidInput = {
  bookingId: string;
  method: ManualPaymentMethod;
  /** Minsta enheten, heltal > 0. Utelämnat = det som återstår att betala. */
  amountMinor?: number | undefined;
};

export type MarkBookingPaidError =
  | "forbidden"
  | "not_found"
  | "booking_cancelled"
  | "invalid_amount"
  | "invalid_method"
  | "already_paid"
  | "unexpected";

export type MarkBookingPaidResult =
  { ok: true; paymentId: string } | { ok: false; code: MarkBookingPaidError };

export type UndoPaymentInput = { paymentId: string };

export type UndoPaymentError =
  "forbidden" | "not_found" | "same_day_required" | "unexpected";

export type UndoPaymentResult =
  { ok: true } | { ok: false; code: UndoPaymentError };

/** Metoderna som får väljas manuellt. */
export const MANUAL_METHODS: readonly ManualPaymentMethod[] = [
  "cash",
  "card_terminal",
  "transfer",
];

const markSchema = z.object({
  bookingId: z.guid(),
  method: z.enum(["cash", "card_terminal", "transfer"]),
  amountMinor: z.number().int().positive().max(MONEY_MAX).optional(),
});

const undoSchema = z.object({ paymentId: z.guid() });

/** Egen/alla bokningar eller kassan (`can_view_reports`). */
function canPay(member: Member | null, staffId: string): boolean {
  return (
    canManageStaffBookings(member, staffId) ||
    hasPerm(member, "can_view_reports")
  );
}

/** Serialiserar betalningar per bokning (två klick, två flikar). */
async function lockBookingPayments(
  q: Queryable,
  businessId: string,
  bookingId: string,
): Promise<void> {
  await q.query(
    "select pg_advisory_xact_lock(hashtextextended('booking-payment:' || $1::text || ':' || $2::text, 0))",
    [businessId, bookingId],
  );
}

type BookingRow = {
  staff_id: string;
  status: string;
  due: number;
  paid_full: boolean;
};

export async function markBookingPaid(
  userId: string,
  businessId: string,
  now: Date,
  input: MarkBookingPaidInput,
): Promise<MarkBookingPaidResult> {
  const parsed = markSchema.safeParse(input);
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path[0];
    if (path === "amountMinor") return { ok: false, code: "invalid_amount" };
    if (path === "method") return { ok: false, code: "invalid_method" };
    return { ok: false, code: "not_found" };
  }
  const { bookingId, method, amountMinor } = parsed.data;
  if (!MANUAL_METHODS.includes(method)) {
    return { ok: false, code: "invalid_method" };
  }

  try {
    return await withOwnerTx(userId, async (q) => {
      const member = await loadMember(q, userId, businessId);
      if (!member) return { ok: false, code: "forbidden" } as const;

      await lockBookingPayments(q, businessId, bookingId);

      // Allt i en fråga: status, vad som återstår och om den redan är betald.
      const r = await q.query<BookingRow>(
        `select bk.staff_id, bk.status::text as status,
                (bk.price_clp - bk.discount_clp - coalesce((
                   select sum(p.amount_clp) from public.payments p
                    where p.business_id = bk.business_id and p.booking_id = bk.id
                      and p.status = 'approved' and p.kind = 'deposit'
                 ), 0))::int as due,
                (exists (
                  select 1 from public.payments p
                   where p.business_id = bk.business_id and p.booking_id = bk.id
                     and p.status = 'approved' and p.kind in ('full', 'balance')
                ) or exists (
                  -- WP-86 (D-072): betald med paket (ej ångrad inlösen).
                  select 1 from public.customer_package_moves m
                   where m.business_id = bk.business_id and m.booking_id = bk.id
                     and m.kind = 'redeem'
                     and not exists (
                       select 1 from public.customer_package_moves r
                        where r.business_id = m.business_id and r.reverses_id = m.id
                     )
                )) as paid_full
           from public.bookings bk
          where bk.business_id = $1 and bk.id = $2`,
        [businessId, bookingId],
      );
      const row = r.rows[0];
      if (!row) return { ok: false, code: "not_found" } as const;
      if (!canPay(member, row.staff_id)) {
        return { ok: false, code: "forbidden" } as const;
      }
      if (row.status === "cancelled") {
        return { ok: false, code: "booking_cancelled" } as const;
      }
      if (row.paid_full) return { ok: false, code: "already_paid" } as const;

      const amount = amountMinor ?? row.due;
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > MONEY_MAX) {
        return { ok: false, code: "invalid_amount" } as const;
      }

      const ins = await q.query<{ id: string }>(
        `insert into public.payments
           (business_id, booking_id, kind, method, amount_clp, status, paid_at)
         values ($1, $2, 'full', $3::public.payment_method, $4, 'approved', $5)
         returning id`,
        [businessId, bookingId, method, amount, now.toISOString()],
      );
      const id = ins.rows[0]?.id;
      if (!id) return { ok: false, code: "unexpected" } as const;
      return { ok: true, paymentId: id } as const;
    });
  } catch (e) {
    if (pgErrorCode(e) === "42501") return { ok: false, code: "forbidden" };
    return { ok: false, code: "unexpected" };
  }
}

type PaymentRow = {
  staff_id: string;
  status: string;
  method: string;
  paid_at: Date | null;
};

export async function undoPayment(
  userId: string,
  businessId: string,
  now: Date,
  input: UndoPaymentInput,
): Promise<UndoPaymentResult> {
  const parsed = undoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "not_found" };
  const { paymentId } = parsed.data;

  try {
    return await withOwnerTx(userId, async (q) => {
      const member = await loadMember(q, userId, businessId);
      if (!member) return { ok: false, code: "forbidden" } as const;

      const r = await q.query<PaymentRow>(
        `select bk.staff_id, p.status::text as status, p.method::text as method,
                p.paid_at
           from public.payments p
           join public.bookings bk
             on bk.business_id = p.business_id and bk.id = p.booking_id
          where p.business_id = $1 and p.id = $2
          for update of p`,
        [businessId, paymentId],
      );
      const row = r.rows[0];
      if (!row) return { ok: false, code: "not_found" } as const;
      if (
        !canPay(member, row.staff_id) ||
        // Betalningar som inte registrerats manuellt i kassan ångras aldrig
        // här (`stripe`/`gift_card` finns kvar i databasens enum, D-062).
        row.method === "mercadopago" ||
        row.method === "stripe" ||
        row.method === "gift_card"
      ) {
        return { ok: false, code: "forbidden" } as const;
      }
      if (row.status === "refunded") return { ok: true } as const; // idempotent
      if (row.status !== "approved" || row.paid_at === null) {
        return { ok: false, code: "not_found" } as const;
      }

      const tz = await loadBusinessTz(q, businessId);
      if (toLocalDate(row.paid_at, tz) !== toLocalDate(now, tz)) {
        return { ok: false, code: "same_day_required" } as const;
      }

      await q.query(
        `update public.payments
            set status = 'refunded'
          where business_id = $1 and id = $2`,
        [businessId, paymentId],
      );
      return { ok: true } as const;
    });
  } catch (e) {
    if (pgErrorCode(e) === "42501") return { ok: false, code: "forbidden" };
    return { ok: false, code: "unexpected" };
  }
}
