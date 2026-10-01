// Se DESIGN.md §7 "HeroSummary"/"FeatureCard" och docs/tasks/plans/WP-11.md §4 steg 4.
// Beloppet/timmarna är redan lime-markerade i copy-strängen via `splitHighlight` — ingen
// egen mallsträng byggs här (hård regel "UI räknar aldrig ut pengar").
//
// WP-47: "Ver detalle" (länkade till `#detalle-semana`, ingen sektion med det id:t finns)
// döljs tills funktionen finns — WP-xx: visas när funktionen finns.
//
// WP-31: "Enviar recordatorio" återinförs som en länk (`winbackHref`, satt av
// `/app/inicio/page.tsx` till `/app/clientes/utskick/nytt?audiencia=inactivos` — bara om
// den inloggade kan skicka utskick, `can_manage_all_bookings`/ägare) i stället för den
// gamla `onClick`-callbacken: ren navigering, ingen dialog att koppla.
import { ArrowUpRight, List, MessageSquare, Zap } from "lucide-react";
import Link from "next/link";

import { strokeCard } from "@/components/ui/icons";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { inicio } from "@/i18n";
import { formatMoney } from "@/lib/format/money";
import { formatLocalDate } from "@/lib/format/dates";

import { FeatureCard } from "./feature-card";
import { heroVariant, splitHighlight } from "./inicio-view";
import type { InicioData } from "./types";

export type HeroSummaryProps = {
  /** "Camila" — förnamnet kommer redan klart från datan (`owner.firstName`), ingen egen
   * namnformatering här. */
  ownerFirstName: string;
  week: InicioData["week"];
  features: InicioData["features"];
  /** WP-31: `undefined` döljer knappen (ingen behörighet att skicka utskick). */
  winbackHref?: string;
};

export function HeroSummary({
  ownerFirstName,
  week,
  features,
  winbackHref,
}: HeroSummaryProps) {
  const variant = heroVariant(week);
  const horasText = inicio.hero.horas({ n: week.recoveredHours });
  const montoText = formatMoney(week.recoveredClp);
  const highlightPart = inicio.hero.destacado({
    horas: horasText,
    monto: montoText,
  });
  const summaryFull =
    variant === "recuperado"
      ? inicio.hero.resumen({ horas: horasText, monto: montoText })
      : inicio.hero.resumenVacio;
  const [before, highlighted, after] = splitHighlight(
    summaryFull,
    variant === "recuperado" ? highlightPart : "",
  );

  return (
    <Card
      as="section"
      aria-label={inicio.resumenSemanaAria}
      tone="dark"
      radius="hero"
      padding="xl"
      className="flex flex-col gap-6 lg:h-68 lg:shrink-0 lg:flex-row lg:gap-8"
    >
      <div className="flex flex-1 flex-col justify-between gap-6 lg:gap-0">
        <div className="flex flex-col gap-3">
          <p className="text-15 text-on-dark-muted">
            {inicio.hola({ nombre: ownerFirstName })}
          </p>
          <p className="font-display text-40 leading-hero font-semibold tracking-display">
            {variant === "recuperado"
              ? inicio.hero.titulo
              : inicio.hero.tituloVacio}
          </p>
          <p className="text-16 leading-relaxed text-on-dark-soft">
            {before}
            {highlighted ? (
              <span className="font-bold text-lime">{highlighted}</span>
            ) : null}
            {after}
          </p>
        </div>
        {/* WP-47: "Ver detalle" döljs — WP-xx: visas när funktionen finns. */}
      </div>

      <div className="flex flex-col gap-3 lg:shrink-0 lg:flex-row lg:gap-4">
        <FeatureCard
          index={1}
          tone="lilac"
          icon={<List className="size-7.5" strokeWidth={strokeCard} />}
          title={inicio.features.listaEspera.titulo}
          meta={inicio.features.listaEspera.resumen({
            n: features.waitlist.count,
            dia: formatLocalDate(features.waitlist.day, "weekdayLongLower"),
          })}
          progress={features.waitlist.progress}
        />
        <FeatureCard
          index={2}
          tone="peach"
          icon={<Zap className="size-7.5" strokeWidth={strokeCard} />}
          title={inicio.features.horasFlash.titulo}
          meta={inicio.features.horasFlash.resumen({
            activas: features.flash.active,
            reservadas: features.flash.booked,
          })}
          progress={features.flash.progress}
        />
        <FeatureCard
          index={3}
          tone="lime"
          icon={<MessageSquare className="size-7.5" strokeWidth={strokeCard} />}
          title={inicio.features.teEchamosDeMenos.titulo}
          meta={inicio.features.teEchamosDeMenos.resumen({
            n: features.winback.count,
          })}
          action={
            winbackHref ? (
              <IconButton
                label={inicio.features.teEchamosDeMenos.enviarRecordatorio}
                tone="ink"
                size={34}
                asChild
                // Knappen ligger i ett lime FeatureCard, men FeatureCard i sig sitter inuti
                // hero-kortets `data-surface="dark"` (card.tsx): utan denna override läcker
                // `on-dark:focus-visible:outline-lime` (icon-button.tsx) igenom och ger lime
                // fokusring på lime bakgrund (osynlig, QA).
                className="on-dark:focus-visible:outline-ink"
              >
                <Link href={winbackHref} prefetch={false}>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-3.75"
                    strokeWidth={2.4}
                  />
                </Link>
              </IconButton>
            ) : undefined
          }
        />
      </div>
    </Card>
  );
}
