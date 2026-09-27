import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  initialsOf,
  nextBooking,
  nextChip,
  parseInstantOrThrow,
  relative,
  restOfDay,
  rowTag,
  todayLabel,
} from "./hoy-view";
import type { HoyBooking } from "./types";

function booking(overrides: Partial<HoyBooking>): HoyBooking {
  return {
    id: "b1",
    start: "2026-10-02T15:00:00-03:00",
    end: "2026-10-02T15:30:00-03:00",
    clientName: "Joaquín Rivas",
    service: "Corte + barba",
    staffName: "Diego",
    staffColor: 1,
    status: "confirmed",
    confirmedByCustomer: true,
    depositPaidClp: 0,
    source: "web",
    visitNumber: 3,
    ...overrides,
  };
}

// Testerna körs med tre olika värden på TZ (miljövariabeln, inte parametern till dates.ts) för
// att bevisa att alla beräkningar går via SANTIAGO explicit och aldrig via värdens egen
// tidszon (D-017/WP-04). date-fns/date-fns-tz används inte (D-018).
for (const tz of [undefined, "UTC", "Europe/Stockholm"]) {
  describe(`hoy-view (process.env.TZ=${tz ?? "(ingen, systemets standard)"})`, () => {
    const originalTz = process.env.TZ;
    beforeEach(() => {
      if (tz) process.env.TZ = tz;
      else delete process.env.TZ;
    });
    afterEach(() => {
      if (originalTz) process.env.TZ = originalTz;
      else delete process.env.TZ;
    });

    describe("todayLabel", () => {
      it("formaterar med weekdayDayMonthLong", () => {
        expect(
          todayLabel(parseInstantOrThrow("2026-10-02T14:40:00-03:00")),
        ).toBe("Viernes 2 de octubre");
      });
    });

    describe("initialsOf", () => {
      it('"Camila Rojas" → "CR"', () => {
        expect(initialsOf("Camila Rojas")).toBe("CR");
      });
    });

    describe("relative", () => {
      it("14:40 → 15:00 = 'en 20 min'", () => {
        expect(
          relative(
            parseInstantOrThrow("2026-10-02T14:40:00-03:00"),
            parseInstantOrThrow("2026-10-02T15:00:00-03:00"),
          ),
        ).toBe("en 20 min");
      });

      it("14:00 → 15:00 = 'en 1 h'", () => {
        expect(
          relative(
            parseInstantOrThrow("2026-10-02T14:00:00-03:00"),
            parseInstantOrThrow("2026-10-02T15:00:00-03:00"),
          ),
        ).toBe("en 1 h");
      });

      it("13:55 → 15:00 = 'en 1 h 5 min'", () => {
        expect(
          relative(
            parseInstantOrThrow("2026-10-02T13:55:00-03:00"),
            parseInstantOrThrow("2026-10-02T15:00:00-03:00"),
          ),
        ).toBe("en 1 h 5 min");
      });

      it("15:00 → 15:00 = 'ahora'", () => {
        expect(
          relative(
            parseInstantOrThrow("2026-10-02T15:00:00-03:00"),
            parseInstantOrThrow("2026-10-02T15:00:00-03:00"),
          ),
        ).toBe("ahora");
      });

      it("15:07 → 15:00 = '7 min de atraso'", () => {
        expect(
          relative(
            parseInstantOrThrow("2026-10-02T15:07:00-03:00"),
            parseInstantOrThrow("2026-10-02T15:00:00-03:00"),
          ),
        ).toBe("7 min de atraso");
      });

      it("sommartid (abril, väggtiden skulle ge −30): en 30 min", () => {
        // 2026-04-04 23:50 (−03) = 2026-04-05T02:50Z, bokning 2026-04-05T03:20Z
        // (= 23:20 −04, andra förekomsten av 23:xx den natten).
        expect(
          relative(
            parseInstantOrThrow("2026-04-05T02:50:00Z"),
            parseInstantOrThrow("2026-04-05T03:20:00Z"),
          ),
        ).toBe("en 30 min");
      });

      it("sommartid (septiembre, väggtiden skulle ge 1 h 45 min): en 45 min", () => {
        // 2026-09-05 23:30 (−04) = 03:30Z, bokning 2026-09-06T04:15Z (= 01:15 −03).
        expect(
          relative(
            parseInstantOrThrow("2026-09-06T03:30:00Z"),
            parseInstantOrThrow("2026-09-06T04:15:00Z"),
          ),
        ).toBe("en 45 min");
      });
    });

    describe("nextBooking", () => {
      const now = parseInstantOrThrow("2026-10-02T14:40:00-03:00");

      it("hoppar över completed, no_show och cancelled", () => {
        const bookings = [
          booking({
            id: "done",
            start: "2026-10-02T10:00:00-03:00",
            end: "2026-10-02T10:30:00-03:00",
            status: "completed",
          }),
          booking({
            id: "noshow",
            start: "2026-10-02T11:00:00-03:00",
            end: "2026-10-02T11:30:00-03:00",
            status: "no_show",
          }),
          booking({
            id: "cancelled",
            start: "2026-10-02T12:00:00-03:00",
            end: "2026-10-02T12:30:00-03:00",
            status: "cancelled",
          }),
          booking({
            id: "next",
            start: "2026-10-02T15:00:00-03:00",
            end: "2026-10-02T15:30:00-03:00",
          }),
        ];
        expect(nextBooking(bookings, now)?.id).toBe("next");
      });

      it("en pågående bokning (start < now < end) räknas som nästa kund", () => {
        const bookings = [
          booking({
            id: "ongoing",
            start: "2026-10-02T14:30:00-03:00",
            end: "2026-10-02T15:00:00-03:00",
          }),
        ];
        expect(nextBooking(bookings, now)?.id).toBe("ongoing");
      });

      it("en bokning i morgon räknas inte", () => {
        const bookings = [
          booking({
            id: "manana",
            start: "2026-10-03T09:00:00-03:00",
            end: "2026-10-03T09:30:00-03:00",
          }),
        ];
        expect(nextBooking(bookings, now)).toBeUndefined();
      });

      it("lokal dag via localDayRange: 2026-09-06 börjar 01:00, en bokning lördag 23:30 hör inte till söndagen", () => {
        const sundayNow = parseInstantOrThrow("2026-09-06T14:00:00-03:00");
        const bookings = [
          // 2026-09-06T03:30Z = lördag 23:30 (−04, före sommartidsbytet).
          booking({
            id: "saturday-night",
            start: "2026-09-06T03:30:00Z",
            end: "2026-09-06T04:00:00Z",
          }),
        ];
        expect(nextBooking(bookings, sundayNow)).toBeUndefined();
      });
    });

    describe("restOfDay", () => {
      it("utesluter nästa kund och sorterar på instant (dubbeltimmen 4 april: två 23:30 i rätt ordning)", () => {
        // 2026-04-04 har 25 h (slut på sommartid): 23:00–23:59 finns två gånger. Bägge
        // 23:30-instanserna hör till samma lokala dag (`localDayRange` går till
        // 2026-04-05T04:00:00Z), trots att väggklockan visar samma "23:30".
        const now = parseInstantOrThrow("2026-04-04T20:00:00-03:00");
        const next = booking({
          id: "next",
          start: "2026-04-04T21:00:00-03:00",
          end: "2026-04-04T21:30:00-03:00",
        });
        const earlier2330 = booking({
          id: "2330-early",
          start: "2026-04-05T02:30:00Z", // 23:30 −03, första förekomsten
          end: "2026-04-05T03:00:00Z",
        });
        const later2330 = booking({
          id: "2330-late",
          start: "2026-04-05T03:30:00Z", // 23:30 −04, andra förekomsten
          end: "2026-04-05T04:00:00Z",
        });
        const bookings = [next, later2330, earlier2330];
        const rest = restOfDay(bookings, now, next);
        expect(rest.map((b) => b.id)).toEqual(["2330-early", "2330-late"]);
      });
    });

    describe("rowTag", () => {
      it("flash + abono → Flash", () => {
        const tag = rowTag(booking({ source: "flash", depositPaidClp: 5000 }));
        expect(tag).toEqual({ tone: "lime", label: "Flash" });
      });

      it("lista + abono → Desde lista", () => {
        const tag = rowTag(
          booking({ source: "waitlist", depositPaidClp: 5000 }),
        );
        expect(tag).toEqual({ tone: "peach", label: "Desde lista" });
      });

      it("bara abono → Abono", () => {
        const tag = rowTag(booking({ source: "web", depositPaidClp: 5000 }));
        expect(tag).toEqual({ tone: "peach-50", label: "Abono" });
      });

      it("ingen av delarna → ingen tagg", () => {
        expect(
          rowTag(booking({ source: "manual", depositPaidClp: 0 })),
        ).toBeUndefined();
      });
    });

    describe("nextChip", () => {
      it("bekräftad av kunden → success/Confirmó", () => {
        expect(nextChip(booking({ confirmedByCustomer: true }))).toEqual({
          tone: "success",
          label: "Confirmó",
        });
      });

      it("obekräftad → pending/Sin confirmar", () => {
        expect(nextChip(booking({ confirmedByCustomer: false }))).toEqual({
          tone: "pending",
          label: "Sin confirmar",
        });
      });
    });
  });
}
