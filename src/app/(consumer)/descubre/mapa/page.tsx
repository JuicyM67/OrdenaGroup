// /descubre/mapa (CL: /descubre/mapa, dold) — kartvyn (WP-68, D-055).
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { pageMetadata } from "@/components/marketing/paginas/metadata";
import { getConsumerNav } from "@/components/marketplace/consumer-session";
import { MapPage } from "@/components/marketplace/map-page";
import {
  offerSort,
  parseDiscoverParams,
  parsePositionCookie,
} from "@/components/marketplace/params";
import {
  categoryFromSlug,
  marketplaceEnabled,
  POSITION_COOKIE,
} from "@/config/marketplace";
import { hrefMarketplace } from "@/config/routes";
import { descubre } from "@/i18n";
import { withServiceTx } from "@/server/db/tx";
import { areasIn, listOffersIn } from "@/server/marketplace/public";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  ...pageMetadata({
    titulo: descubre.meta.mapa,
    descripcion: descubre.meta.descripcion,
    path: hrefMarketplace("descubreMapa"),
  }),
  // Kartan är en vy av listan — indexeras aldrig (listan är canonical).
  robots: { index: false, follow: true },
};

export default async function MapaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!marketplaceEnabled()) notFound();
  const raw = await searchParams;
  const params = parseDiscoverParams(raw);
  const katRaw = Array.isArray(raw.kategori) ? raw.kategori[0] : raw.kategori;
  const category = katRaw ? categoryFromSlug(katRaw) : undefined;
  const position = parsePositionCookie(
    (await cookies()).get(POSITION_COOKIE)?.value,
  );
  const { offers, areas } = await withServiceTx(async (q) => ({
    offers: await listOffersIn(
      q,
      {
        category,
        q: params.q,
        areaSlug: params.ort,
        position,
        maxKm: position ? params.km : undefined,
        flashOnly: params.blixt,
        minRating: params.betyg ? 4.5 : undefined,
        sort: offerSort(params.sortera),
      },
      200,
    ),
    areas: await areasIn(q),
  }));
  const withCoords = offers.items.filter(
    (o) => o.business.lat !== null && o.business.lng !== null,
  );
  return (
    <MapPage
      offers={withCoords}
      withoutCoords={offers.items.length - withCoords.length}
      params={params}
      category={category}
      position={position}
      area={areas.find((a) => a.slug === params.ort)}
      nav={await getConsumerNav()}
    />
  );
}
