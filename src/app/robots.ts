// robots.txt (WP-75): publika sidor indexeras, appen och API:t inte; pekar på sitemap.xml.
import type { MetadataRoute } from "next";

import { siteOrigin } from "@/config/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app/", "/admin/", "/api/"],
    },
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
