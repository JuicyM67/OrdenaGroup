/**
 * Klientvalidering utan Zod (samma mönster som WP-13:s `booking/client-validation.ts`):
 * Zod bunta inte med i klientkomponenten, den riktiga kontrollen är servern
 * (`src/server/onboarding/schemas.ts`). Felkoderna är samma strängar som servern
 * skickar (`onboardingErrorText` i `error-text.ts` mappar båda till samma text).
 */
import { parseMoney } from "@/lib/format/money";
import { parseLocalTime, type LocalTime } from "@/lib/format/dates";
import { parsePhone, phoneErrorKey, type E164 } from "@/lib/format/phone";

export type FieldResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: string };

const RESERVED_SLUGS = new Set([
  "app",
  "api",
  "r",
  "admin",
  "vendedor",
  "login",
  "design-lab",
  "_next",
  "www",
  "auth",
  "static",
  "assets",
  "support",
  "help",
  "docs",
  "blog",
  "legal",
  "terminos",
  "privacidad",
  // WP-67: kundkonton (CL /cuenta, SE /konto).
  "cuenta",
  "konto",
]);

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

/** Namn → slug-förslag: gemener, inga diakritiska tecken, bindestreck. */
export function slugify(raw: string): string {
  const base = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return base.length >= 3 ? base : "";
}

export function validateSlug(raw: string): FieldResult<string> {
  const v = raw.trim().toLowerCase();
  if (!SLUG_PATTERN.test(v))
    return { ok: false, code: "business.slug_invalid" };
  if (RESERVED_SLUGS.has(v))
    return { ok: false, code: "business.slug_reserved" };
  return { ok: true, value: v };
}

export function validateRequired(
  raw: string,
  code: string,
): FieldResult<string> {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, code };
  return { ok: true, value: trimmed };
}

export function validatePhone(raw: string): FieldResult<E164> {
  const r = parsePhone(raw, { allow: "mobile_or_fixed" });
  if (!r.ok) return { ok: false, code: `phone.${phoneErrorKey(r.error)}` };
  return { ok: true, value: r.value };
}

export function validatePriceClp(raw: string): FieldResult<number> {
  const r = parseMoney(raw);
  if (!r.ok) return { ok: false, code: `clp.${r.error}` };
  return { ok: true, value: r.value };
}

export function validateDurationMin(raw: string): FieldResult<number> {
  const trimmed = raw.trim();
  const n = Number(trimmed);
  if (trimmed === "" || !Number.isInteger(n) || n < 5 || n > 600) {
    return { ok: false, code: "services.duration_invalid" };
  }
  return { ok: true, value: n };
}

export function validateTimeRange(
  start: string,
  end: string,
): FieldResult<{ start: LocalTime; end: LocalTime }> {
  const s = parseLocalTime(start);
  if (!s.ok) return { ok: false, code: `time.${s.error}` };
  const e = parseLocalTime(end);
  if (!e.ok) return { ok: false, code: `time.${e.error}` };
  if (s.value >= e.value) {
    return { ok: false, code: "hours.business_hours_start_before_end" };
  }
  return { ok: true, value: { start: s.value, end: e.value } };
}
