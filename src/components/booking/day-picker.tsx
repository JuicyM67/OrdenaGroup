// DayPicker — Reserva.dc.html rad 60–73. Dagarna visas en vecka i taget (mån–sön) i
// ett fast rutnät med pilar för föregående/nästa vecka, i stället för en sidledes
// scroll. Dagar utan bokningsbara tider (stängt, passerat) står kvar som tonade
// rutor så att veckodagarna alltid hamnar i samma kolumn.
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { IconButton } from "@/components/ui/icon-button";
import { reserva } from "@/i18n";
import {
  addLocalDays,
  formatLocalDate,
  startOfLocalWeek,
  type LocalDate,
} from "@/lib/format/dates";

import { DayButton } from "./day-button";
import type { DayAvailability } from "./types";

export function DayPicker({
  headingId,
  days,
  selectedDate,
  onSelect,
  heading = reserva.pasos.diaYHora,
}: {
  headingId: string;
  days: readonly DayAvailability[];
  selectedDate: LocalDate | null;
  onSelect: (date: LocalDate) => void;
  /** Rubrikens text (standard "Dag och tid" med stegnummer). */
  heading?: string;
}) {
  const first = days[0]?.date ?? null;
  const last = days[days.length - 1]?.date ?? null;
  const anchor = selectedDate ?? first;
  const anchorWeek = anchor ? startOfLocalWeek(anchor) : null;

  // Veckan följer det valda datumet; pilarna flyttar bara visningen. När valet
  // ändras utifrån (ny tjänst/person) hoppar vyn tillbaka till valets vecka.
  const [shown, setShown] = useState<{
    anchor: LocalDate | null;
    week: LocalDate | null;
  }>({ anchor: anchorWeek, week: anchorWeek });
  let week = shown.week;
  if (shown.anchor !== anchorWeek) {
    week = anchorWeek;
    setShown({ anchor: anchorWeek, week: anchorWeek });
  }

  if (!week || !first || !last) return null;

  const byDate = new Map(days.map((d) => [d.date, d]));
  const weekDates = Array.from({ length: 7 }, (_, i) => addLocalDays(week, i));
  const canPrev = week > startOfLocalWeek(first);
  const canNext = addLocalDays(week, 7) <= last;
  const monthDate =
    weekDates.find((d) => d === selectedDate) ??
    weekDates.find((d) => byDate.has(d)) ??
    week;

  function go(delta: number) {
    if (!week) return;
    setShown((s) => ({ ...s, week: addLocalDays(week, delta * 7) }));
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-16 leading-event font-bold text-ink">
          {heading}
        </h2>
        <div className="flex items-center gap-1.5">
          <span aria-live="polite" className="mr-1 text-13 text-muted">
            {formatLocalDate(monthDate, "month")}
          </span>
          <IconButton
            size={36}
            label={reserva.dia.semanaAnterior}
            disabled={!canPrev}
            onClick={() => {
              go(-1);
            }}
          >
            <ChevronLeft aria-hidden="true" className="size-4.5" />
          </IconButton>
          <IconButton
            size={36}
            label={reserva.dia.semanaSiguiente}
            disabled={!canNext}
            onClick={() => {
              go(1);
            }}
          >
            <ChevronRight aria-hidden="true" className="size-4.5" />
          </IconButton>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {weekDates.map((date) => {
          const day = byDate.get(date);
          if (!day) {
            return (
              <div
                key={date}
                aria-hidden="true"
                className="flex h-20 flex-col items-center justify-center gap-0.5 rounded-panel text-muted opacity-50"
              >
                <span className="text-12 font-semibold">
                  {formatLocalDate(date, "weekdayShort")}
                </span>
                <span className="font-display text-22 font-bold">
                  {Number(date.slice(8, 10))}
                </span>
                <span className="size-1.5" />
              </div>
            );
          }
          return (
            <DayButton
              key={date}
              date={date}
              selected={selectedDate === date}
              full={day.state === "full"}
              flash={day.hasFlash}
              onSelect={() => {
                onSelect(date);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
