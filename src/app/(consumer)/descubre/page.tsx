// /descubre — marknadsplatsens förstasida: företagskatalogen (WP-85, D-070;
// tidigare erbjudandelistan från WP-68, som nu är fliken /descubre/ofertas).
import type { Metadata } from "next";

import {
  discoverMetadata,
  DiscoverRoute,
  resolveCategory,
  type RouteSearchParams,
} from "@/components/marketplace/discover-route";

export function generateMetadata(): Promise<Metadata> {
  return discoverMetadata(undefined, undefined);
}

export default function DescubrePage({
  searchParams,
}: {
  searchParams: RouteSearchParams;
}) {
  resolveCategory(undefined);
  return (
    <DiscoverRoute
      category={undefined}
      area={undefined}
      searchParams={searchParams}
    />
  );
}
