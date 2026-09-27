import { afterEach, describe, expect, it } from "vitest";

import { SANTIAGO, addLocalDays, type LocalDate } from "@/lib/format/dates";
import type { E164 } from "@/lib/format/phone";

import type { AgendaBooking } from "./types";
import {
  focusDate,
  offsetLabel,
  popoverModel,
  sectionAria,
  statusChip,
  toInstant,
  weekDates,
  weekTitle,
  weekdayMinLabels,
} from "./agenda-view";

describe("weekDates", () => {
  it("måndag + de sex följande dagarna", () => {
    const week = weekDates("2026-10-02" as LocalDate);
    expect(week).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
  });

  it("veckan 31 aug–6 sep 2026 ger 7 unika datum (sommartidsbyte mitt i veckan)", () => {
    const week = weekDates("2026-09-03" as LocalDate);
    expect(new Set(week).size).toBe(7);
    expect(week[0]).toBe("2026-08-31");
    expect(week[6]).toBe("2026-09-06");
  });

  it('"nästa vecka" från 30 mar 2026 ger 6 apr (kalenderdagar), inte 5 apr 23:00', () => {
    const monday = weekDates("2026-03-30" as LocalDate)[0] as LocalDate;
    const nextMonday = addLocalDays(monday, 7);
    expect(nextMonday).toBe("2026-04-06");
  });
});

describe("offsetLabel", () => {
  it("veckan 31 aug–6 sep 2026: måndag GMT−4, söndag 6 sep GMT−3", () => {
    expect(offsetLabel("2026-08-31" as LocalDate, SANTIAGO)).toBe("GMT−4");
    expect(offsetLabel("2026-09-06" as LocalDate, SANTIAGO)).toBe("GMT−3");
  });

  it("veckan 30 mar–5 apr 2026: måndag GMT−3, söndag 5 apr GMT−4", () => {
    expect(offsetLabel("2026-03-30" as LocalDate, SANTIAGO)).toBe("GMT−3");
    expect(offsetLabel("2026-04-05" as LocalDate, SANTIAGO)).toBe("GMT−4");
  });

  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("samma resultat oavsett process.env.TZ (UTC, Europe/Stockholm)", () => {
    for (const tz of ["UTC", "Europe/Stockholm"]) {
      process.env.TZ = tz;
      expect(offsetLabel("2026-08-31" as LocalDate, SANTIAGO)).toBe("GMT−4");
      expect(offsetLabel("2026-09-06" as LocalDate, SANTIAGO)).toBe("GMT−3");
    }
  });
});

describe("focusDate", () => {
  it("2026-10-05T02:00Z (= sön 4 okt 23:00 lokal) ger veckan 28 sep–4 okt, inte veckan därpå", () => {
    const now = toInstant("2026-10-05T02:00:00Z");
    const focus = focusDate(now, SANTIAGO);
    expect(focus).toBe("2026-10-04");
    expect(weekDates(focus)[0]).toBe("2026-09-28");
    expect(weekDates(focus)[6]).toBe("2026-10-04");
  });
});

describe("weekTitle", () => {
  it("Octubre 2026 för fokusdagen, även när veckan spänner över två månader", () => {
    expect(weekTitle("2026-10-02" as LocalDate)).toBe("Octubre 2026");
  });
});

describe("sectionAria", () => {
  it('"Semana del 28 de septiembre al 4 de octubre"', () => {
    expect(
      sectionAria("2026-09-28" as LocalDate, "2026-10-04" as LocalDate),
    ).toBe("Semana del 28 de septiembre al 4 de octubre");
  });
});

describe("popoverModel", () => {
  const booking: AgendaBooking = {
    id: "b-1",
    staffId: "staff-1",
    start: "2026-10-02T11:30:00-03:00",
    end: "2026-10-02T12:05:00-03:00",
    clientName: "Martina Lagos",
    phone: "+56912344821" as E164,
    visitNumber: 6,
    service: "Corte clásico",
    priceClp: 12_000,
    depositPaidClp: 3_000,
    source: "web",
    status: "confirmed",
    confirmedByCustomer: true,
  };

  it('"+56 9 •••• 4821 · 6.ª visita"', () => {
    const model = popoverModel(booking, "Diego", SANTIAGO);
    expect(model.telefonoYVisita).toBe("+56 9 •••• 4821 · 6.ª visita");
  });

  it('"Vie 2 oct · 11:30 – 12:05"', () => {
    const model = popoverModel(booking, "Diego", SANTIAGO);
    expect(model.fechaYRango).toBe("Vie 2 oct · 11:30 – 12:05");
  });

  it('"$12.000 · abono $3.000 pagado"', () => {
    const model = popoverModel(booking, "Diego", SANTIAGO);
    expect(model.payment).toBe("$12.000 · abono $3.000 pagado");
  });

  it("sin abono: solo el precio", () => {
    const model = popoverModel(
      { ...booking, depositPaidClp: null },
      "Diego",
      SANTIAGO,
    );
    expect(model.payment).toBe("$12.000");
  });

  it("con abono en 0: solo el precio", () => {
    const model = popoverModel(
      { ...booking, depositPaidClp: 0 },
      "Diego",
      SANTIAGO,
    );
    expect(model.payment).toBe("$12.000");
  });

  it("status: Confirmó por WhatsApp si el cliente confirmó, si no ningún chip", () => {
    expect(statusChip(booking)).toEqual({
      label: "Confirmó por WhatsApp",
      tone: "success",
    });
    expect(statusChip({ ...booking, confirmedByCustomer: false })).toBeNull();
  });

  it("status: Llegó/No vino (WP-12 FRÅGA 7) tienen prioridad sobre confirmedByCustomer", () => {
    expect(statusChip({ ...booking, status: "completed" })).toEqual({
      label: "Llegó",
      tone: "success",
    });
    expect(statusChip({ ...booking, status: "no_show" })).toEqual({
      label: "No vino",
      tone: "neutral",
    });
  });
});

describe("weekdayMinLabels", () => {
  it('"Lu" … "Do" (dos letras, empieza el lunes)', () => {
    expect(weekdayMinLabels).toEqual([
      "Lu",
      "Ma",
      "Mi",
      "Ju",
      "Vi",
      "Sá",
      "Do",
    ]);
  });
});
