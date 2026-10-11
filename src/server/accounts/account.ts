import "server-only";

/**
 * WP-67 (D-054): kundkontots serveråtkomst. Allt körs i kundens EGEN session
 * (`withUserTx` = `authenticated` + JWT-claims, D-019), så RLS och
 * `auth.uid()` gäller: kontots tabeller har bara egna-rader-policies och
 * företagsdata nås bara via security definer-funktionerna i `private`
 * (migrationen `20261013010000_customer_accounts.sql`), som går via
 * `customer_account_links`. `userId` kommer alltid från en verifierad session
 * (`supabase.auth.getUser()`), aldrig från klienten.
 */
import { LEGAL_VERSION } from "@/i18n/legal/types";
import { cancelBookingForAccount } from "@/server/bookings/cancel";
import { withUserTx } from "@/server/db/tx";
import type { AccountBookingRef } from "@/server/reviews/public";

import {
  toAccountBooking,
  type AccountBooking,
  type MyBookingRow,
} from "./view";

export type AccountSummary = {
  displayName: string | null;
  marketingConsent: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

/** Efter inloggning med kundavsikt: skapa kontot (idempotent), koppla
 * kundrader med samma bekräftade e-post och — bara om kunden själv kryssade
 * i rutan — spara erbjudande-samtycket. Returnerar antalet nya kopplingar. */
export async function ensureAccountAndLink(
  userId: string,
  opts: { displayName?: string | null; marketing?: boolean },
): Promise<number> {
  return withUserTx(userId, async (q) => {
    const before = await q.query<{ n: number }>(
      `select count(*)::int as n from public.customer_accounts`,
    );
    const isNew = (before.rows[0]?.n ?? 0) === 0;
    await q.query(`select private.ensure_customer_account($1)`, [
      opts.displayName ?? null,
    ]);
    const r = await q.query<{ n: number }>(
      `select private.link_customer_rows() as n`,
    );
    // Samtycket loggas bara när kontot skapas nu (rutans värde, även nej) —
    // en ny inloggning skriver aldrig över ett val gjort i Integritet.
    if (isNew && opts.marketing !== undefined) {
      await q.query(`select private.set_account_marketing_consent($1, $2)`, [
        opts.marketing,
        LEGAL_VERSION,
      ]);
    }
    return r.rows[0]?.n ?? 0;
  });
}

/** Kontot, eller `null` om den inloggade inte har något kundkonto. */
export async function loadAccount(
  userId: string,
): Promise<AccountSummary | null> {
  return withUserTx(userId, async (q) => {
    const r = await q.query<{
      display_name: string | null;
      marketing_consent_at: string | null;
    }>(
      `select display_name, marketing_consent_at from public.customer_accounts`,
    );
    const row = r.rows[0];
    if (!row) return null;
    return {
      displayName: row.display_name,
      marketingConsent: row.marketing_consent_at !== null,
    };
  });
}

export async function hasAccount(userId: string): Promise<boolean> {
  return (await loadAccount(userId)) !== null;
}

export async function loadMyBookings(
  userId: string,
  now: Date,
): Promise<AccountBooking[]> {
  return withUserTx(userId, async (q) => {
    // Nya kundrader (bokade utloggad med samma e-post) kopplas vid varje
    // besök — idempotent och billigt.
    await q.query(`select private.link_customer_rows()`);
    const r = await q.query<MyBookingRow>(
      `select * from private.my_bookings()`,
    );
    return r.rows.map((row) => toAccountBooking(row, now));
  });
}

/** En kopplad bokning, eller `undefined` (okänd, annans eller anonymiserad). */
export async function bookingRefForAccount(
  userId: string,
  bookingId: string,
): Promise<AccountBookingRef | undefined> {
  if (!isUuid(bookingId)) return undefined;
  return withUserTx(userId, async (q) => {
    const r = await q.query<{ business_id: string; customer_id: string }>(
      `select business_id, customer_id from private.my_booking_ref($1)`,
      [bookingId],
    );
    const row = r.rows[0];
    return row
      ? { businessId: row.business_id, customerId: row.customer_id, bookingId }
      : undefined;
  });
}

export type AccountCancelResult =
  | { ok: true; pending: boolean }
  | { ok: false; code: "not_found" | "outside_cancel_window" | "error" };

/** Avboka från kontot (ägarens beslut 2026-10-10: ja i v1), samma motor och
 * regler som `/r/[token]`. */
export async function cancelForAccount(
  userId: string,
  bookingId: string,
  now: Date,
): Promise<AccountCancelResult> {
  const ref = await bookingRefForAccount(userId, bookingId);
  if (!ref) return { ok: false, code: "not_found" };
  const r = await cancelBookingForAccount(
    { businessId: ref.businessId, bookingId: ref.bookingId },
    now,
  );
  if (r.ok) return { ok: true, pending: r.value.pending === true };
  if (r.error === "outside_cancel_window") {
    return { ok: false, code: "outside_cancel_window" };
  }
  if (r.error === "not_found") return { ok: false, code: "not_found" };
  return { ok: false, code: "error" };
}

// ---------------------------------------------------------------------------
// Favoriter
// ---------------------------------------------------------------------------

export type AccountFavorite = {
  businessId: string;
  name: string;
  slug: string;
  comuna: string;
  coverUrl: string | null;
  logoUrl: string | null;
  rating: number | null;
  reviewCount: number;
};

export async function loadMyFavorites(
  userId: string,
): Promise<AccountFavorite[]> {
  return withUserTx(userId, async (q) => {
    const r = await q.query<{
      business_id: string;
      name: string;
      slug: string;
      comuna: string;
      cover_url: string | null;
      logo_url: string | null;
      rating: string | null;
      review_count: number;
    }>(`select * from private.my_favorites()`);
    return r.rows.map((x) => ({
      businessId: x.business_id,
      name: x.name,
      slug: x.slug,
      comuna: x.comuna,
      coverUrl: x.cover_url,
      logoUrl: x.logo_url,
      rating: x.rating === null ? null : Number(x.rating),
      reviewCount: x.review_count,
    }));
  });
}

export async function isFavorite(
  userId: string,
  businessId: string,
): Promise<boolean> {
  return withUserTx(userId, async (q) => {
    const r = await q.query(
      `select 1 from public.favorites where business_id = $1`,
      [businessId],
    );
    return r.rows.length > 0;
  });
}

/** Sparar/tar bort en favorit. Kräver ett kundkonto (skapas annars). */
export async function setFavorite(
  userId: string,
  businessId: string,
  on: boolean,
): Promise<void> {
  if (!isUuid(businessId)) return;
  await withUserTx(userId, async (q) => {
    if (on) {
      await q.query(`select private.ensure_customer_account(null)`);
      await q.query(
        `insert into public.favorites (user_id, business_id)
         values ($1, $2) on conflict do nothing`,
        [userId, businessId],
      );
    } else {
      await q.query(`delete from public.favorites where business_id = $1`, [
        businessId,
      ]);
    }
  });
}

// ---------------------------------------------------------------------------
// Integritet (Ley 21.719 / GDPR)
// ---------------------------------------------------------------------------

export async function setMarketingConsent(
  userId: string,
  granted: boolean,
): Promise<void> {
  await withUserTx(userId, async (q) => {
    await q.query(`select private.set_account_marketing_consent($1, $2)`, [
      granted,
      LEGAL_VERSION,
    ]);
  });
}

/** Allt kontot har, som JSON (`private.export_my_account()`): konto,
 * samtyckeslogg, kopplade bokningar, favoriter, recensioner. Aldrig
 * företagens anteckningar (`notes`) eller svar på bokningsfrågor. */
export async function exportMyAccount(userId: string): Promise<unknown> {
  return withUserTx(userId, async (q) => {
    const r = await q.query<{ data: unknown }>(
      `select private.export_my_account() as data`,
    );
    return r.rows[0]?.data ?? null;
  });
}

/** Raderar kundkontot. `true` = även inloggningen raderades (personen var
 * inte medlem i något företag). */
export async function deleteMyAccount(userId: string): Promise<boolean> {
  return withUserTx(userId, async (q) => {
    const r = await q.query<{ deleted: boolean }>(
      `select private.delete_my_account() as deleted`,
    );
    return r.rows[0]?.deleted === true;
  });
}

/** Efter en bokning på `/[slug]` av en inloggad kund (steg 5): koppla nya
 * kundrader. Kopplingen sker på kontots BEKRÄFTADE e-post (som vid
 * inloggning), inte på bokningens telefon — telefonen är overifierad, och en
 * koppling på den skulle kunna visa en annan persons bokningshistorik. */
export async function linkAccountRows(userId: string): Promise<void> {
  await withUserTx(userId, async (q) => {
    await q.query(`select private.link_customer_rows()`);
  });
}

/** Bokningen gjordes nyss inloggad av kontot på `/[slug]`: markera den som
 * kontots (`bookings.account_user_id`) och koppla kundraden. Databasen kräver
 * att bokningen är högst 10 min gammal, inte redan tillhör ett konto och
 * angavs med kontots bekräftade e-post (eller utan e-post). `bookingId` får
 * ALDRIG komma från klienten — bara id:t som servern nyss skapade. */
export async function claimBookingForAccount(
  userId: string,
  businessId: string,
  bookingId: string,
): Promise<void> {
  if (!isUuid(businessId) || !isUuid(bookingId)) return;
  await withUserTx(userId, async (q) => {
    await q.query(`select private.claim_booking($1, $2)`, [
      businessId,
      bookingId,
    ]);
  });
}
