// /descubre/horas-flash — fliken Horas flash (WP-85, D-070): dagens horas flash
// hos företag som visar dem i Descubre.
import type { Metadata } from "next";

import {
  flashMetadata,
  FlashRoute,
  resolveCategory,
  type RouteSearchParams,
} from "@/components/marketplace/discover-route";

export function generateMetadata(): Metadata {
  return flashMetadata();
}

export default function FlashPage({
  searchParams,
}: {
  searchParams: RouteSearchParams;
}) {
  // 404 när marknadsplatsen är av (samma vakt som övriga Descubre-rutter).
  resolveCategory(undefined);
  return <FlashRoute searchParams={searchParams} />;
}
