// Marknadsvärden per installation (D-025). Marknaden väljs i brand.ts
// (NEXT_PUBLIC_MARKET, CL som standard); här finns bara de tekniska värdena.
import { market, type Market } from "./brand";

export type { Market };

export type MarketConfig = {
  /** IANA-tidszon som all logik resonerar i. */
  readonly timeZone: "America/Santiago" | "Europe/Stockholm";
  /** ISO 4217. */
  readonly currency: "CLP" | "SEK";
  /** Decimaler i minsta enheten: CLP lagras i hela pesos, SEK i öre. */
  readonly minorUnits: 0 | 2;
  /** ISO 3166-1 alfa-2 för telefonnummer. */
  readonly phoneCountry: "CL" | "SE";
  /** BCP 47, styr namn på veckodagar/månader och talformat. */
  readonly locale: "es-CL" | "sv-SE";
};

export const MARKETS = {
  CL: {
    timeZone: "America/Santiago",
    currency: "CLP",
    minorUnits: 0,
    phoneCountry: "CL",
    locale: "es-CL",
  },
  SE: {
    timeZone: "Europe/Stockholm",
    currency: "SEK",
    minorUnits: 2,
    phoneCountry: "SE",
    locale: "sv-SE",
  },
} as const satisfies Record<Market, MarketConfig>;

export function getMarketConfig(m: Market): MarketConfig {
  return MARKETS[m];
}

/** Konfigurationen för den här installationen. */
export const marketConfig: MarketConfig = MARKETS[market];
