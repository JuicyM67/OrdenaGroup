// WP-76 (D-053): sms-krediter i SE. Paket och priser bestäms HÄR (servern),
// aldrig av klienten. Belopp i öre (minsta enheten, D-025), exkl. moms.
// `sms_credit_purchases.package_size` har samma lista som check i databasen
// (20261012010000_sms_credits.sql) — `sms-credits.test.ts` håller dem lika.

export type SmsCreditPackage = {
  /** Antal krediter (1 kredit = 1 sms-segment). */
  readonly credits: 100 | 250 | 500 | 1000;
  /** Pris exkl. moms, öre. */
  readonly netOre: number;
  /** Rabatt mot 1 kr/sms, öre (0 = ingen). */
  readonly savingOre: number;
};

export const SMS_CREDIT_PACKAGES: readonly SmsCreditPackage[] = [
  { credits: 100, netOre: 10_000, savingOre: 0 },
  { credits: 250, netOre: 25_000, savingOre: 0 },
  { credits: 500, netOre: 45_000, savingOre: 5_000 },
  { credits: 1000, netOre: 90_000, savingOre: 10_000 },
];

export const SMS_CREDIT_PACKAGE_SIZES = SMS_CREDIT_PACKAGES.map(
  (p) => p.credits,
);

/** Moms 25 % (svensk standardmoms), i baspunkter. */
export const SMS_CREDIT_VAT_BPS = 2500;

/** Giltighet per köp. */
export const SMS_CREDIT_VALIDITY_MONTHS = 12;

/** Varning när så här stor andel av månadens kvot är använd. */
export const SMS_QUOTA_WARN_RATIO = 0.8;

export function smsCreditPackage(
  credits: number,
): SmsCreditPackage | undefined {
  return SMS_CREDIT_PACKAGES.find((p) => p.credits === credits);
}

export type SmsCreditPrice = {
  readonly netOre: number;
  readonly vatOre: number;
  readonly totalOre: number;
};

/** Pris för ett paket: netto, moms (avrundad till hela öre) och totalt. */
export function smsCreditPrice(pkg: SmsCreditPackage): SmsCreditPrice {
  const vatOre = Math.round((pkg.netOre * SMS_CREDIT_VAT_BPS) / 10_000);
  return { netOre: pkg.netOre, vatOre, totalOre: pkg.netOre + vatOre };
}
