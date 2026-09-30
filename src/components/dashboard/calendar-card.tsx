"use client";

// Se DESIGN.md §7 "MiniCalendar" och docs/tasks/plans/WP-11.md §4 steg 6. Klientkomponent:
// `labels.dayLabel` är en funktion och kan inte skickas från en serverkomponent (samma skäl
// som design-lab/components/mini-calendar-demo.tsx, WP-02). Månadsbyte hålls i lokalt
// state; val av dag navigerar till Agendans dagvy (WP-47).
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Card } from "@/components/ui/card";
import { addMonths, type YearMonth } from "@/components/ui/mini-calendar/grid";
import { MiniCalendar } from "@/components/ui/mini-calendar/mini-calendar";
import { calendario, inicio } from "@/i18n";
import { WEEKDAY_MIN } from "@/lib/format/calendar";
import { formatLocalDate, type LocalDate } from "@/lib/format/dates";

// WEEKDAY_MIN är `readonly string[]` (7 element, testat i weekdays.test.ts); MiniCalendar
// vill ha en 7-tuppel — säker assertion, ingen omformatering av innehållet.
const WEEKDAYS_MIN = WEEKDAY_MIN as readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

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
  const router = useRouter();
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
        onSelect={(date) => {
          setSelected(date);
          // WP-47: klick på en dag går till Agendans dagvy för det datumet.
          router.push(`/app/agenda?vista=dia&fecha=${date}`);
        }}
        onPrevMonth={() => setMonth((m) => addMonths(m, -1))}
        onNextMonth={() => setMonth((m) => addMonths(m, 1))}
        labels={{
          title: formatLocalDate(firstOfMonth(month), "monthYear"),
          weekdays: WEEKDAYS_MIN,
          prevMonth: calendario.mesAnterior,
          nextMonth: calendario.mesSiguiente,
          dayLabel: (date) => {
            const base = formatLocalDate(
              date as LocalDate,
              "weekdayDayMonthLong",
            );
            return marked.has(date)
              ? calendario.diaConReservas({ fecha: base })
              : base;
          },
        }}
      />
    </Card>
  );
}
