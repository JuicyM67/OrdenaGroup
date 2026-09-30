// WP-47 (tillägg E): app-ikon (favicon), samma glyf som `LogoMark`
// (`src/components/ui/logo-mark.tsx`) — en cirkel med fylld nederhalva i en lime-ruta.
// Väljs automatiskt per marknad: bygget sätter `NEXT_PUBLIC_MARKET` (CL/SE, se
// `src/config/brand.ts`), och den här filen läser samma `brand`-export, så en framtida
// marknadsspecifik glyf (om märkena någonsin skiljer sig visuellt) bara byts här.
//
// Route handler-ikoner (Satori/`ImageResponse`) har ingen DOM/CSS-kaskad — Tailwind-klasser
// och CSS-variabler (`src/styles/tokens.css`) går inte att använda här, bara inline-`style`.
// Hex-värdena nedan är kopior av `--color-lime`/`--color-ink` (tokens.css), inte nya
// godtyckliga värden — samma undantag som gäller för `src/components/agenda/**`s geometri
// (D-021).
import { ImageResponse } from "next/og";

import { brand } from "@/config/brand";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Satori (`ImageResponse`) har ingen DOM/CSS-kaskad, CSS-variabler (tokens.css) går inte
// att läsa här — kopior av --color-lime/--color-ink, samma motiverade undantag som D-021.
// eslint-disable-next-line no-restricted-syntax -- se motiveringen ovan (kopia av --color-lime)
const LIME = "#E3F36B";
// eslint-disable-next-line no-restricted-syntax -- se motiveringen ovan (kopia av --color-ink)
const INK = "#16161A";

export default function Icon() {
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
          // 18px radie på en 56px logo-ruta (LogoMark) skalat till 32px.
          borderRadius: 10,
        }}
      >
        <svg
          width="20"
          height="20"
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
