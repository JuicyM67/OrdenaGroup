/**
 * Namntabellerna (calendar-es-CL.ts) för appens språk (`marketConfig.locale`).
 */
import { marketConfig } from "@/config/market";

import * as esCL from "./calendar-es-CL";

export type CalendarLocale = typeof marketConfig.locale;

export type CalendarNames = {
  readonly WEEKDAY_LONG: readonly string[];
  readonly WEEKDAY_SHORT: readonly string[];
  readonly WEEKDAY_MIN: readonly string[];
  readonly MONTH_LONG: readonly string[];
  readonly MONTH_SHORT: readonly string[];
};

const TABLES: Record<CalendarLocale, CalendarNames> = {
  "es-CL": esCL,
};

export function calendarNames(locale: CalendarLocale): CalendarNames {
  return TABLES[locale];
}

/** Appens språk. */
export const APP_LOCALE: CalendarLocale = marketConfig.locale;

const app = TABLES[APP_LOCALE];

export const WEEKDAY_LONG = app.WEEKDAY_LONG;
export const WEEKDAY_SHORT = app.WEEKDAY_SHORT;
export const WEEKDAY_MIN = app.WEEKDAY_MIN;
export const MONTH_LONG = app.MONTH_LONG;
export const MONTH_SHORT = app.MONTH_SHORT;
