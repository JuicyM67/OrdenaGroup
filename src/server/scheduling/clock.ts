import "server-only";

/**
 * Den enda platsen i schemamotorn som läser systemklockan (gränstest).
 * Motorn tar alltid emot `now` som argument; anropare i WP-20/21 skickar
 * `systemClock()` och tester en fast tid.
 */
export function systemClock(): Date {
  return new Date();
}
