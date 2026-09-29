import { beforeEach, describe, expect, it, vi } from "vitest";

import { err, ok } from "@/server/scheduling/result";

/** D-030: i CL krävs kundens e-post i Reserva; SE oförändrat. */
const { createBooking } = vi.hoisted(() => ({ createBooking: vi.fn() }));
vi.mock("./create", () => ({ createBooking }));
vi.mock("@/server/db/tx", () => ({ withServiceTx: vi.fn() }));

const { createCustomerBooking, customerEmailRequired } =
  await import("./submit");

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

describe("createCustomerBooking: e-post per marknad (D-030)", () => {
  it("customerEmailRequired: CL ja, SE nej", () => {
    expect(customerEmailRequired("CL")).toBe(true);
    expect(customerEmailRequired("SE")).toBe(false);
  });

  it.each([undefined, "", "   "])(
    "CL utan e-post (%j) → invalid_input, motorn anropas inte",
    async (email) => {
      expect(
        await createCustomerBooking({ ...base, email, market: "CL" }),
      ).toEqual(err("invalid_input"));
      expect(createBooking).not.toHaveBeenCalled();
    },
  );

  it("CL med e-post → motorn", async () => {
    const r = await createCustomerBooking({
      ...base,
      email: "a@b.cl",
      market: "CL",
    });
    expect(r.ok).toBe(true);
    expect(createBooking).toHaveBeenCalledOnce();
  });

  it("SE utan e-post → motorn (oförändrat)", async () => {
    const r = await createCustomerBooking({ ...base, market: "SE" });
    expect(r.ok).toBe(true);
    expect(createBooking).toHaveBeenCalledOnce();
  });
});
