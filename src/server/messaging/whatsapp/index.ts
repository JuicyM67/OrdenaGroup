import "server-only";

/**
 * WhatsApp Cloud API (Meta, D-006/D-007/D-063). Allt utgående går via
 * `message_outbox` (regel 4) — workern (`outbox/worker.ts`) är den enda som
 * anropar `sendWhatsAppTemplate`. Webhooken: `webhook.ts`.
 */
export {
  approvedTemplates,
  META_TEMPLATE_NAMES,
  readWhatsAppEnv,
  whatsappSendMode,
  whatsappTemplateEnabled,
} from "./config";
export type { MetaTemplateName, WhatsAppEnv, WhatsAppSendMode } from "./config";
export { chooseCustomerChannel, whatsappPossible } from "./channel";
export {
  fakeWhatsAppOutbox,
  resetFakeWhatsAppOutbox,
  sendWhatsAppTemplate,
} from "./client";
export type { FakeWhatsAppMessage, SendWhatsAppResult } from "./client";
export { classifyWhatsAppError, WhatsAppSendError } from "./errors";
export { isChileanMobile, sameWhatsAppNumber } from "./phone";
export {
  computeWhatsAppSignature,
  safeTokenEqual,
  verifyWhatsAppSignature,
} from "./signature";
export { buildTemplate, parseButtonPayload } from "./templates";
export { processWhatsAppWebhook } from "./webhook";
export type { WhatsAppWebhookResult } from "./webhook";
