/**
 * Rena funktioner för profilen (WP-41 steg 4, `/{slug}`). Ingen React, inget
 * `new Date()` — klockan (`now`) kommer alltid från `BookingPageData.now`.
 * UI räknar aldrig ut tillgänglighet eller pris (hård regel 2): allt här
 * bara formaterar text ur redan färdig data (`BookingProfile`).
 */
import { calendario, horarios, negocio, perfil } from "@/i18n";
import {
  APP_TZ,
  formatLocalDate,
  formatLocalTimeRange,
  formatTime,
  formatWeekdayRange,
  parseInstant,
  toLocalDate,
  type IsoWeekday,
} from "@/lib/format/dates";

import type {
  BookingBusiness,
  BookingProfile,
  BookingProfileHours,
  IsoInstant,
} from "./types";

/** Samma mönster som `dashboard/inicio-view.ts`: kastar hellre än att tysta ett datafel. */
export function mustParseInstant(iso: IsoInstant, fn: string): Date {
  const r = parseInstant(iso);
  if (!r.ok) {
    throw new RangeError(`${fn}: instant ogiltig "${iso}" (${r.error})`);
  }
  return r.value;
}

/** Chippen "Abierto ahora · hasta 19:00" / "Cerrado" (design: `ProfilDesktop.dc.html` rad 30). */
export function openChipLabel(openNow: BookingProfile["openNow"]): string {
  return openNow.open
    ? perfil.publico.chips.abiertoAhora({ hasta: openNow.closesAt })
    : perfil.publico.chips.cerrado;
}

/** "Hoy 15:30" / "Vie 2 oct 15:30": ingen `calendario`-nyckel för "mañana" (bara
 * `hoy` finns), så en dag som inte är idag skrivs ut som datum + tid. */
function whenLabel(now: Date, start: Date): string {
  const today = toLocalDate(now, APP_TZ);
  const day = toLocalDate(start, APP_TZ);
  const time = formatTime(start, APP_TZ);
  const dia =
    day === today
      ? calendario.hoy
      : formatLocalDate(day, "weekdayDayMonthShort");
  return `${dia} ${time}`;
}

/** Chippen "Próxima hora: …" i huvudet. `null` = ingen ledig tid inom fönstret (döljs). */
export function nextAvailableChipLabel(
  now: IsoInstant,
  nextAvailable: BookingProfile["nextAvailable"],
): string | null {
  if (!nextAvailable) return null;
  const cuando = whenLabel(
    mustParseInstant(now, "nextAvailableChipLabel"),
    mustParseInstant(nextAvailable.start, "nextAvailableChipLabel"),
  );
  return perfil.publico.chips.proximaHora({ cuando });
}

/** "Idag · Klippning dam" under sidopanelens snabbaste tid. */
export function fastestTimeDetail(
  now: IsoInstant,
  start: IsoInstant,
  serviceName: string,
): string {
  const dia = whenLabelDayOnly(
    mustParseInstant(now, "fastestTimeDetail"),
    mustParseInstant(start, "fastestTimeDetail"),
  );
  return perfil.publico.masRapidoDetalle({ dia, servicio: serviceName });
}

function whenLabelDayOnly(now: Date, start: Date): string {
  const today = toLocalDate(now, APP_TZ);
  const day = toLocalDate(start, APP_TZ);
  return day === today
    ? calendario.hoy
    : formatLocalDate(day, "weekdayDayShort");
}

export type HoursRow = { readonly label: string; readonly value: string };

/**
 * Öppettiderna grupperade per rad ("Lun–Vie 10:00–19:00", "Sáb 10:00–16:00",
 * "Dom Cerrado"): slår ihop intilliggande veckodagar med exakt samma
 * intervall(er), en rad per unikt mönster. `formatWeekdayRange` ger alltid
 * en förkortning (även för en enda dag) — en medveten förenkling mot
 * referensen (som blandar "Lördag"/"Söndag" i fullängd med "Mån–fre"
 * förkortat), se plan-notan i booking-screen.tsx.
 */
export function hoursRows(
  hours: readonly BookingProfileHours[],
): readonly HoursRow[] {
  const byWeekday = new Map<IsoWeekday, BookingProfileHours[]>();
  for (const h of hours) {
    const list = byWeekday.get(h.weekday) ?? [];
    list.push(h);
    byWeekday.set(h.weekday, list);
  }

  function patternOf(weekday: IsoWeekday): string {
    const rows = byWeekday.get(weekday);
    if (!rows || rows.length === 0) return horarios.cerrado;
    return horarios.intervalos({
      rangos: rows.map((r) => formatLocalTimeRange(r.start, r.end)),
    });
  }

  const weekdays: IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];
  const rows: HoursRow[] = [];
  let i = 0;
  while (i < weekdays.length) {
    const start = weekdays[i]!;
    const pattern = patternOf(start);
    let j = i;
    while (j + 1 < weekdays.length && patternOf(weekdays[j + 1]!) === pattern) {
      j++;
    }
    const end = weekdays[j]!;
    rows.push({ label: formatWeekdayRange(start, end), value: pattern });
    i = j + 1;
  }
  return rows;
}

/** `https://www.google.com/maps/search/?api=1&query=<adress>` (plan WP-41: ingen
 * inbäddad karta i v1). */
export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** WP-51: "Barbería · Providencia" en el encabezado (`negocio.rubros[category]`;
 * una categoría desconocida o sin configurar se omite, no se muestra la
 * clave cruda). */
export function businessCategoryLabel(
  category: BookingBusiness["category"],
): string | null {
  if (!category) return null;
  const rubros = negocio.rubros as Record<string, string | undefined>;
  return rubros[category] ?? null;
}

/** Avatartonerna för Personal-korten (design: lilac/peach/sky), cyklade per index —
 * samma mönster som `TINTS` i `page-data.ts` för tjänsternas ikonruta. */
export const STAFF_TONES = ["lilac", "peach", "sky"] as const;
export type StaffTone = (typeof STAFF_TONES)[number];
export function staffTone(index: number): StaffTone {
  return STAFF_TONES[index % STAFF_TONES.length]!;
}
