// WP-47 (tillägg E): apple-touch-icon (iOS-hemskärm), samma glyf som `icon.tsx` fast större
// (Apples rekommenderade 180×180) och utan rundade hörn i själva bilden (iOS rundar hörnen
// på hemskärmen automatiskt, en dubbel radie ger synligt "kantfel").
import { ImageResponse } from "next/og";

import { brand } from "@/config/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Satori (`ImageResponse`) har ingen DOM/CSS-kaskad, CSS-variabler (tokens.css) går inte
// att läsa här — kopior av --color-lime/--color-ink, samma motiverade undantag som D-021.
// eslint-disable-next-line no-restricted-syntax -- se motiveringen ovan (kopia av --color-lime)
const LIME = "#E3F36B";
// eslint-disable-next-line no-restricted-syntax -- se motiveringen ovan (kopia av --color-ink)
const INK = "#16161A";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        role="img"
        aria-label={brand.name}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: LIME,
        }}
      >
        <svg
          width="112"
          height="112"
          viewBox="0 0 24 24"
          fill="none"
          stroke={INK}
          strokeWidth={2}
        >
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12a8.5 8.5 0 0 0 17 0z" fill={INK} />
        </svg>
      </div>
    ),
    { ...size },
  );
}
