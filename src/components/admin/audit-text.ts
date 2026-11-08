// Registret i /admin (`private.admin_audit_log`) som läsbar text: åtgärdens
// nyckel ("set_plan") → etikett, `details` (bara id:n/koder, regel 7) → t.ex.
// "Plan: Local · Sin fecha de término". Okända åtgärder och nycklar visas
// som de är, så att en ny loggrad aldrig försvinner ur listan.
import { adminPanel, planes } from "@/i18n";

const t = adminPanel.registro;
const ACCIONES: Readonly<Record<string, string>> = t.acciones;
const CAMPOS: Readonly<Record<string, string>> = t.campos;
const MODOS: Readonly<Record<string, string>> = t.modos;
const PLANES: Readonly<Record<string, string>> = planes.nombres;

/** Interna id:n som inte säger något i listan. */
const OCULTAS = new Set(["invitation_id", "reviewId"]);

/** `business_place` loggar bara VILKA fält som ändrades (booleans). */
const LUGAR = ["rubro", "comuna", "address"] as const;

export type AuditEntryLike = {
  readonly action: string;
  readonly details: Record<string, unknown> | null;
};

/** Tar raden (eller bara nyckeln): `set_marketplace_hidden` blir "Ocultó
 * de Descubre"/"Mostró en Descubre" efter `details.hidden`. */
export function auditActionText(entry: string | AuditEntryLike): string {
  const action = typeof entry === "string" ? entry : entry.action;
  if (typeof entry !== "string" && action === "set_marketplace_hidden") {
    const hidden = entry.details?.hidden;
    if (hidden === true) return t.descubreOculto;
    if (hidden === false) return t.descubreVisible;
  }
  return ACCIONES[action] ?? action;
}

function valueText(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? t.si : t.no;
  if (typeof v === "string" || typeof v === "number") return String(v);
  return JSON.stringify(v);
}

function label(key: string): string {
  return CAMPOS[key] ?? key;
}

/** `override_until` sparas som UTC-midnatt för det valda datumet: visa
 * datumdelen som den är ("2026-12-31T00:00:00Z" → "31-12-2026"). */
function untilText(v: unknown): string {
  if (typeof v !== "string" || v === "") return t.sinFecha;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m ? t.hasta({ fecha: `${m[3]}-${m[2]}-${m[1]}` }) : v;
}

function detailText(key: string, value: unknown): string {
  switch (key) {
    case "plan":
      return `${label(key)}: ${
        typeof value === "string" ? (PLANES[value] ?? value) : valueText(value)
      }`;
    case "override_until":
      return untilText(value);
    case "custom_limits":
      if (
        value &&
        typeof value === "object" &&
        typeof (value as { staff?: unknown }).staff === "number"
      ) {
        return `${label("staff_acordado")}: ${(value as { staff: number }).staff}`;
      }
      return `${label(key)}: ${valueText(value)}`;
    case "billing_mode":
      return `${label(key)}: ${
        typeof value === "string" ? (MODOS[value] ?? value) : valueText(value)
      }`;
    case "has_note":
      return value === true ? t.conNota : t.sinNota;
    case "created_account":
      return value === true ? t.cuentaNueva : t.cuentaExistente;
    case "slug":
      return `${label(key)}: /${valueText(value)}`;
    default:
      return `${label(key)}: ${valueText(value)}`;
  }
}

/** Detaljerna som en rad, "" om det inte finns något att visa. */
export function auditDetailsText(entry: AuditEntryLike): string {
  const details = entry.details ?? {};
  // `hidden` syns redan i åtgärdstexten ("Ocultó de Descubre").
  if (
    entry.action === "set_marketplace_hidden" &&
    typeof details.hidden === "boolean"
  ) {
    return "";
  }
  if (
    entry.action === "business_place" &&
    LUGAR.some((k) => typeof details[k] === "boolean")
  ) {
    const changed = LUGAR.filter((k) => details[k] === true).map(label);
    return changed.length
      ? t.cambios({ campos: changed.join(", ") })
      : t.sinCambios;
  }
  return Object.entries(details)
    .filter(([key]) => !OCULTAS.has(key))
    .map(([key, value]) => detailText(key, value))
    .join(" · ");
}
