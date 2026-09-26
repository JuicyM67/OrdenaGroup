import { err, ok, type ParseResult } from "./result";

/** Kanonisk RUT: "12345678-5", versal K, utan punkter och inledande nollor. */
export type Rut = string & { readonly __brand: "Rut" };

export type RutError =
  "empty" | "invalid_format" | "invalid_check_digit" | "out_of_range";

export type RutCheckDigit =
  "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "K";

const BODY_MAX = 99_999_999;

/** Kontrollsiffra enligt modulo 11 (faktorer 2–7 från höger). */
export function rutCheckDigit(body: number): RutCheckDigit {
  if (!Number.isSafeInteger(body) || body < 1 || body > BODY_MAX) {
    throw new RangeError(`rutCheckDigit: ogiltig kropp ${String(body)}`);
  }
  let sum = 0;
  let factor = 2;
  for (let n = body; n > 0; n = Math.floor(n / 10)) {
    sum += (n % 10) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const r = 11 - (sum % 11);
  if (r === 11) return "0";
  if (r === 10) return "K";
  return String(r) as RutCheckDigit;
}

const SPACES = /\s/g; // \s täcker även U+00A0, U+2007 och U+202F
const SHAPE = /^([0-9.]+)-?([0-9Kk])$/;

/**
 * Godtar punkter, mellanslag, med eller utan bindestreck, gemen k och
 * inledande nollor. Kroppen får vara 1–99 999 999.
 */
export function parseRut(input: string): ParseResult<Rut, RutError> {
  const compact = input.replace(SPACES, "");
  if (compact === "") return err("empty");

  const m = SHAPE.exec(compact);
  if (!m) return err("invalid_format");
  const bodyRaw = (m[1] ?? "").replace(/\./g, "");
  const dv = (m[2] ?? "").toUpperCase();
  if (bodyRaw === "") return err("invalid_format");

  const bodyDigits = bodyRaw.replace(/^0+/, "");
  if (bodyDigits === "" || bodyDigits.length > 8) return err("out_of_range");
  const body = Number(bodyDigits);
  if (body < 1 || body > BODY_MAX) return err("out_of_range");

  if (rutCheckDigit(body) !== dv) return err("invalid_check_digit");
  return ok(`${body}-${dv}` as Rut);
}

/** "1000005-K" → "1.000.005-K". */
export function formatRut(rut: Rut): string {
  const [body = "", dv = ""] = rut.split("-");
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
}
