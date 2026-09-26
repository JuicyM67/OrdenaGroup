import { err, ok, type ParseResult } from "./result";

/** Belopp i hela chilenska pesos (heltal). */
export type Clp = number;

/** Största värde som ryms i Postgres `integer`. */
export const CLP_MAX = 2_147_483_647;

export type ClpError = "empty" | "invalid_format" | "out_of_range";

/** Minus som i designens "−20%" (U+2212). */
const MINUS = "−";

export function isClp(v: unknown): v is Clp {
  return (
    typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= CLP_MAX
  );
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * 18000 → "$18.000", -3000 → "−$3.000". Egen gruppering i stället för
 * Intl.NumberFormat, så att resultatet inte beror på ICU-versionen.
 * Kastar RangeError för annat än heltal inom ±CLP_MAX (programmeringsfel).
 */
export function formatClp(amount: number): string {
  if (!Number.isSafeInteger(amount) || Math.abs(amount) > CLP_MAX) {
    throw new RangeError(`formatClp: ogiltigt belopp ${String(amount)}`);
  }
  const body = "$" + groupThousands(String(Math.abs(amount)));
  return amount < 0 ? MINUS + body : body;
}

// Blanktecken som kan komma från inklistrad text (NBSP, smala mellanslag).
const SPACES = /\s/g; // \s täcker även U+00A0, U+2007 och U+202F
const PLAIN = /^\d+$/;
const GROUPED = /^\d{1,3}(?:\.\d{3})+$/;

/**
 * Formulärsträng → heltal CLP. Godtar "18000", "18.000", "$18.000",
 * "$ 18.000". Avvisar decimaler, fel gruppering och minus.
 */
export function parseClp(input: string): ParseResult<Clp, ClpError> {
  const trimmed = input.replace(SPACES, " ").trim();
  if (trimmed === "") return err("empty");

  let rest = trimmed;
  if (rest.startsWith("$")) rest = rest.slice(1).trimStart();
  if (!PLAIN.test(rest) && !GROUPED.test(rest)) return err("invalid_format");

  const digits = rest.replace(/\./g, "").replace(/^0+(?=\d)/, "");
  if (digits.length > String(CLP_MAX).length) return err("out_of_range");
  const value = Number(digits);
  if (value > CLP_MAX) return err("out_of_range");
  return ok(value);
}
