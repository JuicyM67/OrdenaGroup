// /rubros (SE: /branscher), översikt över alla branschsidor (WP-75).
import type { Metadata } from "next";

import { RubrosIndexPage } from "@/components/marketing/paginas/indices";
import { pageMetadata } from "@/components/marketing/paginas/metadata";
import { hrefRubros } from "@/config/routes";
import { paginas } from "@/i18n/paginas";

export const metadata: Metadata = pageMetadata({
  titulo: paginas.indiceRubros.meta.titulo,
  descripcion: paginas.indiceRubros.meta.descripcion,
  path: hrefRubros(),
});

export default function RubrosPage() {
  return <RubrosIndexPage />;
}
