// Vy-modell för /app/solicitudes/[id] (WP-56): mobil först, öppnas från
// sms/mejl-länken (`/app/solicitudes/{id}`). Rena värden bara: `start` som
// ISO 8601 med offset, text bara via `@/i18n` i komponenten.
//
// Speglar `RequestDetail` (`src/server/owner/requests.ts`, scheduling-
// engineer), duplicerat — samma motiv som `AgendaBooking`/`TodayBooking`/
// `HoyBooking`: en "use client"-fil importerar aldrig något under
// `@/server/*`, inte ens bara typer (boundaries-regeln).
import type { Database } from "@/types/database";

export type SolicitudKind = "booking" | "cancel";
export type SolicitudBookingStatus =
  Database["public"]["Enums"]["booking_status"];

export type SolicitudDetail = {
  readonly kind: SolicitudKind;
  readonly customerName: string;
  readonly serviceName: string;
  readonly staffName: string;
  /** ISO 8601 med offset. */
  readonly start: string;
  readonly status: SolicitudBookingStatus;
};

export type SolicitudActionResult =
  { readonly ok: true } | { readonly ok: false; readonly error?: string };
