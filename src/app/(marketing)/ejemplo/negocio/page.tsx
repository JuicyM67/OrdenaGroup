// /ejemplo/negocio (SE: /exempel/foretag) — WP-72: interaktiv demo av ägarappen med guidad
// visning. Statisk mockup med fiktiv data (ingen inloggning, inga DB-anrop), se
// `docs/design/reference/visning/Foretag.dc.html`. Texter via `visita` (@/i18n).
import type { Metadata } from "next";

import { BusinessDemo } from "@/components/tour/business-demo";
import { brand } from "@/config/brand";
import { visita } from "@/i18n";

export const metadata: Metadata = {
  title: visita.negocio.meta.titulo({ nombre: brand.name }),
  description: visita.negocio.meta.descripcion({ nombre: brand.name }),
};

export default function EjemploNegocioPage() {
  return <BusinessDemo />;
}
