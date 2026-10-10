// /funcionalidades/[funcion] (SE: /funktioner/<slug>), en sida per funktion i mallen
// Funktion.dc.html (WP-75). Blixttider (`/horas-flash`) och flytt (`/migracion`) har egna
// sidfiler men använder samma mall. Funktioner som inte finns på marknaden (betalning på
// CL) ger 404.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FuncionPage } from "@/components/marketing/paginas/funcion-page";
import { pageMetadata } from "@/components/marketing/paginas/metadata";
import {
  funcionAvailable,
  funcionFromParam,
  funcionParamSlugs,
  hrefFuncion,
} from "@/config/routes";
import { paginas } from "@/i18n/paginas";

type PageParams = { funcion: string };

export const dynamicParams = false;

export function generateStaticParams(): PageParams[] {
  return funcionParamSlugs().map((funcion) => ({ funcion }));
}

function resolve(slug: string) {
  const id = funcionFromParam(slug);
  return id && funcionAvailable(id) ? id : undefined;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const id = resolve((await params).funcion);
  if (!id) return {};
  const t = paginas.funciones[id]!;
  return pageMetadata({
    titulo: t.meta.titulo,
    descripcion: t.meta.descripcion,
    path: hrefFuncion(id),
  });
}

export default async function FuncionRoute({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const id = resolve((await params).funcion);
  if (!id) notFound();
  return <FuncionPage id={id} />;
}
