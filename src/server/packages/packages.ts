import "server-only";

import { z } from "zod";

import { can } from "@/config/plans";
import { toLocalDate, type LocalDate } from "@/lib/format/dates";
import { canManageStaffBookings } from "@/server/bookings/authz";
import { pgErrorCode } from "@/server/db/errors";
import { hasPerm, loadMember, type Member } from "@/server/db/permissions";
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx, withServiceTx } from "@/server/db/tx";
import { loadBusinessTz } from "@/server/payments/business-tz";
import { loadPlanIn, planCan } from "@/server/plans/entitlements";
import { listCustomersIn } from "@/server/owner/clientes";

/**
 * WP-86 (D-072) · Paquetes: förbetalda paket med N sessioner.
 *
 * - Mallar (`package_templates`): katalog, `can_edit_catalog`, kräver
 *   planfunktionen `packages`.
 * - Försäljning (`customer_packages`): i salongen, manuell metod
 *   (efectivo/tarjeta/transferencia), samma behörighet som kassan
 *   (`can_view_reports`) eller `can_manage_all_bookings`. Kräver planen.
 *   Namn, sessioner, pris, giltighet och tjänster kopieras från mallen av
 *   databasen (klienten väljer bara kund, mall och metod).
 * - Inlösen ("Usar paquete", `customer_package_moves`): samma behörighet som
 *   "Marcar pagada" (egen/alla bokningar eller kassan). Ingen planspärr —
 *   kunden har redan betalat. Databasens trigger kontrollerar allt igen
 *   under bokningens betalningslås.
 *
 * Allt körs med `withOwnerTx` (RLS gäller) utom de två läsningarna för
 * kundens länk och bokningssidan, som körs som service_role med explicita
 * `business_id`-filter efter att anroparen redan verifierat token/slug.
 */

export type ManualMethod = "cash" | "card_terminal" | "transfer";
const MANUAL: readonly ManualMethod[] = ["cash", "card_terminal", "transfer"];

export const PACKAGE_PRICE_MAX = 100_000_000;
export const PACKAGE_SESSIONS_MAX = 100;
export const PACKAGE_VALIDITY_MAX = 1095;

export type PackageTemplateView = {
  id: string;
  name: string;
  sessions: number;
  priceClp: number;
  validityDays: number | null;
  showPublic: boolean;
  active: boolean;
  serviceIds: string[];
};

export type PackageServiceOption = {
  id: string;
  name: string;
  active: boolean;
};

export type CustomerPackageState = "active" | "expired" | "used_up" | "voided";

export type CustomerPackageUse = {
  moveId: string;
  bookingId: string | null;
  /** ISO 8601 (UTC): bokningens start, annars när sessionen drogs. */
  at: string;
  serviceName: string | null;
  noShow: boolean;
  reversed: boolean;
};

export type CustomerPackageView = {
  id: string;
  name: string;
  sessionsTotal: number;
  remaining: number;
  priceClp: number;
  paymentMethod: ManualMethod;
  soldAt: string;
  expiresOn: LocalDate | null;
  state: CustomerPackageState;
  /** Samma dag som försäljningen och inga använda sessioner. */
  canVoid: boolean;
  serviceNames: string[];
  uses: CustomerPackageUse[];
};

export type PackageError =
  | "forbidden"
  | "plan_locked"
  | "not_found"
  | "invalid"
  | "sin_servicios"
  | "template_inactive"
  | "customer_anonymized"
  | "no_sessions"
  | "expired"
  | "service_not_included"
  | "wrong_customer"
  | "booking_status"
  | "already_used"
  | "already_paid"
  | "same_day_required"
  | "in_use"
  | "unexpected";

export type PackageResult<T = object> =
  ({ ok: true } & T) | { ok: false; code: PackageError };

// ---------------------------------------------------------------------------
// Fel från databasens triggers. Bara kända koder (utan värden) läses ur
// meddelandet; allt annat blir en generell kod (se src/server/db/errors.ts).
// ---------------------------------------------------------------------------

const RAISED: Record<string, PackageError> = {
  forbidden: "forbidden",
  plan_locked: "plan_locked",
  package_template_inactive: "template_inactive",
  package_template_without_services: "sin_servicios",
  customer_anonymized: "customer_anonymized",
  customer_package_in_use: "in_use",
  customer_package_immutable: "invalid",
  package_not_found: "not_found",
  booking_not_found: "not_found",
  package_not_active: "not_found",
  package_expired: "expired",
  package_no_sessions: "no_sessions",
  package_wrong_customer: "wrong_customer",
  package_service_not_included: "service_not_included",
  package_booking_status: "booking_status",
  package_already_used: "already_used",
  booking_already_paid: "already_paid",
  package_reverse_mismatch: "not_found",
};

function dbError(e: unknown): PackageError {
  const msg =
    typeof e === "object" && e !== null && "message" in e
      ? (e as { message?: unknown }).message
      : undefined;
  if (typeof msg === "string" && msg in RAISED) return RAISED[msg]!;
  const code = pgErrorCode(e);
  if (code === "42501") return "forbidden";
  if (code === "23503") return "not_found";
  if (code === "23505" || code === "23514" || code === "22P02")
    return "invalid";
  return "unexpected";
}

/** Kassan eller alla bokningar: får sälja och annullera paket. */
export function canSellPackages(member: Member | null): boolean {
  return (
    hasPerm(member, "can_view_reports") ||
    hasPerm(member, "can_manage_all_bookings")
  );
}

/** Samma regel som "Marcar pagada" (`mark-paid.ts`). */
function canUseOnBooking(member: Member | null, staffId: string): boolean {
  return (
    canManageStaffBookings(member, staffId) ||
    hasPerm(member, "can_view_reports")
  );
}

/** "Kvar" = sessions_total + summan av ledgerns delta. */
const REMAINING_SQL = `(cp.sessions_total + coalesce((
     select sum(m.delta) from public.customer_package_moves m
      where m.business_id = cp.business_id and m.customer_package_id = cp.id
   ), 0))::int`;

/** Ej ångrad inlösen (alias `m`). */
const NOT_REVERSED_SQL = `not exists (
     select 1 from public.customer_package_moves r
      where r.business_id = m.business_id and r.reverses_id = m.id
   )`;

// ---------------------------------------------------------------------------
// Mallar (Ajustes → Paquetes)
// ---------------------------------------------------------------------------

export type PackageTemplatesData = {
  templates: PackageTemplateView[];
  services: PackageServiceOption[];
  canEdit: boolean;
  planAllows: boolean;
};

export async function listPackageTemplatesIn(
  q: Queryable,
  businessId: string,
  opts: { onlyActive?: boolean } = {},
): Promise<PackageTemplateView[]> {
  const r = await q.query<{
    id: string;
    name: string;
    sessions: number;
    price_clp: number;
    validity_days: number | null;
    show_public: boolean;
    active: boolean;
    service_ids: string[] | null;
  }>(
    `select pt.id, pt.name, pt.sessions, pt.price_clp, pt.validity_days,
            pt.show_public, pt.active,
            array(select pts.service_id::text from public.package_template_services pts
                   where pts.business_id = pt.business_id and pts.template_id = pt.id
                   order by pts.service_id) as service_ids
       from public.package_templates pt
      where pt.business_id = $1 ${opts.onlyActive ? "and pt.active" : ""}
      order by pt.active desc, pt.sort, lower(pt.name)`,
    [businessId],
  );
  return r.rows.map((x) => ({
    id: x.id,
    name: x.name,
    sessions: x.sessions,
    priceClp: x.price_clp,
    validityDays: x.validity_days,
    showPublic: x.show_public,
    active: x.active,
    serviceIds: x.service_ids ?? [],
  }));
}

export async function loadPackageTemplates(
  userId: string,
  businessId: string,
): Promise<PackageTemplatesData> {
  return withOwnerTx(userId, async (q) => {
    const member = await loadMember(q, userId, businessId);
    const plan = await loadPlanIn(q, businessId);
    const templates = await listPackageTemplatesIn(q, businessId);
    const services = await q.query<PackageServiceOption>(
      `select id, name, active from public.services
        where business_id = $1
        order by active desc, sort, lower(name)`,
      [businessId],
    );
    return {
      templates,
      services: services.rows,
      canEdit: hasPerm(member, "can_edit_catalog"),
      planAllows: planCan(plan, "packages"),
    };
  });
}

const templateSchema = z.object({
  id: z.guid().optional(),
  name: z.string().trim().min(1).max(80),
  serviceIds: z.array(z.guid()).max(100),
  sessions: z.number().int().min(1).max(PACKAGE_SESSIONS_MAX),
  priceClp: z.number().int().min(1).max(PACKAGE_PRICE_MAX),
  validityDays: z.number().int().min(1).max(PACKAGE_VALIDITY_MAX).nullable(),
  showPublic: z.boolean(),
  active: z.boolean(),
});

export type SavePackageTemplateInput = z.input<typeof templateSchema>;

export async function savePackageTemplate(
  userId: string,
  businessId: string,
  input: SavePackageTemplateInput,
): Promise<PackageResult<{ id: string }>> {
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const t = parsed.data;
  const serviceIds = [...new Set(t.serviceIds)];
  if (serviceIds.length === 0) return { ok: false, code: "sin_servicios" };

  try {
    return await withOwnerTx(userId, async (q) => {
      const member = await loadMember(q, userId, businessId);
      if (!hasPerm(member, "can_edit_catalog")) {
        return { ok: false, code: "forbidden" } as const;
      }
      if (!planCan(await loadPlanIn(q, businessId), "packages")) {
        return { ok: false, code: "plan_locked" } as const;
      }
      const own = await q.query<{ n: number }>(
        `select count(*)::int as n from public.services
          where business_id = $1 and id = any($2::uuid[])`,
        [businessId, serviceIds],
      );
      if ((own.rows[0]?.n ?? 0) !== serviceIds.length) {
        return { ok: false, code: "invalid" } as const;
      }

      let id = t.id;
      if (id) {
        const up = await q.query<{ id: string }>(
          `update public.package_templates
              set name = $3, sessions = $4, price_clp = $5, validity_days = $6,
                  show_public = $7, active = $8
            where business_id = $1 and id = $2
            returning id`,
          [
            businessId,
            id,
            t.name,
            t.sessions,
            t.priceClp,
            t.validityDays,
            t.showPublic,
            t.active,
          ],
        );
        if (!up.rows[0]) return { ok: false, code: "not_found" } as const;
        await q.query(
          `delete from public.package_template_services
            where business_id = $1 and template_id = $2
              and not (service_id = any($3::uuid[]))`,
          [businessId, id, serviceIds],
        );
      } else {
        const ins = await q.query<{ id: string }>(
          `insert into public.package_templates
             (business_id, name, sessions, price_clp, validity_days, show_public, active, sort)
           values ($1, $2, $3, $4, $5, $6, $7,
                   coalesce((select max(sort) + 1 from public.package_templates
                              where business_id = $1), 0))
           returning id`,
          [
            businessId,
            t.name,
            t.sessions,
            t.priceClp,
            t.validityDays,
            t.showPublic,
            t.active,
          ],
        );
        id = ins.rows[0]?.id;
        if (!id) return { ok: false, code: "unexpected" } as const;
      }
      await q.query(
        `insert into public.package_template_services (business_id, template_id, service_id)
         select $1, $2, s from unnest($3::uuid[]) s
         on conflict do nothing`,
        [businessId, id, serviceIds],
      );
      return { ok: true, id } as const;
    });
  } catch (e) {
    return { ok: false, code: dbError(e) };
  }
}

// ---------------------------------------------------------------------------
// Kundens paket (kundkortet)
// ---------------------------------------------------------------------------

type CustomerPackageRow = {
  id: string;
  name: string;
  sessions_total: number;
  remaining: number;
  price_clp: number;
  payment_method: string;
  sold_at: Date;
  expires_on: string | null;
  status: string;
  used: number;
  service_names: string[] | null;
};

function stateOf(
  row: { status: string; remaining: number; expires_on: string | null },
  today: LocalDate,
): CustomerPackageState {
  if (row.status === "voided") return "voided";
  if (row.remaining <= 0) return "used_up";
  if (row.expires_on !== null && row.expires_on < today) return "expired";
  return "active";
}

export async function listCustomerPackagesIn(
  q: Queryable,
  businessId: string,
  customerId: string,
  now: Date,
): Promise<CustomerPackageView[]> {
  const tz = await loadBusinessTz(q, businessId);
  const today = toLocalDate(now, tz);
  const r = await q.query<CustomerPackageRow>(
    `select cp.id, cp.name, cp.sessions_total, ${REMAINING_SQL} as remaining,
            cp.price_clp, cp.payment_method::text as payment_method, cp.sold_at,
            cp.expires_on::text as expires_on, cp.status,
            (select count(*) from public.customer_package_moves m
              where m.business_id = cp.business_id and m.customer_package_id = cp.id
                and m.kind = 'redeem' and ${NOT_REVERSED_SQL})::int as used,
            array(select sv.name from public.customer_package_services s
                    join public.services sv on sv.business_id = s.business_id and sv.id = s.service_id
                   where s.business_id = cp.business_id and s.customer_package_id = cp.id
                   order by sv.sort, lower(sv.name)) as service_names
       from public.customer_packages cp
      where cp.business_id = $1 and cp.customer_id = $2
      order by (cp.status = 'active') desc, cp.sold_at desc
      limit 50`,
    [businessId, customerId],
  );
  if (r.rows.length === 0) return [];

  const moves = await q.query<{
    id: string;
    customer_package_id: string;
    booking_id: string | null;
    at: Date;
    service_name: string | null;
    no_show: boolean;
    reversed: boolean;
  }>(
    `select m.id, m.customer_package_id, m.booking_id,
            coalesce(lower(bk.period), m.created_at) as at,
            sv.name as service_name, m.no_show,
            not ${NOT_REVERSED_SQL} as reversed
       from public.customer_package_moves m
       left join public.bookings bk
         on bk.business_id = m.business_id and bk.id = m.booking_id
       left join public.services sv
         on sv.business_id = bk.business_id and sv.id = bk.service_id
      where m.business_id = $1 and m.kind = 'redeem'
        and m.customer_package_id = any($2::uuid[])
      order by at desc`,
    [businessId, r.rows.map((x) => x.id)],
  );
  const usesBy = new Map<string, CustomerPackageUse[]>();
  for (const m of moves.rows) {
    const list = usesBy.get(m.customer_package_id) ?? [];
    list.push({
      moveId: m.id,
      bookingId: m.booking_id,
      at: m.at.toISOString(),
      serviceName: m.service_name,
      noShow: m.no_show,
      reversed: m.reversed,
    });
    usesBy.set(m.customer_package_id, list);
  }

  return r.rows.map((x) => ({
    id: x.id,
    name: x.name,
    sessionsTotal: x.sessions_total,
    remaining: x.remaining,
    priceClp: x.price_clp,
    paymentMethod: (MANUAL as readonly string[]).includes(x.payment_method)
      ? (x.payment_method as ManualMethod)
      : "cash",
    soldAt: x.sold_at.toISOString(),
    expiresOn: x.expires_on as LocalDate | null,
    state: stateOf(x, today),
    canVoid:
      x.status === "active" &&
      x.used === 0 &&
      toLocalDate(x.sold_at, tz) === today,
    serviceNames: x.service_names ?? [],
    uses: usesBy.get(x.id) ?? [],
  }));
}

export type CustomerPackagesData = {
  packages: CustomerPackageView[];
  /** Behörighet OCH plan: visar "Vender paquete". */
  canSell: boolean;
  /** Behörighet: "Anular venta" (oberoende av plan). */
  canVoid: boolean;
  /** Aktiva mallar att sälja (tom om `!canSell`). */
  templates: PackageTemplateView[];
  /** Som kundkortets `canViewMoney`: utan kassan visas inga belopp
   * (`priceClp` är då 0). */
  showMoney: boolean;
};

export async function loadCustomerPackages(
  userId: string,
  businessId: string,
  customerId: string,
  now: Date,
): Promise<CustomerPackagesData> {
  return withOwnerTx(userId, async (q) => {
    const member = await loadMember(q, userId, businessId);
    if (!member) {
      return {
        packages: [],
        canSell: false,
        canVoid: false,
        templates: [],
        showMoney: false,
      };
    }
    const sellPerm = canSellPackages(member);
    const planAllows = planCan(await loadPlanIn(q, businessId), "packages");
    const canSell = sellPerm && planAllows;
    const showMoney = hasPerm(member, "can_view_reports");
    const packages = await listCustomerPackagesIn(
      q,
      businessId,
      customerId,
      now,
    );
    return {
      packages: showMoney
        ? packages
        : packages.map((p) => ({ ...p, priceClp: 0 })),
      showMoney,
      canSell,
      canVoid: sellPerm,
      templates: canSell
        ? await listPackageTemplatesIn(q, businessId, { onlyActive: true })
        : [],
    };
  });
}

// ---------------------------------------------------------------------------
// Försäljning och annullering
// ---------------------------------------------------------------------------

const sellSchema = z.object({
  customerId: z.guid(),
  templateId: z.guid(),
  method: z.enum(["cash", "card_terminal", "transfer"]),
});

export type SellPackageInput = z.input<typeof sellSchema>;

export async function sellPackage(
  userId: string,
  businessId: string,
  input: SellPackageInput,
): Promise<PackageResult<{ customerPackageId: string }>> {
  const parsed = sellSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { customerId, templateId, method } = parsed.data;
  try {
    return await withOwnerTx(userId, async (q) => {
      const member = await loadMember(q, userId, businessId);
      if (!canSellPackages(member)) {
        return { ok: false, code: "forbidden" } as const;
      }
      if (!planCan(await loadPlanIn(q, businessId), "packages")) {
        return { ok: false, code: "plan_locked" } as const;
      }
      // Namn, sessioner, pris och giltighet sätts av databasens trigger från
      // mallen; värdena här är bara platshållare för not null-kolumnerna.
      const ins = await q.query<{ id: string }>(
        `insert into public.customer_packages
           (business_id, customer_id, template_id, name, sessions_total, price_clp, payment_method)
         values ($1, $2, $3, '-', 1, 1, $4::public.payment_method)
         returning id`,
        [businessId, customerId, templateId, method],
      );
      const id = ins.rows[0]?.id;
      if (!id) return { ok: false, code: "unexpected" } as const;
      return { ok: true, customerPackageId: id } as const;
    });
  } catch (e) {
    return { ok: false, code: dbError(e) };
  }
}

const idSchema = z.object({ customerPackageId: z.guid() });

/** Anular venta: samma lokala dag som försäljningen, inga använda sessioner. */
export async function voidPackageSale(
  userId: string,
  businessId: string,
  now: Date,
  input: { customerPackageId: string },
): Promise<PackageResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "not_found" };
  try {
    return await withOwnerTx(userId, async (q) => {
      const member = await loadMember(q, userId, businessId);
      if (!canSellPackages(member)) {
        return { ok: false, code: "forbidden" } as const;
      }
      const r = await q.query<{ status: string; sold_at: Date }>(
        `select status, sold_at from public.customer_packages
          where business_id = $1 and id = $2
          for update`,
        [businessId, parsed.data.customerPackageId],
      );
      const row = r.rows[0];
      if (!row) return { ok: false, code: "not_found" } as const;
      if (row.status === "voided") return { ok: true } as const; // idempotent
      const tz = await loadBusinessTz(q, businessId);
      if (toLocalDate(row.sold_at, tz) !== toLocalDate(now, tz)) {
        return { ok: false, code: "same_day_required" } as const;
      }
      await q.query(
        `update public.customer_packages set status = 'voided'
          where business_id = $1 and id = $2`,
        [businessId, parsed.data.customerPackageId],
      );
      return { ok: true } as const;
    });
  } catch (e) {
    return { ok: false, code: dbError(e) };
  }
}

/** Kundsök i "Vender paquete" från Caja (namn eller telefon, högst 8). */
export async function searchCustomersForPackage(
  userId: string,
  businessId: string,
  now: Date,
  search: string,
): Promise<{ id: string; name: string; phone: string | null }[]> {
  const term = search.trim().slice(0, 60);
  if (term.length < 2) return [];
  return withOwnerTx(userId, async (q) => {
    const member = await loadMember(q, userId, businessId);
    if (!canSellPackages(member)) return [];
    const items = await listCustomersIn(q, businessId, now, {
      search: term,
      sort: "nombre",
    });
    return items
      .slice(0, 8)
      .map((c) => ({ id: c.id, name: c.name, phone: c.phone }));
  });
}

// ---------------------------------------------------------------------------
// Inlösen ("Usar paquete") och "Devolver sesión"
// ---------------------------------------------------------------------------

const redeemSchema = z.object({
  bookingId: z.guid(),
  customerPackageId: z.guid().optional(),
});

export type RedeemPackageInput = z.input<typeof redeemSchema>;

/** Paket som kan användas för bokningen, det som går ut först först. */
async function usablePackagesIn(
  q: Queryable,
  businessId: string,
  bookingIds: readonly string[],
  today: LocalDate,
): Promise<
  Map<string, { customerPackageId: string; name: string; remaining: number }>
> {
  const out = new Map<
    string,
    { customerPackageId: string; name: string; remaining: number }
  >();
  if (bookingIds.length === 0) return out;
  const r = await q.query<{
    booking_id: string;
    id: string;
    name: string;
    remaining: number;
  }>(
    `select distinct on (bk.id) bk.id as booking_id, cp.id, cp.name,
            ${REMAINING_SQL} as remaining
       from public.bookings bk
       join public.customer_packages cp
         on cp.business_id = bk.business_id and cp.customer_id = bk.customer_id
       join public.customer_package_services s
         on s.business_id = cp.business_id and s.customer_package_id = cp.id
        and s.service_id = bk.service_id
      where bk.business_id = $1 and bk.id = any($2::uuid[])
        and cp.status = 'active'
        and (cp.expires_on is null or cp.expires_on >= $3::date)
        and ${REMAINING_SQL} > 0
      order by bk.id, cp.expires_on nulls last, cp.sold_at`,
    [businessId, bookingIds, today],
  );
  for (const x of r.rows) {
    out.set(x.booking_id, {
      customerPackageId: x.id,
      name: x.name,
      remaining: x.remaining,
    });
  }
  return out;
}

export async function redeemPackage(
  userId: string,
  businessId: string,
  now: Date,
  input: RedeemPackageInput,
): Promise<PackageResult<{ moveId: string; remaining: number }>> {
  const parsed = redeemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "not_found" };
  const { bookingId } = parsed.data;
  try {
    return await withOwnerTx(userId, async (q) => {
      const member = await loadMember(q, userId, businessId);
      if (!member) return { ok: false, code: "forbidden" } as const;
      const bk = await q.query<{ staff_id: string }>(
        `select staff_id from public.bookings where business_id = $1 and id = $2`,
        [businessId, bookingId],
      );
      const staffId = bk.rows[0]?.staff_id;
      if (!staffId) return { ok: false, code: "not_found" } as const;
      if (!canUseOnBooking(member, staffId)) {
        return { ok: false, code: "forbidden" } as const;
      }

      let packageId = parsed.data.customerPackageId;
      if (!packageId) {
        const tz = await loadBusinessTz(q, businessId);
        const usable = await usablePackagesIn(
          q,
          businessId,
          [bookingId],
          toLocalDate(now, tz),
        );
        packageId = usable.get(bookingId)?.customerPackageId;
        if (!packageId) return { ok: false, code: "no_sessions" } as const;
      }

      const ins = await q.query<{ id: string }>(
        `insert into public.customer_package_moves
           (business_id, customer_package_id, kind, delta, booking_id)
         values ($1, $2, 'redeem', -1, $3)
         returning id`,
        [businessId, packageId, bookingId],
      );
      const moveId = ins.rows[0]?.id;
      if (!moveId) return { ok: false, code: "unexpected" } as const;
      const rem = await q.query<{ remaining: number }>(
        `select ${REMAINING_SQL} as remaining from public.customer_packages cp
          where cp.business_id = $1 and cp.id = $2`,
        [businessId, packageId],
      );
      return {
        ok: true,
        moveId,
        remaining: rem.rows[0]?.remaining ?? 0,
      } as const;
    });
  } catch (e) {
    return { ok: false, code: dbError(e) };
  }
}

const undoSchema = z.object({ moveId: z.guid() });

export async function undoPackageUse(
  userId: string,
  businessId: string,
  input: { moveId: string },
): Promise<PackageResult> {
  const parsed = undoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "not_found" };
  try {
    return await withOwnerTx(userId, async (q) => {
      const member = await loadMember(q, userId, businessId);
      if (!member) return { ok: false, code: "forbidden" } as const;
      const r = await q.query<{
        customer_package_id: string;
        booking_id: string | null;
        staff_id: string | null;
        reversed: boolean;
      }>(
        `select m.customer_package_id, m.booking_id, bk.staff_id,
                not ${NOT_REVERSED_SQL} as reversed
           from public.customer_package_moves m
           left join public.bookings bk
             on bk.business_id = m.business_id and bk.id = m.booking_id
          where m.business_id = $1 and m.id = $2 and m.kind = 'redeem'`,
        [businessId, parsed.data.moveId],
      );
      const row = r.rows[0];
      if (!row || !row.booking_id || !row.staff_id) {
        return { ok: false, code: "not_found" } as const;
      }
      if (!canUseOnBooking(member, row.staff_id)) {
        return { ok: false, code: "forbidden" } as const;
      }
      if (row.reversed) return { ok: true } as const; // idempotent
      await q.query(
        `insert into public.customer_package_moves
           (business_id, customer_package_id, kind, delta, booking_id, reverses_id)
         values ($1, $2, 'reverse', 1, $3, $4)`,
        [
          businessId,
          row.customer_package_id,
          row.booking_id,
          parsed.data.moveId,
        ],
      );
      return { ok: true } as const;
    });
  } catch (e) {
    // Två samtidiga "Devolver" → unikt index: den andra är redan gjord.
    if (pgErrorCode(e) === "23505") return { ok: true };
    return { ok: false, code: dbError(e) };
  }
}

// ---------------------------------------------------------------------------
// Bokningar: agendans detaljvy och Cajas "Por cobrar"
// ---------------------------------------------------------------------------

export type BookingPackageInfo = {
  /** Bokningen är betald med ett paket (ej ångrad inlösen). */
  use: { moveId: string; packageName: string; remaining: number } | null;
  /** Ett aktivt paket som täcker tjänsten (om `use` saknas). */
  available: {
    customerPackageId: string;
    name: string;
    remaining: number;
  } | null;
};

/** Batch för en lista bokningar (agendans vecka, kassans lista). Bokningar
 * utan paketkoppling saknas i kartan. */
export async function listBookingPackageInfoIn(
  q: Queryable,
  businessId: string,
  bookingIds: readonly string[],
  now: Date,
): Promise<Map<string, BookingPackageInfo>> {
  const out = new Map<string, BookingPackageInfo>();
  if (bookingIds.length === 0) return out;
  const has = await q.query<{ n: number }>(
    `select count(*)::int as n from public.customer_packages
      where business_id = $1 limit 1`,
    [businessId],
  );
  if ((has.rows[0]?.n ?? 0) === 0) return out;

  const uses = await q.query<{
    booking_id: string;
    move_id: string;
    name: string;
    remaining: number;
  }>(
    `select m.booking_id, m.id as move_id, cp.name, ${REMAINING_SQL} as remaining
       from public.customer_package_moves m
       join public.customer_packages cp
         on cp.business_id = m.business_id and cp.id = m.customer_package_id
      where m.business_id = $1 and m.booking_id = any($2::uuid[])
        and m.kind = 'redeem' and ${NOT_REVERSED_SQL}`,
    [businessId, bookingIds],
  );
  for (const u of uses.rows) {
    out.set(u.booking_id, {
      use: { moveId: u.move_id, packageName: u.name, remaining: u.remaining },
      available: null,
    });
  }
  const rest = bookingIds.filter((id) => !out.has(id));
  const tz = await loadBusinessTz(q, businessId);
  const usable = await usablePackagesIn(
    q,
    businessId,
    rest,
    toLocalDate(now, tz),
  );
  for (const [bookingId, available] of usable) {
    out.set(bookingId, { use: null, available });
  }
  return out;
}

export type CajaPackagesSummary = {
  soldCount: number;
  soldMinor: number;
  /** Försäljning per metod (läggs till i kassans "por método"). */
  byMethod: { method: ManualMethod; amountMinor: number }[];
  /** Pris − rabatt för bokningar i perioden som betalats med paket och som
   * `report_summary` annars räknar som "por cobrar". */
  redeemedExpectedMinor: number;
};

/** Kassan (WP-24) för perioden [start, end): sålda paket räknas som
 * inkasserat på försäljningsdagen; en bokning som löses in med paket är
 * inte längre "por cobrar" och räknas inte igen. */
export async function cajaPackagesIn(
  q: Queryable,
  businessId: string,
  start: string,
  end: string,
): Promise<CajaPackagesSummary> {
  const sold = await q.query<{ method: string; n: number; amount: string }>(
    `select payment_method::text as method, count(*)::int as n,
            sum(price_clp)::text as amount
       from public.customer_packages
      where business_id = $1 and status = 'active'
        and sold_at >= $2::timestamptz and sold_at < $3::timestamptz
      group by payment_method`,
    [businessId, start, end],
  );
  const red = await q.query<{ amount: string | null }>(
    `select sum(bk.price_clp - bk.discount_clp)::text as amount
       from public.bookings bk
      where bk.business_id = $1
        and bk.status in ('confirmed', 'completed')
        and lower(bk.period) >= $2::timestamptz and lower(bk.period) < $3::timestamptz
        and not exists (
          select 1 from public.payments p
           where p.business_id = bk.business_id and p.booking_id = bk.id
             and p.status = 'approved' and p.kind = 'full'
        )
        and exists (
          select 1 from public.customer_package_moves m
           where m.business_id = bk.business_id and m.booking_id = bk.id
             and m.kind = 'redeem' and ${NOT_REVERSED_SQL}
        )`,
    [businessId, start, end],
  );
  const byMethod = sold.rows
    .filter((x) => (MANUAL as readonly string[]).includes(x.method))
    .map((x) => ({
      method: x.method as ManualMethod,
      amountMinor: Number(x.amount) || 0,
    }));
  return {
    soldCount: sold.rows.reduce((a, x) => a + x.n, 0),
    soldMinor: byMethod.reduce((a, x) => a + x.amountMinor, 0),
    byMethod,
    redeemedExpectedMinor: Number(red.rows[0]?.amount ?? 0) || 0,
  };
}

// ---------------------------------------------------------------------------
// Kunden: `/r/[token]` och bokningssidan (service_role, efter verifiering)
// ---------------------------------------------------------------------------

export type PublicCustomerPackage = {
  id: string;
  name: string;
  sessionsTotal: number;
  remaining: number;
  expiresOn: LocalDate | null;
};

/** Kundens aktiva paket hos företaget, för bokningen som `/r/[token]` redan
 * verifierat. Visar bara namn och saldo (inga priser, betalmetoder eller
 * andra bokningar). */
export function loadPackagesForManagedBooking(
  businessId: string,
  bookingId: string,
  now: Date,
): Promise<PublicCustomerPackage[]> {
  return withServiceTx(async (q) => {
    const tz = await loadBusinessTz(q, businessId);
    const r = await q.query<{
      id: string;
      name: string;
      sessions_total: number;
      remaining: number;
      expires_on: string | null;
    }>(
      `select cp.id, cp.name, cp.sessions_total, ${REMAINING_SQL} as remaining,
              cp.expires_on::text as expires_on
         from public.bookings bk
         join public.customer_packages cp
           on cp.business_id = bk.business_id and cp.customer_id = bk.customer_id
        where bk.business_id = $1 and bk.id = $2
          and cp.status = 'active'
          and (cp.expires_on is null or cp.expires_on >= $3::date)
        order by cp.sold_at desc
        limit 10`,
      [businessId, bookingId, toLocalDate(now, tz)],
    );
    return r.rows
      .filter((x) => x.remaining > 0)
      .map((x) => ({
        id: x.id,
        name: x.name,
        sessionsTotal: x.sessions_total,
        remaining: x.remaining,
        expiresOn: x.expires_on as LocalDate | null,
      }));
  });
}

/** Bokningssidan: tjänst → billigaste (per session) publika aktiva mall
 * som täcker den. Tom om planen inte har paket. Körs i anroparens
 * transaktion (`page-data.ts`, service_role efter slug-uppslaget). */
export async function listPublicPackageOffersIn(
  q: Queryable,
  businessId: string,
  plan: string,
): Promise<Map<string, { sessions: number; priceClp: number }>> {
  const out = new Map<string, { sessions: number; priceClp: number }>();
  if (!can(plan, "packages")) return out;
  const r = await q.query<{
    service_id: string;
    sessions: number;
    price_clp: number;
  }>(
    `select distinct on (pts.service_id) pts.service_id, pt.sessions, pt.price_clp
       from public.package_templates pt
       join public.package_template_services pts
         on pts.business_id = pt.business_id and pts.template_id = pt.id
      where pt.business_id = $1 and pt.active and pt.show_public
      order by pts.service_id, pt.price_clp::numeric / pt.sessions, pt.sessions`,
    [businessId],
  );
  for (const x of r.rows) {
    out.set(x.service_id, { sessions: x.sessions, priceClp: x.price_clp });
  }
  return out;
}

/** Caja: får den inloggade sälja paket (behörighet + plan), och i så fall
 * de aktiva mallarna. */
export function loadCajaPackageContext(
  userId: string,
  businessId: string,
): Promise<{ canSell: boolean; templates: PackageTemplateView[] }> {
  return withOwnerTx(userId, async (q) => {
    const member = await loadMember(q, userId, businessId);
    const canSell =
      canSellPackages(member) &&
      planCan(await loadPlanIn(q, businessId), "packages");
    return {
      canSell,
      templates: canSell
        ? await listPackageTemplatesIn(q, businessId, { onlyActive: true })
        : [],
    };
  });
}
