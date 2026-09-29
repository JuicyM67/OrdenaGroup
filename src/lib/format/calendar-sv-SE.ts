/**
 * Namn på veckodagar och månader (sv-SE), samma form som calendar-es-CL.ts:
 * egna tabeller i stället för ICU-text (samma sträng i server och webbläsare).
 * Veckodagar med versal som i es-CL-tabellerna (rubriker, början av rad);
 * `formatLocalDate` ger gemener för löptext. Alla strängar är NFC.
 */

/** ISO-ordning: index 0 = måndag. */
export const WEEKDAY_LONG: readonly string[] = [
  "Måndag",
  "Tisdag",
  "Onsdag",
  "Torsdag",
  "Fredag",
  "Lördag",
  "Söndag",
];

export const WEEKDAY_SHORT: readonly string[] = [
  "Mån",
  "Tis",
  "Ons",
  "Tor",
  "Fre",
  "Lör",
  "Sön",
];

/** Två bokstäver (kalenderrubrik). Index 0 = måndag. */
export const WEEKDAY_MIN: readonly string[] = [
  "Må",
  "Ti",
  "On",
  "To",
  "Fr",
  "Lö",
  "Sö",
];

/** Gemener, som i löptext ("2 oktober"). Index 0 = januari. */
export const MONTH_LONG: readonly string[] = [
  "januari",
  "februari",
  "mars",
  "april",
  "maj",
  "juni",
  "juli",
  "augusti",
  "september",
  "oktober",
  "november",
  "december",
];

/** Tre bokstäver, utan punkt. */
export const MONTH_SHORT: readonly string[] = [
  "jan",
  "feb",
  "mar",
  "apr",
  "maj",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];
