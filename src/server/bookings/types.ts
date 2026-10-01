import "server-only";

import type { Clp } from "@/lib/format/clp";
import type { Interval } from "@/server/scheduling/core/intervals";

/**
 * Felkoderna är kontraktet mot WP-20/21 (UI mappar med
 * `satisfies Record<BookingError, string>`, texter i WP-03b).
 */
export type BookingError =
  | "invalid_input" // Zod-fel i indata (ska inte hända från vårt UI)
  | "service_not_offered" // tjänst/profesional finns inte i företaget, inaktiv eller utför inte tjänsten
  | "business_unavailable" // kund: företaget är inte aktivt (businesses.status <> 'active')
  | "outside_hours" // inte i ett ledigt arbetsfönster (eller inte på rutnätet för kund)
  | "too_soon" // start < now + min_notice_minutes (bara kund)
  | "too_far" // lokalt datum > idag + max_days_ahead (bara kund)
  | "slot_taken" // 23P01 från no_overlap, eller alla "any"-kandidater tagna
  | "not_found" // bokningen finns inte i företaget, eller fel token (move/cancel)
  | "invalid_status" // move/cancel på annat än requested/confirmed/pending_payment; confirm/decline på annat än requested (WP-45)
  | "outside_cancel_window" // kund senare än cancel_window_hours före start
  | "forbidden"; // WP-46: medlemmen saknar behörighet (flaggorna i memberships)

/** Kundens flöden (token/bokningssidan) returnerar aldrig `forbidden`. */
export type CustomerBookingError = Exclude<BookingError, "forbidden">;

export type CreatedBooking = {
  id: string;
  businessId: string;
  staffId: string;
  serviceId: string;
  customerId: string;
  /** period (utan buffert), ISO UTC. */
  start: string;
  end: string;
  /** Räknat på servern från services.price_clp. */
  priceClp: Clp;
  /** WP-54: medlemsrabatten (0 = ingen). Satt av servern, aldrig klienten.
   * Pris att betala = `priceClp - discountClp`. */
  discountClp: Clp;
  /** WP-31/WP-30: varför `discountClp > 0` — medlemsrabatt,
   * erbjudandelänk eller flash-tid (största vinner, aldrig summan). Saknas
   * när `discountClp === 0`. */
  discountReason?: "member" | "offer" | "flash";
  /** WP-54: finns bara när `discountClp` kommer från medlemskap i just det
   * här anropet (inte vid ett idempotent omförsök). `null` = företaget har
   * ingen förmånstext (visa då bara rabatten). */
  memberBenefitText?: string | null;
  depositClp: 0;
  /** WP-45: kund via bokningssidan → `requested` om inte företaget har
   * `auto_confirm_bookings`; ägarens (manuella) bokningar alltid `confirmed`. */
  status: "requested" | "confirmed";
  /** Klartext, returneras EN gång; bara SHA-256 sparas. Loggas aldrig. */
  manageToken: string;
};

export type MovedBooking = {
  id: string;
  businessId: string;
  staffId: string;
  serviceId: string;
  start: string;
  end: string;
  priceClp: Clp;
  /** Flytten behåller statusen (WP-45: en förfrågan förblir `requested`). */
  status: "requested" | "confirmed" | "pending_payment";
  /** Ny klartext-token (D-029: flytten roterar den, gamla länkar slutar
   * gälla). Bara SHA-256 sparas. Loggas aldrig. */
  manageToken: string;
};

/** Intervallet (blocked, inkl. buffert) som blev ledigt, för väntelistan (WP-23). */
export type Freed = { staffId: string; blocked: Interval };
