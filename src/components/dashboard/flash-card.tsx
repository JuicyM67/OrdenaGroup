// Se DESIGN.md §7 "FlashCard" och docs/tasks/plans/WP-11.md §4 steg 6. Mörkt kort i asiden.
// `activeFlash === null`: FRÅGA 4 (planen) rekommenderar samma mörka kort med
// `hoy.accionesRapidas.crearHoraFlash` och en pil-länk till Horas flash, tills
// `inicio.flashCard.vacio` finns (WP-03b). Det tillståndet byggs inte i design lab än — det
// här är bara en säker, icke-kraschande fallback om `activeFlash` skulle vara `null`.
import { ArrowUpRight, Zap } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { strokeArrow, strokeCard } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import { hoy, inicio } from "@/i18n";
import { SANTIAGO, formatDate, formatTime } from "@/lib/format/dates";

import { mustParseInstant } from "./inicio-view";
import type { InicioData } from "./types";

export type FlashCardProps = {
  activeFlash: InicioData["activeFlash"];
  href: string;
};

function IconTile() {
  return (
    <span
      aria-hidden="true"
      className="flex size-14 shrink-0 items-center justify-center rounded-icon bg-lime text-ink"
    >
      <Zap className="size-6.5" strokeWidth={strokeCard} />
    </span>
  );
}

function ShareLink({ href, label }: { href: string; label: string }) {
  return (
    <IconButton asChild size={44} tone="surface" label={label}>
      <Link href={href} prefetch={false}>
        <ArrowUpRight
          aria-hidden="true"
          className="size-4.5"
          strokeWidth={strokeArrow}
        />
      </Link>
    </IconButton>
  );
}

export function FlashCard({ activeFlash, href }: FlashCardProps) {
  if (!activeFlash) {
    return (
      <Card
        as="section"
        aria-label={hoy.accionesRapidas.crearHoraFlash}
        tone="dark"
        radius="card"
        padding="none"
        className="flex flex-1 items-center gap-4 px-5.5 py-5"
      >
        <IconTile />
        <div className="flex-1 text-16 font-bold">
          {hoy.accionesRapidas.crearHoraFlash}
        </div>
        <ShareLink href={href} label={hoy.accionesRapidas.crearHoraFlash} />
      </Card>
    );
  }

  const start = mustParseInstant(activeFlash.start, "FlashCard");

  return (
    <Card
      as="section"
      aria-label={inicio.flashCard.titulo}
      tone="dark"
      radius="card"
      padding="none"
      className="flex flex-1 items-center gap-4 px-5.5 py-5"
    >
      <IconTile />
      <div className="flex-1">
        <div className="text-12 text-on-dark-muted">
          {inicio.flashCard.titulo}
        </div>
        <div className="mt-0.5 text-16 font-bold">
          {inicio.flashCard.fechaHoraDescuento({
            fecha: formatDate(start, SANTIAGO, "weekdayDayShort"),
            hora: formatTime(start, SANTIAGO),
            porcentaje: activeFlash.discountPct,
          })}
        </div>
        <div className="mt-0.5 text-12 text-on-dark-muted">
          {inicio.flashCard.detalle({
            servicio: activeFlash.service,
            profesional: activeFlash.staff,
          })}
        </div>
      </div>
      <ShareLink href={href} label={inicio.flashCard.compartir} />
    </Card>
  );
}
