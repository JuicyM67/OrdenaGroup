import { afterAll, describe, expect, it, vi } from "vitest";

import {
  adminQuery,
  assertLocalDatabase,
  createTestUser,
  dropTestUser,
} from "@/server/db/testing";

import { createInvitationToken } from "../admin/token";
import {
  BETA_INVITATION_REQUIRED,
  completeOnboarding,
} from "./complete-onboarding";
import { acceptInvitation } from "./invitation";

// Stängd beta (src/config/beta.ts): `create_business()` bara för plattformsadmins, men ett
// utkast från en inbjudan (F19/WP-36) fylls alltid i. Admin-kontrollen styrs härifrån (en
// riktig rad i `private.platform_admins` går inte att städa bort om den är den enda —
// `platform_admins_keep_one`).
vi.mock("@/config/beta", () => ({ INVITE_ONLY_BETA: true }));
const admin = vi.hoisted(() => ({ value: false }));
vi.mock("@/server/admin/auth", () => ({
  isPlatformAdmin: async () => admin.value,
}));

assertLocalDatabase();

function uniqueSlug(): string {
  return `beta-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function validInput(slug: string) {
  return {
    acceptedTerms: true,
    business: {
      name: "Barbería Beta",
      slug,
      comuna: "Providencia",
      category: "barberia",
      phone: "+56912345678",
      address: "Av. Providencia 1234",
    },
    services: [{ name: "Corte", durationMin: 30, priceClp: "12000" }],
    staff: [{ name: "Diego", serviceIndexes: [0] }],
    hours: [{ weekday: 1, open: true, start: "09:00", end: "19:00" }],
  };
}

const createdUsers: string[] = [];
const createdBusinessIds: string[] = [];

afterAll(async () => {
  // Inbjudningarna först: en accepterad inbjudan måste ha kvar sitt företag
  // (`business_invitations_accepted_has_business`), och `created_by` pekar på kontot.
  for (const id of createdUsers) {
    await adminQuery(
      "delete from private.business_invitations where created_by = $1",
      [id],
    );
  }
  for (const id of createdBusinessIds) {
    await adminQuery("delete from public.businesses where id = $1", [id]);
  }
  for (const id of createdUsers) {
    await dropTestUser(id);
  }
});

async function businessCountForSlug(slug: string): Promise<string> {
  const r = await adminQuery<{ n: string }>(
    "select count(*)::text as n from public.businesses where slug = $1",
    [slug],
  );
  return r.rows[0]?.n ?? "";
}

describe("completeOnboarding under den stängda betan (integration, lokal Supabase)", () => {
  it("utan inbjudan → beta.invitation_required, inget företag skapas", async () => {
    admin.value = false;
    const userId = await createTestUser();
    createdUsers.push(userId);
    const slug = uniqueSlug();

    expect(await completeOnboarding(userId, validInput(slug))).toEqual({
      ok: false,
      code: BETA_INVITATION_REQUIRED,
    });
    expect(await businessCountForSlug(slug)).toBe("0");
    const memberships = await adminQuery(
      "select 1 from public.memberships where user_id = $1",
      [userId],
    );
    expect(memberships.rows).toHaveLength(0);
  });

  it("plattformsadmin → får skapa ett företag (tester)", async () => {
    admin.value = true;
    try {
      const userId = await createTestUser();
      createdUsers.push(userId);
      const slug = uniqueSlug();

      const result = await completeOnboarding(userId, validInput(slug));
      expect(result.ok).toBe(true);
      if (result.ok) createdBusinessIds.push(result.businessId);
      expect(await businessCountForSlug(slug)).toBe("1");
    } finally {
      admin.value = false;
    }
  });

  it("inbjudan (utkast) → onboarding fyller i SAMMA företag", async () => {
    admin.value = false;
    const userId = await createTestUser();
    createdUsers.push(userId);
    const { token, hash } = createInvitationToken();
    await adminQuery(
      `insert into private.business_invitations (email, business_name, token_hash, created_by)
       values ($1, $2, $3, $4)`,
      [`${userId}@test.invalid`, "Barbería Invitada", hash, userId],
    );
    const accepted = await acceptInvitation(userId, token);
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    createdBusinessIds.push(accepted.businessId);

    const slug = uniqueSlug();
    const result = await completeOnboarding(userId, validInput(slug));
    expect(result).toEqual({
      ok: true,
      businessId: accepted.businessId,
      slug,
    });
    const business = await adminQuery<{ comuna: string; category: string }>(
      "select comuna, category from public.businesses where id = $1",
      [accepted.businessId],
    );
    expect(business.rows[0]).toEqual({
      comuna: "Providencia",
      category: "barberia",
    });
  });
});
