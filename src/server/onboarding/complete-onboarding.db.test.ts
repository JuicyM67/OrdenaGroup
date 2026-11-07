import { afterAll, describe, expect, it } from "vitest";

import { LEGAL_VERSION } from "@/i18n/legal/types";
import {
  adminQuery,
  assertLocalDatabase,
  createTestUser,
  dropTestUser,
} from "@/server/db/testing";

import { completeOnboarding } from "./complete-onboarding";

assertLocalDatabase();

function uniqueSlug(): string {
  return `wp15-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function validInput(slug: string) {
  return {
    acceptedTerms: true,
    business: {
      name: "Barbería WP-15",
      slug,
      comuna: "Providencia",
      category: "barberia",
      phone: "+56912345678",
      address: "Av. Providencia 1234",
    },
    services: [
      { name: "Corte", durationMin: 30, priceClp: "12000" },
      { name: "Barba", durationMin: 15, priceClp: "8000" },
    ],
    staff: [
      { name: "Diego", serviceIndexes: [0, 1] },
      { name: "Matías", serviceIndexes: [0] },
    ],
    hours: [
      { weekday: 1, open: true, start: "09:00", end: "19:00" },
      { weekday: 2, open: true, start: "09:00", end: "19:00" },
      { weekday: 7, open: false },
    ],
  };
}

const createdUsers: string[] = [];
const createdBusinessIds: string[] = [];

afterAll(async () => {
  for (const id of createdBusinessIds) {
    await adminQuery("delete from public.businesses where id = $1", [id]);
  }
  for (const id of createdUsers) {
    await dropTestUser(id);
  }
});

describe("completeOnboarding (integration, lokal Supabase)", () => {
  it("skapar företag + tjänster + personal + öppettider i en transaktion", async () => {
    const userId = await createTestUser();
    createdUsers.push(userId);
    const slug = uniqueSlug();

    const result = await completeOnboarding(userId, validInput(slug));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    createdBusinessIds.push(result.businessId);
    expect(result.slug).toBe(slug);

    const business = await adminQuery<{
      name: string;
      comuna: string;
      category: string;
      phone: string;
    }>(
      "select name, comuna, category, phone from public.businesses where id = $1",
      [result.businessId],
    );
    expect(business.rows[0]).toEqual({
      name: "Barbería WP-15",
      comuna: "Providencia",
      category: "barberia",
      phone: "+56912345678",
    });

    const membership = await adminQuery<{ role: string }>(
      "select role from public.memberships where business_id = $1 and user_id = $2",
      [result.businessId, userId],
    );
    expect(membership.rows).toHaveLength(1);
    expect(membership.rows[0]?.role).toBe("owner");

    const services = await adminQuery<{
      name: string;
      duration_min: number;
      price_clp: number;
    }>(
      "select name, duration_min, price_clp from public.services where business_id = $1 order by sort",
      [result.businessId],
    );
    expect(services.rows).toEqual([
      { name: "Corte", duration_min: 30, price_clp: 12000 },
      { name: "Barba", duration_min: 15, price_clp: 8000 },
    ]);

    const staff = await adminQuery<{ name: string; color: string }>(
      "select name, color from public.staff where business_id = $1 order by sort",
      [result.businessId],
    );
    expect(staff.rows).toEqual([
      { name: "Diego", color: "staff-1" },
      { name: "Matías", color: "staff-2" },
    ]);

    const staffServices = await adminQuery<{ n: string }>(
      "select count(*)::text as n from public.staff_services where business_id = $1",
      [result.businessId],
    );
    // Diego: 2 servicios, Matías: 1 servicio.
    expect(staffServices.rows[0]?.n).toBe("3");

    const hours = await adminQuery<{ weekday: number }>(
      "select weekday from public.business_hours where business_id = $1 order by weekday",
      [result.businessId],
    );
    // Solo los días abiertos (lunes, martes) generan filas; domingo (cerrado) no.
    expect(hours.rows.map((r) => r.weekday)).toEqual([1, 2]);

    // WP-26: villkor + biträdesavtal loggas i samma transaktion.
    const consents = await adminQuery<{ kind: string; subject: string }>(
      `select kind::text, subject::text from public.consent_events
        where business_id = $1 and granted and version = $2 order by consent_events.kind`,
      [result.businessId, LEGAL_VERSION],
    );
    expect(consents.rows).toEqual([
      { kind: "owner_terms", subject: "owner" },
      { kind: "dpa", subject: "owner" },
    ]);
  });

  it("WP-26: utan acceptedTerms → terms.not_accepted, inget företag skapas", async () => {
    const userId = await createTestUser();
    createdUsers.push(userId);
    const slug = uniqueSlug();
    const { acceptedTerms: _omit, ...withoutTerms } = validInput(slug);
    void _omit;

    for (const input of [
      withoutTerms,
      { ...withoutTerms, acceptedTerms: false },
    ]) {
      expect(await completeOnboarding(userId, input)).toEqual({
        ok: false,
        code: "terms.not_accepted",
      });
    }
    const count = await adminQuery<{ n: string }>(
      "select count(*)::text as n from public.businesses where slug = $1",
      [slug],
    );
    expect(count.rows[0]?.n).toBe("0");
  });

  it("slug duplicado → business.slug_taken, ingen rad skapas", async () => {
    const userId1 = await createTestUser();
    const userId2 = await createTestUser();
    createdUsers.push(userId1, userId2);
    const slug = uniqueSlug();

    const first = await completeOnboarding(userId1, validInput(slug));
    expect(first.ok).toBe(true);
    if (first.ok) createdBusinessIds.push(first.businessId);

    const second = await completeOnboarding(userId2, validInput(slug));
    expect(second).toEqual({ ok: false, code: "business.slug_taken" });

    const count = await adminQuery<{ n: string }>(
      "select count(*)::text as n from public.businesses where slug = $1",
      [slug],
    );
    expect(count.rows[0]?.n).toBe("1");
  });

  it("ogiltig indata (zod) → inget skrivs, RLS/DB rörs aldrig", async () => {
    const userId = await createTestUser();
    createdUsers.push(userId);

    const result = await completeOnboarding(userId, {
      business: {
        name: "",
        slug: "x",
        comuna: "Providencia",
        category: "barberia",
        phone: "+56912345678",
      },
      services: [],
      staff: [],
      hours: [],
    });
    expect(result).toEqual({ ok: false, code: "business.name_empty" });
  });

  it("en annan ägare ser inte den nya rader (RLS, tenant-isolering)", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    createdUsers.push(owner, other);
    const slug = uniqueSlug();

    const result = await completeOnboarding(owner, validInput(slug));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    createdBusinessIds.push(result.businessId);

    const { withOwnerTx } = await import("@/server/db/tx");
    const visibleToOther = await withOwnerTx(other, async (q) => {
      const r = await q.query(
        "select id from public.businesses where id = $1",
        [result.businessId],
      );
      return r.rows;
    });
    expect(visibleToOther).toEqual([]);

    const membershipsForOther = await withOwnerTx(other, async (q) => {
      const r = await q.query(
        "select business_id from public.memberships where business_id = $1",
        [result.businessId],
      );
      return r.rows;
    });
    expect(membershipsForOther).toEqual([]);
  });
});
