// /for-kunder (CL: /para-clientes, dold/404 som marknadsplatsen, se `marketplaceEnabled`).
// Landningssida för konsumentkontot. Design: docs/design/reference/for-kunder/.
// Metadata: unik titel/beskrivning, canonical, Open Graph och BreadcrumbList.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  ClientesCierre,
  ClientesFaq,
  ClientesFunciones,
  ClientesHero,
  ClientesPasos,
} from "@/components/marketing/clientes/clientes-page";
import { BreadcrumbJsonLd } from "@/components/marketing/paginas/json-ld";
import { pageMetadata } from "@/components/marketing/paginas/metadata";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { brand } from "@/config/brand";
import { marketplaceEnabled } from "@/config/marketplace";
import { href } from "@/config/routes";
import { paraClientes } from "@/i18n";

const t = paraClientes;

export function generateMetadata(): Metadata {
  if (!marketplaceEnabled()) return {};
  return pageMetadata({
    titulo: t.meta.titulo,
    descripcion: t.meta.descripcion({ nombre: brand.name }),
    path: href("paraClientes"),
  });
}

export default function ParaClientesPage() {
  if (!marketplaceEnabled()) notFound();
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <BreadcrumbJsonLd
        migas={[
          { nombre: t.meta.inicio, href: href("inicio") },
          { nombre: t.meta.migas, href: href("paraClientes") },
        ]}
      />
      <SiteHeader className="mt-10" />
      <main className="flex-1">
        <ClientesHero />
        <ClientesFunciones />
        <ClientesPasos />
        <ClientesFaq />
        <ClientesCierre />
      </main>
      <SiteFooter />
    </div>
  );
}
