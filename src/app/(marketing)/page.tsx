// Landningssida (/, offentlig, indexerbar — ingen noindex). Route group "(marketing)"
// påverkar inte URL:en. Text via `copy` (`@/i18n/marketing`, D-025/D-026), aldrig direkt
// från `@/i18n`, så sidan fungerar för båda marknaderna från samma kod.
//
// WP-71: ny startsida "Foto-berättelse" (ägarens valda design, referenser i
// docs/design/reference/startsida/). Ordning: hero → smärtfri flytt → "så ser din
// bokningssida ut" → funktioner (bento) → "så bokar dina kunder" → för vem (mosaik) →
// priser → frågor & svar → avslutande CTA → sidfot. Ingen `npm run visual` (ingen
// referensbild finns som skärmdump).
import type { Metadata } from "next";

import { Bento } from "@/components/marketing/home/bento";
import { Como } from "@/components/marketing/home/como";
import { CtaFinal } from "@/components/marketing/home/cta-final";
import { Faq } from "@/components/marketing/home/faq";
import { FlyttSection } from "@/components/marketing/home/flytt";
import { HomeHero } from "@/components/marketing/home/hero";
import { Para } from "@/components/marketing/home/para";
import { Beta } from "@/components/marketing/home/beta";
import { Showcase } from "@/components/marketing/home/showcase";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { brand } from "@/config/brand";
import { copy } from "@/i18n/marketing";

export const metadata: Metadata = {
  title: copy.landing.meta.titulo({ nombre: brand.name }),
  description: copy.landing.meta.descripcion({ nombre: brand.name }),
};

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      {/* mt-10: glas-navet ligger ovanpå hero-fotot, 24 px in från kortets överkant. */}
      <SiteHeader className="mt-10" />

      <main className="flex-1">
        <HomeHero />
        <div className="bg-canvas">
          <FlyttSection />
        </div>
        <Showcase />
        <Bento />
        <Como />
        <Para />
        <Beta />
        <Faq />
        <CtaFinal />
      </main>

      <SiteFooter />
    </div>
  );
}
