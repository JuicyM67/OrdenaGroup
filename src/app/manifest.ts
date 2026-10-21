// WP-74 (D-049): webbapp-manifest. Ikonerna är de dynamiska (`icon.tsx`, `apple-icon.tsx`).
import type { MetadataRoute } from "next";

import { brand } from "@/config/brand";

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
    icons: [],
  };
}
