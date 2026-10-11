import "server-only";

/**
 * Ajustes (WP-15b slim, F1/F2/F3 efter onboarding): ägaren läser och ändrar sitt eget
 * företag i /app/ajustes. Allt går via `withOwnerTx` (D-019) — RLS (`private.is_member`,
 * D-014) är den enda gränsen för tenant-isolering, samma mönster som
 * `src/server/onboarding/complete-onboarding.ts`. Varje mutation tar `businessId`
 * explicit (försvar i djupet, D-014) OCH litar på RLS: ett `UPDATE`/`DELETE` som inte
 * matchar RLS-policyn (ägaren är inte medlem i just det företaget) rör noll rader i
 * stället för att kasta — se `assertUpdated`. Ett `INSERT` som inte matchar `with check`
 * kastar 42501 — se `mapDbError`.
 */
import type { IsoWeekday } from "@/lib/format/dates";
import type { Queryable } from "@/server/db/pool";
import { pgErrorCode } from "@/server/db/errors";
import { withOwnerTx } from "@/server/db/tx";
import { mediaPathFromUrl } from "@/server/bookings/media";
// WP-56: samma mappning `string → "none"|"late"|"all"` som motorn
// (`src/server/bookings/row.ts`, scheduling-engineer) använder för
// `businesses.cancel_approval` — importerad i stället för en egen kopia.
import { toCancelApproval } from "@/server/bookings/row";
import { loadMember } from "@/server/db/permissions";
import {
  canAddActiveServiceIn,
  requireFeatureIn,
  PlanLockedError,
} from "@/server/plans/entitlements";

import {
  ajustesHoursInputSchema,
  ajustesServiceInputSchema,
  ajustesStaffInputSchema,
  businessSettingsInputSchema,
  memberSettingsInputSchema,
  waitlistSettingsInputSchema,
  winbackSettingsInputSchema,
  type AjustesHoursInput,
  type AjustesServiceInput,
  type AjustesStaffInput,
} from "./ajustes-schemas";
import {
  authzCode,
  memberView,
  requireMemberPerm,
  type MemberView,
} from "./member";

export type AjustesBusiness = {
  name: string;
  slug: string;
  comuna: string;
  phone: string;
  address: string;
  minNoticeMinutes: number;
  maxDaysAhead: number;
  cancelWindowHours: number;
  slotIntervalMinutes: number;
  /** WP-45 (D-033): `businesses.auto_confirm_bookings`. */
  autoConfirmBookings: boolean;
  /** WP-56: `businesses.cancel_approval` ("none"/"late"/"all") — om kundens
   * avbokning (`/r/[token]`) kräver ägarens godkännande (`cancel_requested`)
   * innan tiden frigörs. */
  cancelApproval: "none" | "late" | "all";
  /** WP-54: `businesses.member_discount_pct`. `null` = förmånen är avstängd. */
  memberDiscountPct: number | null;
  /** WP-54: `businesses.member_benefit_text`. `null` = ingen egen text. */
  memberBenefitText: string | null;
  /** WP-31: `businesses.winback_days`. `null` = "Te echamos de menos" är avstängd. */
  winbackDays: number | null;
  /** WP-31: `businesses.winback_message`. `null` = inget eget meddelande. */
  winbackMessage: string | null;
  /** WP-31: `businesses.winback_offer_pct`. `null` = ingen rabatt. */
  winbackOfferPct: number | null;
  /** WP-31: `businesses.winback_offer_days`. `null` = ingen rabatt. */
  winbackOfferDays: number | null;
  /** WP-23: `businesses.waitlist_mode` ("sequential"/"broadcast"). */
  waitlistMode: "sequential" | "broadcast";
  /** WP-65 (D-045): `businesses.review_requests_enabled`. */
  reviewRequestsEnabled: boolean;
  /** WP-23: `businesses.waitlist_hold_minutes` (5–240). */
  waitlistHoldMinutes: number;
};

export type AjustesService = {
  id: string;
  name: string;
  durationMin: number;
  priceClp: number;
  bufferAfterMin: number;
  active: boolean;
  /** WP-41: "" = ingen beskrivning. */
  description: string;
};

export type AjustesStaffMember = {
  id: string;
  name: string;
  active: boolean;
  /** WP-41: roll, "" = ingen (ändras via `updateStaffTitle`, profile.ts). */
  title: string;
  serviceIds: string[];
};

export type AjustesHour = {
  weekday: IsoWeekday;
  open: boolean;
  start: string;
  end: string;
};

export type AjustesData = {
  /** WP-46: den inloggades roll och effektiva behörigheter (UI döljer
   * sektioner; servern kontrollerar ändå varje mutation). */
  member: MemberView;
  business: AjustesBusiness;
  services: AjustesService[];
  staff: AjustesStaffMember[];
  hours: AjustesHour[];
};

export type MutationResult = { ok: true } | { ok: false; code: string };
export type CreateResult =
  { ok: true; id: string } | { ok: false; code: string };

function pgConstraint(e: unknown): string | undefined {
  if (typeof e !== "object" || e === null || !("constraint" in e)) {
    return undefined;
  }
  const v = (e as Record<string, unknown>).constraint;
  return typeof v === "string" ? v : undefined;
}

/** Samma mönster som complete-onboarding.ts: bara SQLSTATE/constraint, aldrig detail. */
export function mapDbError(e: unknown): string {
  if (e instanceof PlanLockedError) return e.code;
  const authz = authzCode(e);
  if (authz) return authz;
  const code = pgErrorCode(e);
  const constraint = pgConstraint(e);
  // WP-73 (D-048): databasens spärr (trigger) om förkontrollen hann passeras.
  if (code === "23514" && constraint === "plan_limit_services") {
    return "plan_limit_services";
  }
  // WP-70 (D-056): prisvakten — priset kan inte höjas under/efter ett erbjudande.
  if (code === "23514" && constraint === "service_price_offer_lock") {
    return "offers.service_price_locked";
  }
  if (code === "42501") return "unauthorized";
  if (code === "23505" && constraint === "businesses_slug_key") {
    return "business.slug_taken";
  }
  if (code === "23514" && constraint === "businesses_slug_not_reserved") {
    return "business.slug_reserved";
  }
  if (code === "23514" && constraint === "businesses_slug_format") {
    return "business.slug_invalid";
  }
  if (code === "23P01" && constraint === "business_hours_no_overlap") {
    return "hours.business_hours_no_overlap";
  }
  if (code === "23514" && constraint === "business_hours_start_before_end") {
    return "hours.business_hours_start_before_end";
  }
  if (code === "23514" && constraint === "businesses_cancel_approval_check") {
    return "business.cancel_approval_invalid";
  }
  if (
    code === "23514" &&
    constraint === "businesses_member_discount_pct_check"
  ) {
    return "member.discount_invalid";
  }
  if (
    code === "23514" &&
    constraint === "businesses_member_benefit_text_length_check"
  ) {
    return "member.benefit_too_long";
  }
  if (code === "23514" && constraint === "businesses_winback_days_check") {
    return "winback.days_invalid";
  }
  if (
    code === "23514" &&
    constraint === "businesses_winback_message_length_check"
  ) {
    return "winback.message_too_long";
  }
  if (code === "23514" && constraint === "businesses_winback_offer_pct_check") {
    return "winback.offer_pct_invalid";
  }
  if (
    code === "23514" &&
    constraint === "businesses_winback_offer_days_check"
  ) {
    return "winback.offer_days_invalid";
  }
  if (
    code === "23514" &&
    constraint === "businesses_waitlist_hold_minutes_check"
  ) {
    return "waitlist.hold_minutes_invalid";
  }
  return "unknown";
}

/** UPDATE/DELETE som inte matchade RLS (ägaren är inte medlem i det företaget) → 0 rader. */
function assertUpdated(rowCount: number | null): MutationResult | undefined {
  if (!rowCount) return { ok: false, code: "unauthorized" };
  return undefined;
}

// ---------------------------------------------------------------------------
// Läsning
// ---------------------------------------------------------------------------

type BusinessRow = {
  name: string;
  slug: string;
  comuna: string;
  phone: string | null;
  address: string | null;
  min_notice_minutes: number;
  max_days_ahead: number;
  cancel_window_hours: number;
  slot_interval_minutes: number;
  auto_confirm_bookings: boolean;
  cancel_approval: string;
  member_discount_pct: number | null;
  member_benefit_text: string | null;
  winback_days: number | null;
  winback_message: string | null;
  winback_offer_pct: number | null;
  winback_offer_days: number | null;
  waitlist_mode: string;
  waitlist_hold_minutes: number;
  review_requests_enabled: boolean;
};

/** Samma försvarsmönster som `toCancelApproval` (`src/server/bookings/row.ts`)
 * — enumet garanterar redan värdet i databasen, men TS litar aldrig blint på
 * en textcast. */
function toWaitlistMode(v: string): "sequential" | "broadcast" {
  return v === "broadcast" ? "broadcast" : "sequential";
}

type ServiceRow = {
  id: string;
  name: string;
  duration_min: number;
  price_clp: number;
  buffer_after_min: number;
  active: boolean;
  description: string | null;
};

type StaffRow = {
  id: string;
  name: string;
  active: boolean;
  title: string | null;
};
type StaffServiceRow = { staff_id: string; service_id: string };
type HoursRow = { weekday: number; start_time: string; end_time: string };

/** "HH:mm:ss" (Postgres `time`) → "HH:mm". */
function shortTime(t: string): string {
  return t.slice(0, 5);
}

async function loadBusinessRow(
  q: Queryable,
  businessId: string,
): Promise<AjustesBusiness> {
  const businessRes = await q.query<BusinessRow>(
    `select name, slug, comuna, phone, address, min_notice_minutes, max_days_ahead,
            cancel_window_hours, slot_interval_minutes, auto_confirm_bookings,
            cancel_approval, member_discount_pct, member_benefit_text,
            winback_days, winback_message, winback_offer_pct, winback_offer_days,
            waitlist_mode::text as waitlist_mode, waitlist_hold_minutes,
            review_requests_enabled
       from public.businesses
      where id = $1`,
    [businessId],
  );
  const b = businessRes.rows[0];
  if (!b) throw new Error("loadAjustesData: företaget hittades inte");
  return {
    name: b.name,
    slug: b.slug,
    comuna: b.comuna,
    phone: b.phone ?? "",
    address: b.address ?? "",
    minNoticeMinutes: b.min_notice_minutes,
    maxDaysAhead: b.max_days_ahead,
    cancelWindowHours: b.cancel_window_hours,
    slotIntervalMinutes: b.slot_interval_minutes,
    autoConfirmBookings: b.auto_confirm_bookings,
    cancelApproval: toCancelApproval(b.cancel_approval),
    memberDiscountPct: b.member_discount_pct,
    memberBenefitText: b.member_benefit_text,
    waitlistMode: toWaitlistMode(b.waitlist_mode),
    waitlistHoldMinutes: b.waitlist_hold_minutes,
    reviewRequestsEnabled: b.review_requests_enabled,
    winbackDays: b.winback_days,
    winbackMessage: b.winback_message,
    winbackOfferPct: b.winback_offer_pct,
    winbackOfferDays: b.winback_offer_days,
  };
}

async function loadServiceRows(
  q: Queryable,
  businessId: string,
): Promise<AjustesService[]> {
  const servicesRes = await q.query<ServiceRow>(
    `select id, name, duration_min, price_clp, buffer_after_min, active,
            description
       from public.services
      where business_id = $1
      order by sort, name`,
    [businessId],
  );
  return servicesRes.rows.map((s) => ({
    id: s.id,
    name: s.name,
    durationMin: s.duration_min,
    priceClp: s.price_clp,
    bufferAfterMin: s.buffer_after_min,
    active: s.active,
    description: s.description ?? "",
  }));
}

async function loadStaffRows(
  q: Queryable,
  businessId: string,
): Promise<AjustesStaffMember[]> {
  const staffRes = await q.query<StaffRow>(
    `select id, name, active, title
       from public.staff
      where business_id = $1
      order by sort, name`,
    [businessId],
  );
  const staffServicesRes = await q.query<StaffServiceRow>(
    `select staff_id, service_id
       from public.staff_services
      where business_id = $1`,
    [businessId],
  );
  const serviceIdsByStaff = new Map<string, string[]>();
  for (const row of staffServicesRes.rows) {
    const list = serviceIdsByStaff.get(row.staff_id) ?? [];
    list.push(row.service_id);
    serviceIdsByStaff.set(row.staff_id, list);
  }
  return staffRes.rows.map((s) => ({
    id: s.id,
    name: s.name,
    active: s.active,
    title: s.title ?? "",
    serviceIds: serviceIdsByStaff.get(s.id) ?? [],
  }));
}

async function loadHoursRows(
  q: Queryable,
  businessId: string,
): Promise<AjustesHour[]> {
  const hoursRes = await q.query<HoursRow>(
    `select weekday, start_time, end_time
       from public.business_hours
      where business_id = $1
      order by weekday`,
    [businessId],
  );
  const hoursByWeekday = new Map<number, HoursRow>();
  for (const row of hoursRes.rows) hoursByWeekday.set(row.weekday, row);
  return [1, 2, 3, 4, 5, 6, 7].map((weekday) => {
    const row = hoursByWeekday.get(weekday);
    return row
      ? {
          weekday: weekday as IsoWeekday,
          open: true,
          start: shortTime(row.start_time),
          end: shortTime(row.end_time),
        }
      : {
          weekday: weekday as IsoWeekday,
          open: false,
          start: "09:00",
          end: "19:00",
        };
  });
}

export async function loadAjustesDataIn(
  q: Queryable,
  businessId: string,
  userId?: string,
): Promise<AjustesData> {
  const member = userId ? await loadMember(q, userId, businessId) : null;
  // WP-60 fynd: sekventiellt, inte `Promise.all` — samma `q` (en
  // transaktion/anslutning), se motsvarande fix i src/server/owner/inicio.ts.
  const business = await loadBusinessRow(q, businessId);
  const services = await loadServiceRows(q, businessId);
  const staff = await loadStaffRows(q, businessId);
  const hours = await loadHoursRows(q, businessId);
  return { member: memberView(member), business, services, staff, hours };
}

export function loadAjustesData(
  userId: string,
  businessId: string,
): Promise<AjustesData> {
  return withOwnerTx(userId, (q) => loadAjustesDataIn(q, businessId, userId));
}

// ---------------------------------------------------------------------------
// WP-55: smalare läsningar, en per flik i /app/ajustes/[flik] — samma rader som
// `loadAjustesDataIn` ovan plockar isär, men utan att hämta det flikar INTE visar
// ("Tu negocio"/"Reglas de reserva"/"Socios" visar alla tre bara raden i `businesses`,
// t.ex.). `member` (behörigheter) läses redan av `getCurrentMember` i varje sidas
// `access.ts`/`page.tsx` — behövs inte här igen.
// ---------------------------------------------------------------------------

export function loadAjustesBusiness(
  userId: string,
  businessId: string,
): Promise<AjustesBusiness> {
  return withOwnerTx(userId, (q) => loadBusinessRow(q, businessId));
}

export function loadAjustesServices(
  userId: string,
  businessId: string,
): Promise<AjustesService[]> {
  return withOwnerTx(userId, (q) => loadServiceRows(q, businessId));
}

export function loadAjustesStaff(
  userId: string,
  businessId: string,
): Promise<AjustesStaffMember[]> {
  return withOwnerTx(userId, (q) => loadStaffRows(q, businessId));
}

export function loadAjustesHours(
  userId: string,
  businessId: string,
): Promise<AjustesHour[]> {
  return withOwnerTx(userId, (q) => loadHoursRows(q, businessId));
}

// ---------------------------------------------------------------------------
// Företaget
// ---------------------------------------------------------------------------

export async function updateBusinessSettings(
  userId: string,
  businessId: string,
  rawInput: unknown,
): Promise<MutationResult> {
  const parsed = businessSettingsInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "invalid_input",
    };
  }
  const input = parsed.data;
  try {
    return await withOwnerTx(userId, async (q) => {
      await requireMemberPerm(q, userId, businessId, "can_edit_settings");
      const r = await q.query(
        `update public.businesses
            set name = $1, slug = $2, comuna = $3, phone = $4, address = $5,
                min_notice_minutes = $6, max_days_ahead = $7,
                cancel_window_hours = $8, slot_interval_minutes = $9,
                auto_confirm_bookings = $11, cancel_approval = $12
          where id = $10`,
        [
          input.name,
          input.slug,
          input.comuna,
          input.phone,
          input.address ? input.address : null,
          input.minNoticeMinutes,
          input.maxDaysAhead,
          input.cancelWindowHours,
          input.slotIntervalMinutes,
          businessId,
          input.autoConfirmBookings,
          input.cancelApproval,
        ],
      );
      return assertUpdated(r.rowCount) ?? { ok: true };
    });
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
}

// ---------------------------------------------------------------------------
// Socios (WP-54): förmånen för kunder markerade som `customers.is_member`.
// ---------------------------------------------------------------------------

/** `enabled = false` → sparar alltid `null` i båda kolumnerna, oavsett vad
 * `discountPct`/`benefitText` råkar innehålla (samma "av/på via null"-regel
 * som db-migrationen, 20260930210200). */
export async function updateMemberSettings(
  userId: string,
  businessId: string,
  rawInput: unknown,
): Promise<MutationResult> {
  const parsed = memberSettingsInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "invalid_input",
    };
  }
  const input = parsed.data;
  const discountPct = input.enabled ? (input.discountPct ?? null) : null;
  const benefitText =
    input.enabled && input.benefitText ? input.benefitText : null;
  try {
    return await withOwnerTx(userId, async (q) => {
      await requireMemberPerm(q, userId, businessId, "can_edit_settings");
      // WP-73 (D-048): medlemsrabatter ingår i Team+. Att stänga av går alltid.
      if (input.enabled) await requireFeatureIn(q, businessId, "campaigns");
      const r = await q.query(
        `update public.businesses
            set member_discount_pct = $1, member_benefit_text = $2
          where id = $3`,
        [discountPct, benefitText, businessId],
      );
      return assertUpdated(r.rowCount) ?? { ok: true };
    });
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
}

// ---------------------------------------------------------------------------
// WP-31: "Te echamos de menos" automático — `businesses.winback_*`.
// ---------------------------------------------------------------------------

/** `enabled = false` → sparar alltid `null` i alla fyra kolumner (samma
 * av/på-via-null-regel som `updateMemberSettings`), oavsett vad `days`/
 * `message`/`offerPct`/`offerDays` råkar innehålla.
 *
 * Behörighet (säkerhetsgranskning WP-31): `can_manage_all_bookings`, inte
 * `can_edit_settings` — samma flagga som krävs för att skicka ett manuellt
 * utskick (`src/server/campaigns/send.ts`), eftersom den här inställningen
 * styr automatiska marknadsföringsutskick till kunder (samma risknivå). */
export async function updateWinbackSettings(
  userId: string,
  businessId: string,
  rawInput: unknown,
): Promise<MutationResult> {
  const parsed = winbackSettingsInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "invalid_input",
    };
  }
  const input = parsed.data;
  const days = input.enabled ? (input.days ?? null) : null;
  const message = input.enabled && input.message ? input.message : null;
  const offerPct = input.enabled ? (input.offerPct ?? null) : null;
  const offerDays = input.enabled ? (input.offerDays ?? null) : null;
  try {
    return await withOwnerTx(userId, async (q) => {
      await requireMemberPerm(q, userId, businessId, "can_manage_all_bookings");
      // WP-73 (D-048): "Vi saknar dig" ingår i Team+. Att stänga av går alltid.
      if (input.enabled) await requireFeatureIn(q, businessId, "campaigns");
      const r = await q.query(
        `update public.businesses
            set winback_days = $1, winback_message = $2,
                winback_offer_pct = $3, winback_offer_days = $4
          where id = $5`,
        [days, message, offerPct, offerDays, businessId],
      );
      return assertUpdated(r.rowCount) ?? { ok: true };
    });
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
}

// ---------------------------------------------------------------------------
// WP-23 (Ajustes → Reglas de reserva): väntelistans läge + hålltid.
// ---------------------------------------------------------------------------

export async function updateWaitlistSettings(
  userId: string,
  businessId: string,
  rawInput: unknown,
): Promise<MutationResult> {
  const parsed = waitlistSettingsInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "invalid_input",
    };
  }
  const input = parsed.data;
  try {
    return await withOwnerTx(userId, async (q) => {
      await requireMemberPerm(q, userId, businessId, "can_edit_settings");
      await requireFeatureIn(q, businessId, "waitlist");
      const r = await q.query(
        `update public.businesses
            set waitlist_mode = $1, waitlist_hold_minutes = $2
          where id = $3`,
        [input.mode, input.holdMinutes, businessId],
      );
      return assertUpdated(r.rowCount) ?? { ok: true };
    });
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
}

// ---------------------------------------------------------------------------
// Tjänster (ingen radering — bara inaktivera, se WP-15b-planen)
// ---------------------------------------------------------------------------

async function nextSort(
  q: Queryable,
  table: string,
  businessId: string,
): Promise<number> {
  const r = await q.query<{ next: number }>(
    `select coalesce(max(sort), 0) + 1 as next from public.${table} where business_id = $1`,
    [businessId],
  );
  return r.rows[0]?.next ?? 1;
}

/** Insert i anroparens transaktion (behörigheten kontrolleras av anroparen).
 * Delas av `createService` och AI-importen (WP-66, `src/server/import/apply.ts`). */
export async function insertServiceIn(
  q: Queryable,
  businessId: string,
  input: AjustesServiceInput,
  active = true,
): Promise<string | undefined> {
  const sort = await nextSort(q, "services", businessId);
  const r = await q.query<{ id: string }>(
    `insert into public.services (business_id, name, duration_min, price_clp, buffer_after_min, sort, description, active)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
    [
      businessId,
      input.name,
      input.durationMin,
      input.priceClp,
      input.bufferAfterMin,
      sort,
      input.description ?? null,
      active,
    ],
  );
  return r.rows[0]?.id;
}

export async function createService(
  userId: string,
  businessId: string,
  rawInput: unknown,
): Promise<CreateResult> {
  const parsed = ajustesServiceInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "invalid_input",
    };
  }
  const input = parsed.data;
  try {
    return await withOwnerTx(userId, async (q) => {
      await requireMemberPerm(q, userId, businessId, "can_edit_catalog");
      // WP-73 (D-048): planens gräns för aktiva tjänster.
      if (!(await canAddActiveServiceIn(q, businessId))) {
        return { ok: false, code: "plan_limit_services" };
      }
      const id = await insertServiceIn(q, businessId, input);
      if (!id) return { ok: false, code: "unauthorized" };
      return { ok: true, id };
    });
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
}

export async function updateService(
  userId: string,
  businessId: string,
  serviceId: string,
  rawInput: unknown,
): Promise<MutationResult> {
  const parsed = ajustesServiceInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "invalid_input",
    };
  }
  const input = parsed.data;
  try {
    return await withOwnerTx(userId, async (q) => {
      await requireMemberPerm(q, userId, businessId, "can_edit_catalog");
      const r = await q.query(
        // WP-41: `description` utelämnad (äldre formulär) = oförändrad.
        `update public.services
            set name = $1, duration_min = $2, price_clp = $3, buffer_after_min = $4,
                description = case when $7::boolean then $8 else description end
          where id = $5 and business_id = $6`,
        [
          input.name,
          input.durationMin,
          input.priceClp,
          input.bufferAfterMin,
          serviceId,
          businessId,
          input.description !== undefined,
          input.description ?? null,
        ],
      );
      return assertUpdated(r.rowCount) ?? { ok: true };
    });
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
}

export async function setServiceActive(
  userId: string,
  businessId: string,
  serviceId: string,
  active: boolean,
): Promise<MutationResult> {
  try {
    return await withOwnerTx(userId, async (q) => {
      await requireMemberPerm(q, userId, businessId, "can_edit_catalog");
      // WP-73 (D-048): att aktivera en tjänst räknas mot gränsen; redan
      // aktiva tjänster över gränsen (nedgradering) får vara kvar.
      if (active) {
        const cur = await q.query<{ active: boolean }>(
          `select active from public.services where id = $1 and business_id = $2`,
          [serviceId, businessId],
        );
        if (
          cur.rows[0]?.active === false &&
          !(await canAddActiveServiceIn(q, businessId))
        ) {
          return { ok: false, code: "plan_limit_services" };
        }
      }
      const r = await q.query(
        `update public.services set active = $1 where id = $2 and business_id = $3`,
        [active, serviceId, businessId],
      );
      return assertUpdated(r.rowCount) ?? { ok: true };
    });
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
}

// ---------------------------------------------------------------------------
// Personal (ingen radering, se WP-15b-planen)
// ---------------------------------------------------------------------------

async function replaceStaffServices(
  q: Queryable,
  businessId: string,
  staffId: string,
  serviceIds: readonly string[],
): Promise<void> {
  await q.query(
    `delete from public.staff_services where business_id = $1 and staff_id = $2`,
    [businessId, staffId],
  );
  for (const serviceId of new Set(serviceIds)) {
    await q.query(
      `insert into public.staff_services (business_id, staff_id, service_id)
       select $1, $2, id from public.services where id = $3 and business_id = $1`,
      [businessId, staffId, serviceId],
    );
  }
}

/** Insert i anroparens transaktion (behörigheten kontrolleras av anroparen).
 * Delas av `createStaff` och AI-importen (WP-66). */
export async function insertStaffIn(
  q: Queryable,
  businessId: string,
  input: AjustesStaffInput,
): Promise<string | undefined> {
  const sort = await nextSort(q, "staff", businessId);
  const r = await q.query<{ id: string }>(
    `insert into public.staff (business_id, name, color, sort)
     values ($1, $2, $3, $4) returning id`,
    [businessId, input.name, `staff-${((sort - 1) % 6) + 1}`, sort],
  );
  const id = r.rows[0]?.id;
  if (id) await replaceStaffServices(q, businessId, id, input.serviceIds);
  return id;
}

export async function createStaff(
  userId: string,
  businessId: string,
  rawInput: unknown,
): Promise<CreateResult> {
  const parsed = ajustesStaffInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "invalid_input",
    };
  }
  const input = parsed.data;
  try {
    return await withOwnerTx(userId, async (q) => {
      await requireMemberPerm(q, userId, businessId, "can_manage_team");
      const id = await insertStaffIn(q, businessId, input);
      if (!id) return { ok: false, code: "unauthorized" };
      return { ok: true, id };
    });
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
}

export async function updateStaff(
  userId: string,
  businessId: string,
  staffId: string,
  rawInput: unknown,
): Promise<MutationResult> {
  const parsed = ajustesStaffInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "invalid_input",
    };
  }
  const input = parsed.data;
  try {
    return await withOwnerTx(userId, async (q) => {
      await requireMemberPerm(q, userId, businessId, "can_manage_team");
      const r = await q.query(
        `update public.staff set name = $1 where id = $2 and business_id = $3`,
        [input.name, staffId, businessId],
      );
      const failed = assertUpdated(r.rowCount);
      if (failed) return failed;
      await replaceStaffServices(q, businessId, staffId, input.serviceIds);
      return { ok: true };
    });
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
}

export async function setStaffActive(
  userId: string,
  businessId: string,
  staffId: string,
  active: boolean,
): Promise<MutationResult> {
  // Ley 21.719/WP-44: en inaktiverad medarbetare kan inte bokas längre, och
  // profilbilden (gratis, allas plan) är en personuppgift — den tas bort
  // direkt i stället för att bli kvar oanvänd. Storage-borttagningen sker
  // EFTER commit (samma mönster/motivering som `src/server/owner/profile.ts`).
  let photoToRemove: string | null = null;
  let result: MutationResult;
  try {
    result = await withOwnerTx<MutationResult>(userId, async (q) => {
      await requireMemberPerm(q, userId, businessId, "can_manage_team");
      if (!active) {
        const prev = await q.query<{ url: string | null }>(
          `select photo_url as url from public.staff
          where id = $1 and business_id = $2 for update`,
          [staffId, businessId],
        );
        if (prev.rows[0]?.url) {
          photoToRemove = mediaPathFromUrl(prev.rows[0].url, businessId);
        }
      }
      const r = await q.query(
        `update public.staff
          set active = $1,
              photo_url = case when $1 then photo_url else null end
        where id = $2 and business_id = $3`,
        [active, staffId, businessId],
      );
      return assertUpdated(r.rowCount) ?? { ok: true };
    });
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
  if (result.ok && photoToRemove) {
    const { ownerMediaStorage } = await import("./media-storage");
    await (await ownerMediaStorage()).remove([photoToRemove]);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Öppettider (samma form som onboarding: ett intervall per dag)
// ---------------------------------------------------------------------------

/** I anroparens transaktion (behörigheten kontrolleras av anroparen). Delas av
 * `replaceBusinessHours` och AI-importen (WP-66). */
export async function replaceBusinessHoursIn(
  q: Queryable,
  businessId: string,
  input: AjustesHoursInput,
): Promise<MutationResult> {
  const del = await q.query(
    `delete from public.business_hours where business_id = $1`,
    [businessId],
  );
  // Inga öppna dagar innan heller: kolla medlemskap separat, annars skulle en
  // ägare utan dagar aldrig märka att skrivningen tystnat (0 rader från DELETE
  // säger inget om en tom vecka).
  if (del.rowCount === 0) {
    const member = await q.query(
      `select 1 from public.businesses where id = $1`,
      [businessId],
    );
    if (member.rows.length === 0) return { ok: false, code: "unauthorized" };
  }
  for (const h of input) {
    if (!h.open || !h.start || !h.end) continue;
    await q.query(
      `insert into public.business_hours (business_id, weekday, start_time, end_time)
       values ($1, $2, $3, $4)`,
      [businessId, h.weekday, h.start, h.end],
    );
  }
  return { ok: true };
}

export async function replaceBusinessHours(
  userId: string,
  businessId: string,
  rawInput: unknown,
): Promise<MutationResult> {
  const parsed = ajustesHoursInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "invalid_input",
    };
  }
  const input = parsed.data;
  try {
    return await withOwnerTx(userId, async (q) => {
      await requireMemberPerm(q, userId, businessId, "can_edit_settings");
      return replaceBusinessHoursIn(q, businessId, input);
    });
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
}
