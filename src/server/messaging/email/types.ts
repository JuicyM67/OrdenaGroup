import "server-only";

import type { Market } from "@/config/brand";

/** Vad `sendEmail` skickar med (regel hård 4 / INTEGRATIONS.md §4). */
export type EmailKind = "booking" | "account";

/** Resultatet av att rendera en mall: det `sendEmail` behöver. */
export type RenderedEmail = {
  readonly subject: string;
  /** Förhandsvisningstexten Gmail/Apple Mail visar bredvid ämnesraden. */
  readonly preheader: string;
  readonly html: string;
  readonly text: string;
};

/** Ett "bokningskort" (tjänst, tid, profesional, adress, pris) som återges i
 * flera mallar — samma form som kortet i appen (F7). */
export type BookingCardData = {
  readonly servicio: string;
  readonly fecha: string;
  readonly hora: string;
  readonly profesional?: string;
  readonly direccion?: string;
  /** Redan formaterat via `formatMoney` (t.ex. "$18.000"/"450 kr") — kortet
   * gör ingen egen valutalogik, samma mönster som `fecha`/`hora` i
   * `email.*` i i18n (WP-03). */
  readonly precio?: string;
  /** WP-54: medlemsrabatten, redan formaterad ("$1.800"). Finns den visar
   * kortet "Precio socio: {precio} (−{descuentoSocio})" i stället för
   * "Precio: {precio}" (`precio` är då redan priset efter rabatt). */
  readonly descuentoSocio?: string;
  /** WP-31: rabatten (`descuentoSocio`) kommer från en erbjudandelänk →
   * etiketten "Precio con oferta" i stället för "Precio socio". */
  readonly descuentoOferta?: boolean;
  /** WP-64 (D-044): betalning online. Visas som raden "Pago" i kortet. */
  readonly pago?: "reservado" | "pagado" | "reembolso";
};

export type EmailTemplateMeta = {
  readonly kind: EmailKind;
  readonly market: Market;
};
