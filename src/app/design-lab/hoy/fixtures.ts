// Fixtures för Hoy (Hoy.dc.html renderVals()), se docs/tasks/plans/WP-14.md §4 steg 1 och 5.
// `buildFixture(estado)` väljer tillstånd via `?estado=` på /design-lab/hoy. Standardläget
// (utan `estado`) är referensens läge.
import type { HoyBooking, HoyData } from "@/components/mobile/types";

const LINKS: HoyData["links"] = {
  flash: "/app/horas-flash/nueva",
  waitlist: "/app/lista-de-espera",
  cobrar: "/app/caja/cobrar",
  tabs: {
    hoy: "/app/hoy",
    agenda: "/app/agenda",
    clientes: "/app/clientes",
    caja: "/app/caja",
  },
};

const baseBookings: HoyBooking[] = [
  {
    id: "temprano",
    start: "2026-10-02T10:00:00-03:00",
    end: "2026-10-02T10:30:00-03:00",
    clientName: "Sofía Muñoz",
    service: "Corte clásico",
    staffName: "Matías",
    staffColor: 2,
    status: "completed",
    confirmedByCustomer: true,
    depositPaidClp: 0,
    source: "web",
    visitNumber: 2,
  },
  {
    id: "joaquin",
    start: "2026-10-02T15:00:00-03:00",
    end: "2026-10-02T15:35:00-03:00",
    clientName: "Joaquín Rivas",
    service: "Corte + barba",
    staffName: "Diego",
    staffColor: 1,
    status: "confirmed",
    confirmedByCustomer: true,
    depositPaidClp: 0,
    source: "web",
    visitNumber: 3,
  },
  {
    id: "valentina",
    start: "2026-10-02T15:45:00-03:00",
    end: "2026-10-02T16:15:00-03:00",
    clientName: "Valentina Soto",
    service: "Corte clásico",
    staffName: "Matías",
    staffColor: 2,
    status: "confirmed",
    confirmedByCustomer: false,
    depositPaidClp: 8000,
    source: "web",
    visitNumber: 1,
  },
  {
    id: "ignacio",
    start: "2026-10-02T16:30:00-03:00",
    end: "2026-10-02T16:50:00-03:00",
    clientName: "Ignacio Pérez",
    service: "Perfilado de barba",
    staffName: "Tomás",
    staffColor: 3,
    status: "confirmed",
    confirmedByCustomer: true,
    depositPaidClp: 0,
    source: "web",
    visitNumber: 1,
  },
  {
    id: "ian",
    start: "2026-10-02T17:15:00-03:00",
    end: "2026-10-02T17:45:00-03:00",
    clientName: "Ian Soto",
    service: "Corte clásico",
    staffName: "Diego",
    staffColor: 1,
    status: "confirmed",
    confirmedByCustomer: false,
    depositPaidClp: 0,
    source: "waitlist",
    visitNumber: 1,
  },
  {
    id: "emilio",
    start: "2026-10-02T18:00:00-03:00",
    end: "2026-10-02T18:35:00-03:00",
    clientName: "Emilio Tapia",
    service: "Corte + barba",
    staffName: "Tomás",
    staffColor: 3,
    status: "confirmed",
    confirmedByCustomer: true,
    depositPaidClp: 0,
    source: "flash",
    visitNumber: 1,
  },
];

export const baseFixture = {
  now: "2026-10-02T14:40:00-03:00",
  owner: { name: "Camila Rojas" },
  closedToday: false,
  bookings: baseBookings,
  dayCount: 6,
  dayTotalClp: 84_000,
  waitlistCount: 3,
  // WP-45 (D-033): tom som standard — klockan döljs helt utan `onConfirmRequest`/
  // `onDeclineRequest` (page.tsx skickar dem bara för `?estado=solicitudes`).
  pendingRequests: [],
  links: LINKS,
} satisfies HoyData;

function withBooking(
  data: HoyData,
  id: string,
  patch: Partial<HoyBooking>,
): HoyData {
  return {
    ...data,
    bookings: data.bookings.map((b) => (b.id === id ? { ...b, ...patch } : b)),
  };
}

const MANY_NAMES = [
  "Camila Fuentes",
  "Diego Araya",
  "Fernanda Soto",
  "Gabriel Muñoz",
  "Javiera Rojas",
  "Matías Pizarro",
  "Constanza Vidal",
  "Benjamín Castro",
  "Antonia Reyes",
  "Vicente Silva",
];
const MANY_STAFF: readonly [string, HoyBooking["staffColor"]][] = [
  ["Diego", 1],
  ["Matías", 2],
  ["Tomás", 3],
];
const MANY_SOURCES: readonly HoyBooking["source"][] = [
  "web",
  "web",
  "web",
  "waitlist",
  "flash",
];

function manyBookings(): HoyBooking[] {
  const early: HoyBooking[] = [
    {
      id: "many-temprano-1",
      start: "2026-10-02T09:00:00-03:00",
      end: "2026-10-02T09:30:00-03:00",
      clientName: "Sofía Muñoz",
      service: "Corte clásico",
      staffName: "Matías",
      staffColor: 2,
      status: "completed",
      confirmedByCustomer: true,
      depositPaidClp: 0,
      source: "web",
      visitNumber: 2,
    },
    {
      id: "many-temprano-2",
      start: "2026-10-02T09:45:00-03:00",
      end: "2026-10-02T10:15:00-03:00",
      clientName: "Renato Vega",
      service: "Perfilado de barba",
      staffName: "Tomás",
      staffColor: 3,
      status: "completed",
      confirmedByCustomer: true,
      depositPaidClp: 0,
      source: "web",
      visitNumber: 4,
    },
  ];
  const rest: HoyBooking[] = MANY_NAMES.map((clientName, i) => {
    const hour = 15 + Math.floor((i * 45) / 60);
    const minute = (i * 45) % 60;
    const start = `2026-10-02T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-03:00`;
    const endMinute = minute + 30;
    const endHour = hour + Math.floor(endMinute / 60);
    const end = `2026-10-02T${String(endHour).padStart(2, "0")}:${String(endMinute % 60).padStart(2, "0")}:00-03:00`;
    const [staffName, staffColor] = MANY_STAFF[i % MANY_STAFF.length]!;
    return {
      id: `many-${i}`,
      start,
      end,
      clientName,
      service: i % 2 === 0 ? "Corte clásico" : "Corte + barba",
      staffName,
      staffColor,
      status: "confirmed",
      confirmedByCustomer: i % 3 !== 0,
      depositPaidClp: i % 4 === 0 ? 6000 : 0,
      source: MANY_SOURCES[i % MANY_SOURCES.length]!,
      visitNumber: 1,
    };
  });
  return [...early, ...rest];
}

export function buildFixture(estado: string | undefined): HoyData {
  switch (estado) {
    case "ahora":
      return { ...baseFixture, now: "2026-10-02T15:00:00-03:00" };
    case "atrasado":
      return withBooking(
        { ...baseFixture, now: "2026-10-02T15:07:00-03:00" },
        "joaquin",
        { confirmedByCustomer: false },
      );
    case "sin-confirmar":
      return withBooking(baseFixture, "joaquin", {
        confirmedByCustomer: false,
      });
    case "sin-proxima":
      return {
        ...baseFixture,
        bookings: baseFixture.bookings.map((b) =>
          b.id === "temprano" ? b : { ...b, status: "completed" },
        ),
      };
    case "vacio":
      return {
        ...baseFixture,
        bookings: baseFixture.bookings.filter((b) => b.status === "completed"),
        dayCount: 1,
        dayTotalClp: 12_000,
      };
    case "cerrado":
      return {
        ...baseFixture,
        closedToday: true,
        bookings: [],
        dayCount: 0,
        dayTotalClp: 0,
        waitlistCount: 0,
      };
    case "muchas":
      return {
        ...baseFixture,
        bookings: manyBookings(),
        dayCount: 12,
        dayTotalClp: 168_000,
      };
    case "solicitudes":
      // WP-45 (D-033): för skärmdump (FRÅGA 5) — inte en del av `npm run visual hoy`.
      return {
        ...baseFixture,
        pendingRequests: [
          {
            id: "req-camila",
            clientName: "Camila Reyes",
            service: "Corte + barba",
            start: "2026-10-03T11:00:00-03:00",
          },
        ],
      };
    default:
      return baseFixture;
  }
}
