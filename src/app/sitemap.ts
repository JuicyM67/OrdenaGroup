// sitemap.xml (WP-75): alla publika, indexerbara sidor i installationens marknad (en
// installation per marknad, D-025), med riktiga marknadsadresser från `routes.ts`.
// WP-68 (D-055): marknadsplatsen (Descubre, kategori, kategori × ort, erbjudanden) tas
// med först när den är indexerbar (`MARKETPLACE_INDEXABLE=1`, bara SE).
// WP-85 (D-070): kategori- och ortsidorna är företagskatalogen; en ortsida tas med
// först från `MARKETPLACE_AREA_MIN_BUSINESSES` listade företag.
import type { MetadataRoute } from "next";

import { categorySlug, marketplaceIndexable } from "@/config/marketplace";
import { hrefMarketplace, sitemapPaths } from "@/config/routes";
import { absoluteUrl } from "@/config/site-url";
import { loadDirectorySitemap } from "@/server/marketplace/businesses";
import { loadSitemapEntries } from "@/server/marketplace/public";

export const revalidate = 3600;

async function marketplaceEntries(): Promise<MetadataRoute.Sitemap> {
  if (!marketplaceIndexable()) return [];
  try {
    const [{ offers }, combos] = await Promise.all([
      loadSitemapEntries(),
      loadDirectorySitemap(),
    ]);
    const categoryPaths = new Set<string>();
    for (const c of combos) {
      const cat = categorySlug(c.category);
      categoryPaths.add(hrefMarketplace("descubre", cat));
      if (c.areaSlug) {
        categoryPaths.add(hrefMarketplace("descubre", cat, c.areaSlug));
      }
    }
    return [
      {
        url: absoluteUrl(hrefMarketplace("descubre")),
        changeFrequency: "daily",
        priority: 0.8,
      },
      {
        url: absoluteUrl(hrefMarketplace("descubreOfertas")),
        changeFrequency: "daily",
        priority: 0.6,
      },
      ...[...categoryPaths].map((path) => ({
        url: absoluteUrl(path),
        changeFrequency: "daily" as const,
        priority: 0.6,
      })),
      ...offers.map((o) => ({
        url: absoluteUrl(hrefMarketplace("oferta", o.slug)),
        lastModified: o.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
    ];
  } catch {
    // Databasen nere ska aldrig fälla hela sitemap:en.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = sitemapPaths().map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
  return [...base, ...(await marketplaceEntries())];
}
