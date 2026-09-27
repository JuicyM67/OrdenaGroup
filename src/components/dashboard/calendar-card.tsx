"use client";

// Se DESIGN.md §7 "MiniCalendar" och docs/tasks/plans/WP-11.md §4 steg 6. Klientkomponent:
// `labels.dayLabel` är en funktion och kan inte skickas från en serverkomponent (samma skäl
// som design-lab/components/mini-calendar-demo.tsx, WP-02). Månadsbyte hålls i lokalt
// state; val av dag markerar bara — navigering till Agenda för den dagen är WP-21 (idé).
//
// TODO(WP-10): byt `WEEKDAYS_MIN` mot `weekdayMin`-preset i src/lib/format/dates.ts när den
// finns (FRÅGA 6) — MiniCalendar tar redan `weekdays` som prop (WP-02), så det är bara den
// hårdkodade arrayen nedan som ska bytas ut, ingen omskrivning av komponenten.
// TODO(WP-03b): lägg till `calendario.diaConReservas({ fecha })` i `dayLabel` när nyckeln
// finns (FRÅGA 7) — pricken är annars ensam bärare av "har bokningar".
import { useState } from "react";

import { Card } from "@/components/ui/card";
import { addMonths, type YearMonth } from "@/components/ui/mini-calendar/grid";
import { MiniCalendar } from "@/components/ui/mini-calendar/mini-calendar";
import { calendario, inicio } from "@/i18n";
import { formatLocalDate, type LocalDate } from "@/lib/format/dates";

const WEEKDAYS_MIN: readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
] = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

function firstOfMonth({ year, month }: YearMonth): LocalDate {
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  return `${y}-${m}-01` as LocalDate;
}

export type CalendarCardProps = {
  month: YearMonth;
  today: LocalDate;
  markedDates: readonly LocalDate[];
};

export function CalendarCard({
  month: initialMonth,
  today,
  markedDates,
}: CalendarCardProps) {
  const [month, setMonth] = useState<YearMonth>(initialMonth);
  const [selected, setSelected] = useState<string>(today);
  const marked = new Set<string>(markedDates);

  return (
    <Card
      as="section"
      aria-label={inicio.calendarioAria}
      radius="card"
      padding="none"
      className="px-5.5 py-5"
    >
      <MiniCalendar
        month={month}
        selected={selected}
        today={today}
        markedDates={marked}
        variant="light"
        onSelect={setSelected}
        onPrevMonth={() => setMonth((m) => addMonths(m, -1))}
        onNextMonth={() => setMonth((m) => addMonths(m, 1))}
        labels={{
          title: formatLocalDate(firstOfMonth(month), "monthYear"),
          weekdays: WEEKDAYS_MIN,
          prevMonth: calendario.mesAnterior,
          nextMonth: calendario.mesSiguiente,
          dayLabel: (date) =>
            formatLocalDate(date as LocalDate, "weekdayDayMonthLong"),
        }}
      />
    </Card>
  );
}
