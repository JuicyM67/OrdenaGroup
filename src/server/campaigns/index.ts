import "server-only";

/**
 * WP-31 (F14): "Erbjudanden" (kampanjer) + "Te echamos de menos". Se
 * `docs/tasks/plans/WP-31-utskick.md` och `docs/decisions/DECISIONS.md`
 * (D-029/D-030, samma outbox-mönster som bokningsmeddelandena).
 */
export {
  countInactiveCustomers,
  listCampaigns,
  previewCampaign,
  sendCampaign,
} from "./send";
export type {
  PreviewCampaignResult,
  SendCampaignError,
  SendCampaignResult,
} from "./send";
export type {
  CampaignAudience,
  CampaignChannel,
  CampaignInput,
  CampaignListItem,
} from "./types";
export { findBajaTargetByToken, unsubscribeByToken } from "./baja";
export type { BajaTarget, UnsubscribeResult } from "./baja";
export { runWinback } from "./winback";
export type { RunWinbackResult } from "./winback";
