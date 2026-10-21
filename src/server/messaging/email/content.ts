import "server-only";

import * as Es from "@/i18n/es-CL";

/**
 * Texterna kommer alltid från `src/i18n/` (copywriter-es-cl äger den mappen,
 * regel hård 6) — den här filen slår bara upp fälten mallarna behöver.
 */

/** `email.*` (WP-03/copywriter-es-cl): de fyra bokningsmejlen (`cuerpo` i
 * ren text), `comun` (hälsning/fot/knapptexter delade av mallarna nedan),
 * `bienvenida`, `nuevaReservaDueno`, `cancelacionDueno`, `listaEsperaCupo`,
 * `horaFlash` och `acceso` (link mágico/confirmación). */
export function emailNs() {
  return Es.email;
}

export function gestionCampos() {
  return Es.gestion.campos;
}

/** Etikett för priset i bokningskortet — återanvänder formulärlabeln från
 * Servicios (samma ord passar: "Precio"), ingen ny nyckel. */
export function precioLabel(): string {
  return Es.servicios.campos.priceLabel;
}

/** CTA-text för "Reservar de nuevo" (mejl om avbokning): återanvänder
 * knappen de Agenda ("Nueva reserva"), inte WhatsApp-mallens knapptext. */
export function nuevaReservaCta(): string {
  return Es.agenda.nuevaReserva;
}
