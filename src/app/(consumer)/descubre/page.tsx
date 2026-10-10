// /upptack (CL: /descubre, dold tills Mercado Pago finns) — marknadsplatsens
// listvy (WP-68, D-056).
import type { Metadata } from "next";

import {
  discoverMetadata,
  DiscoverRoute,
  resolveCategory,
  type RouteSearchParams,
} from "@/components/marketplace/discover-route";

export function generateMetadata(): Metadata {
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
