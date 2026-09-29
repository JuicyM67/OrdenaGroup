/**
 * Namntabeller per språk (calendar-es-CL.ts, calendar-sv-SE.ts) och tabellerna
 * för den här installationens språk (`marketConfig.locale`, D-025).
 */
import { marketConfig } from "@/config/market";

import * as esCL from "./calendar-es-CL";
import * as svSE from "./calendar-sv-SE";

export type CalendarLocale = "es-CL" | "sv-SE";

export type CalendarNames = {
  readonly WEEKDAY_LONG: readonly string[];
  readonly WEEKDAY_SHORT: readonly string[];
  readonly WEEKDAY_MIN: readonly string[];
  readonly MONTH_LONG: readonly string[];
  readonly MONTH_SHORT: readonly string[];
};

const TABLES: Record<CalendarLocale, CalendarNames> = {
  "es-CL": esCL,
  "sv-SE": svSE,
};

export function calendarNames(locale: CalendarLocale): CalendarNames {
  return TABLES[locale];
}

/** Appens språk (installationens marknad). */
export const APP_LOCALE: CalendarLocale = marketConfig.locale;

const app = TABLES[APP_LOCALE];

export const WEEKDAY_LONG = app.WEEKDAY_LONG;
export const WEEKDAY_SHORT = app.WEEKDAY_SHORT;
export const WEEKDAY_MIN = app.WEEKDAY_MIN;
export const MONTH_LONG = app.MONTH_LONG;
export const MONTH_SHORT = app.MONTH_SHORT;
