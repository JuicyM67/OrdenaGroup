import "server-only";

import { brand } from "@/config/brand";

import { emailNs, gestionCampos } from "../content";
import { composeSimpleEmail } from "../layout";
import type { RenderedEmail } from "../types";

export type HoraFlashData = {
  readonly negocio: string;
  readonly servicio: string;
  readonly fecha: string;
  readonly hora: string;
  readonly pct: number;
  readonly reservarUrl: string;
};

/**
 * Oferta con descuento (marketing, `hora_flash` en INTEGRATIONS.md §1):
 * SOLO se envía a clientes con `consent_marketing_at` y que no hayan
 * respondido BAJA (regla del proyecto), y contando contra la cuota del
 * plan — esa comprobación vive en el outbox (arbetspaket C), no acá: esta
 * función solo arma el HTML/texto.
 */
export function horaFlashEmail(data: HoraFlashData): RenderedEmail {
  const ns = emailNs().horaFlash;
  const comun = emailNs().comun;
  const campos = gestionCampos();
  return composeSimpleEmail({
    subject: ns.asunto({ negocio: data.negocio, pct: data.pct }),
    preheader: ns.preheader,
    titulo: ns.titulo({ pct: data.pct }),
    paragraphs: [ns.texto(data)],
    cardRows: [
      { label: campos.servicio, value: data.servicio },
      { label: campos.dia, value: data.fecha },
      { label: campos.hora, value: data.hora },
    ],
    cta: { label: ns.cta, href: data.reservarUrl, variant: "lime" },
    footerLines: [
      comun.piePagina({ marca: brand.name, negocio: data.negocio }),
      comun.porQueRecibes,
    ],
  });
}
