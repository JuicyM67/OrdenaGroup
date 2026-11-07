// Datum i /admin (es-CL, i appens tidszon America/Santiago). Ersätter de gamla
// `toLocaleString("sv-SE")`-anropen från WP-36. Bara för plattformsytan:
// ägarens skärmar använder presets i `src/lib/format/dates.ts`.
import { APP_TZ } from "@/lib/format/dates";

const DATE: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: APP_TZ,
};

const dateFormat = new Intl.DateTimeFormat("es-CL", DATE);
const dateTimeFormat = new Intl.DateTimeFormat("es-CL", {
  ...DATE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "07-11-2026". */
export function formatAdminDate(value: string | Date): string {
  return dateFormat.format(new Date(value));
}

/** "07-11-2026, 14:03". */
export function formatAdminDateTime(value: string | Date): string {
  return dateTimeFormat.format(new Date(value));
}
