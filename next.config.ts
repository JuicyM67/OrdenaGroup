import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Marknaden bakas alltid in (CL som standard) så att `process.env.NEXT_PUBLIC_MARKET`
  // blir en konstant i klientkoden och bara ett språk följer med (D-025).
  env: { NEXT_PUBLIC_MARKET: process.env.NEXT_PUBLIC_MARKET ?? "CL" },
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
        process.env.NEXT_PUBLIC_MARKET === "SE"
          ? "./src/i18n/sv-SE.app.ts"
          : "./src/i18n/es-CL.ts",
    },
  },
};

export default nextConfig;
