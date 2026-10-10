// /upptack/<kategori> (WP-68): SEO-landningssida per kategori.
import type { Metadata } from "next";

import {
  discoverMetadata,
  DiscoverRoute,
  resolveCategory,
  type RouteSearchParams,
} from "@/components/marketplace/discover-route";

type Params = Promise<{ categoria: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { categoria } = await params;
  return discoverMetadata(resolveCategory(categoria), undefined);
}

export default async function CategoriaPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: RouteSearchParams;
}) {
  const { categoria } = await params;
  return (
    <DiscoverRoute
      category={resolveCategory(categoria)}
      area={undefined}
      searchParams={searchParams}
    />
  );
}
