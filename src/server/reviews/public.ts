import "server-only";

import { z } from "zod";

import { hashManageToken } from "@/server/bookings/token";
import type { Queryable } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";

import { reviewDisplayName } from "./display-name";

/**
 * WP-65 (D-045): kundens sida `/resena/[token]` och den publika läsningen
 * på `/[slug]`. Allt körs som service_role (samma princip som resten av
 * `/[slug]` och `/r/[token]`); token:en loggas aldrig, bara dess SHA-256
 * finns i `review_invites`.
 */

export const REVIEW_COMMENT_MAX = 1000;
export const REVIEW_EDIT_DAYS = 7;
const EDIT_WINDOW_MS = REVIEW_EDIT_DAYS * 24 * 60 * 60 * 1000;
/** Länken gäller 60 dagar efter förfrågan (sedan: `noEncontrada`). */
const INVITE_VALID_DAYS = 60;

/** Bokningar som räknas som genomförda (D-045): `completed`, eller
 * `confirmed` vars tid passerat (ingen markerade No vino). */
const DONE_STATUSES = new Set(["completed", "confirmed"]);

export type ReviewInvitePage = {
  negocio: string;
  slug: string;
  servicio: string;
  profesional: string;
  /** Företagets tidszon (visning av datumet). */
  timezone: string;
  /** ISO, bokningens start. */
  startsAt: string;
  /** Visningsnamnet recensionen publiceras med ("Ana P."). */
  displayName: string | null;
  existing: { rating: number; comment: string } | null;
  /** `false` = recensionen finns och 7 dagar har gått (bara tack-läge). */
  editable: boolean;
};

type InviteRow = {
  business_id: string;
  booking_id: string;
  customer_id: string;
  invite_created_at: string;
};

/** Token → inbjudan (bara hash-uppslag, ingen `business_id` att filtrera på
 * — token:en är det enda kunden har, samma som `/r/[token]`). */
async function findInvite(
  q: Queryable,
  token: string,
): Promise<InviteRow | undefined> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return undefined;
  const r = await q.query<{
    business_id: string;
    booking_id: string;
    created_at: string;
  }>(
    `select business_id, booking_id, created_at
       from public.review_invites
      where token_hash = $1
        and created_at > now() - make_interval(days => $2::int)`,
    [hashManageToken(token), INVITE_VALID_DAYS],
  );
  const row = r.rows[0];
  if (!row) return undefined;
  const bk = await q.query<{ customer_id: string; status: string }>(
    `select customer_id, status::text as status
       from public.bookings
      where business_id = $1 and id = $2`,
    [row.business_id, row.booking_id],
  );
  const b = bk.rows[0];
  if (!b || !DONE_STATUSES.has(b.status)) return undefined;
  return {
    business_id: row.business_id,
    booking_id: row.booking_id,
    customer_id: b.customer_id,
    invite_created_at: row.created_at,
  };
}

function isEditable(createdAt: string | null, now: Date): boolean {
  if (!createdAt) return true;
  return now.getTime() - new Date(createdAt).getTime() <= EDIT_WINDOW_MS;
}

export async function loadReviewInvite(
  token: string,
  now: Date,
): Promise<ReviewInvitePage | undefined> {
  return withServiceTx(async (q) => {
    const invite = await findInvite(q, token);
    if (!invite) return undefined;
    return loadReviewPageIn(q, invite.business_id, invite.booking_id, now);
  });
}

/** Sidans data för en (redan auktoriserad) bokning — delas av tokenlänken och
 * kontot (WP-67, D-054). */
async function loadReviewPageIn(
  q: Queryable,
  businessId: string,
  bookingId: string,
  now: Date,
): Promise<ReviewInvitePage | undefined> {
  const r = await q.query<{
    negocio: string;
    slug: string;
    servicio: string;
    profesional: string;
    timezone: string;
    starts_at: string;
    cliente: string | null;
    anonymized: boolean;
    rating: number | null;
    comment: string | null;
    review_created_at: string | null;
  }>(
    `select b.name as negocio, b.slug, s.name as servicio,
            st.name as profesional, b.timezone,
            lower(bk.period) as starts_at,
            c.name as cliente, (c.anonymized_at is not null) as anonymized,
            rv.rating, rv.comment, rv.created_at as review_created_at
       from public.bookings bk
       join public.businesses b on b.id = bk.business_id
       join public.services s on s.business_id = bk.business_id and s.id = bk.service_id
       join public.staff st on st.business_id = bk.business_id and st.id = bk.staff_id
       join public.customers c on c.business_id = bk.business_id and c.id = bk.customer_id
       left join public.reviews rv on rv.business_id = bk.business_id and rv.booking_id = bk.id
      where bk.business_id = $1 and bk.id = $2`,
    [businessId, bookingId],
  );
  const row = r.rows[0];
  if (!row || row.anonymized) return undefined;
  return {
    negocio: row.negocio,
    slug: row.slug,
    servicio: row.servicio,
    profesional: row.profesional,
    timezone: row.timezone,
    startsAt: new Date(row.starts_at).toISOString(),
    displayName: reviewDisplayName(row.cliente),
    existing:
      row.rating !== null
        ? { rating: row.rating, comment: row.comment ?? "" }
        : null,
    editable: isEditable(row.review_created_at, now),
  };
}

export const reviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(REVIEW_COMMENT_MAX),
});
export type ReviewInput = z.infer<typeof reviewInputSchema>;

export type SubmitReviewResult =
  { ok: true } | { ok: false; code: "invalid_input" | "not_found" | "closed" };

/** Skapar recensionen, eller uppdaterar den inom 7 dagar (samma länk). */
export async function submitReview(
  token: string,
  raw: unknown,
  now: Date,
): Promise<SubmitReviewResult> {
  const parsed = reviewInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  return withServiceTx(async (q) => {
    const invite = await findInvite(q, token);
    if (!invite) return { ok: false, code: "not_found" } as const;
    return writeReviewIn(q, invite, parsed.data, now);
  });
}

type ReviewTarget = {
  business_id: string;
  booking_id: string;
  customer_id: string;
};

/** Själva skrivningen, samma regler oavsett väg (D-045): en per bokning,
 * ändringsbar i 7 dagar, aldrig för en anonymiserad kund. */
async function writeReviewIn(
  q: Queryable,
  target: ReviewTarget,
  input: ReviewInput,
  now: Date,
): Promise<SubmitReviewResult> {
  const comment = input.comment === "" ? null : input.comment;
  const c = await q.query<{ name: string | null; anonymized: boolean }>(
    `select name, (anonymized_at is not null) as anonymized
       from public.customers
      where business_id = $1 and id = $2`,
    [target.business_id, target.customer_id],
  );
  const customer = c.rows[0];
  if (!customer || customer.anonymized) {
    return { ok: false, code: "not_found" };
  }
  const existing = await q.query<{ id: string; created_at: string }>(
    `select id, created_at from public.reviews
      where business_id = $1 and booking_id = $2
      for update`,
    [target.business_id, target.booking_id],
  );
  const prev = existing.rows[0];
  if (prev) {
    if (!isEditable(prev.created_at, now)) {
      return { ok: false, code: "closed" };
    }
    await q.query(
      `update public.reviews
          set rating = $3, comment = $4
        where business_id = $1 and id = $2`,
      [target.business_id, prev.id, input.rating, comment],
    );
    return { ok: true };
  }
  await q.query(
    `insert into public.reviews
       (business_id, booking_id, customer_id, rating, comment, display_name)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (booking_id) do nothing`,
    [
      target.business_id,
      target.booking_id,
      target.customer_id,
      input.rating,
      comment,
      reviewDisplayName(customer.name),
    ],
  );
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Från kundkontot (WP-67, D-054/D-045): samma regler som tokenlänken, men
// auktoriserat via en kopplad bokning (`AccountBookingRef`, som anroparen
// fått från `private.my_booking_ref()` i kundens egen session). Fönstret är
// 60 dagar från bokningens start i stället för från förfrågan.
// ---------------------------------------------------------------------------

/** En bokning som kundkontot bevisligen är kopplat till. */
export type AccountBookingRef = {
  businessId: string;
  customerId: string;
  bookingId: string;
};

/** `businessId`/`customerId` är betrodda (från `my_booking_ref`); bokningen
 * måste ändå vara genomförd och inom 60 dagar. */
async function accountTargetIn(
  q: Queryable,
  ref: AccountBookingRef,
  now: Date,
): Promise<ReviewTarget | undefined> {
  const r = await q.query<{ status: string; ended: boolean; recent: boolean }>(
    `select status::text as status,
            upper(period) <= $3 as ended,
            lower(period) > $3::timestamptz - make_interval(days => $4::int) as recent
       from public.bookings
      where business_id = $1 and id = $2 and customer_id = $5`,
    [
      ref.businessId,
      ref.bookingId,
      now.toISOString(),
      INVITE_VALID_DAYS,
      ref.customerId,
    ],
  );
  const b = r.rows[0];
  if (!b || !b.recent) return undefined;
  const done =
    b.status === "completed" || (b.status === "confirmed" && b.ended);
  if (!done) return undefined;
  return {
    business_id: ref.businessId,
    booking_id: ref.bookingId,
    customer_id: ref.customerId,
  };
}

export async function loadAccountReview(
  ref: AccountBookingRef,
  now: Date,
): Promise<ReviewInvitePage | undefined> {
  return withServiceTx(async (q) => {
    const target = await accountTargetIn(q, ref, now);
    if (!target) return undefined;
    return loadReviewPageIn(q, target.business_id, target.booking_id, now);
  });
}

export async function submitReviewForAccount(
  ref: AccountBookingRef,
  raw: unknown,
  now: Date,
): Promise<SubmitReviewResult> {
  const parsed = reviewInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  return withServiceTx(async (q) => {
    const target = await accountTargetIn(q, ref, now);
    if (!target) return { ok: false, code: "not_found" } as const;
    return writeReviewIn(q, target, parsed.data, now);
  });
}

// ---------------------------------------------------------------------------
// Publik visning (`/[slug]`)
// ---------------------------------------------------------------------------

export type PublicReview = {
  id: string;
  rating: number;
  comment: string | null;
  displayName: string | null;
  servicio: string | null;
  createdAt: string;
  reply: string | null;
};

export type PublicReviews = {
  /** Snittet med en decimal (t.ex. 4.8). */
  average: number;
  count: number;
  items: PublicReview[];
  hasMore: boolean;
};

export const PUBLIC_REVIEWS_PAGE = 5;
export const PUBLIC_REVIEWS_MAX = 200;

/** Synliga recensioner (inte dolda av admin), senaste först. `undefined`
 * om företaget inte har några — sektionen döljs då helt. */
export async function loadPublicReviewsIn(
  q: Queryable,
  businessId: string,
  limit: number,
): Promise<PublicReviews | undefined> {
  const n = Math.min(Math.max(limit, 1), PUBLIC_REVIEWS_MAX);
  const stats = await q.query<{ avg: string | null; count: number }>(
    `select round(avg(rating)::numeric, 1)::text as avg, count(*)::int as count
       from public.reviews
      where business_id = $1 and hidden_at is null`,
    [businessId],
  );
  const s = stats.rows[0];
  if (!s || s.count === 0 || s.avg === null) return undefined;
  const r = await q.query<{
    id: string;
    rating: number;
    comment: string | null;
    display_name: string | null;
    servicio: string | null;
    created_at: string;
    reply: string | null;
  }>(
    `select rv.id, rv.rating, rv.comment, rv.display_name, s.name as servicio,
            rv.created_at, rv.reply
       from public.reviews rv
       join public.bookings bk on bk.business_id = rv.business_id and bk.id = rv.booking_id
       left join public.services s on s.business_id = bk.business_id and s.id = bk.service_id
      where rv.business_id = $1 and rv.hidden_at is null
      order by rv.created_at desc
      limit $2`,
    [businessId, n],
  );
  return {
    average: Number(s.avg),
    count: s.count,
    items: r.rows.map((x) => ({
      id: x.id,
      rating: x.rating,
      comment: x.comment,
      displayName: x.display_name,
      servicio: x.servicio,
      createdAt: new Date(x.created_at).toISOString(),
      reply: x.reply,
    })),
    hasMore: s.count > r.rows.length,
  };
}
