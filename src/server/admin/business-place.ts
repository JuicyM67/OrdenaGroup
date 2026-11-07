import "server-only";

// /admin/negocios/[id] → "Rubro y ubicación" (WP-84, D-069; port av SE WP-90 /
// D-074 utan katalogfälten och utan "tidigare betyg"): plattformsadmin hjälper
// ett företag att rätta rubro, comuna och adress. Samma regler som ägarens
// Ajustes (`comunaSchema`, `RUBRO_KEYS`, max 200 tecken adress). Via service_role
// i en transaktion, med en rad i `private.admin_audit_log` (bara vilka fält som
// ändrades i `details`, aldrig värdena — regel 7). Geokodningen plockar upp en
// ändrad adress själv (`geocode_address_hash`, svepet).
import { z } from "zod";

import { withServiceTx } from "@/server/db/tx";
import { comunaSchema, RUBRO_KEYS } from "@/server/onboarding/schemas";

import { writeAuditLog } from "./audit";
import type { AdminActionResult } from "./businesses";

export type AdminBusinessPlace = {
  rubro: (typeof RUBRO_KEYS)[number];
  comuna: string;
  address: string;
  /** Företaget från en admin-inbjudan som ägaren inte har gjort klart
   * (`isOnboardingDraft`: comuna och category tomma). Onboardingen fyller i
   * fälten — admin rör dem inte under tiden. */
  draft: boolean;
};

export async function getAdminBusinessPlace(
  businessId: string,
): Promise<AdminBusinessPlace | null> {
  return withServiceTx(async (q) => {
    const r = await q.query<{
      category: string;
      comuna: string;
      address: string | null;
    }>(
      `select category, comuna, address from public.businesses where id = $1`,
      [businessId],
    );
    const b = r.rows[0];
    if (!b) return null;
    return {
      rubro: (RUBRO_KEYS as readonly string[]).includes(b.category)
        ? (b.category as AdminBusinessPlace["rubro"])
        : "otro",
      comuna: b.comuna,
      address: b.address ?? "",
      draft: b.comuna === "" && b.category === "",
    };
  });
}

export const adminBusinessPlaceInputSchema = z.object({
  rubro: z.enum(RUBRO_KEYS),
  comuna: comunaSchema,
  address: z.string().trim().max(200),
});

export async function setAdminBusinessPlace(
  adminUserId: string,
  businessId: string,
  rawInput: unknown,
): Promise<AdminActionResult> {
  const parsed = adminBusinessPlaceInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  const input = parsed.data;
  return withServiceTx(async (q) => {
    const before = await q.query<{
      category: string;
      comuna: string;
      address: string | null;
    }>(
      `select category, comuna, address from public.businesses
        where id = $1 for update`,
      [businessId],
    );
    const prev = before.rows[0];
    if (!prev) return { ok: false, code: "not_found" };
    if (prev.comuna === "" && prev.category === "") {
      return { ok: false, code: "onboarding_draft" };
    }
    const address = input.address === "" ? null : input.address;
    await q.query(
      `update public.businesses
          set category = $2, comuna = $3, address = $4
        where id = $1`,
      [businessId, input.rubro, input.comuna, address],
    );
    await writeAuditLog(q, {
      adminUserId,
      action: "business_place",
      businessId,
      details: {
        rubro: prev.category !== input.rubro,
        comuna: prev.comuna !== input.comuna,
        address: (prev.address ?? null) !== address,
      },
    });
    return { ok: true };
  });
}
