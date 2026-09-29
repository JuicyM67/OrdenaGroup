import "server-only";

import type { Market } from "@/config/brand";
import * as Es from "@/i18n/es-CL";
import * as Sv from "@/i18n/sv-SE.app";

/**
 * Texterna kommer alltid från `src/i18n/` (copywriter-es-cl äger den mappen,
 * regel hård 6) — den här filen väljer bara RÄTT marknads modul och slår upp
 * fälten mallarna behöver. Direkta imports av `es-CL`/`sv-SE.app` (inte
 * `@/i18n`, som bakas in per marknad vid bygget via `i18n-locale`, se
 * `src/i18n/index.ts`): mejl-renderaren och testerna behöver kunna rendera
 * BÅDA marknaderna i samma process (design lab, `*.test.ts`), samma mönster
 * som `src/i18n/auth.ts`.
 */
function forMarket<T>(market: Market, cl: T, se: T): T {
  return market === "SE" ? se : cl;
}

/** `email.*` (WP-03/copywriter-es-cl): de fyra bokningsmejlen (`cuerpo` i
 * ren text), `comun` (hälsning/fot/knapptexter delade av mallarna nedan),
 * `bienvenida`, `nuevaReservaDueno`, `cancelacionDueno`, `listaEsperaCupo`,
 * `horaFlash` och `acceso` (link mágico/confirmación). */
export function emailNs(market: Market) {
  return forMarket(market, Es.email, Sv.email);
}

export function gestionCampos(market: Market) {
  return forMarket(market, Es.gestion, Sv.gestion).campos;
}

/** Etikett för priset i bokningskortet — återanvänder formulärlabeln från
 * Servicios (samma ord passar: "Precio"/"Pris"), ingen ny nyckel. */
export function precioLabel(market: Market): string {
  return forMarket(market, Es.servicios, Sv.servicios).campos.priceLabel;
}

/** CTA-text för "Reservar de nuevo" (mejl om avbokning): återanvänder
 * knappen de Agenda ("Nueva reserva"/"Ny bokning"), inte WhatsApp-mallens
 * knapptext (den finns bara för CL — SE har inga WhatsApp-mallar, D-025). */
export function nuevaReservaCta(market: Market): string {
  return forMarket(market, Es.agenda, Sv.agenda).nuevaReserva;
}
