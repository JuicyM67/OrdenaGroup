// Fixtures för Inicio (Main.dc.html), hämtade ur referensens renderVals(). Bara data,
// ingen UI-text (den kommer från @/i18n) och ingen egen formatering (den kommer från
// src/lib/format/) — se docs/tasks/plans/WP-11.md §4 steg 2. Initialer och procent räknas
// vid renderingen (initialsOf/formatPercent), inte lagrade som text här.
import type { InicioData, TodayBooking } from "@/components/dashboard/types";
import { parseLocalDate, type LocalDate } from "@/lib/format/dates";

function mustLocalDate(s: string): LocalDate {
  const r = parseLocalDate(s);
  if (!r.ok) throw new Error(`fixture: fecha inválida "${s}"`);
  return r.value;
}

const NOW = "2026-10-02T14:40:00-03:00";

const REFERENCE_TODAY: TodayBooking[] = [
  {
    id: "b-joaquin",
    start: "2026-10-02T15:00:00-03:00",
    end: "2026-10-02T15:45:00-03:00",
    clientName: "Joaquín Rivas",
    service: "Corte + barba",
    staff: "Diego",
    tint: "lilac-100",
    status: "confirmed",
    depositPaid: false,
    confirmedByCustomer: true,
  },
  {
    id: "b-valentina",
    start: "2026-10-02T15:45:00-03:00",
    end: "2026-10-02T16:15:00-03:00",
    clientName: "Valentina Soto",
    service: "Corte clásico",
    staff: "Matías",
    tint: "peach-50",
    status: "confirmed",
    depositPaid: true,
    confirmedByCustomer: false,
  },
  {
    id: "b-ignacio",
    start: "2026-10-02T16:30:00-03:00",
    end: "2026-10-02T16:50:00-03:00",
    clientName: "Ignacio Pérez",
    service: "Perfilado de barba",
    staff: "Tomás",
    tint: "lime-50",
    status: "pending_payment",
    depositPaid: false,
    confirmedByCustomer: false,
  },
];

const LLENO_NAMES = [
  "Joaquín Rivas",
  "Valentina Soto",
  "Ignacio Pérez",
  "Camila Reyes",
  "Benjamín Silva",
  "Antonia Vidal",
  "Martín Toro",
  "Josefa Muñoz",
  "Diego Contreras",
  "Florencia Rojas",
  "Tomás Araya",
  "Agustina León",
  "Vicente Fuentes",
  "Emilia Castro",
] as const;

const LLENO_TINTS: NonNullable<TodayBooking["tint"]>[] = [
  "lilac-100",
  "peach-50",
  "lime-50",
  "sky",
  "lilac",
];

/**
 * 14 filas para el test de scroll interno de "Agenda de hoy" (?estado=lleno, §5). Todas
 * empiezan después de `NOW` (14:40): `upcomingToday` (inicio-view.ts) filtra las que ya
 * terminaron, así que filas antes de `NOW` no contarían para el test de scroll.
 */
function buildLlenoToday(): TodayBooking[] {
  return LLENO_NAMES.map((clientName, i) => {
    const hour = 15 + Math.floor(i / 2);
    const minute = i % 2 === 0 ? "00" : "30";
    const start = `2026-10-02T${String(hour).padStart(2, "0")}:${minute}:00-03:00`;
    const endMinute = i % 2 === 0 ? "30" : "00";
    const endHour = i % 2 === 0 ? hour : hour + 1;
    const end = `2026-10-02T${String(endHour).padStart(2, "0")}:${endMinute}:00-03:00`;
    return {
      id: `lleno-${i}`,
      start,
      end,
      clientName,
      service: "Corte + barba",
      staff: "Diego",
      tint: LLENO_TINTS[i % LLENO_TINTS.length]!,
      status: "confirmed",
      depositPaid: i % 3 === 0,
      confirmedByCustomer: i % 3 !== 0,
    } satisfies TodayBooking;
  });
}

/**
 * "Próximas reservas" (WP-fixar-sv): a propósito con filas en semanas futuras (no solo la
 * semana de `NOW`), para mostrar que la tarjeta no depende de qué semana mira la Agenda.
 */
const UPCOMING: TodayBooking[] = [
  {
    id: "up-joaquin",
    start: "2026-10-02T15:00:00-03:00",
    end: "2026-10-02T15:45:00-03:00",
    clientName: "Joaquín Rivas",
    service: "Corte + barba",
    staff: "Diego",
    tint: "lilac-100",
    status: "confirmed",
    depositPaid: false,
    confirmedByCustomer: true,
  },
  {
    id: "up-valentina",
    start: "2026-10-03T11:00:00-03:00",
    end: "2026-10-03T11:30:00-03:00",
    clientName: "Valentina Soto",
    service: "Corte clásico",
    staff: "Matías",
    tint: "peach-50",
    status: "confirmed",
    depositPaid: true,
    confirmedByCustomer: false,
  },
  {
    id: "up-camila",
    start: "2026-10-06T09:30:00-03:00",
    end: "2026-10-06T10:15:00-03:00",
    clientName: "Camila Reyes",
    service: "Corte + barba",
    staff: "Tomás",
    tint: "lime-50",
    status: "pending_payment",
    depositPaid: false,
    confirmedByCustomer: false,
  },
  {
    id: "up-benjamin",
    start: "2026-10-12T16:00:00-03:00",
    end: "2026-10-12T16:30:00-03:00",
    clientName: "Benjamín Silva",
    service: "Corte clásico",
    staff: "Diego",
    tint: "sky",
    status: "confirmed",
    depositPaid: false,
    confirmedByCustomer: true,
  },
];

const ACTIVE_FLASH = {
  start: "2026-10-06T11:30:00-03:00",
  discountPct: 20,
  service: "Corte + barba",
  staff: "Diego",
} satisfies NonNullable<InicioData["activeFlash"]>;

const BASE = {
  now: NOW,
  business: { name: "Barbería Norte", comuna: "Providencia" },
  owner: { name: "Camila R.", firstName: "Camila" },
  notifications: { count: 1 }, // referensens prick "Notificaciones"
  week: { recoveredHours: 4, recoveredClp: 72_000 },
  features: {
    waitlist: {
      count: 3,
      day: mustLocalDate("2026-10-03"), // sábado
      progress: 0.6,
    },
    flash: { active: 2, booked: 1, progress: 0.5 },
    winback: { count: 12 },
  },
  stats: {
    bookingsToday: 14,
    toConfirm: 2,
    revenueWeekClp: 486_000,
    // Puntos relativos (0–100) para el sparkline, misma forma en "S" que la referencia
    // (sube, baja, sube, baja, sube): ver docs/tasks/plans/WP-11.md R3.
    revenueSeries: [22, 40, 28, 55, 20, 62, 46],
    noShowPct: 4,
    noShowTrend: "down",
  },
  upcoming: UPCOMING,
  calendar: {
    month: { year: 2026, month: 10 },
    markedDates: [
      "2026-10-02",
      "2026-10-03",
      "2026-10-06",
      "2026-10-07",
      "2026-10-09",
      "2026-10-10",
      "2026-10-13",
    ].map(mustLocalDate),
  },
  activeFlash: ACTIVE_FLASH,
} satisfies Omit<InicioData, "today">;

export type InicioEstado = "referencia" | "vacio" | "lleno" | "sin-flash";

export function getInicioFixtures(estado: InicioEstado): InicioData {
  switch (estado) {
    case "vacio":
      return {
        ...BASE,
        week: { recoveredHours: 0, recoveredClp: 0 },
        today: [],
      } satisfies InicioData;
    case "lleno":
      return { ...BASE, today: buildLlenoToday() } satisfies InicioData;
    case "sin-flash":
      return {
        ...BASE,
        activeFlash: null,
        today: REFERENCE_TODAY,
      } satisfies InicioData;
    case "referencia":
    default:
      return { ...BASE, today: REFERENCE_TODAY } satisfies InicioData;
  }
}
