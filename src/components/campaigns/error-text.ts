// Felkod → text för Campañas (WP-31, F14). Samma mönster som
// `src/components/settings/error-text.ts`: en okänd kod ger
// `comun.algoSalioMal` i stället för att krascha UI:t.
import { campanas, comun, planes } from "@/i18n";

const KNOWN: Record<string, string> = {
  forbidden: campanas.nueva.error.forbidden,
  invalid_input: campanas.nueva.error.invalid_input,
  no_recipients: campanas.nueva.error.no_recipients,
  rate_limited: campanas.nueva.error.rate_limited,
  unexpected: campanas.nueva.error.unexpected,
  // WP-73 (D-048)
  plan_locked: planes.errores.plan_locked,
};

export function campanaErrorText(code: string): string {
  return KNOWN[code] ?? comun.algoSalioMal;
}
