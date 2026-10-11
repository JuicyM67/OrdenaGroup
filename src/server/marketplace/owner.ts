import "server-only";

/**
 * Erbjudanderedigeraren (WP-70, D-056): företagets egna erbjudanden i
 * `/app/erbjudanden` (CL `/app/ofertas`, dold som marknadsplatsen, D-055).
 *
 * Databasen går via `withOwnerTx` (D-019): RLS + `offers_guard` (WP-68) +
 * `offers_guard_plan_price`/`services_price_offer_lock` (WP-70) är gränsen;
 * förkontrollerna här ger bara vänligare felkoder.
 * - Katalogrätt (`can_edit_catalog`, D-034) skapar och ändrar utkast och
 *   pausar; bara ägaren publicerar och ändrar ett publicerat erbjudande.
 * - Planen måste ha `offers` (Team och uppåt, D-048).
 * - Prisvakten: ordinarie pris = tjänstens pris i dag; rabatten räknas mot
 *   det lägsta priset de senaste 30 dagarna, och erbjudandepriset måste
 *   ligga under det.
 *
 * Bilder: samma tre steg som profilbilderna (`src/server/owner/profile.ts`):
 * `createOfferImageUpload` signerar `<business_id>/<uuid>.<ext>` i bucketen
 * `offer-images` med användarens session, klienten laddar upp direkt, och
 * `saveOffer` kontrollerar objektet (finns, typ, storlek) innan URL:en sparas.
 */
import { randomUUID } from "node:crypto";

import { categoryForRubro } from "@/config/marketplace";
import {
  APP_TZ,
  addLocalDays,
  fromLocal,
  toLocalDate,
  type LocalDate,
  type LocalTime,
} from "@/lib/format/dates";
import { parseMoney } from "@/lib/format/money";
import {
  OFFER_IMAGE_BUCKET,
  OFFER_IMAGE_CONTENT_TYPES,
  OFFER_IMAGE_EXTENSION,
  OFFER_IMAGE_MAX_BYTES,
  offerImageUploadSchema,
  offerInputSchema,
} from "@/lib/validation/offers";
import { pgErrorCode } from "@/server/db/errors";
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx } from "@/server/db/tx";
import { authzCode, isOwner, requireMemberPerm } from "@/server/owner/member";
import type { MediaStorage } from "@/server/owner/profile";
import {
  PlanLockedError,
  loadPlanIn,
  planCan,
  requireFeatureIn,
} from "@/server/plans/entitlements";

export type OfferStatus = "draft" | "published" | "paused" | "ended";

export type OwnerOffer = {
  id: string;
  slug: string;
  serviceId: string;
  serviceName: string;
  title: string;
  description: string;
  includes: string[];
  terms: string;
  category: string;
  offerPriceMinor: number;
  /** Tjänstens pris i dag (= ordinarie pris). */
  regularPriceMinor: number;
  status: OfferStatus;
  quantityTotal: number | null;
  quantitySold: number;
  saleStartsOn: LocalDate | null;
  /** Sista säljdagen (inklusive). */
  saleEndsOn: LocalDate | null;
  validMonths: number;
  imageUrl: string | null;
  publishedAt: string | null;
};

export type OwnerOfferService = {
  id: string;
  name: string;
  priceMinor: number;
  /** Lägsta pris senaste 30 dagarna (underlag för rabatten). */
  lowestMinor: number;
  /** Priset kan inte höjas just nu (publicerat eller nyss avslutat erbjudande). */
  priceLocked: boolean;
};

export type OffersEditorData = {
  offers: OwnerOffer[];
  services: OwnerOfferService[];
  canEdit: boolean;
  canPublish: boolean;
  planOk: boolean;
  defaultCategory: string;
  /** Till förhandsvisningen (samma kort som i Upptäck). */
  business: { name: string; slug: string; areaName: string | null };
};

export type OfferResult = { ok: true } | { ok: false; code: string };

const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const UUID_ONLY = new RegExp(`^${UUID_RE}$`);
const MIDNIGHT = "00:00" as LocalTime;

function pgConstraint(e: unknown): string | undefined {
  if (typeof e !== "object" || e === null || !("constraint" in e)) {
    return undefined;
  }
  const v = (e as Record<string, unknown>).constraint;
  return typeof v === "string" ? v : undefined;
}

/** Bara SQLSTATE/constraint, aldrig message/detail (ingen persondata). */
export function mapOfferDbError(e: unknown): string {
  if (e instanceof PlanLockedError) return e.code;
  const authz = authzCode(e);
  if (authz) return authz;
  const code = pgErrorCode(e);
  const constraint = pgConstraint(e);
  if (code === "23514") {
    switch (constraint) {
      case "offers_price_below_regular":
        return "offers.price_not_below";
      case "offer_regular_price_raised":
        return "offers.price_raised_recently";
      case "service_price_offer_lock":
        return "offers.service_price_locked";
      case "offers_sale_window":
        return "offers.sale_window_invalid";
      case "offers_image_url_check":
        return "offers.image_invalid";
      case "offers_quantity_within_total":
        return "offers.quantity_below_sold";
    }
  }
  if (code === "23503") return "offers.service_required";
  if (code === "42501") return "forbidden";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Bild-URL:er (bucketen är publik, samma form som `business-media`)
// ---------------------------------------------------------------------------
function supabaseBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL saknas");
  return url.replace(/\/+$/, "");
}

function offerImagePrefix(baseUrl: string): string {
  return `${baseUrl}/storage/v1/object/public/${OFFER_IMAGE_BUCKET}/`;
}

export function offerImageUrl(
  path: string,
  baseUrl: string = supabaseBaseUrl(),
): string {
  return offerImagePrefix(baseUrl) + path;
}

/** Omvändningen (för att ta bort en ersatt bild). `null` om URL:en inte är
 * företagets egen fil i bucketen (t.ex. en demobild i `public/`). */
export function offerImagePathFromUrl(
  url: string | null,
  businessId: string,
  baseUrl: string = supabaseBaseUrl(),
): string | null {
  if (!url) return null;
  const prefix = offerImagePrefix(baseUrl);
  if (!url.startsWith(prefix)) return null;
  const path = url.slice(prefix.length);
  return isOwnOfferImagePath(path, businessId) ? path : null;
}

/** Bara sökvägar som `createOfferImageUpload` kan ha skapat för företaget. */
export function isOwnOfferImagePath(path: string, businessId: string): boolean {
  const re = new RegExp(`^${UUID_RE}/${UUID_RE}\\.(jpg|png|webp)$`);
  return re.test(path) && path.startsWith(`${businessId}/`);
}

// ---------------------------------------------------------------------------
// Slug och datum
// ---------------------------------------------------------------------------
export function offerSlug(title: string, suffix: string): string {
  const base = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return base ? `${base}-${suffix}` : `erbjudande-${suffix}`;
}

function startOfDay(date: string | null): Date | null {
  return date === null ? null : fromLocal(date as LocalDate, MIDNIGHT, APP_TZ);
}

/** Sista säljdagen inklusive ⇒ `sale_ends_at` = midnatt dagen efter. */
function endOfDay(date: string | null): Date | null {
  return date === null
    ? null
    : fromLocal(addLocalDays(date as LocalDate, 1), MIDNIGHT, APP_TZ);
}

function lastDayOf(endsAt: Date | null): LocalDate | null {
  return endsAt === null ? null : addLocalDays(toLocalDate(endsAt, APP_TZ), -1);
}

async function defaultStorage(): Promise<MediaStorage> {
  const { ownerMediaStorage } = await import("@/server/owner/media-storage");
  return ownerMediaStorage(OFFER_IMAGE_BUCKET);
}

// ---------------------------------------------------------------------------
// Läsning
// ---------------------------------------------------------------------------
type OfferRow = {
  id: string;
  slug: string;
  service_id: string;
  service_name: string;
  title: string;
  description: string | null;
  includes: string[];
  terms: string | null;
  category: string;
  offer_price_minor: number;
  service_price: number;
  status: OfferStatus;
  quantity_total: number | null;
  quantity_sold: number;
  sale_starts_at: Date | null;
  sale_ends_at: Date | null;
  valid_months: number;
  image_url: string | null;
  published_at: Date | null;
};

async function servicesIn(
  q: Queryable,
  businessId: string,
): Promise<OwnerOfferService[]> {
  const r = await q.query<{
    id: string;
    name: string;
    price: number;
    lowest: number | null;
    locked: boolean;
  }>(
    `select s.id, s.name, s.price_clp as price,
            private.service_lowest_price_30d(s.business_id, s.id) as lowest,
            exists (
              select 1 from public.offers o
               where o.business_id = s.business_id and o.service_id = s.id
                 and (o.status = 'published'
                      or o.last_unpublished_at > now() - interval '30 days')
            ) as locked
       from public.services s
      where s.business_id = $1 and s.active
      order by s.sort, s.name`,
    [businessId],
  );
  return r.rows.map((s) => ({
    id: s.id,
    name: s.name,
    priceMinor: s.price,
    lowestMinor: Math.min(s.lowest ?? s.price, s.price),
    priceLocked: s.locked,
  }));
}

export async function loadOffersEditor(
  userId: string,
  businessId: string,
): Promise<OffersEditorData> {
  return withOwnerTx(userId, async (q) => {
    const member = await requireMemberPerm(
      q,
      userId,
      businessId,
      "can_edit_catalog",
    );
    const plan = await loadPlanIn(q, businessId);
    // En anslutning: frågorna körs efter varandra (pg köar annars med varning).
    const offers = await q.query<OfferRow>(
      `select o.id, o.slug, o.service_id, s.name as service_name, o.title,
                o.description, o.includes, o.terms, o.category,
                o.offer_price_minor, s.price_clp as service_price, o.status,
                o.quantity_total, o.quantity_sold, o.sale_starts_at,
                o.sale_ends_at, o.valid_months, o.image_url, o.published_at
           from public.offers o
           join public.services s on s.business_id = o.business_id and s.id = o.service_id
          where o.business_id = $1
          order by case o.status when 'published' then 0 when 'draft' then 1
                                 when 'paused' then 2 else 3 end,
                   o.updated_at desc`,
      [businessId],
    );
    const services = await servicesIn(q, businessId);
    const biz = await q.query<{
      category: string;
      name: string;
      slug: string;
      area_name: string | null;
    }>(
      `select category, name, slug, area_name from public.businesses where id = $1`,
      [businessId],
    );
    return {
      offers: offers.rows.map((o) => ({
        id: o.id,
        slug: o.slug,
        serviceId: o.service_id,
        serviceName: o.service_name,
        title: o.title,
        description: o.description ?? "",
        includes: o.includes,
        terms: o.terms ?? "",
        category: o.category,
        offerPriceMinor: o.offer_price_minor,
        regularPriceMinor: o.service_price,
        status: o.status,
        quantityTotal: o.quantity_total,
        quantitySold: o.quantity_sold,
        saleStartsOn: o.sale_starts_at
          ? toLocalDate(o.sale_starts_at, APP_TZ)
          : null,
        saleEndsOn: lastDayOf(o.sale_ends_at),
        validMonths: o.valid_months,
        imageUrl: o.image_url,
        publishedAt: o.published_at ? o.published_at.toISOString() : null,
      })),
      services,
      canEdit: true,
      canPublish: isOwner(member),
      planOk: planCan(plan, "offers"),
      defaultCategory: categoryForRubro(biz.rows[0]?.category ?? ""),
      business: {
        name: biz.rows[0]?.name ?? "",
        slug: biz.rows[0]?.slug ?? "",
        areaName: biz.rows[0]?.area_name ?? null,
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Skapa / ändra
// ---------------------------------------------------------------------------
async function checkUploadedImage(
  q: Queryable,
  path: string,
): Promise<string | null> {
  const obj = await q.query<{ size: string | null; mime: string | null }>(
    `select metadata->>'size' as size, metadata->>'mimetype' as mime
       from storage.objects
      where bucket_id = $1 and name = $2`,
    [OFFER_IMAGE_BUCKET, path],
  );
  const o = obj.rows[0];
  if (!o) return "offers.image_missing";
  const size = Number(o.size);
  if (
    !(OFFER_IMAGE_CONTENT_TYPES as readonly string[]).includes(o.mime ?? "") ||
    !Number.isFinite(size) ||
    size > OFFER_IMAGE_MAX_BYTES
  ) {
    return "offers.image_type_invalid";
  }
  return null;
}

export async function saveOffer(
  userId: string,
  businessId: string,
  offerId: string | null,
  rawInput: unknown,
  storage?: MediaStorage,
): Promise<{ ok: true; id: string } | { ok: false; code: string }> {
  if (offerId !== null && !UUID_ONLY.test(offerId)) {
    return { ok: false, code: "invalid_input" };
  }
  const parsed = offerInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "invalid_input",
    };
  }
  const input = parsed.data;
  const price = parseMoney(input.offerPrice);
  if (!price.ok || price.value <= 0) {
    return { ok: false, code: "offers.price_invalid" };
  }
  if (
    typeof input.imagePath === "string" &&
    !isOwnOfferImagePath(input.imagePath, businessId)
  ) {
    return { ok: false, code: "invalid_input" };
  }

  let result:
    | { ok: true; id: string; replaced: string | null }
    | { ok: false; code: string; discard: boolean };
  try {
    result = await withOwnerTx(userId, async (q) => {
      const member = await requireMemberPerm(
        q,
        userId,
        businessId,
        "can_edit_catalog",
      );
      await requireFeatureIn(q, businessId, "offers");

      const svc = (await servicesIn(q, businessId)).find(
        (s) => s.id === input.serviceId,
      );
      if (!svc) {
        return { ok: false, code: "offers.service_required", discard: true };
      }
      if (price.value >= svc.lowestMinor) {
        return { ok: false, code: "offers.price_not_below", discard: true };
      }

      let prevImage: string | null = null;
      if (offerId !== null) {
        const prev = await q.query<{
          status: OfferStatus;
          image_url: string | null;
        }>(
          `select status, image_url from public.offers
            where id = $1 and business_id = $2 for update`,
          [offerId, businessId],
        );
        const row = prev.rows[0];
        if (!row) {
          return { ok: false, code: "offers.not_found", discard: true };
        }
        if (row.status === "published" && !isOwner(member)) {
          return {
            ok: false,
            code: "offers.published_owner_only",
            discard: true,
          };
        }
        prevImage = row.image_url;
      }

      let imageUrl: string | null | undefined = undefined;
      if (input.imagePath === null) imageUrl = null;
      if (typeof input.imagePath === "string") {
        const bad = await checkUploadedImage(q, input.imagePath);
        if (bad) return { ok: false, code: bad, discard: true };
        imageUrl = offerImageUrl(input.imagePath);
      }

      const values = [
        input.serviceId,
        input.title,
        input.description || null,
        input.includes,
        input.terms || null,
        input.category,
        price.value,
        input.quantityTotal,
        startOfDay(input.saleStartsOn),
        endOfDay(input.saleEndsOn),
        input.validMonths,
      ];

      if (offerId === null) {
        // `id` har ingen insert-grant (WP-68) — databasen väljer den.
        const ins = await q.query<{ id: string }>(
          `insert into public.offers
             (business_id, slug, service_id, title, description, includes,
              terms, category, offer_price_minor, quantity_total,
              sale_starts_at, sale_ends_at, valid_months, image_url)
           values ($12, $13, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $14)
           returning id`,
          [
            ...values,
            businessId,
            offerSlug(input.title, randomUUID().slice(0, 6)),
            imageUrl ?? null,
          ],
        );
        return { ok: true, id: ins.rows[0]!.id, replaced: null };
      }

      await q.query(
        `update public.offers
            set service_id = $1, title = $2, description = $3, includes = $4,
                terms = $5, category = $6, offer_price_minor = $7,
                quantity_total = $8, sale_starts_at = $9, sale_ends_at = $10,
                valid_months = $11,
                image_url = case when $14::boolean then $15 else image_url end
          where id = $12 and business_id = $13`,
        [
          ...values,
          offerId,
          businessId,
          imageUrl !== undefined,
          imageUrl ?? null,
        ],
      );
      const replaced =
        imageUrl !== undefined && prevImage !== imageUrl
          ? offerImagePathFromUrl(prevImage, businessId)
          : null;
      return { ok: true, id: offerId, replaced };
    });
  } catch (e) {
    result = { ok: false, code: mapOfferDbError(e), discard: true };
  }

  // Storage städas efter commit (en misslyckad borttagning lämnar i värsta
  // fall en föräldralös fil, aldrig en rad som pekar på en saknad fil).
  if (!result.ok) {
    if (result.discard && typeof input.imagePath === "string") {
      await (storage ?? (await defaultStorage())).remove([input.imagePath]);
    }
    return { ok: false, code: result.code };
  }
  if (result.replaced) {
    await (storage ?? (await defaultStorage())).remove([result.replaced]);
  }
  return { ok: true, id: result.id };
}

// ---------------------------------------------------------------------------
// Publicera / pausa
// ---------------------------------------------------------------------------
export async function setOfferStatus(
  userId: string,
  businessId: string,
  offerId: string,
  status: "published" | "paused",
): Promise<OfferResult> {
  if (!UUID_ONLY.test(offerId)) return { ok: false, code: "invalid_input" };
  if (status !== "published" && status !== "paused") {
    return { ok: false, code: "invalid_input" };
  }
  try {
    return await withOwnerTx(userId, async (q) => {
      const member = await requireMemberPerm(
        q,
        userId,
        businessId,
        "can_edit_catalog",
      );
      if (status === "published") {
        if (!isOwner(member)) {
          return { ok: false, code: "offers.publish_owner_only" };
        }
        await requireFeatureIn(q, businessId, "offers");
      }
      const r = await q.query(
        `update public.offers set status = $1
          where id = $2 and business_id = $3 and status <> 'ended'`,
        [status, offerId, businessId],
      );
      return r.rowCount
        ? { ok: true }
        : { ok: false, code: "offers.not_found" };
    });
  } catch (e) {
    return { ok: false, code: mapOfferDbError(e) };
  }
}

// ---------------------------------------------------------------------------
// Bilduppladdning (steg 1: signera)
// ---------------------------------------------------------------------------
export async function createOfferImageUpload(
  userId: string,
  businessId: string,
  rawInput: unknown,
  storage?: MediaStorage,
): Promise<
  | { ok: true; path: string; signedUrl: string; token: string }
  | { ok: false; code: string }
> {
  const parsed = offerImageUploadSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "invalid_input",
    };
  }
  try {
    await withOwnerTx(userId, async (q) => {
      await requireMemberPerm(q, userId, businessId, "can_edit_catalog");
      await requireFeatureIn(q, businessId, "offers");
    });
  } catch (e) {
    return { ok: false, code: mapOfferDbError(e) };
  }
  const path = `${businessId}/${randomUUID()}.${OFFER_IMAGE_EXTENSION[parsed.data.contentType]}`;
  const signed = await (
    storage ?? (await defaultStorage())
  ).createSignedUploadUrl(path);
  if (!signed.ok) return { ok: false, code: "offers.upload_failed" };
  return { ok: true, path, signedUrl: signed.signedUrl, token: signed.token };
}
