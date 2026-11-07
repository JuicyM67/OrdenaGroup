import type { NextConfig } from "next";

import { clLegacyRedirects } from "./src/config/routes";

function supabaseImageConfig(): NonNullable<NextConfig["images"]> {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return { remotePatterns: [] };
  const u = new URL(raw);
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(u.hostname);
  return {
    remotePatterns: [
      {
        protocol: u.protocol === "http:" ? "http" : "https",
        hostname: u.hostname,
        ...(u.port ? { port: u.port } : {}),
        pathname: "/storage/v1/object/public/**",
      },
    ],
    ...(local ? { dangerouslyAllowLocalIP: true } : {}),
  };
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Permanenta redirects (308) från gamla sökvägar, så att delade länkar fortsätter
  // fungera (se `src/config/routes.ts`).
  async redirects() {
    return clLegacyRedirects();
  },
  // WP-27: grundläggande säkerhetsheaders (ingen inbäddning → ingen clickjacking
  // av /app eller avbokningen i /r/[token]). Full CSP med img-src kommer senare (IDEAS).
  async headers() {
    return [
      {
        // Bara sidor/API, inte /_next/static: headers på varje JS-chunk räknas
        // annars in i JS-budgeten (D-032, encodedDataLength) utan att skydda något.
        // `/embed/` har egna regler nedan (WP-82, D-067).
        source: "/((?!_next/static|_next/image|favicon.ico|embed/).*)",
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
      {
        // WP-82 (D-067): widgetarna under /embed/<slug>/ ska kunna ramas in på företagens
        // egna sidor, så här gäller `frame-ancestors *` och ingen X-Frame-Options (den
        // kan inte tillåta bestämda ursprung). Inga sessioner eller kakor används på
        // dessa sidor; allt annat är fortfarande blockerat ovan.
        source: "/embed/:slug/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Robots-Tag", value: "noindex" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ];
  },
  // WP-68 (B1, säkerhetsgranskning #110): marknadsplatsens bilder från projektets
  // Supabase Storage går via Next bildoptimering (samma ursprung för besökaren).
  // WP-70 (#111 S3): bara projektets EGEN Supabase-värd (från NEXT_PUBLIC_SUPABASE_URL),
  // aldrig `*.supabase.co`. Lokalt (127.0.0.1:54321) måste Next tillåta lokal IP.
  images: supabaseImageConfig(),
  // Next skriver annars in egna regler i CLAUDE.md vid `next dev`.
  agentRules: false,
  // Dev-indikatorn ritas i nederkanten och hamnar annars i skärmdumparna
  // när `npm run visual` körs mot `next dev` (WP-02 steg 1).
  devIndicators: false,
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
