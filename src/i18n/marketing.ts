/**
 * Texterna för den publika hemsidan, valda per marknad (D-025, D-026).
 * Sidorna under (marketing) importerar härifrån, aldrig direkt från es-CL.
 * Beloppen kommer från `src/config/pricing.ts`, inte från texterna.
 */
import { market } from "@/config/brand";

import { estados, hoy, nav } from "./es-CL";
import * as esCLSitio from "./es-CL.marketing";
import * as svSE from "./sv-SE";

/** Samma form som es-CL men med vanliga string/number/boolean i stället för literaler. */
type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends (...args: infer A) => infer R
        ? (...args: A) => Widen<R>
        : T extends readonly (infer U)[]
          ? readonly Widen<U>[]
          : T extends object
            ? { readonly [K in keyof T]: Widen<T[K]> }
            : T;

type PlanTexto = Omit<esCLSitio.PlanLanding, "precioClp">;

export type MarketingCopy = Widen<
  { nav: typeof nav; estados: typeof estados; hoy: typeof hoy } & Pick<
    typeof esCLSitio,
    | "landing"
    | "sitio"
    | "SITIO_FUNCIONALIDADES"
    | "SITIO_PRECIOS_TABLA"
    | "SITIO_PARA_INDUSTRIAS"
    | "SITIO_RUBROS_MARQUEE"
  >
> & { readonly PLANES: readonly PlanTexto[] };

// Namngivna importer (inte `import * as`): en namnrymdsimport av es-CL gör att
// bundlern behåller alla exporter överallt, även i appens JS (budget /r, FRÅGA 7).
const cl: MarketingCopy = {
  nav,
  estados,
  hoy,
  ...esCLSitio,
  PLANES: esCLSitio.PLANES_LANDING,
};
const se: MarketingCopy = { ...svSE };

const copies: Record<typeof market, MarketingCopy> = { CL: cl, SE: se };

export const copy: MarketingCopy = copies[market];

/** HTML-attributet lang för marknaden. */
export const lang = market === "SE" ? "sv" : "es-CL";
