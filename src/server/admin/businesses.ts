import "server-only";

// Företagslistan/-detaljen och åtgärderna i /admin (F19/WP-36). Körs alltid
// med `service_role` (samma mönster som `src/server/privacy/business.ts`):
// den som anropar har redan passerat `requireAdminForAction()` i
// `src/app/(admin)/admin/**/actions.ts`, så ingen extra medlemskapskontroll
// behövs här (till skillnad från privacy/authz.ts, som skyddar mot en
// vanlig ägarsession). E-post hämtas via `auth.admin` (Supabase, service
// role) — `service_role` saknar SELECT-grant direkt på `auth.users` (se
// 20260930080200_business_deletion_lifecycle.sql), så all e-postuppslagning
// går via `getStorageAdminClient().auth.admin.*` i stället för SQL.
import {
  isBusinessPlan,
  parseCustomLimits,
  type BusinessPlan,
  type CustomLimits,
} from "@/config/plans";
import {
  BILLING_NOTE_MAX,
  isBillingMode,
  type BillingMode,
} from "@/config/billing-mode";
import { getStorageAdminClient } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";
import {
  missingForMarketplace,
  type MissingPart,
} from "@/server/marketplace/completeness";
import { sendEmail } from "@/server/messaging/email/send";
import { purgeBusiness } from "@/server/privacy/business";

import { writeAuditLog } from "./audit";

export type { BusinessPlan } from "@/config/plans";
export type BusinessStatus = "active" | "frozen";
export type { BillingMode } from "@/config/billing-mode";

export type BusinessListItem = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly plan: BusinessPlan;
  readonly planOverrideUntil: string | null;
  readonly status: BusinessStatus;
  readonly billingMode: BillingMode;
  readonly deletionRequestedAt: string | null;
  /** WP-83 (D-068): plan pagado que el dueño pidió al registrarse. */
  readonly planRequested: BusinessPlan | null;
  readonly ownerEmail: string | null;
  readonly createdAt: string;
  /** WP-84 (D-069): kortens innehåll (rubro, comuna, bild, redo för Descubre). */
  readonly category: string;
  readonly comuna: string;
  readonly imageUrl: string | null;
  readonly readiness: {
    readonly imagen: boolean;
    readonly lugar: boolean;
    readonly servicios: boolean;
  };
  /** Plattformen har dolt företaget i Descubre (`marketplace_hidden`). */
  readonly marketplaceHidden: boolean;
};

/**
 * Hämtar en id→e-post-karta för ALLA användare (paginerat, `perPage` 1000,
 * max 10 sidor — gott om marginal för pilotens skala). Enklare och mer
 * robust än att filtrera via GoTrue:s REST-API direkt (ingen
 * e-postfiltrering i supabase-js `admin.listUsers()`), och listan med
 * företag är ändå liten i den här fasen (en handfull pilotkunder).
 */
export async function emailsByUserId(): Promise<Map<string, string>> {
  const client = getStorageAdminClient();
  const map = new Map<string, string>();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error || !data) break;
    for (const u of data.users) {
      if (u.email) map.set(u.id, u.email);
    }
    if (data.users.length < 1000) break;
  }
  return map;
}

export type ListBusinessesFilter = {
  q?: string;
  plan?: BusinessPlan;
  status?: BusinessStatus;
  billingMode?: BillingMode;
};

export async function listBusinesses(
  filter: ListBusinessesFilter = {},
): Promise<readonly BusinessListItem[]> {
  const rows = await withServiceTx(async (q) => {
    const r = await q.query<{
      id: string;
      name: string;
      slug: string;
      plan: BusinessPlan;
      plan_override_until: string | null;
      status: BusinessStatus;
      billing_mode: string;
      deletion_requested_at: string | null;
      plan_requested: BusinessPlan | null;
      owner_user_id: string | null;
      created_at: string;
      category: string;
      comuna: string;
      image_url: string | null;
      has_image: boolean;
      has_place: boolean;
      has_services: boolean;
      marketplace_hidden: boolean;
    }>(
      `select b.id, b.name, b.slug, b.plan, b.plan_override_until, b.status,
              b.billing_mode, b.deletion_requested_at, b.plan_requested, b.created_at,
              b.category, b.comuna, b.marketplace_hidden,
              coalesce(nullif(btrim(b.logo_url), ''), nullif(btrim(b.cover_url), '')) as image_url,
              (select m.user_id from public.memberships m
                where m.business_id = b.id and m.role = 'owner'
                order by m.created_at limit 1) as owner_user_id,
              (coalesce(btrim(b.logo_url), '') <> '' or coalesce(btrim(b.cover_url), '') <> '') as has_image,
              coalesce(btrim(b.address), '') <> '' as has_place,
              exists (select 1 from public.services s
                       where s.business_id = b.id and s.active) as has_services
         from public.businesses b
        order by b.created_at desc`,
    );
    return r.rows;
  });

  const emails = await emailsByUserId();

  const items: BusinessListItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    planOverrideUntil: row.plan_override_until,
    status: row.status,
    billingMode: row.billing_mode === "manual" ? "manual" : "app",
    deletionRequestedAt: row.deletion_requested_at,
    planRequested: row.plan_requested,
    ownerEmail: row.owner_user_id
      ? (emails.get(row.owner_user_id) ?? null)
      : null,
    createdAt: row.created_at,
    category: row.category,
    comuna: row.comuna,
    imageUrl: row.image_url,
    readiness: {
      imagen: row.has_image,
      lugar: row.has_place,
      servicios: row.has_services,
    },
    marketplaceHidden: row.marketplace_hidden,
  }));

  const q = filter.q?.trim().toLowerCase();
  return items.filter((item) => {
    if (filter.plan && item.plan !== filter.plan) return false;
    if (filter.status && item.status !== filter.status) return false;
    if (filter.billingMode && item.billingMode !== filter.billingMode)
      return false;
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.slug.toLowerCase().includes(q) ||
      (item.ownerEmail?.toLowerCase().includes(q) ?? false)
    );
  });
}

export type BusinessMember = {
  readonly userId: string;
  readonly role: string;
  readonly email: string | null;
};

export type BusinessDetail = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly comuna: string;
  readonly category: string;
  readonly plan: BusinessPlan;
  readonly planOverrideUntil: string | null;
  /** WP-73 (D-048): avtalade gränser för plan `custom`. */
  readonly customLimits: CustomLimits;
  readonly status: BusinessStatus;
  readonly billingMode: BillingMode;
  /** Intern anteckning (private.business_billing_notes), bara /admin. */
  readonly billingNote: string | null;
  readonly deletionRequestedAt: string | null;
  /** WP-83 (D-068): plan pagado pedido al registrarse, y cuándo. */
  readonly planRequested: BusinessPlan | null;
  readonly planRequestedAt: string | null;
  readonly createdAt: string;
  readonly counts: {
    readonly bookings: number;
    readonly staff: number;
    readonly members: number;
  };
  readonly lastActivityAt: string | null;
  readonly members: readonly BusinessMember[];
  /** Descubre (WP-85, D-070): ägarens val, plattformens döljning och vad
   * profilen saknar (samma regel som den publika listningen). */
  readonly marketplace: {
    readonly listed: boolean;
    readonly hidden: boolean;
    readonly missing: readonly MissingPart[];
  };
};

export async function getBusinessDetail(
  businessId: string,
): Promise<BusinessDetail | null> {
  const data = await withServiceTx(async (q) => {
    const businessRes = await q.query<{
      id: string;
      name: string;
      slug: string;
      comuna: string;
      category: string;
      plan: BusinessPlan;
      plan_override_until: string | null;
      custom_limits: unknown;
      status: BusinessStatus;
      billing_mode: string;
      billing_note: string | null;
      deletion_requested_at: string | null;
      plan_requested: BusinessPlan | null;
      plan_requested_at: string | null;
      created_at: string;
      marketplace_listed: boolean;
      marketplace_hidden: boolean;
      logo_url: string | null;
      cover_url: string | null;
      address: string | null;
      serves_at_customer: boolean;
      service_area_count: number;
      active_service_count: number;
    }>(
      `select b.id, b.name, b.slug, b.comuna, b.category, b.plan, b.plan_override_until,
              b.custom_limits, b.status, b.billing_mode, n.note as billing_note,
              b.deletion_requested_at, b.plan_requested, b.plan_requested_at, b.created_at,
              b.marketplace_listed, b.marketplace_hidden,
              b.logo_url, b.cover_url, b.address, b.serves_at_customer,
              (select count(*)::int from public.business_service_areas a
                where a.business_id = b.id) as service_area_count,
              (select count(*)::int from public.services s
                where s.business_id = b.id and s.active) as active_service_count
         from public.businesses b
         left join private.business_billing_notes n on n.business_id = b.id
        where b.id = $1`,
      [businessId],
    );
    const business = businessRes.rows[0];
    if (!business) return null;

    // WP-60 fynd: sekventiellt, inte `Promise.all` — samma `q` (en
    // transaktion/anslutning), se motsvarande fix i src/server/owner/inicio.ts.
    const bookingsCount = await q.query<{ n: string }>(
      `select count(*)::text as n from public.bookings where business_id = $1`,
      [businessId],
    );
    const staffCount = await q.query<{ n: string }>(
      `select count(*)::text as n from public.staff where business_id = $1`,
      [businessId],
    );
    const membersRes = await q.query<{ user_id: string; role: string }>(
      // WP-105: supportrader (admins i modo soporte) är inte företagets konton.
      `select user_id, role from public.memberships
        where business_id = $1 and support_until is null order by created_at`,
      [businessId],
    );
    const lastActivity = await q.query<{ last_at: string | null }>(
      `select max(created_at) as last_at from public.bookings where business_id = $1`,
      [businessId],
    );

    return {
      business,
      bookings: Number(bookingsCount.rows[0]?.n ?? "0"),
      staff: Number(staffCount.rows[0]?.n ?? "0"),
      members: membersRes.rows,
      lastActivityAt: lastActivity.rows[0]?.last_at ?? null,
    };
  });
  if (!data) return null;

  const emails = await emailsByUserId();

  return {
    id: data.business.id,
    name: data.business.name,
    slug: data.business.slug,
    comuna: data.business.comuna,
    category: data.business.category,
    plan: data.business.plan,
    planOverrideUntil: data.business.plan_override_until,
    customLimits: parseCustomLimits(data.business.custom_limits),
    status: data.business.status,
    billingMode: data.business.billing_mode === "manual" ? "manual" : "app",
    billingNote: data.business.billing_note,
    deletionRequestedAt: data.business.deletion_requested_at,
    planRequested: data.business.plan_requested,
    planRequestedAt: data.business.plan_requested_at,
    createdAt: data.business.created_at,
    counts: {
      bookings: data.bookings,
      staff: data.staff,
      members: data.members.length,
    },
    lastActivityAt: data.lastActivityAt,
    members: data.members.map((m) => ({
      userId: m.user_id,
      role: m.role,
      email: emails.get(m.user_id) ?? null,
    })),
    marketplace: {
      listed: data.business.marketplace_listed,
      hidden: data.business.marketplace_hidden,
      missing: missingForMarketplace({
        logoUrl: data.business.logo_url,
        coverUrl: data.business.cover_url,
        address: data.business.address,
        servesAtCustomer: data.business.serves_at_customer,
        serviceAreaCount: data.business.service_area_count,
        activeServiceCount: data.business.active_service_count,
      }),
    },
  };
}

export type AdminActionResult = { ok: true } | { ok: false; code: string };

export async function setPlan(
  adminUserId: string,
  businessId: string,
  plan: BusinessPlan,
  overrideUntil: string | null,
  rawCustomLimits: unknown = null,
): Promise<AdminActionResult> {
  if (!isBusinessPlan(plan)) return { ok: false, code: "invalid_input" };
  // WP-73 (D-048): bara `custom` sparar avtalade gränser; för andra planer
  // lämnas kolumnen orörd (ignoreras ändå av `src/config/plans.ts`).
  const customLimits =
    plan === "custom" ? parseCustomLimits(rawCustomLimits) : null;
  if (
    customLimits?.staff !== undefined &&
    (customLimits.staff < 1 || customLimits.staff > 10000)
  ) {
    return { ok: false, code: "invalid_input" };
  }
  return withServiceTx(async (q) => {
    const r = await q.query(
      `update public.businesses
          set plan = $2, plan_override_until = $3,
              custom_limits = coalesce($4::jsonb, custom_limits)
        where id = $1`,
      [
        businessId,
        plan,
        overrideUntil,
        customLimits ? JSON.stringify(customLimits) : null,
      ],
    );
    if (!r.rowCount) return { ok: false, code: "not_found" };
    await writeAuditLog(q, {
      adminUserId,
      action: "set_plan",
      businessId,
      details: {
        plan,
        override_until: overrideUntil,
        ...(customLimits ? { custom_limits: customLimits } : {}),
      },
    });
    return { ok: true };
  });
}

/**
 * Döljer/visar företaget i Descubre på plattformsnivå (`marketplace_hidden`,
 * WP-85/D-070) — t.ex. demo- och testföretag. Skilt från ägarens eget val
 * (`marketplace_listed`), som lämnas orört.
 */
export async function setMarketplaceHidden(
  adminUserId: string,
  businessId: string,
  hidden: boolean,
): Promise<AdminActionResult> {
  if (typeof hidden !== "boolean") return { ok: false, code: "invalid_input" };
  return withServiceTx(async (q) => {
    const r = await q.query(
      `update public.businesses set marketplace_hidden = $2 where id = $1`,
      [businessId, hidden],
    );
    if (!r.rowCount) return { ok: false, code: "not_found" };
    await writeAuditLog(q, {
      adminUserId,
      action: "set_marketplace_hidden",
      businessId,
      details: { hidden },
    });
    return { ok: true };
  });
}

/**
 * WP-80 (D-061): "Facturación manual". Sätter `businesses.billing_mode` och
 * den interna anteckningen (tom = ingen) i en transaktion med loggraden.
 * Loggen får bara läget och om en anteckning finns — aldrig själva texten
 * (fritext kan innehålla persondata, regel 7).
 */
export async function setBillingMode(
  adminUserId: string,
  businessId: string,
  mode: BillingMode,
  rawNote: string | null,
): Promise<AdminActionResult> {
  if (!isBillingMode(mode)) return { ok: false, code: "invalid_input" };
  const note = rawNote?.trim() ? rawNote.trim() : null;
  if (note && note.length > BILLING_NOTE_MAX)
    return { ok: false, code: "note_too_long" };
  return withServiceTx(async (q) => {
    const r = await q.query(
      `update public.businesses set billing_mode = $2 where id = $1`,
      [businessId, mode],
    );
    if (!r.rowCount) return { ok: false, code: "not_found" };
    if (note) {
      await q.query(
        `insert into private.business_billing_notes (business_id, note, updated_by)
         values ($1, $2, $3)
         on conflict (business_id) do update
           set note = excluded.note, updated_by = excluded.updated_by, updated_at = now()`,
        [businessId, note, adminUserId],
      );
    } else {
      await q.query(
        `delete from private.business_billing_notes where business_id = $1`,
        [businessId],
      );
    }
    await writeAuditLog(q, {
      adminUserId,
      action: "set_billing_mode",
      businessId,
      details: { billing_mode: mode, has_note: note !== null },
    });
    return { ok: true };
  });
}

export async function freezeBusiness(
  adminUserId: string,
  businessId: string,
): Promise<AdminActionResult> {
  return withServiceTx(async (q) => {
    const r = await q.query(
      `update public.businesses set status = 'frozen' where id = $1 and status <> 'frozen'`,
      [businessId],
    );
    if (!r.rowCount) {
      const exists = await q.query(
        `select 1 from public.businesses where id = $1`,
        [businessId],
      );
      return exists.rows.length
        ? { ok: false, code: "already_frozen" }
        : { ok: false, code: "not_found" };
    }
    await writeAuditLog(q, { adminUserId, action: "freeze", businessId });
    return { ok: true };
  });
}

/** Vägrar avfrysa mitt i en pågående raderingsbegäran (`deletion_requested_at`
 * satt) — admin ska ångra raderingen först (`cancelDeletion`), annars hamnar
 * `status`/`deletion_requested_at` i ett motsägelsefullt läge. */
export async function unfreezeBusiness(
  adminUserId: string,
  businessId: string,
): Promise<AdminActionResult> {
  return withServiceTx(async (q) => {
    const r = await q.query(
      `update public.businesses
          set status = 'active'
        where id = $1 and status = 'frozen' and deletion_requested_at is null`,
      [businessId],
    );
    if (!r.rowCount) {
      const row = await q.query<{ deletion_requested_at: string | null }>(
        `select deletion_requested_at from public.businesses where id = $1`,
        [businessId],
      );
      if (!row.rows.length) return { ok: false, code: "not_found" };
      if (row.rows[0]!.deletion_requested_at)
        return { ok: false, code: "deletion_pending" };
      return { ok: false, code: "not_frozen" };
    }
    await writeAuditLog(q, { adminUserId, action: "unfreeze", businessId });
    return { ok: true };
  });
}

/**
 * WP-84 (D-069, port av SE WP-93): plattformsadmin raderar ett företag DIREKT
 * (testkonton, dubbletter), utan 30 dagars frist. Oåterkalleligt. Kräver att
 * admin skriver företagets slug som bekräftelse. Samma radering som
 * lagringsjobbet (`purgeBusiness`: Storage, bokningar före företaget,
 * ägarkonton utan andra medlemskap). Loggraden skrivs FÖRE raderingen med
 * bara slug i `details` (regel 7: inget namn) — `business_id` blir `null` när
 * företaget försvinner (on delete set null).
 */
export async function adminDeleteNow(
  adminUserId: string,
  businessId: string,
  confirmSlug: string,
): Promise<AdminActionResult> {
  const found = await withServiceTx(async (q) => {
    const r = await q.query<{ slug: string }>(
      `select slug from public.businesses where id = $1`,
      [businessId],
    );
    return r.rows[0] ?? null;
  });
  if (!found) return { ok: false, code: "not_found" };
  if (confirmSlug.trim().toLowerCase() !== found.slug) {
    return { ok: false, code: "confirm_mismatch" };
  }
  await withServiceTx((q) =>
    writeAuditLog(q, {
      adminUserId,
      action: "delete_now",
      businessId,
      details: { slug: found.slug },
    }),
  );
  try {
    const result = await purgeBusiness(businessId, { skipGracePeriod: true });
    return result.ok ? { ok: true } : { ok: false, code: result.code };
  } catch {
    // T.ex. Storage-fel: inget i databasen har raderats än (steg 2 före 3).
    return { ok: false, code: "desconocido" };
  }
}

/**
 * Admin-variant av `src/server/privacy/business.ts` `requestBusinessDeletion`
 * (samma SQL, men utan `isOwner`-kravet — planen: "skriv admin-varianter som
 * inte kräver owner").
 */
export async function adminRequestDeletion(
  adminUserId: string,
  businessId: string,
): Promise<AdminActionResult> {
  return withServiceTx(async (q) => {
    const r = await q.query(
      `update public.businesses
          set status_before_deletion_request = status,
              status = 'frozen',
              deletion_requested_at = now()
        where id = $1 and deletion_requested_at is null`,
      [businessId],
    );
    if (!r.rowCount) {
      const exists = await q.query(
        `select 1 from public.businesses where id = $1`,
        [businessId],
      );
      return exists.rows.length
        ? { ok: false, code: "already_requested" }
        : { ok: false, code: "not_found" };
    }
    await writeAuditLog(q, {
      adminUserId,
      action: "request_deletion",
      businessId,
    });
    return { ok: true };
  });
}

export async function adminCancelDeletion(
  adminUserId: string,
  businessId: string,
): Promise<AdminActionResult> {
  return withServiceTx(async (q) => {
    const r = await q.query(
      `update public.businesses
          set status = coalesce(status_before_deletion_request, 'active'),
              status_before_deletion_request = null,
              deletion_requested_at = null
        where id = $1 and deletion_requested_at is not null`,
      [businessId],
    );
    if (!r.rowCount) return { ok: false, code: "not_requested" };
    await writeAuditLog(q, {
      adminUserId,
      action: "cancel_deletion",
      businessId,
    });
    return { ok: true };
  });
}

/**
 * Skickar en ny inloggningslänk till en användare (support, F19/WP-36):
 * `auth.admin.generateLink` ger en `hashed_token` av samma form som vår
 * vanliga magiska länk (`type: magiclink`) — byggs om till samma URL-form
 * som `/auth/confirm/route.ts` redan förstår (`token_hash`+`type`), så
 * mottagaren loggar in precis som vanligt. Skickas direkt via Resend med
 * den befintliga `magicLink`-mallen (inte utkorgen: engångsåtgärd av en
 * admin, inte ett systemhändelse-mail).
 */
export async function sendLoginLink(
  adminUserId: string,
  targetUserId: string,
  businessId: string | null,
): Promise<AdminActionResult> {
  const client = getStorageAdminClient();
  const { data: userData, error: userError } =
    await client.auth.admin.getUserById(targetUserId);
  if (userError || !userData.user?.email)
    return { ok: false, code: "not_found" };
  const email = userData.user.email;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const { data, error } = await client.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: appUrl ? { redirectTo: `${appUrl}/auth/confirm` } : undefined,
  });
  if (error || !data) return { ok: false, code: "generate_link_failed" };

  const confirmUrl = `${appUrl}/auth/confirm?token_hash=${encodeURIComponent(
    data.properties.hashed_token,
  )}&type=magiclink`;

  try {
    await sendEmail({
      to: email,
      template: "magicLink",
      data: { confirmUrl, token: data.properties.email_otp },
    });
  } catch {
    return { ok: false, code: "send_failed" };
  }

  return withServiceTx(async (q) => {
    await writeAuditLog(q, {
      adminUserId,
      action: "send_login_link",
      businessId,
      targetUserId,
    });
    return { ok: true };
  });
}

export async function changeEmail(
  adminUserId: string,
  targetUserId: string,
  businessId: string | null,
  newEmail: string,
): Promise<AdminActionResult> {
  const email = newEmail.trim().toLowerCase();
  if (!email || !email.includes("@"))
    return { ok: false, code: "invalid_email" };

  const client = getStorageAdminClient();
  const { error } = await client.auth.admin.updateUserById(targetUserId, {
    email,
    email_confirm: true,
  });
  if (error) return { ok: false, code: "update_failed" };

  return withServiceTx(async (q) => {
    await writeAuditLog(q, {
      adminUserId,
      action: "change_email",
      businessId,
      targetUserId,
    });
    return { ok: true };
  });
}
