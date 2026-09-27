// Referensveckan (28 sep–4 okt 2026), ur docs/design/reference/Agenda.dc.html
// (renderVals()). Bara data här, ingen UI-text (R9/WP-02): `?estado=` väljer tillstånd i
// page.tsx. Se docs/tasks/plans/WP-12.md steg 2.
import type { E164 } from "@/lib/format/phone";
import type { LocalDate, LocalTime } from "@/lib/format/dates";

import type {
  AgendaBlock,
  AgendaBooking,
  AgendaData,
  BookingSource,
  BookingStatus,
} from "@/components/agenda/types";

const DIEGO = "staff-1";
const MATIAS = "staff-2";
const TOMAS = "staff-3";

const STAFF = [
  { id: DIEGO, name: "Diego", initials: "DI", color: 1 as const },
  { id: MATIAS, name: "Matías", initials: "MA", color: 2 as const },
  { id: TOMAS, name: "Tomás", initials: "TO", color: 3 as const },
];

type BookingInput = {
  id: string;
  staffId: string;
  date: string;
  start: string;
  end: string;
  clientName: string;
  service: string;
  priceClp: number;
  depositPaidClp?: number | null;
  source?: BookingSource;
  status?: BookingStatus;
  confirmedByCustomer?: boolean;
  flashPct?: number;
  visitNumber?: number;
  phone?: string;
};

function booking(b: BookingInput): AgendaBooking {
  return {
    id: b.id,
    staffId: b.staffId,
    start: `${b.date}T${b.start}:00-03:00`,
    end: `${b.date}T${b.end}:00-03:00`,
    clientName: b.clientName,
    phone: (b.phone ?? "+56911112222") as E164,
    visitNumber: b.visitNumber ?? 1,
    service: b.service,
    priceClp: b.priceClp,
    depositPaidClp: b.depositPaidClp ?? null,
    source: b.source ?? "web",
    status: b.status ?? "confirmed",
    confirmedByCustomer: b.confirmedByCustomer ?? false,
    ...(b.flashPct !== undefined ? { flashPct: b.flashPct } : {}),
  };
}

const CORTE = 8_000;
const CORTE_BARBA = 12_000;
const BARBA = 6_000;

const bookings: readonly AgendaBooking[] = [
  // lunes 28 sep
  booking({
    id: "bk-lun-1",
    staffId: DIEGO,
    date: "2026-09-28",
    start: "10:00",
    end: "10:35",
    clientName: "Pablo Muñoz",
    service: "Corte",
    priceClp: CORTE,
  }),
  booking({
    id: "bk-lun-2",
    staffId: MATIAS,
    date: "2026-09-28",
    start: "11:00",
    end: "11:50",
    clientName: "Andrés Vega",
    service: "Corte + barba",
    priceClp: CORTE_BARBA,
  }),
  booking({
    id: "bk-lun-3",
    staffId: TOMAS,
    date: "2026-09-28",
    start: "14:30",
    end: "15:05",
    clientName: "Felipe Rojas",
    service: "Corte",
    priceClp: CORTE,
  }),
  // martes 29 sep
  booking({
    id: "bk-mar-1",
    staffId: DIEGO,
    date: "2026-09-29",
    start: "10:30",
    end: "11:20",
    clientName: "Cristóbal Díaz",
    service: "Corte + barba",
    priceClp: CORTE_BARBA,
  }),
  booking({
    id: "bk-mar-2",
    staffId: TOMAS,
    date: "2026-09-29",
    start: "12:00",
    end: "12:35",
    clientName: "Benjamín Silva",
    service: "Corte",
    priceClp: CORTE,
  }),
  booking({
    id: "bk-mar-3",
    staffId: MATIAS,
    date: "2026-09-29",
    start: "15:00",
    end: "15:50",
    clientName: "Tomás Fuentes",
    service: "Corte + barba",
    priceClp: CORTE_BARBA,
  }),
  // miércoles 30 sep
  booking({
    id: "bk-mie-1",
    staffId: MATIAS,
    date: "2026-09-30",
    start: "10:00",
    end: "10:20",
    clientName: "Lucas Herrera",
    service: "Barba",
    priceClp: BARBA,
  }),
  booking({
    id: "bk-mie-2",
    staffId: DIEGO,
    date: "2026-09-30",
    start: "11:00",
    end: "11:35",
    clientName: "Martín Soto",
    service: "Corte",
    priceClp: CORTE,
  }),
  booking({
    id: "bk-mie-3",
    staffId: TOMAS,
    date: "2026-09-30",
    start: "12:00",
    end: "12:50",
    clientName: "Vicente Araya",
    service: "Corte + barba",
    priceClp: CORTE_BARBA,
  }),
  booking({
    id: "bk-mie-4",
    staffId: DIEGO,
    date: "2026-09-30",
    start: "14:30",
    end: "15:05",
    clientName: "Diego Castro",
    service: "Corte",
    priceClp: CORTE,
  }),
  // jueves 1 oct
  booking({
    id: "bk-jue-1",
    staffId: TOMAS,
    date: "2026-10-01",
    start: "10:30",
    end: "11:05",
    clientName: "Sebastián Mora",
    service: "Corte",
    priceClp: CORTE,
  }),
  booking({
    id: "bk-jue-2",
    staffId: DIEGO,
    date: "2026-10-01",
    start: "11:30",
    end: "12:20",
    clientName: "Nicolás Pino",
    service: "Corte + barba",
    priceClp: CORTE_BARBA,
  }),
  booking({
    id: "bk-jue-3",
    staffId: MATIAS,
    date: "2026-10-01",
    start: "14:30",
    end: "15:20",
    clientName: "Gabriel León",
    service: "Corte + barba",
    priceClp: CORTE_BARBA,
  }),
  // viernes 2 oct (hoy)
  booking({
    id: "bk-vie-1",
    staffId: MATIAS,
    date: "2026-10-02",
    start: "10:00",
    end: "10:35",
    clientName: "Agustín Vera",
    service: "Corte",
    priceClp: CORTE,
  }),
  booking({
    id: "bk-vie-2",
    staffId: DIEGO,
    date: "2026-10-02",
    start: "11:30",
    end: "12:05",
    clientName: "Martina Lagos",
    service: "Corte clásico",
    priceClp: 12_000,
    depositPaidClp: 3_000,
    visitNumber: 6,
    phone: "+56912344821",
    confirmedByCustomer: true,
  }),
  booking({
    id: "bk-vie-3",
    staffId: TOMAS,
    date: "2026-10-02",
    start: "12:15",
    end: "13:05",
    clientName: "Emilio Tapia",
    service: "Corte + barba",
    priceClp: CORTE_BARBA,
    source: "flash",
    flashPct: 20,
  }),
  booking({
    id: "bk-vie-4",
    staffId: DIEGO,
    date: "2026-10-02",
    start: "15:00",
    end: "15:50",
    clientName: "Joaquín Rivas",
    service: "Corte + barba",
    priceClp: CORTE_BARBA,
  }),
  // sábado 3 oct
  booking({
    id: "bk-sab-1",
    staffId: DIEGO,
    date: "2026-10-03",
    start: "10:00",
    end: "10:50",
    clientName: "Maximiliano Ruiz",
    service: "Corte + barba",
    priceClp: CORTE_BARBA,
  }),
  booking({
    id: "bk-sab-2",
    staffId: MATIAS,
    date: "2026-10-03",
    start: "11:00",
    end: "11:35",
    clientName: "Renato Gil",
    service: "Corte",
    priceClp: CORTE,
  }),
  booking({
    id: "bk-sab-3",
    staffId: TOMAS,
    date: "2026-10-03",
    start: "11:45",
    end: "12:20",
    clientName: "Ian Soto",
    service: "Corte",
    priceClp: CORTE,
    source: "waitlist",
  }),
  booking({
    id: "bk-sab-4",
    staffId: TOMAS,
    date: "2026-10-03",
    start: "12:30",
    end: "13:20",
    clientName: "Bruno Paz",
    service: "Corte + barba",
    priceClp: CORTE_BARBA,
  }),
  booking({
    id: "bk-sab-5",
    staffId: DIEGO,
    date: "2026-10-03",
    start: "14:30",
    end: "15:05",
    clientName: "Alonso Rey",
    service: "Corte",
    priceClp: CORTE,
  }),
  booking({
    id: "bk-sab-6",
    staffId: MATIAS,
    date: "2026-10-03",
    start: "15:15",
    end: "15:50",
    clientName: "Samuel Ortiz",
    service: "Corte",
    priceClp: CORTE,
  }),
];

const LUNCH_DAYS = [
  "2026-09-28",
  "2026-09-29",
  "2026-09-30",
  "2026-10-01",
  "2026-10-02",
  "2026-10-03",
];

const blocks: readonly AgendaBlock[] = LUNCH_DAYS.flatMap((date) =>
  STAFF.map((s): AgendaBlock => ({
    staffId: s.id,
    start: `${date}T13:30:00-03:00`,
    end: `${date}T14:30:00-03:00`,
    kind: "lunch",
  })),
);

const OPEN = "10:00" as LocalTime;
const CLOSE = "17:00" as LocalTime;

export const agendaFixture: AgendaData = {
  now: "2026-10-02T12:40:00-03:00",
  timezone: "America/Santiago",
  business: {
    hours: {
      1: [{ open: OPEN, close: CLOSE }],
      2: [{ open: OPEN, close: CLOSE }],
      3: [{ open: OPEN, close: CLOSE }],
      4: [{ open: OPEN, close: CLOSE }],
      5: [{ open: OPEN, close: CLOSE }],
      6: [{ open: OPEN, close: CLOSE }],
      // 7 (domingo) saknas: stängt.
    },
  },
  staff: STAFF,
  bookings,
  blocks,
  waitlist: { count: 3, day: "2026-10-03" as LocalDate },
  weekCounts: { [DIEGO]: 21, [MATIAS]: 17, [TOMAS]: 15 },
};

/** `?estado=vacia`: en vecka utan bokningar (samma vecka, inga block, ingen väntelista). */
export const agendaFixtureEmpty: AgendaData = {
  ...agendaFixture,
  bookings: [],
  blocks: [],
  waitlist: null,
  weekCounts: { [DIEGO]: 0, [MATIAS]: 0, [TOMAS]: 0 },
};

/** `?estado=cerrado`: idag (viernes 2 oct) stängt. */
export const agendaFixtureClosedToday: AgendaData = {
  ...agendaFixture,
  business: {
    hours: {
      1: [{ open: OPEN, close: CLOSE }],
      2: [{ open: OPEN, close: CLOSE }],
      3: [{ open: OPEN, close: CLOSE }],
      4: [{ open: OPEN, close: CLOSE }],
      6: [{ open: OPEN, close: CLOSE }],
      // 5 (viernes) saknas: stängt idag.
    },
  },
  bookings: agendaFixture.bookings.filter(
    (b) => !b.start.startsWith("2026-10-02"),
  ),
  blocks: agendaFixture.blocks.filter((b) => !b.start.startsWith("2026-10-02")),
};

/** `?estado=solapadas`: två profesionales samtidigt samma dag (lanes, FRÅGA 3). */
export const agendaFixtureOverlap: AgendaData = {
  ...agendaFixture,
  bookings: [
    ...agendaFixture.bookings,
    booking({
      id: "bk-vie-overlap",
      staffId: MATIAS,
      date: "2026-10-02",
      start: "11:40",
      end: "12:15",
      clientName: "Rodrigo Peña",
      service: "Corte",
      priceClp: CORTE,
    }),
  ],
};

/**
 * `?estado=bloqueo`: ett block som bara gäller EN av de synliga profesionales (Tomás,
 * inte lunch för alla) krockar i tid med en bokning för en annan profesional (Martina
 * Lagos, Diego). Blocket ska dela lane med bokningen i stället för att ritas i full
 * bredd ovanpå den (granskningsfynd, se agenda-screen.tsx).
 */
export const agendaFixtureBlockedStaff: AgendaData = {
  ...agendaFixture,
  blocks: [
    ...agendaFixture.blocks,
    {
      staffId: TOMAS,
      start: "2026-10-02T11:15:00-03:00",
      end: "2026-10-02T11:50:00-03:00",
      kind: "block",
    },
  ],
};
