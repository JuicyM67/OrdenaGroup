import "server-only";

// Carteles (WP-95/96, D-079/D-080): företagets namn, logga, egna bilder och sparade
// skyltdesigner. Logga och omslag visas bara om de ligger i företagets egen mapp i vår
// bucket (samma filter som den publika sidan och `loadProfileSettings`); galleribilder bara
// om sökvägen är en fil som servern själv laddat upp (som `page-data.ts`). Designen läses
// tolerant (`parseSignDesigns`) och skrivs efter strikt validering (`validateSignDesign`).
// Ett bakgrundsfoto sparas som id ("portada" eller `business_images.id`) och måste finnas
// bland företagets bilder när det sparas.
import type {
  CartelBusiness,
  CartelKind,
  CartelPhoto,
} from "@/lib/share/carteles";
import {
  SIGN_COVER_PHOTO,
  parseSignDesigns,
  type SignDesign,
  type SignDesigns,
} from "@/lib/share/carteles-design";
import { validateSignDesign } from "@/lib/validation/carteles";
import { mediaPathFromUrl, publicMediaUrl } from "@/server/bookings/media";
import { withOwnerTx } from "@/server/db/tx";
import type { Queryable } from "@/server/db/pool";

import { authzCode, requireMemberPerm } from "./member";

export type CartelData = {
  business: CartelBusiness;
  designs: SignDesigns;
};

function ownMediaUrl(url: string | null, businessId: string): string | null {
  return url && mediaPathFromUrl(url, businessId) !== null ? url : null;
}

/** Omslaget (om det finns) och galleriet i ägarens ordning. */
async function loadPhotos(
  q: Queryable,
  businessId: string,
  coverUrl: string | null,
): Promise<CartelPhoto[]> {
  const own = new RegExp(`^${businessId}/[0-9a-f-]{36}\\.(jpg|png|webp)$`);
  const imgs = await q.query<{ id: string; path: string }>(
    `select id, path from public.business_images
      where business_id = $1
      order by sort, created_at`,
    [businessId],
  );
  const cover = ownMediaUrl(coverUrl, businessId);
  return [
    ...(cover ? [{ id: SIGN_COVER_PHOTO, url: cover }] : []),
    ...imgs.rows
      .filter((i) => own.test(i.path))
      .map((i) => ({ id: i.id, url: publicMediaUrl(i.path) })),
  ];
}

export function loadCartelData(
  userId: string,
  businessId: string,
): Promise<CartelData> {
  return withOwnerTx(userId, async (q) => {
    const r = await q.query<{
      name: string;
      logo_url: string | null;
      cover_url: string | null;
      sign_designs: unknown;
    }>(
      `select name, logo_url, cover_url, sign_designs
         from public.businesses where id = $1`,
      [businessId],
    );
    const row = r.rows[0];
    if (!row) throw new Error("loadCartelData: företaget hittades inte");
    return {
      business: {
        name: row.name,
        logoUrl: ownMediaUrl(row.logo_url, businessId),
        fotos: await loadPhotos(q, businessId, row.cover_url),
      },
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
      const { fondo } = valid.design;
      if (fondo.tipo === "foto") {
        const cover = await q.query<{ cover_url: string | null }>(
          `select cover_url from public.businesses where id = $1`,
          [businessId],
        );
        const fotos = await loadPhotos(
          q,
          businessId,
          cover.rows[0]?.cover_url ?? null,
        );
        if (!fotos.some((f) => f.id === fondo.foto)) {
          return { ok: false, code: "invalid" } as const;
        }
      }
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
