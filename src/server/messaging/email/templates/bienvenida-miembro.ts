import "server-only";

import { brand } from "@/config/brand";

import { emailNs } from "../content";
import { composeSimpleEmail } from "../layout";
import type { RenderedEmail } from "../types";

export type BienvenidaMiembroData = {
  readonly cliente: string;
  readonly negocio: string;
  /** Företagets förmånstext (`member_benefit_text`); saknas den används
   * `pct` ("10 % de descuento en tus reservas"). */
  readonly beneficioTexto?: string;
  readonly pct?: number;
  /** `/{slug}` — företagets bokningssida. */
  readonly linkReserva: string;
};

/** Texten för förmånen: företagets egen text, annars procentsatsen. */
export function beneficioMiembro(
  data: Pick<BienvenidaMiembroData, "beneficioTexto" | "pct">,
): string | undefined {
  const ns = emailNs().bienvenidaMiembro;
  const texto = data.beneficioTexto?.trim();
  if (texto) return texto;
  if (data.pct !== undefined && data.pct > 0) {
    return ns.beneficioPct({ pct: data.pct });
  }
  return undefined;
}

/** WP-54: al cliente, cuando el negocio lo marca como socio (transaccional). */
export function bienvenidaMiembroEmail(
  data: BienvenidaMiembroData,
): RenderedEmail {
  const ns = emailNs().bienvenidaMiembro;
  const comun = emailNs().comun;
  const beneficio = beneficioMiembro(data);
  const texto = ns.texto({ cliente: data.cliente, negocio: data.negocio });
  return composeSimpleEmail({
    subject: ns.asunto({ negocio: data.negocio }),
    preheader: beneficio ? ns.preheader({ beneficio }) : texto,
    titulo: ns.titulo,
    paragraphs: beneficio ? [texto, ns.beneficio({ beneficio })] : [texto],
    cta: { label: ns.cta, href: data.linkReserva },
    footerLines: [
      comun.piePagina({ marca: brand.name, negocio: data.negocio }),
    ],
  });
}
