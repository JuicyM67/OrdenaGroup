// Felkod → text för Ajustes (WP-15b slim). Samma alfabet som onboarding
// (src/components/onboarding/error-text.ts) plus koderna som bara finns i Ajustes
// (src/server/owner/ajustes-schemas.ts). Ingen specifik copy finns än för
// min-notice/max-days/cancel-window/slot-interval → `comun.algoSalioMal` (närmaste
// befintliga nyckel, se rapporten).
import {
  comun,
  equipo,
  errores,
  horarios,
  negocio,
  perfil,
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
  // WP-45 (D-033): typfel bara (växel), ingen egen copy — samma mönster.
  "business.auto_confirm_invalid": comun.algoSalioMal,
  // WP-56: ett `<select>` begränsar redan värdena i UI:t — samma avvägning.
  "business.cancel_approval_invalid": comun.algoSalioMal,
  // WP-54 (Ajustes → Socios): samma avvägning, ingen egen copy för dessa
  // sällan träffade valideringsfel (fältens `min`/`max`/`maxLength` i UI:t
  // hindrar normalt att de ens skickas).
  "member.enabled_invalid": comun.algoSalioMal,
  "member.discount_invalid": comun.algoSalioMal,
  "member.benefit_invalid_type": comun.algoSalioMal,
  "member.benefit_too_long": comun.algoSalioMal,
  // WP-31 (Ajustes → Socios y envíos → "Te echamos de menos"): misma
  // avvägning que `member.*` arriba — camperos `min`/`max`/`maxLength` en el
  // formulario evitan normalmente que se manden.
  "winback.enabled_invalid": comun.algoSalioMal,
  "winback.days_invalid": comun.algoSalioMal,
  "winback.message_invalid_type": comun.algoSalioMal,
  "winback.message_too_long": comun.algoSalioMal,
  "winback.offer_pct_invalid": comun.algoSalioMal,
  "winback.offer_days_invalid": comun.algoSalioMal,
  "services.name_empty": servicios.errores.nombreVacio,
  "services.duration_invalid": servicios.errores.duracionInvalida,
  "services.buffer_invalid": servicios.errores.bufferInvalido,
  // WP-41
  "services.description_too_long": servicios.errores.descripcionMuyLarga,
  "staff.name_empty": profesionales.errores.nombreVacio,
  "hours.business_hours_start_before_end":
    horarios.errores.business_hours_start_before_end,
  "hours.business_hours_no_overlap": horarios.errores.business_hours_no_overlap,
  "hours.range_required": comun.algoSalioMal,
  "hours.weekday_duplicate": comun.algoSalioMal,
  // WP-41 (src/lib/validation/profile.ts): sin copy específico todavía para
  // about/instagram/título → `comun.algoSalioMal` (mismo patrón que
  // `business.address_too_long` arriba); las imágenes sí tienen copy propio
  // en `perfil.ajustes.errores`.
  "staff.title_too_long": comun.algoSalioMal,
  "profile.about_too_long": comun.algoSalioMal,
  "profile.instagram_invalid": comun.algoSalioMal,
  "profile.tiktok_invalid": comun.algoSalioMal,
  "profile.facebook_invalid": comun.algoSalioMal,
  "profile.image_kind_invalid": comun.algoSalioMal,
  "profile.image_type_invalid": perfil.ajustes.errores.tipoInvalido,
  "profile.image_size_invalid": perfil.ajustes.errores.demasiadoGrande,
  "profile.image_too_large": perfil.ajustes.errores.demasiadoGrande,
  "profile.gallery_full": perfil.ajustes.errores.maxImagenes,
  "profile.upload_failed": perfil.ajustes.errores.subidaFallida,
  "profile.upload_missing": perfil.ajustes.errores.subidaFallida,
  "profile.image_url_invalid": comun.algoSalioMal,
  "profile.text_invalid_type": comun.algoSalioMal,
  invalid_input: comun.algoSalioMal,
  unauthorized: comun.algoSalioMal,
  unknown: comun.algoSalioMal,
  // WP-46 steg 6: Ajustes → Equipo (invitar/reenviar/revocar/editar permisos).
  forbidden: errores.permiso.generico,
  "invitation.email_invalid": equipo.invitarDialog.errores.emailInvalido,
  "invitation.name_invalid_type": comun.algoSalioMal,
  "invitation.name_empty": comun.algoSalioMal,
  "invitation.name_too_long": comun.algoSalioMal,
  staff_not_found: equipo.invitarDialog.errores.profesionalRequerido,
  invitation_pending: equipo.invitarDialog.errores.profesionalYaTieneCuenta,
  plan_limit_reached: equipo.limiteDelPlan.texto,
  not_found: comun.algoSalioMal,
  already_accepted: comun.algoSalioMal,
  already_revoked: comun.algoSalioMal,
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
