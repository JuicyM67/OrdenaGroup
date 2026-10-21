/**
 * Belopp (D-025): lagras i minsta enheten som heltal, CLP i hela pesos.
 * Tunna wrappers runt `clp.ts` så att appen inte behöver veta valutan.
 *
 * Egen gruppering i stället för Intl.NumberFormat, så att resultatet inte
 * beror på ICU-versionen (samma skäl som `formatClp`).
 */
import { CLP_MAX, formatClp, parseClp, type ClpError } from "./clp";
import type { ParseResult } from "./result";

/** Belopp i minsta enheten (CLP: pesos), heltal. */
export type MoneyMinor = number;

/** Största värde som ryms i Postgres `integer`. */
export const MONEY_MAX = CLP_MAX;

/** Samma felkoder som `parseClp` (i18n-nycklarna `validacion.clp.*`). */
export type MoneyError = ClpError;

/** Belopp i pesos ("$18.000"). */
export function formatMoney(amountMinor: number): string {
  return formatClp(amountMinor);
}

/** Prisfält → pesos. */
export function parseMoney(input: string): ParseResult<MoneyMinor, MoneyError> {
  return parseClp(input);
}

/** Pesos → formulärtext (det som `parseMoney` läser tillbaka): "18000". */
export function moneyInputValue(amountMinor: number): string {
  return String(amountMinor);
}
