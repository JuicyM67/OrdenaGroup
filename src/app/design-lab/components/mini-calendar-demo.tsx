"use client";

import { useState } from "react";

import { addMonths, type YearMonth } from "@/components/ui/mini-calendar/grid";
import {
  MiniCalendar,
  type MiniCalendarLabels,
} from "@/components/ui/mini-calendar/mini-calendar";

// `labels.dayLabel` är en funktion och kan inte skickas från en serverkomponent
// (page.tsx) till den här klientkomponenten — den byggs därför lokalt här.
export function MiniCalendarDemo({
  variant,
  labels,
  markedDates,
  highlightWeekOf,
}: {
  variant: "light" | "dark";
  labels: Omit<MiniCalendarLabels, "dayLabel">;
  markedDates?: ReadonlySet<string>;
  highlightWeekOf?: string;
}) {
  const [month, setMonth] = useState<YearMonth>({ year: 2026, month: 10 });
  const [selected, setSelected] = useState("2026-10-02");
  return (
    <MiniCalendar
      month={month}
      selected={selected}
      today="2026-10-02"
      variant={variant}
      markedDates={markedDates}
      highlightWeekOf={highlightWeekOf}
      // Riktig månadsformatering (namn per språk) hör till WP-04/copy — katalogen visar
      // bara ett fast exempel oavsett vilken månad onPrev/NextMonth har navigerat till.
      labels={{ ...labels, dayLabel: (date) => date }}
      onSelect={setSelected}
      onPrevMonth={() => setMonth((m) => addMonths(m, -1))}
      onNextMonth={() => setMonth((m) => addMonths(m, 1))}
    />
  );
}
