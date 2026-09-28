import { describe, expect, it } from "vitest";

import type { LocalDate } from "@/lib/format/dates";

import {
  bookingFlowReducer,
  canContinue,
  initialFlowState,
  type BookingFlowState,
} from "./flow-state";

const d = (s: string) => s as LocalDate;

describe("bookingFlowReducer", () => {
  it("byte av tjänst nollställer tiden men behåller dagen om den finns", () => {
    const withDay: BookingFlowState = {
      ...initialFlowState,
      selection: {
        serviceId: "c",
        staffId: "any",
        date: d("2026-10-06"),
        slotId: "slot-1130",
      },
    };
    const keep = bookingFlowReducer(withDay, {
      type: "select_service",
      serviceId: "cb",
      keepDay: true,
    });
    expect(keep.selection.date).toBe("2026-10-06");
    expect(keep.selection.slotId).toBeNull();

    const drop = bookingFlowReducer(withDay, {
      type: "select_service",
      serviceId: "cb",
      keepDay: false,
    });
    expect(drop.selection.date).toBeNull();
    expect(drop.selection.slotId).toBeNull();
  });

  it("byte av profesional nollställer tiden men behåller dagen om den finns", () => {
    const withDay: BookingFlowState = {
      ...initialFlowState,
      selection: {
        serviceId: "cb",
        staffId: "any",
        date: d("2026-10-06"),
        slotId: "slot-1130",
      },
    };
    const next = bookingFlowReducer(withDay, {
      type: "select_staff",
      staffId: "diego",
      keepDay: true,
    });
    expect(next.selection.date).toBe("2026-10-06");
    expect(next.selection.slotId).toBeNull();
    expect(next.selection.staffId).toBe("diego");
  });

  it("byte av dag nollställer tiden", () => {
    const withSlot: BookingFlowState = {
      ...initialFlowState,
      selection: {
        serviceId: "cb",
        staffId: "any",
        date: d("2026-10-06"),
        slotId: "slot-1130",
      },
    };
    const next = bookingFlowReducer(withSlot, {
      type: "select_day",
      date: d("2026-10-08"),
    });
    expect(next.selection.date).toBe("2026-10-08");
    expect(next.selection.slotId).toBeNull();
  });

  it("full dag → canContinue via väntelistan utan vald tid", () => {
    const selection = {
      serviceId: "cb",
      staffId: "any",
      date: d("2026-10-03"),
      slotId: null,
    };
    expect(canContinue(selection, true)).toBe(true);
    expect(canContinue(selection, false)).toBe(false);
  });

  it("canContinue kräver tjänst + dag + tid när dagen inte är full", () => {
    expect(
      canContinue(
        {
          serviceId: "cb",
          staffId: "any",
          date: d("2026-10-06"),
          slotId: null,
        },
        false,
      ),
    ).toBe(false);
    expect(
      canContinue(
        {
          serviceId: "cb",
          staffId: "any",
          date: d("2026-10-06"),
          slotId: "slot-1130",
        },
        false,
      ),
    ).toBe(true);
  });

  it("slot_taken tar bort tiden och behåller resten av valet", () => {
    const inDatos: BookingFlowState = {
      ...initialFlowState,
      step: "datos",
      formStatus: "submitting",
      selection: {
        serviceId: "cb",
        staffId: "any",
        date: d("2026-10-08"),
        slotId: "slot-1715",
      },
    };
    const next = bookingFlowReducer(inDatos, {
      type: "submit_error",
      code: "slot_taken",
    });
    expect(next.step).toBe("seleccion");
    expect(next.errorCode).toBe("slot_taken");
    expect(next.selection.slotId).toBeNull();
    expect(next.selection.serviceId).toBe("cb");
    expect(next.selection.date).toBe("2026-10-08");
    expect(next.removedSlotIds).toEqual(["slot-1715"]);
  });

  it("too_soon och outside_hours går tillbaka till valen utan att markera tiden som tagen", () => {
    const inDatos: BookingFlowState = {
      ...initialFlowState,
      step: "datos",
      selection: {
        serviceId: "cb",
        staffId: "any",
        date: d("2026-10-08"),
        slotId: "slot-1715",
      },
    };
    const next = bookingFlowReducer(inDatos, {
      type: "submit_error",
      code: "too_soon",
    });
    expect(next.step).toBe("seleccion");
    expect(next.errorCode).toBe("too_soon");
    expect(next.removedSlotIds).toEqual([]);
  });

  it("network behåller steget datos", () => {
    const inDatos: BookingFlowState = {
      ...initialFlowState,
      step: "datos",
      formStatus: "submitting",
    };
    const next = bookingFlowReducer(inDatos, {
      type: "submit_error",
      code: "network",
    });
    expect(next.step).toBe("datos");
    expect(next.errorCode).toBe("network");
    expect(next.formStatus).toBe("idle");
  });

  it("confirmacion kan inte nås utan datos", () => {
    const fromSeleccion = bookingFlowReducer(initialFlowState, {
      type: "submit_success",
    });
    expect(fromSeleccion.step).toBe("seleccion");

    const inDatos: BookingFlowState = { ...initialFlowState, step: "datos" };
    const ok = bookingFlowReducer(inDatos, { type: "submit_success" });
    expect(ok.step).toBe("confirmacion");
  });

  it("waitlist_duplicate lämnar kortet med bocken och felet", () => {
    const inDatos: BookingFlowState = { ...initialFlowState, step: "datos" };
    const next = bookingFlowReducer(inDatos, {
      type: "join_waitlist_error",
      code: "waitlist_duplicate",
    });
    expect(next.step).toBe("seleccion");
    expect(next.waitlistJoined).toBe(true);
    expect(next.errorCode).toBe("waitlist_duplicate");
  });

  it("join_waitlist_success går tillbaka till valen med waitlistJoined", () => {
    const inDatos: BookingFlowState = { ...initialFlowState, step: "datos" };
    const next = bookingFlowReducer(inDatos, {
      type: "join_waitlist_success",
    });
    expect(next.step).toBe("seleccion");
    expect(next.waitlistJoined).toBe(true);
  });

  it("flödet har exakt 3 skärmar", () => {
    const steps: BookingFlowState["step"][] = [
      "seleccion",
      "datos",
      "confirmacion",
    ];
    expect(steps).toHaveLength(3);
  });

  it("reset går tillbaka till initialFlowState (bakåt från bekräftelsen, item 7)", () => {
    const afterBooking: BookingFlowState = {
      step: "confirmacion",
      selection: {
        serviceId: "cb",
        staffId: "any",
        date: d("2026-10-06"),
        slotId: "cb-2026-10-06-1130",
      },
      waitlistJoined: false,
      formStatus: "idle",
      errorCode: null,
      removedSlotIds: [],
    };
    expect(bookingFlowReducer(afterBooking, { type: "reset" })).toEqual(
      initialFlowState,
    );
  });
});
