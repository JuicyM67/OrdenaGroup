"use client";

// Fliken "QR" i Ajustes (WP-95, D-079): två skyltar att skriva ut, bokningsskylten
// (A3/A4/A5) och mini-skylten "Crea tu cuenta" (A6 fyra per A4, eller A5), i tre stilar.
// Förhandsvisningen är samma komponent som utskriften (`Cartel`, mått i cqw). "Descargar
// PDF" öppnar utskriftssidan i en ny flik; där väljer man "Guardar como PDF". Inget sparas.
// Ingen *.dc.html-referens; formspråket är Ajustes vita kort, som "Comparte tu link".
import { Download } from "lucide-react";
import { useId, useState } from "react";

import { Cartel } from "@/components/carteles/cartel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { strokeCard } from "@/components/ui/icons";
import { Pill } from "@/components/ui/pill";
import { appHref } from "@/config/routes";
import { carteles } from "@/i18n";
import {
  CARTEL_SIZES_FOR,
  CARTEL_STYLES,
  cartelDisplayUrl,
  cartelLink,
  cartelQuery,
  type CartelBusiness,
  type CartelKind,
  type CartelSize,
  type CartelStyle,
} from "@/lib/share/carteles";

const t = carteles;

function Choices<T extends string>({
  label,
  options,
  value,
  text,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  text: (v: T) => string;
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <span id={id} className="text-13 font-semibold text-muted">
        {label}
      </span>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Pill
            key={o}
            selected={value === o}
            onClick={() => {
              onChange(o);
            }}
            className={cn(value !== o && "bg-canvas")}
          >
            {text(o)}
          </Pill>
        ))}
      </div>
    </div>
  );
}

function CartelCard({
  kind,
  title,
  help,
  business,
  origin,
  slug,
}: {
  kind: CartelKind;
  title: string;
  help: string;
  business: CartelBusiness;
  origin: string;
  slug: string;
}) {
  const sizes = CARTEL_SIZES_FOR[kind];
  const [size, setSize] = useState<CartelSize>(sizes[0]!);
  const [style, setStyle] = useState<CartelStyle>("claro");
  const printHref = `${appHref("appAjustesQrImprimir")}?${cartelQuery({ kind, size, style })}`;

  return (
    <Card
      as="section"
      aria-label={title}
      radius="tile"
      padding="lg"
      className="flex min-w-0 flex-col gap-5"
    >
      <div className="flex flex-col gap-1.5">
        <h3 className="text-18 font-bold text-ink">{title}</h3>
        <p className="text-14 leading-body text-muted">{help}</p>
      </div>
      <div className="flex flex-wrap items-start gap-6">
        <div
          aria-label={t.vistaPrevia}
          role="figure"
          className="cartel-aspecto w-full max-w-60 shrink-0 overflow-hidden rounded-control shadow-soft"
        >
          <Cartel
            kind={kind}
            estilo={style}
            business={business}
            link={cartelLink(kind, origin, slug)}
            displayUrl={cartelDisplayUrl(origin, slug)}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Choices
            label={t.opciones.tamano}
            options={sizes}
            value={size}
            text={(s) => t.tamanos[s]}
            onChange={setSize}
          />
          <Choices
            label={t.opciones.estilo}
            options={CARTEL_STYLES}
            value={style}
            text={(s) => t.estilos[s]}
            onChange={setStyle}
          />
          <Button asChild variant="primary" size="md" className="self-start">
            <a href={printHref} target="_blank" rel="noreferrer">
              <Download
                aria-hidden="true"
                className="size-4"
                strokeWidth={strokeCard}
              />
              {t.descargar}
            </a>
          </Button>
          <p className="text-13 leading-body text-muted">{t.ayudaPdf}</p>
        </div>
      </div>
    </Card>
  );
}

export type CartelesSectionProps = {
  slug: string;
  business: CartelBusiness;
  /** `siteOrigin()` (NEXT_PUBLIC_APP_URL): QR-kodernas adress. */
  origin: string;
};

export function CartelesSection({
  slug,
  business,
  origin,
}: CartelesSectionProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-display text-20 font-bold lg:text-22">
          {t.titulo}
        </h2>
        <p className="max-w-160 text-14 leading-body text-muted">{t.intro}</p>
      </div>
      <CartelCard
        kind="reservas"
        title={t.reservas.titulo}
        help={t.reservas.ayuda}
        business={business}
        origin={origin}
        slug={slug}
      />
      <CartelCard
        kind="cuenta"
        title={t.cuenta.titulo}
        help={t.cuenta.ayuda}
        business={business}
        origin={origin}
        slug={slug}
      />
    </div>
  );
}
