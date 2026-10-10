// /migracion (SE: /flytt), "Smärtfri flytt" i funktionsmallen (WP-75).
import type { Metadata } from "next";

import { FuncionPage } from "@/components/marketing/paginas/funcion-page";
import { pageMetadata } from "@/components/marketing/paginas/metadata";
import { hrefFuncion } from "@/config/routes";
import { paginas } from "@/i18n/paginas";

const t = paginas.funciones.migracion;

export const metadata: Metadata = pageMetadata({
  titulo: t.meta.titulo,
  descripcion: t.meta.descripcion,
  path: hrefFuncion("migracion"),
});

export default function MigracionPage() {
  return <FuncionPage id="migracion" />;
}
