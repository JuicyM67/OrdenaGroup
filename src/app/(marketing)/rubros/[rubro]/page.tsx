// /rubros/[rubro] (SE: /branscher/<slug>), en sida per bransch i mallen Bransch.dc.html
// (WP-75). `[rubro]` är CL-sluggen (se `rubroFromParam`); 404 för okänd bransch.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { pageMetadata } from "@/components/marketing/paginas/metadata";
import { RubroPage } from "@/components/marketing/paginas/rubro-page";
import { hrefRubro, rubroFromParam, rubroParamSlugs } from "@/config/routes";
import { paginas } from "@/i18n/paginas";

type PageParams = { rubro: string };

export const dynamicParams = false;

export function generateStaticParams(): PageParams[] {
  return rubroParamSlugs().map((rubro) => ({ rubro }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const id = rubroFromParam((await params).rubro);
  if (!id) return {};
  const t = paginas.rubros[id];
  return pageMetadata({
    titulo: t.meta.titulo,
    descripcion: t.meta.descripcion,
    path: hrefRubro(id),
  });
}

export default async function RubroRoute({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const id = rubroFromParam((await params).rubro);
  if (!id) notFound();
  return <RubroPage id={id} />;
}
