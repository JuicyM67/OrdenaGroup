import "server-only";

import { z } from "zod";

import {
  RECORD_FIELD_KEYS,
  isRecordFieldKey,
  type FichaMutationResult,
  type RecordSettingsData,
} from "@/components/records/types";
import { hasPerm, loadMember } from "@/server/db/permissions";
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx } from "@/server/db/tx";
import { loadPlanIn, planCan } from "@/server/plans/entitlements";

/**
 * Ajustes → Ficha (WP-88, D-074): vilka fasta fält fichan visar och
 * consentimiento-mallarna med deras tjänster. Samma behörighet som övriga
 * företagsinställningar (`can_edit_settings`, ägaren alltid), i
 * `withOwnerTx` så att RLS också gäller; skrivning kräver planfunktionen
 * `records`. Versionen (sha256) räknas av databasen.
 */

const MAX_TEMPLATES = 30;

type Denied = Exclude<FichaMutationResult, { ok: true }>;

async function guard(
  q: Queryable,
  userId: string,
  businessId: string,
  write: boolean,
): Promise<Denied | null> {
  const member = await loadMember(q, userId, businessId);
  if (!member) return { ok: false, code: "unauthorized" };
  if (!hasPerm(member, "can_edit_settings")) {
    return { ok: false, code: "forbidden" };
  }
  if (write && !planCan(await loadPlanIn(q, businessId), "records")) {
    return { ok: false, code: "plan_locked" };
  }
  return null;
}

export async function loadRecordSettings(
  userId: string,
  businessId: string,
): Promise<RecordSettingsData | null> {
  return withOwnerTx(userId, async (q) => {
    if (await guard(q, userId, businessId, false)) return null;

    const biz = await q.query<{ record_fields: string[] }>(
      `select record_fields from public.businesses where id = $1`,
      [businessId],
    );
    const templates = await q.query<{
      id: string;
      title: string;
      body: string;
      active: boolean;
      service_ids: string[] | null;
    }>(
      `select ct.id, ct.title, ct.body, ct.active,
              array_remove(array_agg(sct.service_id order by sct.created_at), null) as service_ids
         from public.consent_templates ct
         left join public.service_consent_templates sct
           on sct.business_id = ct.business_id and sct.template_id = ct.id
        where ct.business_id = $1
        group by ct.id
        order by ct.active desc, ct.created_at, ct.id`,
      [businessId],
    );
    const services = await q.query<{
      id: string;
      name: string;
      active: boolean;
    }>(
      `select id, name, active from public.services
        where business_id = $1
        order by active desc, name`,
      [businessId],
    );
    return {
      fields: (biz.rows[0]?.record_fields ?? []).filter(isRecordFieldKey),
      templates: templates.rows.map((t) => ({
        id: t.id,
        title: t.title,
        body: t.body,
        active: t.active,
        serviceIds: t.service_ids ?? [],
      })),
      services: services.rows,
    };
  });
}

const fieldsSchema = z
  .array(z.enum(RECORD_FIELD_KEYS))
  .max(RECORD_FIELD_KEYS.length);

export async function saveRecordFieldSettings(
  userId: string,
  businessId: string,
  raw: unknown,
): Promise<FichaMutationResult> {
  const parsed = fieldsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  // Fast ordning och inga dubbletter (samma regel som databasens check).
  const fields = RECORD_FIELD_KEYS.filter((k) => parsed.data.includes(k));
  return withOwnerTx(userId, async (q) => {
    const denied = await guard(q, userId, businessId, true);
    if (denied) return denied;
    await q.query(
      `update public.businesses set record_fields = $2::text[] where id = $1`,
      [businessId, fields],
    );
    return { ok: true };
  });
}

const templateSchema = z.strictObject({
  id: z.guid().nullable(),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(20000),
  active: z.boolean(),
  serviceIds: z.array(z.guid()).max(200),
});

export async function saveConsentTemplate(
  userId: string,
  businessId: string,
  raw: unknown,
): Promise<FichaMutationResult | { ok: false; code: "limit" }> {
  const parsed = templateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  const input = parsed.data;
  return withOwnerTx(userId, async (q) => {
    const denied = await guard(q, userId, businessId, true);
    if (denied) return denied;

    let templateId = input.id;
    if (templateId) {
      const r = await q.query(
        `update public.consent_templates
            set title = $3, body = $4, active = $5
          where business_id = $1 and id = $2`,
        [businessId, templateId, input.title, input.body, input.active],
      );
      if (!r.rowCount) return { ok: false, code: "not_found" };
    } else {
      const n = await q.query<{ n: number }>(
        `select count(*)::int as n from public.consent_templates where business_id = $1`,
        [businessId],
      );
      if ((n.rows[0]?.n ?? 0) >= MAX_TEMPLATES) {
        return { ok: false, code: "limit" };
      }
      const ins = await q.query<{ id: string }>(
        `insert into public.consent_templates (business_id, title, body, active)
         values ($1, $2, $3, $4) returning id`,
        [businessId, input.title, input.body, input.active],
      );
      templateId = ins.rows[0]?.id ?? null;
      if (!templateId) return { ok: false, code: "unexpected" };
    }

    // Tjänsterna: bara företagets egna (sammansatt FK nekar annars ändå).
    const wanted = [...new Set(input.serviceIds)];
    const own = await q.query<{ id: string }>(
      `select id from public.services where business_id = $1 and id = any($2::uuid[])`,
      [businessId, wanted],
    );
    const ownIds = own.rows.map((r) => r.id);
    await q.query(
      `delete from public.service_consent_templates
        where business_id = $1 and template_id = $2
          and not (service_id = any($3::uuid[]))`,
      [businessId, templateId, ownIds],
    );
    await q.query(
      `insert into public.service_consent_templates (business_id, service_id, template_id)
       select $1, s, $2 from unnest($3::uuid[]) s
       on conflict do nothing`,
      [businessId, templateId, ownIds],
    );
    return { ok: true };
  });
}
