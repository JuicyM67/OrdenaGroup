import "server-only";

import type { Market } from "@/config/brand";
import * as Es from "@/i18n/es-CL";
import * as Sv from "@/i18n/sv-SE.app";

/** Samma mönster som `src/server/messaging/email/content.ts` — direkta
 * imports av `es-CL`/`sv-SE.app` (inte `@/i18n`), så både CL och SE kan
 * renderas i samma process (design lab, tester). */
export function smsNs(market: Market) {
  return market === "SE" ? Sv.sms : Es.sms;
}
