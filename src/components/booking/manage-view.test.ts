import { describe, expect, it } from "vitest";

import {
  manageFields,
  manageState,
  mustParseInstant,
  type ManagedBooking,
} from "./manage-view";

// 2026-10-06 10:00 America/Santiago (verano, -03:00) = 13:00 UTC.
const START = "2026-10-06T13:00:00.000Z";
const END = "2026-10-06T13:35:00.000Z";

function booking(overrides: Partial<ManagedBooking> = {}): ManagedBooking {
  return {
    businessId: "b0000000-0000-4000-8000-000000000001",
    bookingId: "b0000000-0000-4000-8000-0000000000aa",
    business: {
      name: "Barbería Norte",
      slug: "barberia-norte",
      phone: "+56223456789",
      address: "Av. Providencia 1234",
      comuna: "Providencia",
      timezone: "America/Santiago",
    },
    serviceName: "Corte clásico",
    staffName: "Diego",
    start: START,
    end: END,
    priceClp: 12000,
    status: "confirmed",
    cancelWindowHours: 3,
    canCancel: true,
    ...overrides,
  };
}

describe("manageState", () => {
  it("cancelled: status = cancelled, oavsett canCancel/tid", () => {
    const b = booking({ status: "cancelled", canCancel: false });
    expect(manageState(b, new Date("2026-10-06T10:00:00.000Z"))).toBe(
      "cancelled",
    );
  });

  it("past: now ≥ slutet", () => {
    const b = booking({ canCancel: false });
    expect(manageState(b, new Date(END))).toBe("past");
    expect(manageState(b, new Date("2026-10-06T14:00:00.000Z"))).toBe("past");
  });

  it("locked: fortfarande i framtiden, men utanför avbokningsfönstret", () => {
    const b = booking({ canCancel: false });
    expect(manageState(b, new Date("2026-10-06T12:00:00.000Z"))).toBe("locked");
  });

  it("cancellable: inom fönstret, status ändringsbar", () => {
    const b = booking({ canCancel: true });
    expect(manageState(b, new Date("2026-10-01T00:00:00.000Z"))).toBe(
      "cancellable",
    );
  });
});

describe("manageFields", () => {
  it("formaterar i företagets tidszon (America/Santiago), inte UTC", () => {
    const fields = manageFields(booking());
    expect(fields.hora).toBe("10:00");
    expect(fields.servicio).toBe("Corte clásico");
    expect(fields.profesional).toBe("Diego");
    expect(fields.precio).toBe("$12.000");
  });

  it("adressen: gatuadress när den finns", () => {
    expect(manageFields(booking()).direccion).toBe("Av. Providencia 1234");
  });

  it("adressen: comuna som fallback när gatuadressen saknas", () => {
    const b = booking({
      business: { ...booking().business, address: null },
    });
    expect(manageFields(b).direccion).toBe("Providencia");
  });
});

describe("mustParseInstant", () => {
  it("kastar på en ogiltig instant", () => {
    expect(() => mustParseInstant("inte-en-instant", "test")).toThrow();
  });

  it("parsar en giltig instant", () => {
    expect(mustParseInstant(START, "test").toISOString()).toBe(START);
  });
});
