/** Minus som i designens "−20%" (U+2212), samma som `formatClp`. */
const MINUS = "−";

/**
 * Procentenheter (heltal som `discount_pct`/`deposit_value`, inte andel):
 * 4 → "4%", -20 → "−20%". Avrundar till heltal (halva bort från noll).
 * Inget mellanslag före "%", som i designen ("4%" i Main).
 * Kastar RangeError för NaN/oändligt (programmeringsfel).
 */
export function formatPercent(points: number): string {
  if (!Number.isFinite(points)) {
    throw new RangeError(`formatPercent: ogiltigt värde ${String(points)}`);
  }
  const rounded = Math.round(Math.abs(points));
  if (rounded === 0) return "0%";
  return `${points < 0 ? MINUS : ""}${rounded}%`;
}
