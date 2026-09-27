import { describe, expect, it } from "vitest";

import { estados, inicio, nav } from "@/i18n";
import { parseInstant } from "@/lib/format/dates";

import {
  firstName,
  heroVariant,
  noShowTrendLabel,
  notificationsLabel,
  splitHighlight,
  statusChip,
  todayLabel,
  upcomingToday,
} from "./inicio-view";
import type { TodayBooking } from "./types";

function mustParse(iso: string): Date {
  const r = parseInstant(iso);
  if (!r.ok) throw new Error(`fixture instant inválido: ${iso}`);
  return r.value;
}

function booking(
  overrides: Partial<TodayBooking> & { id: string },
): TodayBooking {
  return {
    start: "2026-10-02T15:00:00-03:00",
    end: "2026-10-02T15:45:00-03:00",
    clientName: "Joaquín Rivas",
    service: "Corte + barba",
    staff: "Diego",
    tint: "lilac-100",
    status: "confirmed",
    depositPaid: false,
    confirmedByCustomer: false,
    ...overrides,
  };
}

describe("todayLabel", () => {
  it('"2026-10-03T02:30:00Z" (= viernes 23:30 en Santiago, −03) → "Viernes 2 de octubre", no sábado', () => {
    expect(todayLabel(mustParse("2026-10-03T02:30:00Z"))).toBe(
      "Viernes 2 de octubre",
    );
  });

  it('"2026-10-02T01:30:00Z" (= jueves 22:30 en Santiago, −03) → jueves, no viernes', () => {
    expect(todayLabel(mustParse("2026-10-02T01:30:00Z"))).toBe(
      "Jueves 1 de octubre",
    );
  });
});

describe("upcomingToday", () => {
  it("una reserva en curso (inicio 14:30, now 14:40) se ve; una que ya terminó no", () => {
    const enCurso = booking({
      id: "en-curso",
      start: "2026-10-02T14:30:00-03:00",
      end: "2026-10-02T15:15:00-03:00",
    });
    const terminada = booking({
      id: "terminada",
      start: "2026-10-02T13:00:00-03:00",
      end: "2026-10-02T13:45:00-03:00",
    });
    const now = mustParse("2026-10-02T14:40:00-03:00");
    const result = upcomingToday([enCurso, terminada], now);
    expect(result.map((b) => b.id)).toEqual(["en-curso"]);
  });

  it("horario de verano: 5 de septiembre 2026 23:30 (−04) cuenta como el sábado 5, no domingo 6", () => {
    const b = booking({
      id: "b",
      start: "2026-09-06T03:30:00Z", // = sábado 5-sep 23:30 en Santiago (−04)
      end: "2026-09-06T04:15:00Z",
    });
    const now = mustParse("2026-09-06T02:00:00Z"); // = sábado 5-sep 22:00
    expect(upcomingToday([b], now).map((x) => x.id)).toEqual(["b"]);

    // Para "el domingo 6" (que en Santiago empieza a la 01:00, ver test siguiente),
    // esa misma reserva no debe contarse como parte del domingo.
    const domingoNow = mustParse("2026-09-06T13:00:00Z"); // domingo 6, 10:00 (−03)
    expect(upcomingToday([b], domingoNow).map((x) => x.id)).toEqual([]);
  });

  it("domingo 6 de septiembre empieza a la 01:00 (localDayRange), no +24 h", () => {
    // El domingo local empieza a la 01:00 (hay un salto de las 00:00 a la 01:00 esa
    // noche). Una reserva a las 01:15 locales sí es del domingo.
    const b = booking({
      id: "domingo-temprano",
      start: "2026-09-06T04:15:00Z", // domingo 01:15 (−03, ya en horario de verano)
      end: "2026-09-06T05:00:00Z", // domingo 02:00
    });
    const now = mustParse("2026-09-06T04:20:00Z"); // domingo 01:20, reserva en curso
    expect(upcomingToday([b], now).map((x) => x.id)).toEqual([
      "domingo-temprano",
    ]);
  });

  it("4 de abril 2026: dos reservas a las 23:30 (hora doble) cuentan como el día 4 y se ordenan por instante", () => {
    // El 4 de abril 2026 el reloj retrocede de 24:00 a 23:00: las 23:30 ocurren dos
    // veces, con offsets distintos.
    const earlier = booking({
      id: "23:30-earlier",
      start: "2026-04-05T02:30:00Z", // 4-abr 23:30 (−03, primera vez)
      end: "2026-04-05T03:15:00Z",
    });
    const later = booking({
      id: "23:30-later",
      start: "2026-04-05T03:30:00Z", // 4-abr 23:30 (−04, segunda vez)
      end: "2026-04-05T04:15:00Z",
    });
    const now = mustParse("2026-04-05T01:00:00Z"); // 4-abr 22:00 (−03)
    expect(upcomingToday([later, earlier], now).map((x) => x.id)).toEqual([
      "23:30-earlier",
      "23:30-later",
    ]);
  });
});

describe("statusChip", () => {
  it("abono pagado → deposit / Abono pagado (gana sobre confirmedByCustomer)", () => {
    expect(
      statusChip({ depositPaid: true, confirmedByCustomer: true }),
    ).toEqual({ tone: "deposit", text: estados.abonoPagado });
    expect(
      statusChip({ depositPaid: true, confirmedByCustomer: false }),
    ).toEqual({ tone: "deposit", text: estados.abonoPagado });
  });

  it("confirmada por el cliente (sin abono) → success / Confirmada", () => {
    expect(
      statusChip({ depositPaid: false, confirmedByCustomer: true }),
    ).toEqual({ tone: "success", text: estados.confirmada });
  });

  it("ninguno de los dos → pending / Sin confirmar (incluye pending_payment)", () => {
    expect(
      statusChip({ depositPaid: false, confirmedByCustomer: false }),
    ).toEqual({ tone: "pending", text: estados.sinConfirmar });
  });
});

describe("heroVariant", () => {
  it("0 horas → vacio", () => {
    expect(heroVariant({ recoveredHours: 0, recoveredClp: 0 })).toBe("vacio");
  });

  it("más de 0 horas → recuperado, con flexión singular vía copy", () => {
    expect(heroVariant({ recoveredHours: 1, recoveredClp: 18000 })).toBe(
      "recuperado",
    );
    expect(inicio.hero.horas({ n: 1 })).toBe("1 hora");
    expect(inicio.hero.horas({ n: 4 })).toBe("4 horas");
  });
});

describe("firstName", () => {
  it('"Camila R." → "Camila"', () => {
    expect(firstName("Camila R.")).toBe("Camila");
  });

  it("un solo nombre se devuelve tal cual", () => {
    expect(firstName("Camila")).toBe("Camila");
  });
});

describe("noShowTrendLabel", () => {
  it("down → bajando, up → subiendo, flat → igual", () => {
    expect(noShowTrendLabel("down")).toBe(inicio.stats.tendencia.bajando);
    expect(noShowTrendLabel("up")).toBe(inicio.stats.tendencia.subiendo);
    expect(noShowTrendLabel("flat")).toBe(inicio.stats.tendencia.igual);
  });
});

describe("notificationsLabel", () => {
  it("0 → nav.notificaciones (sin aviso de cantidad)", () => {
    expect(notificationsLabel(0)).toBe(nav.notificaciones);
  });

  it("n > 0 → nav.notificacionesNuevas({ n })", () => {
    expect(notificationsLabel(3)).toBe(nav.notificacionesNuevas({ n: 3 }));
    expect(notificationsLabel(1)).toBe(nav.notificacionesNuevas({ n: 1 }));
  });
});

describe("splitHighlight", () => {
  it("la subcadena existe: se parte en antes/resaltado/después", () => {
    expect(
      splitHighlight(
        "Recuperaste 4 horas · $72.000 esta semana.",
        "4 horas · $72.000",
      ),
    ).toEqual(["Recuperaste ", "4 horas · $72.000", " esta semana."]);
  });

  it("la subcadena no existe: todo el texto queda sin resaltar", () => {
    expect(splitHighlight("Activa la lista de espera.", "4 horas")).toEqual([
      "Activa la lista de espera.",
      "",
      "",
    ]);
  });

  it("la subcadena aparece dos veces: se usa la primera aparición", () => {
    expect(splitHighlight("ab ab", "ab")).toEqual(["", "ab", " ab"]);
  });
});
