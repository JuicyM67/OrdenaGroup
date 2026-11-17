import "server-only";

// Carteles (WP-95/96, D-079/D-080): företagets namn, logga och sparade skyltdesigner.
// Loggan visas bara om den ligger i företagets egen mapp i vår bucket (samma filter som den
// publika sidan och `loadProfileSettings`), annars initialer. Designen läses tolerant
// (`parseSignDesigns`) och skrivs efter strikt validering (`validateSignDesign`).
import type { CartelBusiness, CartelKind } from "@/lib/share/carteles";
import {
  parseSignDesigns,
  type SignDesign,
  type SignDesigns,
} from "@/lib/share/carteles-design";
import { validateSignDesign } from "@/lib/validation/carteles";
import { mediaPathFromUrl } from "@/server/bookings/media";
import { withOwnerTx } from "@/server/db/tx";

import { authzCode, requireMemberPerm } from "./member";

export type CartelData = {
  business: CartelBusiness;
  designs: SignDesigns;
};

export function loadCartelData(
  userId: string,
  businessId: string,
): Promise<CartelData> {
  return withOwnerTx(userId, async (q) => {
    const r = await q.query<{
      name: string;
      logo_url: string | null;
      sign_designs: unknown;
    }>(
      `select name, logo_url, sign_designs from public.businesses where id = $1`,
      [businessId],
    );
    const row = r.rows[0];
    if (!row) throw new Error("loadCartelData: företaget hittades inte");
    const logoUrl =
      row.logo_url && mediaPathFromUrl(row.logo_url, businessId) !== null
        ? row.logo_url
        : null;
    return {
      business: { name: row.name, logoUrl },
      designs: parseSignDesigns(row.sign_designs),
    };
  });
}

export type SaveSignDesignResult =
  | { ok: true; design: SignDesign }
  | { ok: false; code: "invalid" | "unauthorized" | "forbidden" | "error" };

/** Sparar en skylts design (`sign_designs.<kind>`), kräver `can_edit_settings`. */
export async function saveSignDesign(
  userId: string,
  businessId: string,
  kind: CartelKind,
  input: unknown,
): Promise<SaveSignDesignResult> {
  const valid = validateSignDesign(kind, input);
  if (!valid.ok) return valid;
  try {
    return await withOwnerTx(userId, async (q) => {
      await requireMemberPerm(q, userId, businessId, "can_edit_settings");
      const r = await q.query(
        `update public.businesses
            set sign_designs = jsonb_set(
                  jsonb_set(sign_designs, '{v}', '1'::jsonb),
                  array[$2::text], $3::jsonb)
          where id = $1`,
        [businessId, kind, JSON.stringify(valid.design)],
      );
      if (r.rowCount !== 1) return { ok: false, code: "forbidden" } as const;
      return { ok: true, design: valid.design } as const;
    });
  } catch (e) {
    const code = authzCode(e);
    if (code) return { ok: false, code };
    return { ok: false, code: "error" };
  }
}
