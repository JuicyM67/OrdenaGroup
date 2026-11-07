// Descubres gemensamma ram (WP-85, D-070; utbruten ur WP-68:s listvy): delad
// glas-header, foto-hero med lime-markering, sök + ort, flikarna Företag ·
// Erbjudanden · Blixttider, sidfot och mobilens bottenflikar. Innehållet per
// flik kommer som children. Serverrenderad.
import Image from "next/image";
import type { ReactNode } from "react";

import {
  BreadcrumbJsonLd,
  type Migas,
} from "@/components/marketing/paginas/json-ld";
import { Brodsmulor } from "@/components/marketing/paginas/foto-hero";
import { Highlight } from "@/components/marketing/highlight";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { descubre } from "@/i18n";
import type { AreaOption } from "@/server/marketplace/public";

import { BottomTabs } from "./bottom-tabs";
import type { ConsumerNav } from "./consumer-session";
import { DiscoverTabs, type DiscoverTab } from "./discover-tabs";
import { LocationMenu } from "./location-menu";
import type { DiscoverParams } from "./params";
import { SearchForm } from "./search-form";

const t = descubre;

export function DiscoverShell({
  tab,
  migas,
  heading,
  bajada,
  searchAction,
  searchHidden,
  searchPlaceholder,
  suggestions,
  params,
  areas,
  hasPosition,
  listBase,
  nav,
  children,
}: {
  tab: DiscoverTab;
  migas: Migas;
  /** H1 i två delar (andra delen får lime-markering). */
  heading: { pre: string; marca: string };
  bajada: string;
  searchAction: string;
  /** Dolda fält till sökformuläret (t.ex. `kategori` på erbjudandefliken). */
  searchHidden?: Record<string, string>;
  searchPlaceholder?: string;
  suggestions?: readonly string[];
  params: DiscoverParams;
  areas: readonly AreaOption[];
  hasPosition: boolean;
  listBase: (p: DiscoverParams) => string;
  nav: ConsumerNav;
  children: ReactNode;
}) {
  const location = (tone: "light" | "glass", className?: string) => (
    <LocationMenu
      areas={areas}
      params={params}
      hasPosition={hasPosition}
      basePath={listBase}
      tone={tone}
      className={className}
    />
  );

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <BreadcrumbJsonLd migas={migas} />
      <SiteHeader className="mt-10" />
      <main className="flex-1 pb-28 lg:pb-0">
        <section className="relative -mt-26 bg-dark text-on-dark">
          <Image
            src="/marketing/hudvard.webp"
            alt={t.hero.foto}
            fill
            priority
            sizes="100vw"
            className="object-cover object-photo-top"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-photo-tint-mobile lg:bg-photo-tint"
          />
          <div className="relative mx-auto flex max-w-360 flex-col gap-5 px-4 pt-32 pb-8 sm:px-8 lg:px-22 lg:pt-40 lg:pb-16">
            <Brodsmulor migas={migas} label={t.migas.label} />
            <h1 className="max-w-4xl font-display text-38 leading-display font-semibold tracking-hero text-balance sm:text-56 lg:text-60">
              {heading.pre}
              <Highlight>{heading.marca}</Highlight>
            </h1>
            <p className="max-w-xl text-16 leading-relaxed text-on-dark/90 sm:text-18">
              {bajada}
            </p>
            <div className="flex max-w-3xl flex-col gap-2.5 sm:flex-row sm:items-center">
              <SearchForm
                action={searchAction}
                params={params}
                extraHidden={searchHidden}
                placeholder={searchPlaceholder}
                suggestions={suggestions}
                className="flex-1"
                trailing={location("light", "hidden sm:block")}
              />
              {location("glass", "sm:hidden")}
            </div>
          </div>
        </section>

        <div className="mx-auto flex max-w-360 flex-col gap-6 px-4 py-6 sm:px-8 lg:gap-8 lg:px-22 lg:py-10">
          <DiscoverTabs active={tab} params={params} />
          {children}
        </div>
      </main>
      <SiteFooter />
      <BottomTabs active="descubre" nav={nav} />
    </div>
  );
}
