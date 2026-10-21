// De tekniska värdena för Chile (D-025, D-062): tidszon, valuta, telefonland
// och språk. Repot kör bara Chile; värdena är konstanter.
export const marketConfig = {
  /** IANA-tidszon som all logik resonerar i. */
  timeZone: "America/Santiago",
  /** ISO 4217. Lagras i hela pesos (inga decimaler). */
  currency: "CLP",
  /** ISO 3166-1 alfa-2 för telefonnummer. */
  phoneCountry: "CL",
  /** BCP 47, styr namn på veckodagar/månader och talformat. */
  locale: "es-CL",
} as const;

export type MarketConfig = typeof marketConfig;
