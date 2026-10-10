// /erbjudande/<slug> (CL: /oferta/<slug>, dold) — erbjudandesidan (WP-68, D-055).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { pageMetadata } from "@/components/marketing/paginas/metadata";
import { getConsumerNav } from "@/components/marketplace/consumer-session";
import { OfferDetail } from "@/components/marketplace/offer-detail";
import { offerJsonLd } from "@/components/marketplace/offer-json-ld";
import { discoverHref } from "@/components/marketplace/params";
import { marketplaceEnabled, marketplaceIndexable } from "@/config/marketplace";
import { href, hrefMarketplace } from "@/config/routes";
import { descubre } from "@/i18n";
import { loadOffer } from "@/server/marketplace/public";

type Params = Promise<{ slug: string }>;

const getOffer = cache(async (slug: string) => {
  if (!marketplaceEnabled()) notFound();
  const offer = await loadOffer(decodeURIComponent(slug));
  if (!offer) notFound();
  return offer;
});

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const offer = await getOffer(slug);
  const titulo = descubre.meta.oferta({
    titulo: offer.title,
    negocio: offer.business.name,
  });
  return {
    ...pageMetadata({
      titulo,
      descripcion: offer.description ?? titulo,
      path: hrefMarketplace("oferta", offer.slug),
    }),
    robots: marketplaceIndexable()
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

export default async function OfertaPage({ params }: { params: Params }) {
  const { slug } = await params;
  const offer = await getOffer(slug);
  const url = hrefMarketplace("oferta", offer.slug);
  return (
    <OfferDetail
      offer={offer}
      jsonLd={offerJsonLd(offer, url, `/${offer.business.slug}`)}
      migas={[
        { nombre: descubre.migas.inicio, href: href("inicio") },
        { nombre: descubre.nav.descubre, href: hrefMarketplace("descubre") },
        {
          nombre: descubre.categorias.nombres[offer.category],
          href: discoverHref({}, offer.category),
        },
        { nombre: offer.title, href: url },
      ]}
      nav={await getConsumerNav()}
    />
  );
}
