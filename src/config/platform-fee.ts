// Plattformens avgift på kundbetalningar online (Stripe Connect, D-044).
// Räknas som andel av beloppet per företagets plan, i baspunkter (100 = 1 %).
// Ägaren kan ändra nivåerna här utan annan kodändring; alla belopp är heltal
// i minsta enheten (SEK öre).
export type FeePlan = "free" | "emprende" | "equipo" | "local";

export const PLATFORM_FEE_BPS: Record<FeePlan, number> = {
  free: 100,
  emprende: 100,
  equipo: 100,
  local: 100,
};

/** Minsta belopp (öre) som går att ta betalt för online. Stripes golv för SEK
 * är 3,00 kr; vi sätter 5 kr så att avgiften aldrig blir meningslös. */
export const ONLINE_PAYMENT_MIN_MINOR = 500;

export function platformFeeBps(plan: string): number {
  return PLATFORM_FEE_BPS[plan as FeePlan] ?? PLATFORM_FEE_BPS.free;
}

/** Avgift i minsta enheten, avrundad nedåt (aldrig mer än avtalat) och aldrig
 * större än beloppet. */
export function platformFeeMinor(amountMinor: number, plan: string): number {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return 0;
  const fee = Math.floor((amountMinor * platformFeeBps(plan)) / 10_000);
  return Math.min(fee, amountMinor);
}
