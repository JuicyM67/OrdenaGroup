// Se DESIGN.md §7 "FlashCard" och docs/tasks/plans/WP-11.md §4 steg 6. Mörkt kort i asiden.
// `activeFlash === null` (FRÅGA 4): samma mörka kort, med `inicio.flashCard.vacio` i stället
// för datum/tid/rabatt.
//
// WP-47: pil-länken till `/app/flash` (skapa/dela en hora flash) döljs — horas flash fas 2
// saknar backend/route än. WP-xx: visas när funktionen finns.
import { Zap } from "lucide-react";

import { Card } from "@/components/ui/card";
import { strokeCard } from "@/components/ui/icons";
import { inicio } from "@/i18n";
import { APP_TZ, formatDate, formatTime } from "@/lib/format/dates";

import { mustParseInstant } from "./inicio-view";
import type { InicioData } from "./types";

export type FlashCardProps = {
  activeFlash: InicioData["activeFlash"];
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

export function FlashCard({ activeFlash }: FlashCardProps) {
  if (!activeFlash) {
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
            {inicio.flashCard.vacio}
          </div>
        </div>
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
            fecha: formatDate(start, APP_TZ, "weekdayDayShort"),
            hora: formatTime(start, APP_TZ),
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
    </Card>
  );
}
