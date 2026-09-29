/**
 * Sammanfattningstext och pris i BookingBar. Bara text via `@/i18n`, bara formatering
 * via `src/lib/format/`. UI räknar aldrig ut priser eller tider — allt kommer redan
 * färdigt i `BookingSlot`/`BookingService` (hård regel 2, planens R "Specifikt för
 * Reserva").
 */
import { reserva } from "@/i18n";
import { formatMoney } from "@/lib/format/money";
import {
  formatLocalDate,
  formatTime,
  APP_TZ,
  type LocalDate,
} from "@/lib/format/dates";

import type { BookingSelection } from "./flow-state";
import type { BookingPageData, DayAvailability } from "./types";

export function findDay(
  data: BookingPageData,
  selection: Pick<BookingSelection, "serviceId" | "staffId">,
  date: LocalDate | null,
): DayAvailability | null {
  if (!selection.serviceId || !date) return null;
  // Ingen fallback till "any" för en namngiven profesional utan egen data
  // (qa-granskning, item 13): annars visas Cualquieras tider som om de vore
  // den valda profesionalens, i stället för `vacios.sinHorariosEnRango`.
  const days = data.availability[selection.serviceId]?.[selection.staffId];
  return days?.find((d) => d.date === date) ?? null;
}

/** `reserva.resumen.*`: dag = `weekdayDayShort`, tid = `formatTime`, profesional
 * utelämnas när "Cualquiera" (R8) är vald. */
export function summaryText(
  selection: BookingSelection,
  data: BookingPageData,
  day: DayAvailability | null,
): string {
  const service = data.services.find((s) => s.id === selection.serviceId);
  if (!service || !selection.date) return "";
  const dia = formatLocalDate(selection.date, "weekdayDayShort");

  if (day?.state === "full") {
    return reserva.resumen.listaEspera({ servicio: service.name, dia });
  }

  const slot = day?.slots.find((s) => s.id === selection.slotId);
  if (!slot) return "";
  const hora = formatTime(new Date(slot.start), APP_TZ);
  const staff = data.staff.find((p) => p.id === selection.staffId);
  if (!staff) {
    return reserva.resumen.sinProfesional({
      servicio: service.name,
      dia,
      hora,
    });
  }
  return reserva.resumen.conProfesional({
    servicio: service.name,
    dia,
    hora,
    profesional: staff.name,
  });
}

export interface BarPrice {
  readonly total: string;
  readonly old: string | null;
}

/** Priset i BookingBar, direkt ur datan (aldrig `slot.priceClp * 0.8` i klienten). */
export function barPrice(slot: {
  priceClp: number;
  originalPriceClp?: number;
}): BarPrice {
  return {
    total: formatMoney(slot.priceClp),
    old:
      slot.originalPriceClp !== undefined
        ? formatMoney(slot.originalPriceClp)
        : null,
  };
}
