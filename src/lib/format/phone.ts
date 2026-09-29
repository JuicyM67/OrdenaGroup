import { marketConfig } from "@/config/market";

import { err, ok, type ParseResult } from "./result";

/** Telefonnummer i E.164, t.ex. "+56912345678". */
export type E164 = string & { readonly __brand: "E164" };

/** Land vars nummer godtas (`marketConfig.phoneCountry`). */
export type PhoneCountry = "CL" | "SE";

/** Felkod från parsrarna (marknadsneutral). */
export type PhoneParseError =
  | "empty"
  | "invalid_chars"
  | "wrong_country"
  | "invalid_length"
  | "not_mobile"
  | "invalid_prefix";

/**
 * Felkoden som UI och Zod-scheman visar, samma nycklar som i18n
 * (`errores.reserva.telefono`, `validacion.telefono*`). Där heter
 * `wrong_country` fortfarande `not_chilean`; `phoneErrorKey` översätter.
 */
export type PhoneError =
  Exclude<PhoneParseError, "wrong_country"> | "not_chilean";

/** Parserns felkod → i18n-nyckeln (se `PhoneError`). */
export function phoneErrorKey(e: PhoneParseError): PhoneError {
  return e === "wrong_country" ? "not_chilean" : e;
}

export type PhoneAllow = "mobile" | "mobile_or_fixed";

/** Samma mönster som DB-checken i DATA_MODEL. */
export const E164_PATTERN = /^\+[1-9][0-9]{7,14}$/;

export function isE164(v: string): v is E164 {
  return E164_PATTERN.test(v);
}

// Separatorer som godtas i inmatning. \s täcker även NBSP (U+00A0), U+2007
// och U+202F (t.ex. från WhatsApp).
const SEPARATORS = /[\s\-.()]/g;

/**
 * Chilenskt nummer → E.164. Standard: bara mobil (9 siffror som börjar på 9).
 * Med `allow: "mobile_or_fixed"` godtas även fasta nummer (9 siffror som
 * börjar på 2–7, utom specialserien 60x). Gamla 8-siffriga nummer gissas inte.
 * Ogiltigt prefix ger `not_mobile` i mobilläget och `invalid_prefix` i läget
 * `mobile_or_fixed`.
 */
export function parseChileanPhone(
  input: string,
  opts?: { allow?: PhoneAllow },
): ParseResult<E164, PhoneParseError> {
  const allow = opts?.allow ?? "mobile";
  const compact = input.replace(SEPARATORS, "");
  if (compact === "") return err("empty");
  if (!/^\+?\d+$/.test(compact)) return err("invalid_chars");

  let national: string;
  if (compact.startsWith("+")) {
    if (!compact.startsWith("+56")) return err("wrong_country");
    national = compact.slice(3);
  } else if (compact.startsWith("00")) {
    if (!compact.startsWith("0056")) return err("wrong_country");
    national = compact.slice(4);
  } else if (compact.length === 11 && compact.startsWith("56")) {
    national = compact.slice(2);
  } else {
    national = compact;
  }

  if (national.length !== 9) return err("invalid_length");

  const isMobile = national.startsWith("9");
  const isFixed = /^[2-7]/.test(national) && !national.startsWith("60");
  if (allow === "mobile") {
    if (!isMobile) return err("not_mobile");
  } else if (!isMobile && !isFixed) {
    return err("invalid_prefix");
  }
  return ok(`+56${national}` as E164);
}

/**
 * Svenskt nummer → E.164. Standard: bara mobil (07x xxx xx xx, +46 7x…:
 * 9 siffror efter 46 som börjar på 7). Med `allow: "mobile_or_fixed"` godtas
 * även fasta nummer 0[1-9]… med 7–9 siffror efter nollan. Inmatning med
 * landsnummer får ha kvar nollan ("+46 (0)70 …"). Ogiltigt prefix ger
 * `not_mobile` i mobilläget och `invalid_prefix` i läget `mobile_or_fixed`.
 */
export function parseSwedishPhone(
  input: string,
  opts?: { allow?: PhoneAllow },
): ParseResult<E164, PhoneParseError> {
  const allow = opts?.allow ?? "mobile";
  const compact = input.replace(SEPARATORS, "");
  if (compact === "") return err("empty");
  if (!/^\+?\d+$/.test(compact)) return err("invalid_chars");

  let national: string;
  if (compact.startsWith("+")) {
    if (!compact.startsWith("+46")) return err("wrong_country");
    national = compact.slice(3);
  } else if (compact.startsWith("00")) {
    if (!compact.startsWith("0046")) return err("wrong_country");
    national = compact.slice(4);
  } else if (compact.length === 11 && compact.startsWith("467")) {
    national = compact.slice(2);
  } else {
    national = compact;
  }
  // Nationellt prefix 0 ("070 …", eller "+46 (0)70 …").
  if (national.startsWith("0")) national = national.slice(1);

  if (national.startsWith("0")) return err("invalid_prefix");
  if (national.startsWith("7")) {
    if (national.length !== 9) return err("invalid_length");
    return ok(`+46${national}` as E164);
  }
  if (allow === "mobile") {
    return national.length < 7 || national.length > 9
      ? err("invalid_length")
      : err("not_mobile");
  }
  if (national.length < 7 || national.length > 9) return err("invalid_length");
  return ok(`+46${national}` as E164);
}

/** Nummer för `country` (standard: installationens marknad) → E.164. */
export function parsePhoneFor(
  country: PhoneCountry,
  input: string,
  opts?: { allow?: PhoneAllow },
): ParseResult<E164, PhoneParseError> {
  return country === "SE"
    ? parseSwedishPhone(input, opts)
    : parseChileanPhone(input, opts);
}

/** `parsePhoneFor` med installationens land (`marketConfig.phoneCountry`). */
export function parsePhone(
  input: string,
  opts?: { allow?: PhoneAllow },
): ParseResult<E164, PhoneParseError> {
  return parsePhoneFor(marketConfig.phoneCountry, input, opts);
}

/**
 * "+46 70 123 45 67" (svensk mobil).
 * "+56 9 1234 5678" (mobil), "+56 2 2123 4567" (Santiago),
 * "+56 32 212 3456" (regionalt). Andra nummer returneras oförändrade.
 */
export function formatPhone(p: E164): string {
  const se = swedishMobileNational(p);
  if (se !== null) {
    return `+46 ${se.slice(0, 2)} ${se.slice(2, 5)} ${se.slice(5, 7)} ${se.slice(7)}`;
  }
  const n = chileanNational(p);
  if (n === null) return p;
  if (n.startsWith("9") || n.startsWith("2")) {
    return `+56 ${n.slice(0, 1)} ${n.slice(1, 5)} ${n.slice(5)}`;
  }
  return `+56 ${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`;
}

const DOT = "•";

/**
 * "+56 9 •••• 4821", "+46 70 ••• 48 21" (EventPopover). Visar aldrig
 * mittsiffrorna; används även i loggar.
 */
export function maskPhone(p: E164): string {
  const last4 = p.slice(-4);
  const se = swedishMobileNational(p);
  if (se !== null) {
    return `+46 ${se.slice(0, 2)} ${DOT.repeat(3)} ${last4.slice(0, 2)} ${last4.slice(2)}`;
  }
  const n = chileanNational(p);
  if (n === null) return `+${DOT.repeat(4)} ${last4}`;
  if (n.startsWith("9") || n.startsWith("2")) {
    return `+56 ${n.slice(0, 1)} ${DOT.repeat(4)} ${last4}`;
  }
  return `+56 ${n.slice(0, 2)} ${DOT.repeat(3)} ${last4}`;
}

function chileanNational(p: string): string | null {
  return /^\+56\d{9}$/.test(p) ? p.slice(3) : null;
}

function swedishMobileNational(p: string): string | null {
  return /^\+467\d{8}$/.test(p) ? p.slice(3) : null;
}
