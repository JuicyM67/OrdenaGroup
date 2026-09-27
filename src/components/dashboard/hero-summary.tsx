// Se DESIGN.md §7 "HeroSummary"/"FeatureCard" och docs/tasks/plans/WP-11.md §4 steg 4.
// Beloppet/timmarna är redan lime-markerade i copy-strängen via `splitHighlight` — ingen
// egen mallsträng byggs här (hård regel "UI räknar aldrig ut pengar").
import { ArrowUpRight, List, MessageSquare, Zap } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { strokeArrow, strokeCard } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import { Card } from "@/components/ui/card";
import { inicio } from "@/i18n";
import { formatClp } from "@/lib/format/clp";
import { formatLocalDate } from "@/lib/format/dates";

import { FeatureCard } from "./feature-card";
import { firstName, heroVariant, splitHighlight } from "./inicio-view";
import type { InicioData } from "./types";

export type HeroSummaryProps = {
  ownerName: string;
  week: InicioData["week"];
  features: InicioData["features"];
  detailHref: string;
  onEnviarRecordatorio?: () => void;
};

export function HeroSummary({
  ownerName,
  week,
  features,
  detailHref,
  onEnviarRecordatorio,
}: HeroSummaryProps) {
  const variant = heroVariant(week);
  const horasText = inicio.hero.horas({ n: week.recoveredHours });
  const montoText = formatClp(week.recoveredClp);
  const highlightPart = `${horasText} · ${montoText}`;
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
      className="flex h-68 shrink-0 gap-8"
    >
      <div className="flex flex-1 flex-col justify-between">
        <div className="flex flex-col gap-3">
          <p className="text-15 text-on-dark-muted">
            {inicio.hola({ nombre: firstName(ownerName) })}
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
        <Button asChild variant="inverse" size="md" className="self-start">
          <Link href={detailHref} prefetch={false}>
            {inicio.hero.verDetalle}
            <ArrowUpRight
              aria-hidden="true"
              className="size-4"
              strokeWidth={strokeArrow}
            />
          </Link>
        </Button>
      </div>

      <div className="flex shrink-0 gap-4">
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
            <IconButton
              label={inicio.features.teEchamosDeMenos.enviarRecordatorio}
              tone="ink"
              size={34}
              onClick={onEnviarRecordatorio}
            >
              <ArrowUpRight
                aria-hidden="true"
                className="size-3.75"
                strokeWidth={2.4}
              />
            </IconButton>
          }
        />
      </div>
    </Card>
  );
}
