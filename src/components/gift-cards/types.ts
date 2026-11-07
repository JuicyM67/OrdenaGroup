// WP-87 (D-073): klienttyper för Caja → Tarjetas de regalo. Klientkomponenter
// importerar aldrig `@/server` (gränsregeln) — servern formaterar texterna
// och skickar färdiga värden.

export type TillCard = {
  last4: string;
  initialMinor: number;
  balanceMinor: number;
  statusLabel: string;
  active: boolean;
  expiresLabel: string;
  recipient: string | null;
  theme: "lime" | "lilac";
};

export type TillBookingOption = { id: string; label: string; dueMinor: number };

export type TillState = {
  code: string;
  card: TillCard | null;
  bookings: TillBookingOption[];
  /** Förvald bokning (`?reserva=` från "Marcar como pagada"). */
  bookingId: string;
  message: string | null;
  error: string | null;
};

export type SellState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "done";
      amountLabel: string;
      code: string;
      /** Kortets länk (med token), relativ. Visas bara nu. */
      cardHref: string;
      expiresLabel: string;
      emailed: boolean;
      theme: "lime" | "lilac";
      recipient: string | null;
    };
