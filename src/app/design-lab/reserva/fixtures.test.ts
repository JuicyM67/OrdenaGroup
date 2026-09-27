import { describe, expect, it } from "vitest";

import {
  barberiaNorte,
  barberiaPausada,
  estudioSur,
  fixtureBusinesses,
  SLOT_TAKEN_ID,
} from "./fixtures";

describe("fixtures — barberia-norte", () => {
  it("har tre tjänster, fyra profesionales (inkl. Cualquiera i UI)", () => {
    expect(barberiaNorte.services).toHaveLength(3);
    expect(barberiaNorte.staff).toHaveLength(3);
  });

  it("Mar 6 11:30 (Corte + barba) har flash-pris ur datan, inte 80 % uträknat i UI", () => {
    const day = barberiaNorte.availability.cb?.any.find(
      (d) => d.date === "2026-10-06",
    );
    const slot = day?.slots.find(
      (s) =>
        s.id === SLOT_TAKEN_ID.replace("2026-10-08-1715", "2026-10-06-1130"),
    );
    expect(day?.hasFlash).toBe(true);
    expect(slot?.priceClp).toBe(14400);
    expect(slot?.originalPriceClp).toBe(18000);
    expect(slot?.discountPct).toBe(20);
  });

  it("Sáb 3 är full för alla tre tjänster", () => {
    for (const serviceId of ["c", "cb", "b"]) {
      const day = barberiaNorte.availability[serviceId]?.any.find(
        (d) => d.date === "2026-10-03",
      );
      expect(day?.state).toBe("full");
      expect(day?.slots).toEqual([]);
    }
  });

  it("SLOT_TAKEN_ID finns Jue 8, Corte + barba, Cualquiera", () => {
    const day = barberiaNorte.availability.cb?.any.find(
      (d) => d.date === "2026-10-08",
    );
    expect(day?.slots.some((s) => s.id === SLOT_TAKEN_ID)).toBe(true);
  });

  it("de namngivna profesionales har inte tiden 17:15 (variation i tillgänglighet)", () => {
    for (const staffId of ["diego", "matias", "tomas"]) {
      const day = barberiaNorte.availability.cb?.[staffId]?.find(
        (d) => d.date === "2026-10-08",
      );
      expect(day?.slots.some((s) => s.start.includes("T20:15"))).toBe(false);
    }
  });
});

describe("fixtures — tenant-isolering", () => {
  it("estudio-sur delar inga tjänster/profesionales med barberia-norte", () => {
    expect(estudioSur.services.map((s) => s.id)).not.toContain("cb");
    expect(estudioSur.staff.map((p) => p.id)).not.toContain("diego");
  });

  it("barberia-pausada är frozen utan tjänster", () => {
    expect(barberiaPausada.business.status).toBe("frozen");
    expect(barberiaPausada.services).toEqual([]);
  });

  it("fixtureBusinesses har alla slugs", () => {
    expect(Object.keys(fixtureBusinesses).sort()).toEqual([
      "barberia-norte",
      "barberia-pausada",
      "estudio-sur",
      "sin-servicios-demo",
      "vacios-demo",
    ]);
  });
});
