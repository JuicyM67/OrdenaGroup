// /upptack/<kategori>/<ort> (WP-68): SEO-landningssida per kategori och ort.
import type { Metadata } from "next";

import {
  discoverMetadata,
  DiscoverRoute,
  resolveArea,
  resolveCategory,
  type RouteSearchParams,
} from "@/components/marketplace/discover-route";

type Params = Promise<{ categoria: string; ciudad: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { categoria, ciudad } = await params;
  return discoverMetadata(resolveCategory(categoria), resolveArea(ciudad));
}

export default async function CategoriaCiudadPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: RouteSearchParams;
}) {
  const { categoria, ciudad } = await params;
  return (
    <DiscoverRoute
      category={resolveCategory(categoria)}
      area={resolveArea(ciudad)}
      searchParams={searchParams}
    />
  );
}
