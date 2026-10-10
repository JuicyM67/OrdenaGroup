// WP-74 (D-049): webbapp-manifest per marknad. SE får b-klockans ikoner (192/512 samt
// maskable med säkerhetsmarginal); CL behåller sina dynamiska ikoner (`icon.tsx`).
import type { MetadataRoute } from "next";

import { brand, market } from "@/config/brand";

// Kopior av --color-ink / --color-canvas (tokens.css): manifestet är JSON och kan inte
// läsa CSS-variabler — samma motiverade undantag som `icon.tsx`.
// eslint-disable-next-line no-restricted-syntax -- kopia av --color-ink
const THEME = "#16161A";
// eslint-disable-next-line no-restricted-syntax -- kopia av --color-canvas
const BACKGROUND = "#F4F4F0";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.name,
    start_url: "/",
    display: "standalone",
    theme_color: THEME,
    background_color: BACKGROUND,
    icons:
      market === "SE"
        ? [
            {
              src: "/brand/bb-icon-192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/brand/bb-icon-512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "/brand/bb-icon-maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ]
        : [],
  };
}
