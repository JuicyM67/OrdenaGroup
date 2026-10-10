// Klienttyper för Horas flash (/app/flash, WP-30). Speglar `src/server/flash/`
// (scheduling-engineer) — duplicerade, inte importerade: en "use client"-fil
// importerar aldrig något under `@/server/*` (samma regel som
// `src/components/agenda/manual-booking-dialog.tsx`s katalogtyp).
import type { LocalDate, LocalTime } from "@/lib/format/dates";

export type FlashStaff = { id: string; name: string };

/** Tjänster en profesional kan utföra, för "Servicios específicos"-läget i
 * dialogen (längden räknas ur den längsta valda tjänsten). */
export type FlashCatalogService = {
  id: string;
  name: string;
  durationMin: number;
  staffIds: readonly string[];
};

export type FlashSlotStatus = "active" | "booked";

export type FlashSlotView = {
  id: string;
  staffId: string;
  staffName: string;
  /** ISO 8601 (UTC eller med offset). */
  start: string;
  end: string;
  /** `null` = alla tjänster. */
  serviceNames: readonly string[] | null;
  discountPct: number;
  status: FlashSlotStatus;
};

export type CreateFlashSlotInput = {
  staffId: string;
  date: LocalDate;
  time: LocalTime;
  /** Antingen en fri längd (minuter)… */
  lengthMinutes?: number;
  /** …eller specifika tjänster (längden räknas ur den längsta av dem). */
  serviceIds?: string[];
  discountPct: number;
};

export type CreateFlashResult =
  | { ok: true; id: string }
  | {
      ok: false;
      code:
        "forbidden" | "not_free" | "overlap" | "invalid_input" | "plan_locked";
    };

export type CancelFlashResult = { ok: true } | { ok: false; code: string };

/** UX-granskning (sección "Blixttider"): speglar `FreeGap`
 * (`src/server/flash/gaps.ts`), samma dupliceringsmotiv som ovan. */
export type FlashGapView = {
  staffId: string;
  staffName: string;
  date: LocalDate;
  /** ISO 8601 (UTC eller med offset). */
  start: string;
  end: string;
};

// ---------------------------------------------------------------------------
// WP-30 "Enviar a clientes" — speglar `src/server/campaigns/types.ts`/
// `flash.ts` (integrations-engineer), samma dupliceringsmotiv som ovan.
// ---------------------------------------------------------------------------

export type FlashCampaignAudienceKind =
  "all" | "members" | "regulars" | "inactive";

export type FlashCampaignAudience =
  | { kind: "all" }
  | { kind: "members" }
  | { kind: "regulars" }
  | { kind: "inactive"; days: number };

export type FlashCampaignChannel = "email" | "sms";

export type SendFlashCampaignInput = {
  flashSlotId: string;
  channel: FlashCampaignChannel;
  audience: FlashCampaignAudience;
  message: string;
};

export type SendFlashCampaignResult =
  { ok: true; queued: number } | { ok: false; code: string };
