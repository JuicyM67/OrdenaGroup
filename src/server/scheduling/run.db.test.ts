import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closePool } from "@/server/db/pool";
import { assertLocalDatabase } from "@/server/db/testing";

import { err, ok, SchedulingInfraError } from "./result";
import { runAs } from "./run";

const customer = { kind: "customer" as const };

beforeAll(() => assertLocalDatabase());
afterAll(async () => {
  await closePool();
});

function failing(code: string, times: number) {
  let calls = 0;
  const fn = async () => {
    calls++;
    if (calls <= times) throw Object.assign(new Error("x"), { code });
    return ok(calls);
  };
  return { fn, calls: () => calls };
}

describe("runAs: deadlock/serialiseringsfel", () => {
  it.each(["40P01", "40001"])(
    "%s en gång → hela transaktionen körs om och lyckas",
    async (code) => {
      const f = failing(code, 1);
      expect(
        await runAs(customer, f.fn, { onConflict: err("slot_taken") }),
      ).toEqual(ok(2));
      expect(f.calls()).toBe(2);
    },
  );

  it("två gånger i rad → onConflict (slot_taken), inte fler försök", async () => {
    const f = failing("40P01", 5);
    expect(
      await runAs(customer, f.fn, { onConflict: err("slot_taken") }),
    ).toEqual(err("slot_taken"));
    expect(f.calls()).toBe(2);
  });

  it("utan onConflict → SchedulingInfraError med bara SQLSTATE", async () => {
    const f = failing("40P01", 5);
    const e = await runAs(customer, f.fn).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(SchedulingInfraError);
    expect((e as SchedulingInfraError).code).toBe("40P01");
  });

  it("andra fel körs inte om", async () => {
    const f = failing("23505", 5);
    await expect(
      runAs(customer, f.fn, { onConflict: err("slot_taken") }),
    ).rejects.toBeInstanceOf(SchedulingInfraError);
    expect(f.calls()).toBe(1);
  });
});
