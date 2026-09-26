/**
 * Sommartidsövergångar i America/Santiago 2020–2030 (tzdata-regeln "Chile":
 * slut "Apr Sun>=2 3:00u", start "Sep Sun>=2 4:00u"; 2022 uppskjuten en vecka).
 * Verifierade mot Node 24.13.0 / ICU 77.1 / tzdata 2025b.
 *
 * Tabellen är underlag för motsvarande pgTAP-test av Postgres tzdata i WP-10
 * (`timestamptz AT TIME ZONE 'America/Santiago'`). Ändra bara när IANA
 * publicerar nya regler för Chile (se SCHEDULING.md, "Tidszon och sommartid").
 */
export type DstTransition = {
  /** "end" = tillbaka till −04 (april), "start" = fram till −03 (september). */
  kind: "end" | "start";
  /** Instanten då offset byts (UTC). */
  utc: string;
  offsetBeforeMinutes: number;
  offsetAfterMinutes: number;
  /** Den lokala dagen som får 25 h (end) eller 23 h (start). */
  localDate: string;
  localDayLengthHours: 23 | 25;
  /** Lokala väggtider [från, till) som förekommer två gånger (end) eller inte alls (start). */
  affectedLocal: { date: string; from: string; to: string };
};

type Row = [kind: "end" | "start", utc: string, localDate: string];

const ROWS: Row[] = [
  ["end", "2020-04-05T03:00:00Z", "2020-04-04"],
  ["start", "2020-09-06T04:00:00Z", "2020-09-06"],
  ["end", "2021-04-04T03:00:00Z", "2021-04-03"],
  ["start", "2021-09-05T04:00:00Z", "2021-09-05"],
  ["end", "2022-04-03T03:00:00Z", "2022-04-02"],
  ["start", "2022-09-11T04:00:00Z", "2022-09-11"],
  ["end", "2023-04-02T03:00:00Z", "2023-04-01"],
  ["start", "2023-09-03T04:00:00Z", "2023-09-03"],
  ["end", "2024-04-07T03:00:00Z", "2024-04-06"],
  ["start", "2024-09-08T04:00:00Z", "2024-09-08"],
  ["end", "2025-04-06T03:00:00Z", "2025-04-05"],
  ["start", "2025-09-07T04:00:00Z", "2025-09-07"],
  ["end", "2026-04-05T03:00:00Z", "2026-04-04"],
  ["start", "2026-09-06T04:00:00Z", "2026-09-06"],
  ["end", "2027-04-04T03:00:00Z", "2027-04-03"],
  ["start", "2027-09-05T04:00:00Z", "2027-09-05"],
  ["end", "2028-04-02T03:00:00Z", "2028-04-01"],
  ["start", "2028-09-03T04:00:00Z", "2028-09-03"],
  ["end", "2029-04-08T03:00:00Z", "2029-04-07"],
  ["start", "2029-09-02T04:00:00Z", "2029-09-02"],
  ["end", "2030-04-07T03:00:00Z", "2030-04-06"],
  ["start", "2030-09-08T04:00:00Z", "2030-09-08"],
];

export const SANTIAGO_DST_TRANSITIONS: readonly DstTransition[] = ROWS.map(
  ([kind, utc, localDate]) =>
    kind === "end"
      ? {
          kind,
          utc,
          offsetBeforeMinutes: -180,
          offsetAfterMinutes: -240,
          localDate,
          localDayLengthHours: 25,
          affectedLocal: { date: localDate, from: "23:00", to: "24:00" },
        }
      : {
          kind,
          utc,
          offsetBeforeMinutes: -240,
          offsetAfterMinutes: -180,
          localDate,
          localDayLengthHours: 23,
          affectedLocal: { date: localDate, from: "00:00", to: "01:00" },
        },
);

/** Snabbåtkomst till övergångarna som testas explicit i planen. */
export const DST_2026_END = "2026-04-05T03:00:00Z";
export const DST_2026_START = "2026-09-06T04:00:00Z";
export const DST_2027_END = "2027-04-04T03:00:00Z";
export const DST_2027_START = "2027-09-05T04:00:00Z";
