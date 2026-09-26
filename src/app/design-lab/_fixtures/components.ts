// Exempeldata till /design-lab/components, kopierat ordagrant ur docs/design/reference/*.dc.html
// (R9, WP-02 steg 4/FRÅGA 9). Det här är testdata för katalogen, inte produkttext — importeras
// aldrig utanför src/app/design-lab/ (se eslint no-restricted-imports, WP-02 steg 4).

export const buttonLabels = {
  primaryHoy: "Hoy",
  primaryNuevaReserva: "Nueva reserva",
  primaryLlegoPopover: "Llegó",
  secondaryNoVino: "No vino",
  secondaryMover: "Mover",
  accentLlegoHoy: "Llegó",
  outlineDarkNoVino: "No vino",
  inverseVerDetalle: "VER DETALLE",
  accentReservar: "Reservar",
} as const;

export const iconButtonLabels = {
  buscar: "Buscar",
  notificaciones: "Notificaciones",
  mesAnterior: "Mes anterior",
  mesSiguiente: "Mes siguiente",
  cerrar: "Cerrar",
  compartir: "Compartir hora flash",
} as const;

export const chipFixtures = [
  { tone: "success", size: "md", label: "Confirmada" },
  { tone: "deposit", size: "md", label: "Abono pagado" },
  { tone: "pending", size: "md", label: "Sin confirmar" },
  { tone: "success", size: "md", label: "bajando" },
  { tone: "pending", size: "sm", label: "Corte clásico" },
  { tone: "neutral", size: "sm", label: "con Diego" },
  { tone: "success", size: "sm", label: "Confirmó por WhatsApp" },
  { tone: "peach", size: "xs", label: "Abono" },
  { tone: "lime", size: "xs", label: "Flash" },
  { tone: "ink", size: "tag", label: "Flash −20%" },
  { tone: "ink", size: "tag", label: "Lista de espera" },
] as const;

export const pillFixtures = ["Cualquiera", "Diego", "Matías", "Tomás"] as const;

export const avatarFixtures = [
  { initials: "CR", tone: "lilac" as const, size: 36 as const },
  { initials: "JR", tone: "lilac-100" as const, size: 40 as const },
  { initials: "VS", tone: "peach-50" as const, size: 40 as const },
  { initials: "IP", tone: "lime-50" as const, size: 40 as const },
];

export const cardFixtures = [
  { tone: "surface" as const, label: "surface" },
  { tone: "dark" as const, label: "dark" },
  { tone: "dark-2" as const, label: "dark-2" },
  { tone: "lilac" as const, label: "lilac" },
  { tone: "peach" as const, label: "peach" },
  { tone: "lime" as const, label: "lime" },
];

export const segmentedControlOptions = [
  { value: "month", label: "Mes" },
  { value: "week", label: "Semana" },
  { value: "day", label: "Día" },
] as const;

export const navRailFixtures = [
  { href: "/design-lab/main", label: "Inicio", active: true },
  { href: "/design-lab/agenda", label: "Agenda", active: false },
  { href: "#clientes", label: "Clientes", active: false },
] as const;

export const pageHeaderMeta = {
  desktop: "Viernes 2 de octubre · Barbería Norte, Providencia",
  mobile: "Viernes 2 de octubre",
} as const;

export const userPillFixture = { name: "Camila R.", initials: "CR" } as const;

// dayLabel saknas medvetet: det är en funktion och kan inte skickas från serversidans
// page.tsx till klientkomponenten som faktiskt renderar MiniCalendar (se mini-calendar-demo.tsx).
export const miniCalendarLabels = {
  title: "Octubre 2026",
  weekdays: ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"] as const,
  prevMonth: "Mes anterior",
  nextMonth: "Mes siguiente",
};

export const miniCalendarMarkedDates = new Set([
  "2026-10-02",
  "2026-10-03",
  "2026-10-06",
  "2026-10-07",
  "2026-10-09",
  "2026-10-10",
  "2026-10-13",
]);
