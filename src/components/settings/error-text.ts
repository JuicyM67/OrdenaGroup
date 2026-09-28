// Felkod → text för Ajustes (WP-15b slim). Samma alfabet som onboarding
// (src/components/onboarding/error-text.ts) plus koderna som bara finns i Ajustes
// (src/server/owner/ajustes-schemas.ts). Ingen specifik copy finns än för
// min-notice/max-days/cancel-window/slot-interval → `comun.algoSalioMal` (närmaste
// befintliga nyckel, se rapporten).
import {
  comun,
  horarios,
  negocio,
  profesionales,
  servicios,
  validacion,
} from "@/i18n";
import type { PhoneError } from "@/lib/format/phone";

const PHONE_MESSAGES = validacion.telefonoNegocio satisfies Record<
  PhoneError | "invalid_type" | "invalid_format",
  string
>;

const CLP_MESSAGES = validacion.clp satisfies Record<
  "empty" | "invalid_format" | "out_of_range" | "invalid_type",
  string
>;

const TIME_MESSAGES = validacion.time satisfies Record<
  "invalid_format" | "out_of_range" | "invalid_type",
  string
>;

const KNOWN: Record<string, string> = {
  "business.name_empty": validacion.requerido,
  "business.name_invalid_type": validacion.requerido,
  "business.comuna_empty": validacion.requerido,
  "business.comuna_invalid_type": validacion.requerido,
  "business.slug_invalid": negocio.errores.slug_invalid,
  "business.slug_reserved": negocio.errores.slug_reserved,
  "business.slug_taken": negocio.errores.slug_taken,
  "business.address_too_long": comun.algoSalioMal,
  "business.min_notice_invalid": comun.algoSalioMal,
  "business.max_days_ahead_invalid": comun.algoSalioMal,
  "business.cancel_window_invalid": comun.algoSalioMal,
  "business.slot_interval_invalid": comun.algoSalioMal,
  "services.name_empty": servicios.errores.nombreVacio,
  "services.duration_invalid": servicios.errores.duracionInvalida,
  "services.buffer_invalid": servicios.errores.bufferInvalido,
  "staff.name_empty": profesionales.errores.nombreVacio,
  "hours.business_hours_start_before_end":
    horarios.errores.business_hours_start_before_end,
  "hours.business_hours_no_overlap": horarios.errores.business_hours_no_overlap,
  "hours.range_required": comun.algoSalioMal,
  "hours.weekday_duplicate": comun.algoSalioMal,
  invalid_input: comun.algoSalioMal,
  unauthorized: comun.algoSalioMal,
  unknown: comun.algoSalioMal,
};

/** En okänd kod ger `comun.algoSalioMal` i stället för att krascha UI:t. */
export function ajustesErrorText(code: string): string {
  const dot = code.indexOf(".");
  const prefix = dot === -1 ? "" : code.slice(0, dot);
  const suffix = dot === -1 ? "" : code.slice(dot + 1);

  if (prefix === "phone" && suffix in PHONE_MESSAGES) {
    return PHONE_MESSAGES[suffix as keyof typeof PHONE_MESSAGES];
  }
  if (prefix === "clp" && suffix in CLP_MESSAGES) {
    return CLP_MESSAGES[suffix as keyof typeof CLP_MESSAGES];
  }
  if (prefix === "time" && suffix in TIME_MESSAGES) {
    return TIME_MESSAGES[suffix as keyof typeof TIME_MESSAGES];
  }
  return KNOWN[code] ?? comun.algoSalioMal;
}
