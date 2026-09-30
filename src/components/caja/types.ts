// WP-24 (F10) · Klienttyper för Caja e informes. Speglar (duplicerar, inte
// importerar) `src/server/reports/caja.ts` och `src/server/payments/
// mark-paid.ts`: klientkomponenter får aldrig importera `@/server`
// (gränsregeln i uppdraget), samma mönster som `AgendaMemberView`/
// `HoyMemberView` (agenda/types.ts, mobile/types.ts) eller `CustomerExportResult`
// i `customer-privacy-actions.tsx`. Håll de två filerna i synk för hand.
import { estados } from "@/i18n";
import type { LocalDate } from "@/lib/format/dates";

// ---------------------------------------------------------------------------
// Markera betald / ångra (src/server/payments/mark-paid.ts)
// ---------------------------------------------------------------------------

export type ManualPaymentMethod =
  "cash" | "card_terminal" | "transfer" | "swish";

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

// ---------------------------------------------------------------------------
// Caja e informes (src/server/reports/caja.ts)
// ---------------------------------------------------------------------------

export type CajaPeriod =
  | { kind: "today" | "week" | "month" }
  | { kind: "range"; from: string; to: string };

export type CajaSummary = {
  revenueMinor: number;
  expectedMinor: number;
  bookings: number;
  noShows: number;
  averageMinor: number;
};

export type BreakdownRow = {
  key: string;
  label: string;
  amountMinor: number;
  bookings: number;
};

export type PorCobrarRow = {
  bookingId: string;
  /** ISO 8601 (UTC). */
  start: string;
  /** `null` om kunden är anonymiserad. */
  customerName: string | null;
  serviceName: string;
  staffName: string;
  /** Det som återstår: pris − rabatt − godkänd förskottsbetalning. */
  priceMinor: number;
};

export type PagoHoyRow = {
  paymentId: string;
  bookingId: string;
  /** ISO 8601 (UTC). */
  paidAt: string;
  method: string;
  amountMinor: number;
  customerName: string | null;
};

export type CajaData = {
  /** Periodens lokala datum, båda inklusive. */
  period: { from: LocalDate; to: LocalDate };
  summary: CajaSummary;
  byMethod: BreakdownRow[];
  byStaff: BreakdownRow[];
  byService: BreakdownRow[];
  porCobrar: PorCobrarRow[];
  pagosHoy: PagoHoyRow[];
};

export type CajaResult = CajaData | { forbidden: true } | { invalid: true };

export type InformesData = {
  weekly: { weekStart: LocalDate; revenueMinor: number }[];
  occupancyByStaff: {
    staffId: string;
    name: string;
    bookedMinutes: number;
    availableMinutes: number;
  }[];
  newVsReturning: {
    weekStart: LocalDate;
    nuevos: number;
    recurrentes: number;
  }[];
  noShowTrend: { weekStart: LocalDate; pct: number }[];
};

export type InformesResult = InformesData | { forbidden: true };

// ---------------------------------------------------------------------------
// Server actions (src/app/(app)/app/caja/actions.ts) — props till CajaScreen
// ---------------------------------------------------------------------------

export type CajaActions = {
  loadCaja: (period: CajaPeriod) => Promise<CajaResult>;
  loadInformes: () => Promise<InformesResult>;
  markPaid: (input: MarkBookingPaidInput) => Promise<MarkBookingPaidResult>;
  undoPayment: (input: UndoPaymentInput) => Promise<UndoPaymentResult>;
};

// TODO_COPY (WP-24, F10): ingen sträng i es-CL.ts täcker "betald" som en kort
// tagg/chip på en bokningsrad (`estados.abonoPagado` är bara för abonon).
// copywriter-es-cl: lägg gärna till t.ex. `estados.pagada` och byt ut den
// här platshållaren — delad av Hoy (`mobile/hoy-view.ts`) och agendans
// popover (`agenda/event-popover.tsx`).
export const PAGADA_LABEL = estados.pagada;
