// DayPicker — Reserva.dc.html rad 60–73. Dagarna visas i sidor om 6 (FRÅGA 4): en
// scrollbehållare med sidor `w-full shrink-0` i stället för att bryta rad, så att den
// första sidan är exakt som referensen oavsett hur många dagar servern skickar.
import { reserva } from "@/i18n";
import { formatLocalDate, type LocalDate } from "@/lib/format/dates";

import { DayButton } from "./day-button";
import type { DayAvailability } from "./types";

const PAGE_SIZE = 6;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

export function DayPicker({
  headingId,
  days,
  selectedDate,
  onSelect,
}: {
  headingId: string;
  days: readonly DayAvailability[];
  selectedDate: LocalDate | null;
  onSelect: (date: LocalDate) => void;
}) {
  const pages = chunk(days, PAGE_SIZE);
  const month = days[0] ? formatLocalDate(days[0].date, "month") : "";

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <h2 id={headingId} className="text-16 font-bold text-ink">
          {reserva.pasos.diaYHora}
        </h2>
        <span className="text-13 text-muted">{month}</span>
      </div>
      <div className="-mx-5 flex snap-x snap-mandatory overflow-x-auto px-5">
        {pages.map((page, i) => (
          <div
            key={`page-${String(i)}`}
            className="flex w-full shrink-0 snap-start gap-2"
          >
            {page.map((day) => (
              <DayButton
                key={day.date}
                date={day.date}
                selected={selectedDate === day.date}
                full={day.state === "full"}
                flash={day.hasFlash}
                onSelect={() => {
                  onSelect(day.date);
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
