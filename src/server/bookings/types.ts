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
  | "invalid_status" // move/cancel på annat än confirmed/pending_payment
  | "outside_cancel_window"; // kund senare än cancel_window_hours före start

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
  discountClp: 0;
  depositClp: 0;
  status: "confirmed";
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
  status: "confirmed" | "pending_payment";
};

/** Intervallet (blocked, inkl. buffert) som blev ledigt, för väntelistan (WP-23). */
export type Freed = { staffId: string; blocked: Interval };
