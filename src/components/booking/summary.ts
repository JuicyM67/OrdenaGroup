/**
 * Sammanfattningstext och pris i BookingBar. Bara text via `@/i18n`, bara formatering
 * via `src/lib/format/`. UI räknar aldrig ut priser eller tider — allt kommer redan
 * färdigt i `BookingSlot`/`BookingService` (hård regel 2, planens R "Specifikt för
 * Reserva").
 */
import { reserva } from "@/i18n";
import { formatClp } from "@/lib/format/clp";
import {
  formatLocalDate,
  formatTime,
  SANTIAGO,
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
  const byStaff = data.availability[selection.serviceId];
  const days = byStaff?.[selection.staffId] ?? byStaff?.any;
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
  const hora = formatTime(new Date(slot.start), SANTIAGO);
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
    total: formatClp(slot.priceClp),
    old:
      slot.originalPriceClp !== undefined
        ? formatClp(slot.originalPriceClp)
        : null,
  };
}
