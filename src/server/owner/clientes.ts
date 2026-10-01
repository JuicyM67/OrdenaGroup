import "server-only";

/**
 * WP-24 (F9, D-034): Clientes — lista (`/app/clientes`) och kundkort
 * (`/app/clientes/[id]`). Samma mönster som `hoy.ts`/`inicio.ts`: en
 * `withOwnerTx`-inpackning (`authenticated`, RLS gäller) + en `*In`-variant
 * som kör i anroparens transaktion (för pgTAP/db-test).
 *
 * "alla medlemmar ser kundregistret" (planen, §Clientes): ingen
 * `can_view_reports`-spärr på listan/kundkortets kontakt/historik — bara
 * pengar-statistiken (`customer_stats`) kräver den, se `loadCustomerStats`.
 * Besök/uteblivna/senaste besök räknas ALLTID live från `bookings`
 * (`visits_count`/`no_show_count`/`last_visit_at` på `customers` underhålls
 * inte av någon trigger ännu, se `supabase/migrations/…customers_indexes_and_report_functions.sql`).
 */
import type { CustomerAnswersView } from "@/server/booking-questions/answers";
import { getCustomerAnswersIn } from "@/server/booking-questions/answers";
import { hasPerm, loadMember, type Member } from "@/server/db/permissions";
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx } from "@/server/db/tx";
import { enqueueMemberWelcome, kickOutbox } from "@/server/messaging/outbox";
import type { ConsentChannel } from "@/server/privacy/types";

import { memberView, requireMemberPerm, type MemberView } from "./member";

// ---------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------

export type CustomerListSort = "ultimaVisita" | "masVisitas" | "nombre";
export type CustomerListFilter =
  | "todos"
  | "habituales"
  | "inactivos"
  | "conInasistencias"
  // WP-54: clientes marcados como `is_member` ("socios", ver es-CL.ts).
  | "socios";

/** Samma trösklar som texterna i `clientes.lista.filtroHabitualesAyuda`/
 * `filtroInactivosAyuda` (es-CL.ts). En enda definition, så siffran aldrig
 * kan glida isär från texten. */
export const HABITUAL_VISITS_THRESHOLD = 3;
export const INACTIVE_DAYS_THRESHOLD = 90;

export type CustomerListItem = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  visitsCount: number;
  noShowCount: number;
  /** ISO 8601 UTC, `null` = aldrig ett avslutat besök. */
  lastVisitAt: string | null;
  /** WP-54: `customers.is_member`. */
  isMember: boolean;
  /** WP-57 (UX, taggen "Samtycke"): `consent_marketing_at is not null`. */
  hasMarketingConsent: boolean;
};

/** WP-57 (UX): antal per filter, oberoende av `?filtro=`/`?q=` — "Alla 23 ·
 * Stamkunder 4 …" i filterknapparna. `todos` räknar alla aktiva kunder
 * (sökningen filtrerar listan men inte de här totalerna, samma mönster som
 * rubrikens "23 kunder"). */
export type CustomerFilterCounts = Record<CustomerListFilter, number>;

export type CustomersListView = {
  member: MemberView;
  items: CustomerListItem[];
  counts: CustomerFilterCounts;
};

type ListRow = {
  id: string;
  name: string;
  phone_e164: string | null;
  email: string | null;
  visits_count: number;
  no_show_count: number;
  last_visit_ms: number | null;
  is_member: boolean;
  has_marketing_consent: boolean;
};

const isoOf = (ms: number) => new Date(Math.round(ms)).toISOString();

const SORT_SQL: Record<CustomerListSort, string> = {
  ultimaVisita: "v.last_visit_at desc nulls last, lower(c.name)",
  masVisitas: "v.visits_count desc, lower(c.name)",
  nombre: "lower(c.name)",
};

/** Inre steg (för tester): kör i anroparens transaktion. `now` styr
 * "inaktiva > 90 dagar"-filtret (aldrig `new Date()` i frågan). */
export async function listCustomersIn(
  q: Queryable,
  businessId: string,
  now: Date,
  opts: {
    search?: string;
    sort?: CustomerListSort;
    filter?: CustomerListFilter;
  } = {},
): Promise<CustomerListItem[]> {
  const sort = opts.sort ?? "ultimaVisita";
  const filter = opts.filter ?? "todos";
  // `%`/`_` i söktexten ska matcha bokstavligt, inte som jokertecken.
  const rawSearch = opts.search?.trim() || null;
  const search = rawSearch
    ? rawSearch.replace(/[\\%_]/g, (m) => `\\${m}`)
    : null;
  const inactiveCutoff = new Date(
    now.getTime() - INACTIVE_DAYS_THRESHOLD * 24 * 60 * 60 * 1000,
  );

  const filterSql =
    filter === "habituales"
      ? "and v.visits_count >= $3::int"
      : filter === "inactivos"
        ? "and (v.last_visit_at is null or v.last_visit_at < $3::timestamptz)"
        : filter === "conInasistencias"
          ? "and n.no_show_count > 0"
          : filter === "socios"
            ? "and c.is_member"
            : "";
  const filterParam: string | number =
    filter === "habituales"
      ? HABITUAL_VISITS_THRESHOLD
      : filter === "inactivos"
        ? inactiveCutoff.toISOString()
        : "";

  const r = await q.query<ListRow>(
    `select c.id, c.name, c.phone_e164, c.email, c.is_member,
            c.consent_marketing_at is not null as has_marketing_consent,
            coalesce(v.visits_count, 0)::int as visits_count,
            coalesce(n.no_show_count, 0)::int as no_show_count,
            extract(epoch from v.last_visit_at) * 1000 as last_visit_ms
       from public.customers c
       left join lateral (
         select count(*)::int as visits_count, max(lower(bk.period)) as last_visit_at
           from public.bookings bk
          where bk.business_id = c.business_id and bk.customer_id = c.id
            and bk.status = 'completed'
       ) v on true
       left join lateral (
         select count(*)::int as no_show_count
           from public.bookings bk
          where bk.business_id = c.business_id and bk.customer_id = c.id
            and bk.status = 'no_show'
       ) n on true
      where c.business_id = $1
        and c.anonymized_at is null
        and ($2::text is null or c.name ilike '%' || $2 || '%' escape '\\'
             or c.phone_e164 ilike '%' || $2 || '%' escape '\\')
        ${filterSql}
      order by ${SORT_SQL[sort]}`,
    // $3 bara när filtret använder den (en oanvänd parameter ger 42P18).
    filterParam === ""
      ? [businessId, search]
      : [businessId, search, filterParam],
  );

  return r.rows.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone_e164,
    email: row.email,
    visitsCount: row.visits_count,
    noShowCount: row.no_show_count,
    lastVisitAt: row.last_visit_ms == null ? null : isoOf(row.last_visit_ms),
    isMember: row.is_member,
    hasMarketingConsent: row.has_marketing_consent,
  }));
}

type CountsRow = {
  todos: string;
  habituales: string;
  inactivos: string;
  con_inasistencias: string;
  socios: string;
};

/** Inre steg (för tester): kör i anroparens transaktion. Oberoende av sök/
 * filter — samma totaler oavsett vad ägaren skrev i sökfältet (WP-57). */
export async function countCustomersByFilterIn(
  q: Queryable,
  businessId: string,
  now: Date,
): Promise<CustomerFilterCounts> {
  const inactiveCutoff = new Date(
    now.getTime() - INACTIVE_DAYS_THRESHOLD * 24 * 60 * 60 * 1000,
  );
  const r = await q.query<CountsRow>(
    `select count(*)::text as todos,
            count(*) filter (where coalesce(v.visits_count, 0) >= $2)::text as habituales,
            count(*) filter (
              where v.last_visit_at is null or v.last_visit_at < $3::timestamptz
            )::text as inactivos,
            count(*) filter (where coalesce(n.no_show_count, 0) > 0)::text as con_inasistencias,
            count(*) filter (where c.is_member)::text as socios
       from public.customers c
       left join lateral (
         select count(*)::int as visits_count, max(lower(bk.period)) as last_visit_at
           from public.bookings bk
          where bk.business_id = c.business_id and bk.customer_id = c.id
            and bk.status = 'completed'
       ) v on true
       left join lateral (
         select count(*)::int as no_show_count
           from public.bookings bk
          where bk.business_id = c.business_id and bk.customer_id = c.id
            and bk.status = 'no_show'
       ) n on true
      where c.business_id = $1 and c.anonymized_at is null`,
    [businessId, HABITUAL_VISITS_THRESHOLD, inactiveCutoff.toISOString()],
  );
  const row = r.rows[0];
  return {
    todos: Number(row?.todos ?? 0),
    habituales: Number(row?.habituales ?? 0),
    inactivos: Number(row?.inactivos ?? 0),
    conInasistencias: Number(row?.con_inasistencias ?? 0),
    socios: Number(row?.socios ?? 0),
  };
}

export async function listCustomers(
  userId: string,
  businessId: string,
  now: Date,
  opts: {
    search?: string;
    sort?: CustomerListSort;
    filter?: CustomerListFilter;
  } = {},
): Promise<CustomersListView> {
  return withOwnerTx(userId, async (q) => {
    const member = await loadMember(q, userId, businessId);
    // WP-60 fynd: sekventiellt, inte `Promise.all` — samma `q` (en
    // transaktion/anslutning), se motsvarande fix i src/server/owner/inicio.ts.
    const items = await listCustomersIn(q, businessId, now, opts);
    const counts = await countCustomersByFilterIn(q, businessId, now);
    return { member: memberView(member), items, counts };
  });
}

// ---------------------------------------------------------------------------
// Kundkort
// ---------------------------------------------------------------------------

export type CustomerConsentView = {
  /** ISO 8601 UTC, `null` = inget registrerat samtycke. */
  at: string | null;
  channel: ConsentChannel | null;
};

export type CustomerStats = {
  visitsCount: number;
  noShowCount: number;
  totalRevenueClp: number;
  /** `null` = inga betalningar ännu (inget att dela på). */
  averagePriceClp: number | null;
  /** ISO 8601 UTC, `null` = aldrig ett avslutat besök. */
  lastVisitAt: string | null;
};

export type CustomerBookingRow = {
  id: string;
  /** ISO 8601 UTC. */
  start: string;
  end: string;
  service: string;
  staffName: string;
  status: string;
  priceClp: number;
  depositPaidClp: number;
};

export type CustomerDetail = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  /** ISO 8601 UTC. */
  createdAt: string;
  consentTerms: CustomerConsentView;
  consentMarketing: CustomerConsentView;
  /** Besök/uteblivna/senaste besök syns för alla medlemmar (planen
   * §Clientes); bara pengarna (`totalRevenueClp`/`averagePriceClp`) kräver
   * `can_view_reports` — se `canViewMoney`. `0`/`null` när den saknas
   * (aldrig det riktiga beloppet till en obehörig medlem). */
  stats: CustomerStats;
  /** `can_view_reports` eller ägare — styr om `stats.totalRevenueClp`/
   * `averagePriceClp` visas (WP-57, kundkortets nyckeltal "Totalt"). */
  canViewMoney: boolean;
  upcoming: CustomerBookingRow[];
  history: CustomerBookingRow[];
  answers: CustomerAnswersView;
  /** Krävs för att visa/ändra anteckningarna respektive dataskyddsknapparna
   * (D-034): `canEditNotes` = `can_manage_all_bookings`/ägare, `isOwner` =
   * exportera/anonymisera. */
  canEditNotes: boolean;
  isOwner: boolean;
  /** WP-54: `customers.is_member`/`member_since`. */
  isMember: boolean;
  /** ISO 8601 UTC, `null` = inte medlem (eller aldrig blivit det). */
  memberSince: string | null;
  /** Samma spärr som `canEditNotes` (`private.customers_guard_notes()`
   * bevakar `notes`/`is_member`/`member_since` tillsammans, 20260930210100). */
  canManageMembership: boolean;
};

type CustomerRow = {
  id: string;
  name: string | null;
  phone_e164: string | null;
  email: string | null;
  notes: string | null;
  // `timestamptz`-kolumner: `pg` parsar dem till `Date` (ingen type parser
  // registrerad, se `src/server/db/pool.ts`), aldrig `string` trots att SQL
  // inte castar dem — `.toISOString()` nedan, ALDRIG `Date.toString()`/en
  // mall-sträng med värdet rakt av (WP-57, fel 1: "Thu Oct 01 2026 … GMT+0200"
  // på kundkortet).
  created_at: Date;
  consent_terms_at: Date | null;
  consent_marketing_at: Date | null;
  consent_channel: ConsentChannel | null;
  is_member: boolean;
  member_since: Date | null;
};

type StatsRow = {
  visits_count: string;
  no_show_count: string;
  total_revenue_clp: string;
  average_price_clp: string | null;
  // Se kommentaren vid `CustomerRow` ovan — samma `Date`-fälla.
  last_visit_at: Date | null;
};

type BookingRow = {
  id: string;
  start_ms: number;
  end_ms: number;
  service_name: string;
  staff_name: string;
  status: string;
  price_clp: number;
  deposit_clp: number;
};

function toBookingRow(r: BookingRow): CustomerBookingRow {
  return {
    id: r.id,
    start: isoOf(r.start_ms),
    end: isoOf(r.end_ms),
    service: r.service_name,
    staffName: r.staff_name,
    status: r.status,
    priceClp: r.price_clp,
    depositPaidClp: r.deposit_clp,
  };
}

/** "alla medlemmar ser kundregistret" (planen §Clientes): besök/uteblivna/
 * senaste besök räknas alltid, oavsett behörighet. Bara pengarna
 * (`totalRevenueClp`/`averagePriceClp`) redigeras bort till 0/`null` här när
 * `showMoney` är falskt (D-034: obehöriga medlemmar ser aldrig beloppet, inte
 * ens i nätverkssvaret — döljs inte bara i UI:t). */
async function loadCustomerStats(
  q: Queryable,
  businessId: string,
  customerId: string,
  showMoney: boolean,
): Promise<CustomerStats> {
  const r = await q.query<StatsRow>(
    `select visits_count, no_show_count, total_revenue_clp, average_price_clp, last_visit_at
       from public.customer_stats($1, $2)`,
    [businessId, customerId],
  );
  const row = r.rows[0];
  if (!row) {
    return {
      visitsCount: 0,
      noShowCount: 0,
      totalRevenueClp: 0,
      averagePriceClp: null,
      lastVisitAt: null,
    };
  }
  return {
    visitsCount: Number(row.visits_count),
    noShowCount: Number(row.no_show_count),
    totalRevenueClp: showMoney ? Number(row.total_revenue_clp) : 0,
    averagePriceClp:
      showMoney && row.average_price_clp != null
        ? Number(row.average_price_clp)
        : null,
    lastVisitAt: row.last_visit_at ? row.last_visit_at.toISOString() : null,
  };
}

/** Inre steg (för tester): kör i anroparens transaktion. `member` utelämnad
 * = ingen behörighetsfiltrering (statistiken visas, `canEditNotes`/`isOwner`
 * blir `true`). */
export async function getCustomerDetailIn(
  q: Queryable,
  businessId: string,
  customerId: string,
  now: Date,
  member?: Member | null,
): Promise<CustomerDetail | null> {
  const customerRes = await q.query<CustomerRow>(
    `select id, name, phone_e164, email, notes, created_at,
            consent_terms_at, consent_marketing_at, consent_channel,
            is_member, member_since
       from public.customers
      where business_id = $1 and id = $2 and anonymized_at is null`,
    [businessId, customerId],
  );
  const c = customerRes.rows[0];
  if (!c) return null;

  const bookingSelect = `
    select bk.id, sv.name as service_name, st.name as staff_name,
           bk.status::text as status, bk.price_clp, bk.deposit_clp,
           extract(epoch from lower(bk.period)) * 1000 as start_ms,
           extract(epoch from upper(bk.period)) * 1000 as end_ms
      from public.bookings bk
      join public.services sv
        on sv.business_id = bk.business_id and sv.id = bk.service_id
      join public.staff st
        on st.business_id = bk.business_id and st.id = bk.staff_id
     where bk.business_id = $1 and bk.customer_id = $2`;

  // WP-60 fynd: sekventiellt, inte `Promise.all` — samma `q` (en
  // transaktion/anslutning), se motsvarande fix i src/server/owner/inicio.ts.
  const upcomingRes = await q.query<BookingRow>(
    `${bookingSelect}
       and bk.status in ('requested', 'pending_payment', 'confirmed', 'cancel_requested')
       and lower(bk.period) >= $3
     order by lower(bk.period)`,
    [businessId, customerId, now.toISOString()],
  );
  const historyRes = await q.query<BookingRow>(
    `${bookingSelect}
       and (bk.status in ('completed', 'no_show', 'cancelled')
            or lower(bk.period) < $3)
     order by lower(bk.period) desc
     limit 30`,
    [businessId, customerId, now.toISOString()],
  );

  const showMoney = member === undefined || hasPerm(member, "can_view_reports");
  const canEditNotes =
    member === undefined ||
    member?.role === "owner" ||
    hasPerm(member, "can_manage_all_bookings");
  const isOwner = member === undefined || member?.role === "owner";

  // WP-60 fynd: sekventiellt, inte `Promise.all` — samma `q` (en
  // transaktion/anslutning), se motsvarande fix i src/server/owner/inicio.ts.
  const stats = await loadCustomerStats(q, businessId, customerId, showMoney);
  const answers = await getCustomerAnswersIn(q, businessId, customerId);

  return {
    id: c.id,
    name: c.name ?? "",
    phone: c.phone_e164,
    email: c.email,
    notes: c.notes,
    createdAt: c.created_at.toISOString(),
    consentTerms: {
      at: c.consent_terms_at ? c.consent_terms_at.toISOString() : null,
      channel: c.consent_channel,
    },
    consentMarketing: {
      at: c.consent_marketing_at ? c.consent_marketing_at.toISOString() : null,
      channel: c.consent_channel,
    },
    stats,
    canViewMoney: showMoney,
    upcoming: upcomingRes.rows.map(toBookingRow),
    history: historyRes.rows.map(toBookingRow),
    answers,
    canEditNotes,
    isOwner,
    isMember: c.is_member,
    memberSince: c.member_since ? c.member_since.toISOString() : null,
    canManageMembership: canEditNotes,
  };
}

export async function getCustomerDetail(
  userId: string,
  businessId: string,
  customerId: string,
  now: Date,
): Promise<CustomerDetail | null> {
  return withOwnerTx(userId, async (q) => {
    const member = await loadMember(q, userId, businessId);
    return getCustomerDetailIn(q, businessId, customerId, now, member);
  });
}

// ---------------------------------------------------------------------------
// Anteckningar
// ---------------------------------------------------------------------------

export type UpdateNotesResult =
  | { ok: true }
  | {
      ok: false;
      code: "unauthorized" | "forbidden" | "not_found" | "too_long";
    };

/** `customers.notes` ≤ 1000 tecken (samma gräns som DB-checken,
 * `customers_notes_length_and_guard.sql`). Tom sträng sparas som `null`. */
export async function updateCustomerNotes(
  userId: string,
  businessId: string,
  customerId: string,
  notes: string,
): Promise<UpdateNotesResult> {
  const trimmed = notes.trim();
  if (trimmed.length > 1000) return { ok: false, code: "too_long" };
  const value = trimmed.length === 0 ? null : trimmed;

  return withOwnerTx(userId, async (q) => {
    try {
      await requireMemberPerm(q, userId, businessId, "can_manage_all_bookings");
    } catch (e) {
      if (e instanceof Error && e.name === "NotMemberError") {
        return { ok: false, code: "unauthorized" };
      }
      return { ok: false, code: "forbidden" };
    }

    const r = await q.query(
      `update public.customers set notes = $3
        where business_id = $1 and id = $2 and anonymized_at is null`,
      [businessId, customerId, value],
    );
    if (r.rowCount === 0) return { ok: false, code: "not_found" };
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Membresía de socios (WP-54, F9/F6): kryssrutan "Socio" i kundkortet och
// knappen "Avisar al cliente" (F14-liknande transaktionellt mejl).
// ---------------------------------------------------------------------------

export type SetMemberResult =
  | { ok: true }
  | {
      ok: false;
      code: "unauthorized" | "forbidden" | "not_found";
    };

/** Samma spärr som `updateCustomerNotes` (ägare eller
 * `can_manage_all_bookings`, `private.customers_guard_notes()` bevakar
 * `notes`/`is_member`/`member_since` tillsammans). `member_since` sätts om
 * på, nollas om av — ingen historik över tidigare medlemskap (planen
 * specificerar inte det). */
export async function setCustomerMember(
  userId: string,
  businessId: string,
  customerId: string,
  isMember: boolean,
): Promise<SetMemberResult> {
  return withOwnerTx(userId, async (q) => {
    try {
      await requireMemberPerm(q, userId, businessId, "can_manage_all_bookings");
    } catch (e) {
      if (e instanceof Error && e.name === "NotMemberError") {
        return { ok: false, code: "unauthorized" };
      }
      return { ok: false, code: "forbidden" };
    }

    const r = await q.query(
      `update public.customers
          set is_member = $3,
              member_since = case when $3 then now() else null end
        where business_id = $1 and id = $2 and anonymized_at is null`,
      [businessId, customerId, isMember],
    );
    if (r.rowCount === 0) return { ok: false, code: "not_found" };
    return { ok: true };
  });
}

export type NotifyMemberResult =
  | { ok: true; queued: boolean }
  | { ok: false; code: "forbidden" | "not_member" | "no_email" };

/** "Avisar al cliente" (kundkortet): köar `bienvenidaMiembro`
 * (`@/server/messaging/outbox`, integrations/scheduling-engineer) och
 * triggar ett direktpass (`kickOutbox`, D-030). Behörigheten kontrolleras
 * inne i `enqueueMemberWelcome` självt (egen `withOwnerTx`/`has_perm`) —
 * den här funktionen bara vidarebefordrar anropet och formens kick. */
export async function notifyCustomerMembership(
  userId: string,
  businessId: string,
  customerId: string,
): Promise<NotifyMemberResult> {
  const result = await enqueueMemberWelcome({
    businessId,
    customerId,
    actorUserId: userId,
  });
  if (!result.ok) return { ok: false, code: result.error };
  if (result.queued) await kickOutbox();
  return { ok: true, queued: result.queued };
}

// ---------------------------------------------------------------------------
// Kontakt (förifyller "Nueva reserva" för en befintlig kund)
// ---------------------------------------------------------------------------

export type CustomerContact = { name: string; phone: string; email: string };

/** Bara namn/telefon/e-post (`/app/agenda?cliente=…`, kundkortets "Nueva
 * reserva" — öppnar `ManualBookingDialog` förifylld). `null` = kunden finns
 * inte (fel företag/anonymiserad) — anroparen öppnar dialogen tom då. */
export async function getCustomerContact(
  userId: string,
  businessId: string,
  customerId: string,
): Promise<CustomerContact | null> {
  return withOwnerTx(userId, async (q) => {
    const r = await q.query<{
      name: string | null;
      phone_e164: string | null;
      email: string | null;
    }>(
      `select name, phone_e164, email
         from public.customers
        where business_id = $1 and id = $2 and anonymized_at is null`,
      [businessId, customerId],
    );
    const row = r.rows[0];
    if (!row) return null;
    return {
      name: row.name ?? "",
      phone: row.phone_e164 ?? "",
      email: row.email ?? "",
    };
  });
}
