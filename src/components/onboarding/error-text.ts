// Felkod (från client-validation.ts eller från servern, samma alfabet) → text. Samma
// mönster som src/components/booking/errors.ts (WP-13).
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
  "business.category_invalid": validacion.requerido,
  "business.slug_invalid": negocio.errores.slug_invalid,
  "business.slug_reserved": negocio.errores.slug_reserved,
  "business.slug_taken": negocio.errores.slug_taken,
  "services.name_empty": servicios.errores.nombreVacio,
  "services.duration_invalid": servicios.errores.duracionInvalida,
  "staff.name_empty": profesionales.errores.nombreVacio,
  "staff.service_index_out_of_range": comun.algoSalioMal,
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
export function onboardingErrorText(code: string): string {
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
