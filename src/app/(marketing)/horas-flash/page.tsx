// /horas-flash (SE: /blixttider): funktionsmallen (WP-75, Funktion.dc.html). Tidigare
// egen layout med `FlashMockup`; texten bor nu i `paginas.funciones.horasFlash`.
import type { Metadata } from "next";

import { FuncionPage } from "@/components/marketing/paginas/funcion-page";
import { pageMetadata } from "@/components/marketing/paginas/metadata";
import { hrefFuncion } from "@/config/routes";
import { paginas } from "@/i18n/paginas";

const t = paginas.funciones.horasFlash;

export const metadata: Metadata = pageMetadata({
  titulo: t.meta.titulo,
  descripcion: t.meta.descripcion,
  path: hrefFuncion("horasFlash"),
});

export default function HorasFlashPage() {
  return <FuncionPage id="horasFlash" />;
}
