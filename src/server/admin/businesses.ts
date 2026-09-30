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
import { getStorageAdminClient } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";
import { sendEmail } from "@/server/messaging/email/send";

import { writeAuditLog } from "./audit";

export type BusinessPlan = "free" | "emprende" | "equipo" | "local";
export type BusinessStatus = "active" | "frozen";

export type BusinessListItem = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly plan: BusinessPlan;
  readonly planOverrideUntil: string | null;
  readonly status: BusinessStatus;
  readonly deletionRequestedAt: string | null;
  readonly ownerEmail: string | null;
  readonly createdAt: string;
};

/**
 * Hämtar en id→e-post-karta för ALLA användare (paginerat, `perPage` 1000,
 * max 10 sidor — gott om marginal för pilotens skala). Enklare och mer
 * robust än att filtrera via GoTrue:s REST-API direkt (ingen
 * e-postfiltrering i supabase-js `admin.listUsers()`), och listan med
 * företag är ändå liten i den här fasen (en handfull pilotkunder).
 */
async function emailsByUserId(): Promise<Map<string, string>> {
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
      deletion_requested_at: string | null;
      owner_user_id: string | null;
      created_at: string;
    }>(
      `select b.id, b.name, b.slug, b.plan, b.plan_override_until, b.status,
              b.deletion_requested_at, b.created_at,
              (select m.user_id from public.memberships m
                where m.business_id = b.id and m.role = 'owner'
                order by m.created_at limit 1) as owner_user_id
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
    deletionRequestedAt: row.deletion_requested_at,
    ownerEmail: row.owner_user_id ? (emails.get(row.owner_user_id) ?? null) : null,
    createdAt: row.created_at,
  }));

  const q = filter.q?.trim().toLowerCase();
  return items.filter((item) => {
    if (filter.plan && item.plan !== filter.plan) return false;
    if (filter.status && item.status !== filter.status) return false;
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
  readonly status: BusinessStatus;
  readonly deletionRequestedAt: string | null;
  readonly createdAt: string;
  readonly counts: {
    readonly bookings: number;
    readonly staff: number;
    readonly members: number;
  };
  readonly lastActivityAt: string | null;
  readonly members: readonly BusinessMember[];
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
      status: BusinessStatus;
      deletion_requested_at: string | null;
      created_at: string;
    }>(
      `select id, name, slug, comuna, category, plan, plan_override_until,
              status, deletion_requested_at, created_at
         from public.businesses where id = $1`,
      [businessId],
    );
    const business = businessRes.rows[0];
    if (!business) return null;

    const [bookingsCount, staffCount, membersRes, lastActivity] =
      await Promise.all([
        q.query<{ n: string }>(
          `select count(*)::text as n from public.bookings where business_id = $1`,
          [businessId],
        ),
        q.query<{ n: string }>(
          `select count(*)::text as n from public.staff where business_id = $1`,
          [businessId],
        ),
        q.query<{ user_id: string; role: string }>(
          `select user_id, role from public.memberships
            where business_id = $1 order by created_at`,
          [businessId],
        ),
        q.query<{ last_at: string | null }>(
          `select max(created_at) as last_at from public.bookings where business_id = $1`,
          [businessId],
        ),
      ]);

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
    status: data.business.status,
    deletionRequestedAt: data.business.deletion_requested_at,
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
  };
}

export type AdminActionResult = { ok: true } | { ok: false; code: string };

export async function setPlan(
  adminUserId: string,
  businessId: string,
  plan: BusinessPlan,
  overrideUntil: string | null,
): Promise<AdminActionResult> {
  return withServiceTx(async (q) => {
    const r = await q.query(
      `update public.businesses set plan = $2, plan_override_until = $3 where id = $1`,
      [businessId, plan, overrideUntil],
    );
    if (!r.rowCount) return { ok: false, code: "not_found" };
    await writeAuditLog(q, {
      adminUserId,
      action: "set_plan",
      businessId,
      details: { plan, override_until: overrideUntil },
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
      const exists = await q.query(`select 1 from public.businesses where id = $1`, [
        businessId,
      ]);
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
      const exists = await q.query(`select 1 from public.businesses where id = $1`, [
        businessId,
      ]);
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
  if (userError || !userData.user?.email) return { ok: false, code: "not_found" };
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
  if (!email || !email.includes("@")) return { ok: false, code: "invalid_email" };

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
