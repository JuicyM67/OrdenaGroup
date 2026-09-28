/**
 * Fixturer för Reserva, hämtade ur `docs/design/reference/Reserva.dc.html`
 * (`renderVals()`) och typade med `satisfies BookingPageData` (planens steg 1).
 *
 * Används bara av `/design-lab/reserva` sedan WP-20: den riktiga routen
 * `/{slug}` läser numera riktig data via `src/server/bookings/page-data.ts`
 * (docs/tasks/plans/WP-20.md). Server-action-stubben som svarar ur de här
 * fixturerna flyttade till `./actions.ts` i samma PR.
 */
import type {
  BookingAvailability,
  BookingPageData,
  BookingService,
  BookingSlot,
  BookingStaffMember,
} from "@/components/booking/types";
import {
  fromLocal,
  SANTIAGO,
  type LocalDate,
  type LocalTime,
} from "@/lib/format/dates";

const d = (s: string) => s as LocalDate;
const t = (s: string) => s as LocalTime;

function iso(date: LocalDate, time: LocalTime): string {
  return fromLocal(date, time, SANTIAGO).toISOString();
}

const TIMES = [
  "10:00",
  "10:45",
  "11:30",
  "12:15",
  "15:00",
  "16:30",
  "17:15",
] as const;

function slotsFor(
  serviceId: string,
  date: LocalDate,
  priceClp: number,
  opts?: {
    flashTime?: string;
    flashPriceClp?: number;
    discountPct?: number;
    omit?: readonly string[];
  },
): BookingSlot[] {
  return TIMES.filter((time) => !opts?.omit?.includes(time)).map((time) => {
    const isFlash = opts?.flashTime === time;
    const base: BookingSlot = {
      id: `${serviceId}-${date}-${time.replace(":", "")}`,
      start: iso(date, t(time)),
      priceClp: isFlash ? (opts?.flashPriceClp ?? priceClp) : priceClp,
    };
    return isFlash
      ? {
          ...base,
          originalPriceClp: priceClp,
          discountPct: opts?.discountPct,
        }
      : base;
  });
}

/** Exporterad så att design lab (`?estado=`) kan peka på samma dagar. */
export const DAY = {
  vie2: d("2026-10-02"),
  sab3: d("2026-10-03"),
  lun5: d("2026-10-05"),
  mar6: d("2026-10-06"),
  mie7: d("2026-10-07"),
  jue8: d("2026-10-08"),
};

function daysFor(
  serviceId: string,
  priceClp: number,
  opts?: { omit?: readonly string[]; noFlash?: boolean },
) {
  const flashOpts =
    !opts?.noFlash && serviceId === "cb"
      ? {
          flashTime: "11:30",
          flashPriceClp: 14400,
          discountPct: 20,
          omit: opts?.omit,
        }
      : opts;
  return [
    {
      date: DAY.vie2,
      state: "open" as const,
      hasFlash: false,
      slots: slotsFor(serviceId, DAY.vie2, priceClp, opts),
    },
    {
      date: DAY.sab3,
      state: "full" as const,
      hasFlash: false,
      slots: [],
    },
    {
      date: DAY.lun5,
      state: "open" as const,
      hasFlash: false,
      slots: slotsFor(serviceId, DAY.lun5, priceClp, opts),
    },
    {
      date: DAY.mar6,
      state: "open" as const,
      hasFlash: !opts?.noFlash && serviceId === "cb",
      slots: slotsFor(serviceId, DAY.mar6, priceClp, flashOpts),
    },
    {
      date: DAY.mie7,
      state: "open" as const,
      hasFlash: false,
      slots: slotsFor(serviceId, DAY.mie7, priceClp, opts),
    },
    {
      date: DAY.jue8,
      state: "open" as const,
      hasFlash: false,
      slots: slotsFor(serviceId, DAY.jue8, priceClp, opts),
    },
  ];
}

/** Jue 8 17:15, Corte + barba, Cualquiera — den enda tid som server-action-stubben
 * (`./actions.ts`) svarar `slot_taken` på (planens steg 1). */
export const SLOT_TAKEN_ID = "cb-2026-10-08-1715";

const services: readonly BookingService[] = [
  {
    id: "c",
    name: "Corte clásico",
    durationMin: 35,
    priceClp: 12000,
    tint: "lilac",
  },
  {
    id: "cb",
    name: "Corte + barba",
    durationMin: 50,
    priceClp: 18000,
    tint: "peach",
  },
  {
    id: "b",
    name: "Perfilado de barba",
    durationMin: 20,
    priceClp: 8000,
    tint: "lime",
  },
];

const staff: readonly BookingStaffMember[] = [
  { id: "diego", name: "Diego" },
  { id: "matias", name: "Matías" },
  { id: "tomas", name: "Tomás" },
];

const availability: BookingAvailability = {
  c: { any: daysFor("c", 12000) },
  cb: {
    any: daysFor("cb", 18000),
    diego: daysFor("cb", 18000, { omit: ["17:15"] }),
    matias: daysFor("cb", 18000, { omit: ["17:15"] }),
    tomas: daysFor("cb", 18000, { omit: ["17:15"] }),
  },
  b: { any: daysFor("b", 8000) },
};

/** "2026-10-02T09:00:00-03:00" = viernes 2 de octubre de 2026, 09:00 en Santiago
 * (planens steg 1). Injicerat, används aldrig via `new Date()` i komponenterna. */
export const NOW = "2026-10-02T09:00:00-03:00";

export const barberiaNorte: BookingPageData = {
  now: NOW,
  business: {
    slug: "barberia-norte",
    name: "Barbería Norte",
    comuna: "Providencia",
    city: "Santiago",
    weekdaysOpen: [1, 2, 3, 4, 5, 6],
    open: t("10:00"),
    close: t("19:00"),
    cancelWindowHours: 4,
    status: "active",
  },
  services,
  staff,
  availability,
} satisfies BookingPageData;

/** Ett andra, fiktivt företag för tenant-isoleringstestet (steg 1). */
export const estudioSur: BookingPageData = {
  now: NOW,
  business: {
    slug: "estudio-sur",
    name: "Estudio Sur",
    comuna: "Ñuñoa",
    city: "Santiago",
    weekdaysOpen: [2, 3, 4, 5, 6],
    open: t("09:00"),
    close: t("18:00"),
    cancelWindowHours: 2,
    status: "active",
  },
  services: [
    {
      id: "m",
      name: "Manicure",
      durationMin: 40,
      priceClp: 15000,
      tint: "lilac",
    },
  ],
  staff: [{ id: "valentina", name: "Valentina" }],
  availability: {
    m: {
      any: [
        {
          date: DAY.mar6,
          state: "open",
          hasFlash: false,
          slots: slotsFor("m", DAY.mar6, 15000).slice(0, 3),
        },
      ],
    },
  },
} satisfies BookingPageData;

/** `status: "frozen"` (steg 1): headern visas, inga steg. */
export const barberiaPausada: BookingPageData = {
  now: NOW,
  business: {
    slug: "barberia-pausada",
    name: "Barbería Pausada",
    comuna: "Providencia",
    city: "Santiago",
    weekdaysOpen: [1, 2, 3, 4, 5, 6],
    open: t("10:00"),
    close: t("19:00"),
    cancelWindowHours: 4,
    status: "frozen",
  },
  services: [],
  staff: [],
  availability: {},
} satisfies BookingPageData;

/** Utan tjänster (`vacios.sinServicios`, steg 8) — skilt från `barberiaPausada`
 * (som är `frozen`, en annan tom vy). */
export const sinServicios: BookingPageData = {
  now: NOW,
  business: {
    slug: "sin-servicios-demo",
    name: "Salón Nuevo",
    comuna: "Providencia",
    city: "Santiago",
    weekdaysOpen: [1, 2, 3, 4, 5, 6],
    open: t("10:00"),
    close: t("19:00"),
    cancelWindowHours: 4,
    status: "active",
  },
  services: [],
  staff: [],
  availability: {},
} satisfies BookingPageData;

/** Ett företag med en tjänst utan några dagar alls (`vacios.sinHorariosEnRango`)
 * och en tjänst med en öppen dag utan tider kvar (`vacios.sinHorariosEseDia`),
 * steg 8. Skilt från `barberiaNorte` så att dess referensvy aldrig påverkas. */
export const vaciosDemo: BookingPageData = {
  now: NOW,
  business: {
    slug: "vacios-demo",
    name: "Estudio Vacío",
    comuna: "Providencia",
    city: "Santiago",
    weekdaysOpen: [1, 2, 3, 4, 5, 6],
    open: t("10:00"),
    close: t("19:00"),
    cancelWindowHours: 4,
    status: "active",
  },
  services: [
    {
      id: "x",
      name: "Servicio sin horas",
      durationMin: 30,
      priceClp: 10000,
      tint: "lilac",
    },
    {
      id: "y",
      name: "Servicio con día vacío",
      durationMin: 30,
      priceClp: 10000,
      tint: "peach",
    },
  ],
  staff: [{ id: "ana", name: "Ana" }],
  availability: {
    x: { any: [] },
    y: {
      any: [{ date: DAY.vie2, state: "open", hasFlash: false, slots: [] }],
    },
  },
} satisfies BookingPageData;

export const fixtureBusinesses: Record<string, BookingPageData> = {
  [barberiaNorte.business.slug]: barberiaNorte,
  [estudioSur.business.slug]: estudioSur,
  [barberiaPausada.business.slug]: barberiaPausada,
  [sinServicios.business.slug]: sinServicios,
  [vaciosDemo.business.slug]: vaciosDemo,
};
