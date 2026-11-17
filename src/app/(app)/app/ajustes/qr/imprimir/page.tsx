// /app/ajustes/qr/imprimir (WP-95, D-079): skylten i verklig storlek för webbläsarens
// utskrift ("Guardar como PDF" eller skrivaren). Ingen AjustesShell: bara arket, plus ett
// verktygsfält som inte skrivs ut. Samma behörighet som fliken QR. Query-parametrarna
// går genom en whitelist (`parseCartelOptions`); okända värden ger standardvärdena.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CartelPapel } from "@/components/carteles/cartel-papel";
import { PrintButton } from "@/components/carteles/print-button";
import { ajustesTabVisible } from "@/components/settings/ajustes-tabs";
import { Button } from "@/components/ui/button";
import { appHref } from "@/config/routes";
import { siteOrigin } from "@/config/site-url";
import { carteles } from "@/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CARTEL_PAGE_SIZE,
  cartelDisplayUrl,
  cartelLink,
  parseCartelOptions,
} from "@/lib/share/carteles";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import { loadCartelBusiness } from "@/server/owner/carteles";

const t = carteles.imprimir;

export const metadata: Metadata = {
  title: t.titulo,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CartelImprimirPage({
  searchParams,
}: {
  searchParams: Promise<{ cartel?: string; tamano?: string; estilo?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const current = await getCurrentMember(user.id);
  if (!current) redirect(appHref("appOnboarding"));
  if (!ajustesTabVisible("qr", current.view)) redirect(appHref("appAgenda"));

  const options = parseCartelOptions(await searchParams);
  const business = await loadCartelBusiness(user.id, current.business.id);
  const origin = siteOrigin();
  const { slug } = current.business;

  return (
    <main className="min-h-dvh bg-canvas px-4 py-8 print:min-h-0 print:bg-transparent print:p-0">
      {/* Pappersstorleken styrs av skylten; marginalerna ligger i själva arket. */}
      <style>{`@page { size: ${CARTEL_PAGE_SIZE[options.size]} portrait; margin: 0; }`}</style>
      <div className="mx-auto mb-8 flex max-w-xl flex-col gap-3 print:hidden">
        <h1 className="font-display text-22 font-bold text-ink">{t.titulo}</h1>
        <p className="text-14 leading-body text-muted">{t.ayuda}</p>
        <div className="flex flex-wrap gap-2">
          <PrintButton label={t.boton} />
          <Button asChild variant="secondary" size="md">
            <Link href={appHref("appAjustesQr")}>{t.volver}</Link>
          </Button>
        </div>
      </div>
      <CartelPapel
        size={options.size}
        kind={options.kind}
        estilo={options.style}
        business={business}
        link={cartelLink(options.kind, origin, slug)}
        displayUrl={cartelDisplayUrl(origin, slug)}
      />
    </main>
  );
}
