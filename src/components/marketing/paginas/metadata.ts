// Gemensam `generateMetadata`-hjälp för funktions- och branschsidorna (WP-75): unik titel
// och beskrivning, canonical mot marknadens egen adress och Open Graph.
import type { Metadata } from "next";

import { brand } from "@/config/brand";
import { absoluteUrl } from "@/config/site-url";

export function pageMetadata(p: {
  titulo: string;
  descripcion: string;
  path: string;
}): Metadata {
  const title = `${p.titulo} | ${brand.name}`;
  return {
    title,
    description: p.descripcion,
    alternates: { canonical: absoluteUrl(p.path) },
    openGraph: {
      title,
      description: p.descripcion,
      url: absoluteUrl(p.path),
      siteName: brand.name,
      type: "website",
    },
  };
}
