/**
 * Zod-scheman för de primitiva formaten. Separat fil så att de rena
 * funktionerna kan användas i klienten utan Zod.
 *
 * Fel läggs till som `code: "custom"` med `message` = felkod med prefix
 * ("phone.not_mobile", "clp.out_of_range" …). Ingen spansk text här:
 * UI mappar koderna till strängar i `src/i18n/es-CL.ts`.
 */
import { z } from "zod";

import { CLP_MAX, parseClp, type Clp } from "./clp";
import {
  parseInstant,
  parseLocalDate,
  parseLocalTime,
  parseTimeZone,
  type LocalDate,
  type LocalTime,
  type TimeZone,
} from "./dates";
import { parseMoney, type MoneyMinor } from "./money";
import {
  isE164,
  parseChileanPhone,
  parsePhone,
  phoneErrorKey,
  type E164,
  type PhoneAllow,
  type PhoneError,
  type PhoneParseError,
} from "./phone";
import type { ParseResult } from "./result";
import { parseRut, type Rut } from "./rut";

type Prefix = "clp" | "rut" | "phone" | "date" | "time" | "instant" | "tz";

/** Sträng → värde via en parser; felkoden blir `${prefix}.${error}`. */
function fromParser<T, E extends string>(
  prefix: Prefix,
  parse: (s: string) => ParseResult<T, E>,
): z.ZodType<T, string> {
  return z
    .string({ error: `${prefix}.invalid_type` })
    .transform((s, ctx): T => {
      const r = parse(s);
      if (r.ok) return r.value;
      ctx.addIssue({ code: "custom", message: `${prefix}.${r.error}` });
      return z.NEVER;
    });
}

/** Heltal CLP, 0..CLP_MAX (server, DB). */
export const clpSchema: z.ZodType<Clp> = z
  .number({ error: "clp.invalid_type" })
  .check((ctx) => {
    const v = ctx.value;
    if (!Number.isSafeInteger(v)) {
      ctx.issues.push({
        code: "custom",
        message: "clp.invalid_format",
        input: v,
      });
    } else if (v < 0 || v > CLP_MAX) {
      ctx.issues.push({
        code: "custom",
        message: "clp.out_of_range",
        input: v,
      });
    }
  });

/** Formulärsträng → heltal CLP. */
export const clpInputSchema: z.ZodType<Clp, string> = fromParser(
  "clp",
  parseClp,
);

/** Redan normaliserat E.164 (server, DB). */
export const e164Schema: z.ZodType<E164> = z
  .string({ error: "phone.invalid_type" })
  .transform((s, ctx): E164 => {
    if (isE164(s)) return s;
    ctx.addIssue({ code: "custom", message: "phone.invalid_format" });
    return z.NEVER;
  });

/** Parserns felkod → i18n-nyckeln (`wrong_country` → `not_chilean`). */
function withPhoneKey(
  r: ParseResult<E164, PhoneParseError>,
): ParseResult<E164, PhoneError> {
  return r.ok ? r : { ok: false, error: phoneErrorKey(r.error) };
}

/** Kundens telefon (F5/F9) i installationens land: bara mobilnummer. */
export const mobileInputSchema: z.ZodType<E164, string> = fromParser(
  "phone",
  (s) => withPhoneKey(parsePhone(s)),
);

/** Företagets telefon (F1) i installationens land: mobil eller fast. */
export const phoneInputSchema: z.ZodType<E164, string> = fromParser(
  "phone",
  (s) => withPhoneKey(parsePhone(s, { allow: "mobile_or_fixed" })),
);

function chilean(allow: PhoneAllow): z.ZodType<E164, string> {
  return fromParser("phone", (s) =>
    withPhoneKey(parseChileanPhone(s, { allow })),
  );
}

/** Bara chilenska mobilnummer, oavsett marknad. Appen använder `mobileInputSchema`. */
export const chileanMobileInputSchema = chilean("mobile");

/** Bara chilenska nummer, oavsett marknad. Appen använder `phoneInputSchema`. */
export const chileanPhoneInputSchema = chilean("mobile_or_fixed");

/**
 * Prisfält i installationens valuta → minsta enheten (CLP: pesos, SEK: öre).
 * Felkoderna har prefixet "clp" (samma i18n-nycklar, `validacion.clp.*`).
 */
export const moneyInputSchema: z.ZodType<MoneyMinor, string> = fromParser(
  "clp",
  parseMoney,
);

export const rutInputSchema: z.ZodType<Rut, string> = fromParser(
  "rut",
  parseRut,
);

export const localDateSchema: z.ZodType<LocalDate, string> = fromParser(
  "date",
  parseLocalDate,
);

/** "HH:mm" eller "HH:mm:ss" (00 sekunder), 00:00–23:59. */
export const localTimeSchema: z.ZodType<LocalTime, string> = fromParser(
  "time",
  (s) => parseLocalTime(s),
);

/** Som localTimeSchema men godtar "24:00" som slut (öppettider). */
export const localEndTimeSchema: z.ZodType<LocalTime, string> = fromParser(
  "time",
  (s) => parseLocalTime(s, { allowEndOfDay: true }),
);

export const timeZoneSchema: z.ZodType<TimeZone, string> = fromParser(
  "tz",
  parseTimeZone,
);

/** ISO 8601/Postgres-text med Z eller offset → Date. */
export const instantSchema: z.ZodType<Date, string> = fromParser(
  "instant",
  parseInstant,
);
