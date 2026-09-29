/**
 * Belopp per marknad (D-025): lagras i minsta enheten som heltal
 * (CLP: hela pesos, SEK: öre). Rena funktioner med `currency` som parameter
 * (`formatMoneyIn`/`parseMoneyIn`) och tunna wrappers med installationens
 * valuta (`formatMoney`/`parseMoney`).
 *
 * Egen gruppering i stället för Intl.NumberFormat, så att resultatet inte
 * beror på ICU-versionen (samma skäl som `formatClp`).
 */
import { marketConfig } from "@/config/market";

import { CLP_MAX, formatClp, parseClp, type ClpError } from "./clp";
import { err, ok, type ParseResult } from "./result";

export type Currency = "CLP" | "SEK";

/** Belopp i minsta enheten (CLP: pesos, SEK: öre), heltal. */
export type MoneyMinor = number;

/** Största värde som ryms i Postgres `integer` (samma för alla valutor). */
export const MONEY_MAX = CLP_MAX;

/** Samma felkoder som `parseClp` (i18n-nycklarna `validacion.clp.*`). */
export type MoneyError = ClpError;

const MINUS = "−";
/** Hårt mellanslag: som sv-SE (Intl) och så att beloppet inte radbryts. */
const NBSP = " ";

function groupWith(digits: string, sep: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/**
 * SEK i öre → "450 kr", "1 250 kr", "450,50 kr" (decimaler bara om det finns
 * öre), "−450 kr". Mellanslagen är hårda (U+00A0).
 */
export function formatSek(amountOre: number): string {
  if (!Number.isSafeInteger(amountOre) || Math.abs(amountOre) > MONEY_MAX) {
    throw new RangeError(`formatSek: ogiltigt belopp ${String(amountOre)}`);
  }
  const abs = Math.abs(amountOre);
  const kronor = Math.floor(abs / 100);
  const ore = abs % 100;
  const body =
    groupWith(String(kronor), NBSP) +
    (ore === 0 ? "" : "," + String(ore).padStart(2, "0")) +
    NBSP +
    "kr";
  return amountOre < 0 ? MINUS + body : body;
}

const SPACES = /\s/g; // \s täcker även U+00A0, U+2007 och U+202F
const SEK_SHAPE = /^(\d{1,3}(?: \d{3})+|\d+)(?:[,.](\d{1,2}))?$/;

/**
 * Formulärsträng → öre. Godtar "450", "450,50", "450,5", "450.50",
 * "1 250", "1 250 kr", "450:-" och "kr 450". Avvisar minus, fler än två
 * decimaler och fel gruppering.
 */
export function parseSek(input: string): ParseResult<MoneyMinor, MoneyError> {
  let rest = input.replace(SPACES, " ").trim();
  if (rest === "") return err("empty");
  rest = rest
    .replace(/^(?:kr|sek)\.?\s*/i, "")
    .replace(/\s*(?::-|kr\.?|sek)$/i, "")
    .trim();
  const m = SEK_SHAPE.exec(rest);
  if (!m) return err("invalid_format");
  const kronorDigits = m[1]!.replace(/ /g, "").replace(/^0+(?=\d)/, "");
  const ore = Number((m[2] ?? "").padEnd(2, "0"));
  if (kronorDigits.length > String(MONEY_MAX).length) {
    return err("out_of_range");
  }
  const value = Number(kronorDigits) * 100 + ore;
  if (value > MONEY_MAX) return err("out_of_range");
  return ok(value);
}

export function formatMoneyIn(currency: Currency, amountMinor: number): string {
  return currency === "SEK" ? formatSek(amountMinor) : formatClp(amountMinor);
}

export function parseMoneyIn(
  currency: Currency,
  input: string,
): ParseResult<MoneyMinor, MoneyError> {
  return currency === "SEK" ? parseSek(input) : parseClp(input);
}

/**
 * Minsta enheten → text för ett formulärfält (det som `parseMoneyIn` läser
 * tillbaka): CLP "18000", SEK "450" eller "450,50".
 */
export function moneyInputValueIn(
  currency: Currency,
  amountMinor: number,
): string {
  if (currency === "CLP") return String(amountMinor);
  const kronor = Math.trunc(amountMinor / 100);
  const ore = Math.abs(amountMinor % 100);
  return ore === 0
    ? String(kronor)
    : `${kronor},${String(ore).padStart(2, "0")}`;
}

/** Belopp i installationens valuta ("$18.000" / "450 kr"). */
export function formatMoney(amountMinor: number): string {
  return formatMoneyIn(marketConfig.currency, amountMinor);
}

/** Prisfält i installationens valuta → minsta enheten. */
export function parseMoney(input: string): ParseResult<MoneyMinor, MoneyError> {
  return parseMoneyIn(marketConfig.currency, input);
}

/** Minsta enheten → formulärtext i installationens valuta. */
export function moneyInputValue(amountMinor: number): string {
  return moneyInputValueIn(marketConfig.currency, amountMinor);
}
