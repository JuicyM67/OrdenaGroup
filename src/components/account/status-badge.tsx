// WP-67: statusbricka på kundkontots bokningskort (samma färger som Agenda:
// bekräftad = success, väntande = pending, avbokad = neutral).
import type { AccountBooking } from "@/server/accounts/view";
import { cuenta } from "@/i18n";

export function statusLabel(b: AccountBooking): string {
  return cuenta.estados[b.status];
}

export function StatusBadge({ booking }: { booking: AccountBooking }) {
  const tone =
    booking.status === "cancelled" || booking.status === "no_show"
      ? "bg-line text-muted"
      : booking.status === "requested" ||
          booking.status === "pending_payment" ||
          booking.status === "cancel_requested"
        ? "bg-pending-bg text-pending-fg"
        : "bg-success-bg text-success-fg";
  return (
    <span
      className={`shrink-0 rounded-badge px-2 py-0.5 text-11 font-bold ${tone}`}
    >
      {statusLabel(booking)}
    </span>
  );
}
