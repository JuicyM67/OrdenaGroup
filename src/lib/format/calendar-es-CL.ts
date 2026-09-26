/**
 * Namn på veckodagar och månader (es-CL). Lokaldata för dates.ts, inte copy:
 * egna tabeller i stället för ICU-text, så att server och webbläsare ger samma
 * sträng (inga hydreringsfel, oberoende av ICU-version).
 * Granskas av copywriter-es-cl. Alla strängar är NFC.
 */

/** ISO-ordning: index 0 = lunes. */
export const WEEKDAY_LONG: readonly string[] = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export const WEEKDAY_SHORT: readonly string[] = [
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
  "Dom",
];

/** Gemener, som i löptext ("2 de octubre"). Index 0 = enero. */
export const MONTH_LONG: readonly string[] = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** Tre bokstäver ("sep", inte "sept"). */
export const MONTH_SHORT: readonly string[] = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];
