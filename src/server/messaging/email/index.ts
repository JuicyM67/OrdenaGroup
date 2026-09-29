import "server-only";

export {
  renderEmail,
  EMAIL_TEMPLATE_KIND,
  EMAIL_TEMPLATE_NAMES,
} from "./render";
export type { EmailTemplateMap, EmailTemplateName } from "./render";
export { sendEmail, fakeEmailOutbox, resetFakeEmailOutbox } from "./send";
export type { SendEmailEnv, SendEmailInput, SendEmailResult } from "./send";
export type { BookingCardData, EmailKind, RenderedEmail } from "./types";
