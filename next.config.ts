import type { NextConfig } from "next";

import {
  clLegacyRedirects,
  seLegacyRedirects,
  seRouteRedirects,
  seRouteRewrites,
} from "./src/config/routes";

const MARKET = process.env.NEXT_PUBLIC_MARKET ?? "CL";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Marknaden bakas alltid in (CL som standard) så att `process.env.NEXT_PUBLIC_MARKET`
  // blir en konstant i klientkoden och bara ett språk följer med (D-025).
  env: { NEXT_PUBLIC_MARKET: MARKET },
  // Svenska permalänkar (D-025, en installation per marknad): SE skriver om svenska
  // slugs (`/priser` osv, se `src/config/routes.ts`) till samma sidfiler som CL, och
  // gör permanenta redirects från de gamla spanska sökvägarna så delade länkar
  // fortsätter fungera. CL rörs inte — dess sökvägar är redan filsystemets.
  async rewrites() {
    return MARKET === "SE" ? seRouteRewrites() : [];
  },
  async redirects() {
    return MARKET === "SE"
      ? [...seRouteRedirects(), ...seLegacyRedirects()]
      : clLegacyRedirects();
  },
  // WP-27: grundläggande säkerhetsheaders (ingen inbäddning → ingen clickjacking
  // av /app eller avbokningen i /r/[token]). Full CSP med img-src kommer senare (IDEAS).
  async headers() {
    return [
      {
        // Bara sidor/API, inte /_next/static: headers på varje JS-chunk räknas
        // annars in i JS-budgeten (D-032, encodedDataLength) utan att skydda något.
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ];
  },
  // Next skriver annars in egna regler i CLAUDE.md vid `next dev`.
  agentRules: false,
  // Dev-indikatorn ritas i nederkanten och hamnar annars i skärmdumparna
  // när `npm run visual` körs mot `next dev` (WP-02 steg 1).
  devIndicators: false,
  turbopack: {
    root: import.meta.dirname,
    // Språkfil per marknad, se src/i18n/index.ts.
    resolveAlias: {
      "i18n-locale":
        MARKET === "SE" ? "./src/i18n/sv-SE.app.ts" : "./src/i18n/es-CL.ts",
    },
  },
};

export default nextConfig;
