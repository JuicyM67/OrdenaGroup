import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { LocalDate } from "@/lib/format/dates";

import type { BookingSelection } from "./flow-state";
import { barPrice, findDay, summaryText } from "./summary";
import type { BookingPageData, DayAvailability } from "./types";

const d = (s: string) => s as LocalDate;

const flashDay: DayAvailability = {
  date: d("2026-10-06"),
  state: "open",
  hasFlash: true,
  slots: [
    {
      id: "slot-1130",
      // 11:30 America/Santiago (verano, -03:00), martes 6 de octubre de 2026.
      start: "2026-10-06T14:30:00.000Z",
      // A propósito no es el 80 % de 18000: el test comprueba que el total sale
      // tal cual de la data, no de un cálculo en el cliente.
      priceClp: 15000,
      originalPriceClp: 18000,
      discountPct: 20,
    },
  ],
};

const fullDay: DayAvailability = {
  date: d("2026-10-03"),
  state: "full",
  hasFlash: false,
  slots: [],
};

function makeData(days: DayAvailability[]): BookingPageData {
  return {
    now: "2026-10-02T09:00:00-03:00",
    business: {
      slug: "barberia-norte",
      name: "Barbería Norte",
      comuna: "Providencia",
      city: "Santiago",
      weekdaysOpen: [1, 2, 3, 4, 5, 6],
      open: "10:00" as never,
      close: "19:00" as never,
      cancelWindowHours: 4,
      status: "active",
    },
    services: [
      {
        id: "cb",
        name: "Corte + barba",
        durationMin: 50,
        priceClp: 18000,
        tint: "peach",
      },
    ],
    staff: [{ id: "diego", name: "Diego" }],
    availability: {
      cb: { any: days, diego: days },
    },
  };
}

describe("summaryText", () => {
  beforeEach(() => {
    process.env.TZ = "Europe/Stockholm";
  });
  afterEach(() => {
    delete process.env.TZ;
  });

  it("visar totalen och det gamla priset precis som i datan (inte 80 %)", () => {
    const data = makeData([flashDay]);
    const selection: BookingSelection = {
      serviceId: "cb",
      staffId: "any",
      date: flashDay.date,
      slotId: "slot-1130",
    };
    const day = findDay(data, selection, selection.date);
    const price = barPrice(day!.slots[0]!);
    expect(price.total).toBe("$15.000");
    expect(price.old).toBe("$18.000");
  });

  it('utelämnar "Cualquiera" i sammanfattningen, tar med en namngiven profesional', () => {
    const data = makeData([flashDay]);
    const withAny: BookingSelection = {
      serviceId: "cb",
      staffId: "any",
      date: flashDay.date,
      slotId: "slot-1130",
    };
    const dayAny = findDay(data, withAny, withAny.date);
    expect(summaryText(withAny, data, dayAny)).toBe(
      "Corte + barba · Mar 6, 11:30",
    );

    const withStaff: BookingSelection = { ...withAny, staffId: "diego" };
    const dayStaff = findDay(data, withStaff, withStaff.date);
    expect(summaryText(withStaff, data, dayStaff)).toBe(
      "Corte + barba · Mar 6, 11:30 · Diego",
    );
  });

  it("full dag → resumen.listaEspera", () => {
    const data = makeData([fullDay]);
    const selection: BookingSelection = {
      serviceId: "cb",
      staffId: "any",
      date: fullDay.date,
      slotId: null,
    };
    const day = findDay(data, selection, selection.date);
    expect(summaryText(selection, data, day)).toBe(
      "Corte + barba · Sáb 3 · lista de espera",
    );
  });

  it("tiden blir densamma med TZ=UTC (beror inte på webbläsarens klocka)", () => {
    process.env.TZ = "UTC";
    const data = makeData([flashDay]);
    const selection: BookingSelection = {
      serviceId: "cb",
      staffId: "any",
      date: flashDay.date,
      slotId: "slot-1130",
    };
    const day = findDay(data, selection, selection.date);
    expect(summaryText(selection, data, day)).toBe(
      "Corte + barba · Mar 6, 11:30",
    );
  });
});
