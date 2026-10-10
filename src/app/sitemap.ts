// sitemap.xml (WP-75): alla publika, indexerbara sidor i installationens marknad (en
// installation per marknad, D-025), med riktiga marknadsadresser från `routes.ts`.
import type { MetadataRoute } from "next";

import { sitemapPaths } from "@/config/routes";
import { absoluteUrl } from "@/config/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapPaths().map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
