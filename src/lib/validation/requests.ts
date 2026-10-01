/**
 * WP-45 (D-033): delat mellan servern (`src/server/owner/requests.ts`,
 * `ownerDecisionRequestSchema`) och komponenterna (klockan, Inicio-listan,
 * `RechazarDialog`) — ingen server-only-import, så "use client"-filer får
 * importera härifrån.
 */

/** Ägarens valfria motiv när en förfrågan nekas (→ `motivo` i
 * `solicitudRechazada`). Samma gräns i dialogen och i schemat. */
export const DECLINE_REASON_MAX = 300;

export type PendingRequestKind = "booking" | "cancel";

/** En väntande förfrågan i klockan/Inicio-listan (`listPendingRequests`). */
export type PendingRequestItem = {
  readonly id: string;
  /** WP-56: `booking` = bokningsförfrågan (`requested`, Bekräfta/Neka),
   * `cancel` = avbokningsförfrågan (`cancel_requested`, Godkänn/Neka).
   * Servern sätter den alltid; valfri bara så att äldre fixturer/tester
   * fortsätter gälla — saknas = `booking`. */
  readonly kind?: PendingRequestKind;
  readonly clientName: string;
  readonly service: string;
  /** ISO 8601 med offset. */
  readonly start: string;
};
