/**
 * Texterna för den publika hemsidan, valda per marknad (D-025, D-026).
 * Sidorna under (marketing) importerar härifrån, aldrig direkt från es-CL.
 * Beloppen kommer från `src/config/pricing.ts`, inte från texterna.
 */
import { market } from "@/config/brand";

import * as esCL from "./es-CL";
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

type PlanTexto = Omit<esCL.PlanLanding, "precioClp">;

export type MarketingCopy = Widen<
  Pick<
    typeof esCL,
    | "nav"
    | "estados"
    | "hoy"
    | "landing"
    | "sitio"
    | "SITIO_FUNCIONALIDADES"
    | "SITIO_PRECIOS_TABLA"
    | "SITIO_PARA_INDUSTRIAS"
    | "SITIO_RUBROS_MARQUEE"
  >
> & { readonly PLANES: readonly PlanTexto[] };

const cl: MarketingCopy = { ...esCL, PLANES: esCL.PLANES_LANDING };
const se: MarketingCopy = { ...svSE };

const copies: Record<typeof market, MarketingCopy> = { CL: cl, SE: se };

export const copy: MarketingCopy = copies[market];

/** HTML-attributet lang för marknaden. */
export const lang = market === "SE" ? "sv" : "es-CL";
