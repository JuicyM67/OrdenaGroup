// WP-31 (F14) · Klienttyper för Campañas (`/app/clientes/utskick`). Speglar
// (duplicerar, inte importerar) `src/server/campaigns/send.ts`
// (integrations-engineer) — en "use client"-fil importerar aldrig något,
// inte ens bara typer, under `@/server/*` (samma regel som
// `src/components/customers/types.ts`s filkommentar). Håll de två filerna i
// synk för hand.

/** `campaigns.audience` (jsonb): vem som ska få utskicket. `days` bara för
 * `kind: "inactive"` (antal dagar sedan senaste besök), `customerIds` bara
 * för `kind: "selected"` (kundkortets "Enviar oferta", `?kunder=id,id`).
 * Samma diskriminerade union som `CampaignAudience`
 * (`src/server/campaigns/types.ts`). */
export type CampaignAudienceKind =
  "all" | "members" | "regulars" | "inactive" | "selected";

export type CampaignAudience =
  | { kind: "all" }
  | { kind: "members" }
  | { kind: "regulars" }
  | { kind: "inactive"; days: number }
  | { kind: "selected"; customerIds: string[] };

export type CampaignChannel = "email" | "sms";

export type CampaignInput = {
  name: string;
  channel: CampaignChannel;
  audience: CampaignAudience;
  message: string;
  offerPct?: number | null;
  offerText?: string | null;
  /** "YYYY-MM-DD". */
  offerValidUntil?: string | null;
};

export type PreviewCampaignResult =
  | {
      ok: true;
      recipients: number;
      skippedNoConsent: number;
      smsPartsPerMessage: number | null;
      smsTotal: number | null;
    }
  | { ok: false; code: string };

export type SendCampaignErrorCode =
  | "forbidden"
  | "invalid_input"
  | "no_recipients"
  | "sms_not_available"
  | "rate_limited"
  | "unexpected";

export type SendCampaignResult =
  | { ok: true; campaignId: string; queued: number }
  | { ok: false; code: SendCampaignErrorCode };

export type CampaignListItem = {
  id: string;
  name: string;
  channel: CampaignChannel;
  /** ISO 8601 UTC. */
  sentAt: string;
  recipients: number;
  /** Reservas hechas con el link de la oferta. */
  redeemed: number;
};

/** Para la audiencia "selected" (kundkortets "Enviar oferta"): nombre de
 * cada cliente elegido, solo para mostrar chips — el servidor vuelve a
 * resolver `customerIds` por su cuenta, esto es solo UI. */
export type SelectedCustomer = {
  id: string;
  name: string;
};
