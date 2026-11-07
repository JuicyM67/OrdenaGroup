import "server-only";

import { z } from "zod";

import {
  RECORD_FIELD_KEYS,
  isRecordFieldKey,
  type ConsentSourceKey,
  type FichaBookingOption,
  type FichaData,
  type FichaMutationResult,
  type RecordFieldKey,
  type SigningLinkResult,
} from "@/components/records/types";
import { hasPerm, loadMember, type Member } from "@/server/db/permissions";
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx, withServiceTx } from "@/server/db/tx";
import { loadPlanIn, planCan } from "@/server/plans/entitlements";

import { createSigningToken, SIGNING_LINK_TTL_MS } from "./public-consent";

/**
 * Fichan i kundkortet (WP-88, D-074). Känsliga uppgifter (Ley 21.719):
 * - Läsning och skrivning i `withOwnerTx` (`authenticated`, RLS gäller:
 *   `private.has_perm(business_id, 'can_view_records')`) OCH samma kontroll i
 *   TypeScript, så att recepción utan behörigheten får `forbidden` i stället
 *   för en tom ficha.
 * - Skrivning kräver planfunktionen `records` (även i RLS).
 * - Inget innehåll loggas och inget skickas via `message_outbox`.
 */

const FIELD_MAX = 1000;
const ENTRY_MAX = 4000;

type Denied = Exclude<FichaMutationResult, { ok: true }>;

function denial(member: Member | null): Denied | null {
  if (!member) return { ok: false, code: "unauthorized" };
  if (!hasPerm(member, "can_view_records")) {
    return { ok: false, code: "forbidden" };
  }
  return null;
}

async function customerExistsIn(
  q: Queryable,
  businessId: string,
  customerId: string,
): Promise<{ name: string } | null> {
  const r = await q.query<{ name: string | null }>(
    `select name from public.customers
      where business_id = $1 and id = $2 and anonymized_at is null`,
    [businessId, customerId],
  );
  const row = r.rows[0];
  return row ? { name: row.name ?? "" } : null;
}

function shortVersion(v: string): string {
  return v.slice(0, 8);
}

function toSource(v: string): ConsentSourceKey {
  return v === "manage_link" || v === "in_person" ? v : "booking";
}

export type LoadFichaResult =
  | { ok: true; data: FichaData }
  | { ok: false; code: "unauthorized" | "forbidden" | "not_found" };

export async function loadFicha(
  userId: string,
  businessId: string,
  customerId: string,
): Promise<LoadFichaResult> {
  return withOwnerTx(userId, async (q) => {
    const member = await loadMember(q, userId, businessId);
    const denied = denial(member);
    if (denied) return { ok: false, code: denied.code as "forbidden" };

    const customer = await customerExistsIn(q, businessId, customerId);
    if (!customer) return { ok: false, code: "not_found" };

    const plan = await loadPlanIn(q, businessId);

    const biz = await q.query<{ record_fields: string[] }>(
      `select record_fields from public.businesses where id = $1`,
      [businessId],
    );
    const fields = (biz.rows[0]?.record_fields ?? []).filter(isRecordFieldKey);

    const rec = await q.query<{
      allergies: string | null;
      contraindications: string | null;
      observations: string | null;
      updated_at: Date;
    }>(
      `select allergies, contraindications, observations, updated_at
         from public.customer_records
        where business_id = $1 and customer_id = $2`,
      [businessId, customerId],
    );
    const r0 = rec.rows[0];

    const bookingsRes = await q.query<{
      id: string;
      service_name: string;
      start_at: Date;
    }>(
      `select bk.id, sv.name as service_name, lower(bk.period) as start_at
         from public.bookings bk
         join public.services sv
           on sv.business_id = bk.business_id and sv.id = bk.service_id
        where bk.business_id = $1 and bk.customer_id = $2
          and bk.status not in ('cancelled')
        order by lower(bk.period) desc
        limit 30`,
      [businessId, customerId],
    );
    const bookings: FichaBookingOption[] = bookingsRes.rows.map((b) => ({
      id: b.id,
      serviceName: b.service_name,
      start: b.start_at.toISOString(),
    }));

    const entriesRes = await q.query<{
      id: string;
      body: string;
      created_at: Date;
      author_user_id: string | null;
      author_name: string | null;
      booking_id: string | null;
      service_name: string | null;
      booking_start: Date | null;
    }>(
      `select e.id, e.body, e.created_at, e.author_user_id,
              st.name as author_name, e.booking_id,
              sv.name as service_name, lower(bk.period) as booking_start
         from public.customer_record_entries e
         left join public.staff st
           on st.business_id = e.business_id and st.id = e.author_staff_id
         left join public.bookings bk
           on bk.business_id = e.business_id and bk.id = e.booking_id
         left join public.services sv
           on sv.business_id = bk.business_id and sv.id = bk.service_id
        where e.business_id = $1 and e.customer_id = $2
        order by e.created_at desc
        limit 200`,
      [businessId, customerId],
    );
    const isOwner = member?.role === "owner";

    const consentsRes = await q.query<{
      id: string;
      title: string;
      active: boolean;
      version: string;
      acc_version: string | null;
      acc_at: Date | null;
      acc_source: string | null;
    }>(
      `select ct.id, ct.title, ct.active, ct.version,
              ce.version as acc_version, ce.created_at as acc_at, ce.source as acc_source
         from public.consent_templates ct
         left join lateral (
           select version, created_at, source
             from public.consent_events
            where business_id = ct.business_id
              and customer_id = $2
              and consent_template_id = ct.id
              and source is not null
              and granted
            order by created_at desc
            limit 1
         ) ce on true
        where ct.business_id = $1 and (ct.active or ce.version is not null)
        order by ct.created_at, ct.id`,
      [businessId, customerId],
    );

    const values = {} as Record<RecordFieldKey, string>;
    for (const k of RECORD_FIELD_KEYS) values[k] = r0?.[k] ?? "";

    return {
      ok: true,
      data: {
        customer: { id: customerId, name: customer.name },
        fields,
        values,
        valuesUpdatedAt: r0 ? r0.updated_at.toISOString() : null,
        entries: entriesRes.rows.map((e) => ({
          id: e.id,
          body: e.body,
          createdAt: e.created_at.toISOString(),
          authorName: e.author_name,
          canDelete: isOwner || e.author_user_id === userId,
          booking:
            e.booking_id && e.service_name && e.booking_start
              ? {
                  id: e.booking_id,
                  serviceName: e.service_name,
                  start: e.booking_start.toISOString(),
                }
              : null,
        })),
        consents: consentsRes.rows.map((c) => ({
          templateId: c.id,
          title: c.title,
          active: c.active,
          currentVersion: shortVersion(c.version),
          accepted:
            c.acc_version && c.acc_at
              ? {
                  version: shortVersion(c.acc_version),
                  at: c.acc_at.toISOString(),
                  source: toSource(c.acc_source ?? ""),
                  isCurrent: c.acc_version === c.version,
                }
              : null,
        })),
        bookings,
        canWrite: planCan(plan, "records"),
      },
    };
  });
}

/** Gemensam inledning för skrivningar: medlem + behörighet + plan + kund. */
async function writeGuard(
  q: Queryable,
  userId: string,
  businessId: string,
  customerId: string,
): Promise<{ member: Member } | Denied> {
  const member = await loadMember(q, userId, businessId);
  const denied = denial(member);
  if (denied) return denied;
  if (!planCan(await loadPlanIn(q, businessId), "records")) {
    return { ok: false, code: "plan_locked" };
  }
  if (!(await customerExistsIn(q, businessId, customerId))) {
    return { ok: false, code: "not_found" };
  }
  return { member: member! };
}

const fieldsSchema = z.strictObject({
  allergies: z.string().max(FIELD_MAX).optional(),
  contraindications: z.string().max(FIELD_MAX).optional(),
  observations: z.string().max(FIELD_MAX).optional(),
});

export async function saveRecordFields(
  userId: string,
  businessId: string,
  customerId: string,
  raw: unknown,
): Promise<FichaMutationResult> {
  const parsed = fieldsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  return withOwnerTx(userId, async (q) => {
    const g = await writeGuard(q, userId, businessId, customerId);
    if ("ok" in g) return g;

    const cur = await q.query<Record<RecordFieldKey, string | null>>(
      `select allergies, contraindications, observations
         from public.customer_records
        where business_id = $1 and customer_id = $2`,
      [businessId, customerId],
    );
    const next = {} as Record<RecordFieldKey, string | null>;
    for (const k of RECORD_FIELD_KEYS) {
      const v = parsed.data[k];
      next[k] = v === undefined ? (cur.rows[0]?.[k] ?? null) : v.trim() || null;
    }

    await q.query(
      `insert into public.customer_records
         (business_id, customer_id, allergies, contraindications, observations, updated_at, updated_by)
       values ($1, $2, $3, $4, $5, now(), $6)
       on conflict (business_id, customer_id) do update
         set allergies = excluded.allergies,
             contraindications = excluded.contraindications,
             observations = excluded.observations,
             updated_at = now(),
             updated_by = excluded.updated_by`,
      [
        businessId,
        customerId,
        next.allergies,
        next.contraindications,
        next.observations,
        userId,
      ],
    );
    return { ok: true };
  });
}

const entrySchema = z.strictObject({
  body: z.string().trim().min(1).max(ENTRY_MAX),
  bookingId: z.guid().nullable(),
});

export async function addRecordEntry(
  userId: string,
  businessId: string,
  customerId: string,
  raw: unknown,
): Promise<FichaMutationResult> {
  const parsed = entrySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  return withOwnerTx(userId, async (q) => {
    const g = await writeGuard(q, userId, businessId, customerId);
    if ("ok" in g) return g;

    if (parsed.data.bookingId) {
      const bk = await q.query(
        `select 1 from public.bookings
          where business_id = $1 and id = $2 and customer_id = $3`,
        [businessId, parsed.data.bookingId, customerId],
      );
      if (bk.rows.length === 0) return { ok: false, code: "invalid_input" };
    }

    await q.query(
      `insert into public.customer_record_entries
         (business_id, customer_id, booking_id, body, author_user_id, author_staff_id)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        businessId,
        customerId,
        parsed.data.bookingId,
        parsed.data.body,
        userId,
        g.member.staffId,
      ],
    );
    return { ok: true };
  });
}

export async function deleteRecordEntry(
  userId: string,
  businessId: string,
  customerId: string,
  entryId: string,
): Promise<FichaMutationResult> {
  if (!z.guid().safeParse(entryId).success) {
    return { ok: false, code: "invalid_input" };
  }
  return withOwnerTx(userId, async (q) => {
    const member = await loadMember(q, userId, businessId);
    const denied = denial(member);
    if (denied) return denied;
    // RLS: bara författaren eller ägaren (policyn "delete customer_record_entries").
    const r = await q.query(
      `delete from public.customer_record_entries
        where business_id = $1 and customer_id = $2 and id = $3
          and (author_user_id = $4 or $5)`,
      [businessId, customerId, entryId, userId, member?.role === "owner"],
    );
    return r.rowCount ? { ok: true } : { ok: false, code: "not_found" };
  });
}

const signingSchema = z.strictObject({
  templateId: z.guid(),
  bookingId: z.guid().nullable(),
});

/**
 * Engångslänk för att signera i salongen. Tabellen är bara serverns
 * (ingen grant till `authenticated`), så kontrollen görs här i samma
 * `withServiceTx` som insättningen — samma mönster som `src/server/privacy/`.
 * Bara hashen sparas; klartexten returneras en gång till personalen.
 */
export async function createSigningLink(
  userId: string,
  businessId: string,
  customerId: string,
  raw: unknown,
  now: Date,
): Promise<SigningLinkResult> {
  const parsed = signingSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  return withServiceTx(async (q) => {
    const g = await writeGuard(q, userId, businessId, customerId);
    if ("ok" in g) return g;

    const t = await q.query(
      `select 1 from public.consent_templates
        where business_id = $1 and id = $2 and active`,
      [businessId, parsed.data.templateId],
    );
    if (t.rows.length === 0) return { ok: false, code: "not_found" };

    if (parsed.data.bookingId) {
      const bk = await q.query(
        `select 1 from public.bookings
          where business_id = $1 and id = $2 and customer_id = $3`,
        [businessId, parsed.data.bookingId, customerId],
      );
      if (bk.rows.length === 0) return { ok: false, code: "invalid_input" };
    }

    const { token, hash } = createSigningToken();
    await q.query(
      `insert into public.consent_signing_links
         (business_id, customer_id, template_id, booking_id, token_hash, created_by, expires_at)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        businessId,
        customerId,
        parsed.data.templateId,
        parsed.data.bookingId,
        hash,
        userId,
        new Date(now.getTime() + SIGNING_LINK_TTL_MS).toISOString(),
      ],
    );
    return { ok: true, path: `/r/firma/${token}` };
  });
}
