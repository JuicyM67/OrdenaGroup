// /descubre/ofertas — fliken Ofertas (WP-85, D-070): erbjudandelistan från WP-68
// (bokas till erbjudandepris, betalas i salongen, D-060), kategori i `?kategori=`.
import type { Metadata } from "next";

import {
  offersMetadata,
  OffersRoute,
  resolveCategory,
  type RouteSearchParams,
} from "@/components/marketplace/discover-route";

export function generateMetadata(): Metadata {
  return offersMetadata();
}

export default function OfertasPage({
  searchParams,
}: {
  searchParams: RouteSearchParams;
}) {
  // 404 när marknadsplatsen är av (samma vakt som övriga Descubre-rutter).
  resolveCategory(undefined);
  return <OffersRoute searchParams={searchParams} />;
}
