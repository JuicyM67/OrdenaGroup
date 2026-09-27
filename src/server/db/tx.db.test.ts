import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closePool, getPool } from "./pool";
import {
  adminQuery,
  assertLocalDatabase,
  createTestBusiness,
  createTestUser,
  dropTestBusiness,
  dropTestUser,
  insertTestBooking,
  type TestBusiness,
} from "./testing";
import { savepoint, withOwnerTx, withServiceTx } from "./tx";

let a: TestBusiness;
let b: TestBusiness;
let stranger: string;

beforeAll(async () => {
  assertLocalDatabase();
  a = await createTestBusiness();
  b = await createTestBusiness();
  stranger = await createTestUser();
  const start = Date.parse("2030-01-08T13:00:00Z");
  await insertTestBooking(a, { start, durationMin: 35 });
  await insertTestBooking(b, { start, durationMin: 35 });
});

afterAll(async () => {
  await dropTestBusiness(a);
  await dropTestBusiness(b);
  await dropTestUser(stranger);
  await closePool();
});

async function currentUser(): Promise<string> {
  const r = await getPool().query<{ u: string }>("select current_user as u");
  return r.rows[0]!.u;
}

describe("withServiceTx", () => {
  it("kör som service_role och rollen återställs efter commit", async () => {
    const who = await withServiceTx(async (q) => {
      const r = await q.query<{ u: string }>("select current_user as u");
      return r.rows[0]!.u;
    });
    expect(who).toBe("service_role");
    // Poolen har högst några anslutningar; alla ska vara tillbaka som postgres.
    for (let i = 0; i < 4; i++) expect(await currentUser()).toBe("postgres");
  });

  it("rullar tillbaka vid fel och rollen återställs", async () => {
    const marker = `rollback-${a.id}`;
    await expect(
      withServiceTx(async (q) => {
        await q.query("update public.businesses set name = $2 where id = $1", [
          a.id,
          marker,
        ]);
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    const r = await adminQuery<{ name: string }>(
      "select name from public.businesses where id = $1",
      [a.id],
    );
    expect(r.rows[0]!.name).not.toBe(marker);
    for (let i = 0; i < 4; i++) expect(await currentUser()).toBe("postgres");
  });

  it("service_role förbigår RLS men ser bara det frågan filtrerar på", async () => {
    const n = await withServiceTx(async (q) => {
      const r = await q.query<{ n: number }>(
        "select count(*)::int as n from public.bookings where business_id = $1",
        [a.id],
      );
      return r.rows[0]!.n;
    });
    expect(n).toBe(1);
  });
});

describe("withOwnerTx", () => {
  it("ägaren i A ser A:s bokningar men noll av B:s", async () => {
    const counts = await withOwnerTx(a.ownerUserId, async (q) => {
      const r = await q.query<{ business_id: string; n: number }>(
        "select business_id, count(*)::int as n from public.bookings where business_id = any($1::uuid[]) group by business_id",
        [[a.id, b.id]],
      );
      return r.rows;
    });
    expect(counts).toEqual([{ business_id: a.id, n: 1 }]);
  });

  it("kör som authenticated med auth.uid() = userId", async () => {
    const r = await withOwnerTx(a.ownerUserId, async (q) => {
      const x = await q.query<{ u: string; uid: string }>(
        "select current_user as u, auth.uid()::text as uid",
      );
      return x.rows[0]!;
    });
    expect(r).toEqual({ u: "authenticated", uid: a.ownerUserId });
    for (let i = 0; i < 4; i++) expect(await currentUser()).toBe("postgres");
  });

  it("förorenad session (request.jwt.claim.sub på sessionsnivå) vinner aldrig över ägarens id", async () => {
    const pool = getPool();
    const max = pool.options.max ?? 3;
    // Förorena varje anslutning i poolen med en annan användare.
    const clients = await Promise.all(
      Array.from({ length: max }, () => pool.connect()),
    );
    for (const c of clients) {
      await c.query(
        "select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claims', $2, false)",
        [b.ownerUserId, JSON.stringify({ sub: b.ownerUserId })],
      );
    }
    for (const c of clients) c.release();
    try {
      const seen = await withOwnerTx(a.ownerUserId, async (q) => {
        const r = await q.query<{ uid: string; n: number }>(
          `select auth.uid()::text as uid,
                  (select count(*)::int from public.bookings where business_id = $1) as n`,
          [b.id],
        );
        return r.rows[0]!;
      });
      expect(seen).toEqual({ uid: a.ownerUserId, n: 0 });
    } finally {
      const again = await Promise.all(
        Array.from({ length: max }, () => pool.connect()),
      );
      for (const c of again) {
        await c.query(
          "select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claims', '', false)",
        );
        c.release();
      }
    }
  });

  it("transaktionerna har lock_timeout och idle_in_transaction_session_timeout", async () => {
    const r = await withServiceTx(async (q) => {
      const x = await q.query<{ l: string; i: string; s: string }>(
        "select current_setting('lock_timeout') as l, current_setting('idle_in_transaction_session_timeout') as i, current_setting('statement_timeout') as s",
      );
      return x.rows[0]!;
    });
    expect(r).toEqual({ l: "3s", i: "15s", s: "10s" });
  });

  it("en användare utan medlemskap ser noll rader", async () => {
    const n = await withOwnerTx(stranger, async (q) => {
      const r = await q.query<{ n: number }>(
        "select count(*)::int as n from public.bookings where business_id = any($1::uuid[])",
        [[a.id, b.id]],
      );
      return r.rows[0]!.n;
    });
    expect(n).toBe(0);
  });

  it("ägaren i A kan inte skriva i B", async () => {
    const updated = await withOwnerTx(a.ownerUserId, async (q) => {
      const r = await q.query(
        "update public.businesses set name = 'x' where id = $1",
        [b.id],
      );
      return r.rowCount;
    });
    expect(updated).toBe(0);
  });

  it("avvisar ett userId som inte är en uuid", async () => {
    await expect(
      withOwnerTx("'; drop table x; --", async () => 1),
    ).rejects.toThrow(TypeError);
  });
});

describe("savepoint", () => {
  it("rullar tillbaka bara det inre steget och transaktionen fortsätter", async () => {
    const result = await withServiceTx(async (q) => {
      await q.query(
        "update public.businesses set comuna = 'Ñuñoa' where id = $1",
        [a.id],
      );
      await expect(
        savepoint(q, async () => {
          await q.query(
            "update public.businesses set comuna = 'Providencia' where id = $1",
            [a.id],
          );
          await q.query("select 1/0");
        }),
      ).rejects.toMatchObject({ code: "22012" });
      const inner = await savepoint(q, async () => "ok");
      const r = await q.query<{ comuna: string }>(
        "select comuna from public.businesses where id = $1",
        [a.id],
      );
      return { comuna: r.rows[0]!.comuna, inner };
    });
    expect(result).toEqual({ comuna: "Ñuñoa", inner: "ok" });
  });
});
