import { beforeEach, describe, expect, it, vi } from "vitest";

import { err, ok } from "@/server/scheduling/result";

/** D-030: kundens e-post krävs i Reserva. */
const { createBooking } = vi.hoisted(() => ({ createBooking: vi.fn() }));
vi.mock("./create", () => ({ createBooking }));
vi.mock("@/server/db/tx", () => ({ withServiceTx: vi.fn() }));

const { createCustomerBooking } = await import("./submit");

const base = {
  businessId: "b0000000-0000-4000-8000-000000000001",
  serviceId: "b0000000-0000-4000-8000-0000000000bb",
  staffId: "any",
  start: "2026-10-06T13:00:00.000Z",
  name: "Cliente",
  phone: "+56912345678",
  idempotencyKey: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  now: new Date(Date.UTC(2026, 9, 1, 12)),
};

beforeEach(() => {
  createBooking.mockReset();
  createBooking.mockResolvedValue(ok({ id: "x" }));
});

describe("createCustomerBooking: e-post krävs (D-030)", () => {
  it.each([undefined, "", "   "])(
    "utan e-post (%j) → invalid_input, motorn anropas inte",
    async (email) => {
      expect(await createCustomerBooking({ ...base, email })).toEqual(
        err("invalid_input"),
      );
      expect(createBooking).not.toHaveBeenCalled();
    },
  );

  it("med e-post → motorn", async () => {
    const r = await createCustomerBooking({ ...base, email: "a@b.cl" });
    expect(r.ok).toBe(true);
    expect(createBooking).toHaveBeenCalledOnce();
  });
});
