import "server-only";

import { createHash, randomBytes } from "node:crypto";

import type { PublicConsent } from "@/components/booking/types";
import type { Queryable } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";
import { loadPlanIn, planCan } from "@/server/plans/entitlements";

/**
 * Consentimiento informado från kundens håll (WP-88, D-074): vilka mallar en
 * tjänst kräver, kontroll av kundens godkännande vid bokning, loggning i den
 * append-only `consent_events` (kind `informed`, version = mallens sha256) och
 * engångslänken för att signera i salongen. Körs som `service_role`
 * (kunden har ingen session); varje fråga filtrerar på en betrodd
 * `businessId`. Inget innehåll eller token loggas.
 */

export type ConsentSource = "booking" | "manage_link" | "in_person";

export type AcceptedConsent = { templateId: string; version: string };

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Hur länge en signeringslänk från fichan gäller. */
export const SIGNING_LINK_TTL_MS = 2 * 60 * 60 * 1000;

/** Aktiva mallar per tjänst. Tomt utan planfunktionen `records` (D-048:
 * en nedgradering pausar kravet, inget raderas). */
export async function loadServiceConsentsIn(
  q: Queryable,
  businessId: string,
  serviceIds: readonly string[],
): Promise<Record<string, PublicConsent[]>> {
  const out: Record<string, PublicConsent[]> = {};
  // Klientstyrt id (bokningsformuläret): bara guid-format når SQL:en.
  const ids = serviceIds.filter((id) => GUID.test(id));
  if (ids.length === 0) return out;
  if (!planCan(await loadPlanIn(q, businessId), "records")) return out;
  const r = await q.query<{
    service_id: string;
    id: string;
    title: string;
    body: string;
    version: string;
  }>(
    `select sct.service_id, ct.id, ct.title, ct.body, ct.version
       from public.service_consent_templates sct
       join public.consent_templates ct
         on ct.business_id = sct.business_id and ct.id = sct.template_id
      where sct.business_id = $1
        and sct.service_id = any($2::uuid[])
        and ct.active
      order by ct.created_at, ct.id`,
    [businessId, ids],
  );
  for (const row of r.rows) {
    (out[row.service_id] ??= []).push({
      templateId: row.id,
      title: row.title,
      body: row.body,
      version: row.version,
    });
  }
  return out;
}

/**
 * Bokningen på `/[slug]`: varje mall tjänsten kräver måste vara godkänd i
 * sin AKTUELLA version (ändrade ägaren texten medan formuläret var öppet
 * nekas bokningen, kunden laddar om och läser den nya texten). Returnerar
 * de godkännanden som ska loggas efter bokningen.
 */
export async function checkInformedConsents(
  businessId: string,
  serviceId: string,
  accepted: readonly AcceptedConsent[],
): Promise<{ ok: true; toRecord: AcceptedConsent[] } | { ok: false }> {
  return withServiceTx(async (q) => {
    const required =
      (await loadServiceConsentsIn(q, businessId, [serviceId]))[serviceId] ??
      [];
    const toRecord: AcceptedConsent[] = [];
    for (const c of required) {
      const hit = accepted.find(
        (a) => a.templateId === c.templateId && a.version === c.version,
      );
      if (!hit) return { ok: false };
      toRecord.push({ templateId: c.templateId, version: c.version });
    }
    return { ok: true, toRecord };
  });
}

/** En rad per godkänd mall. Idempotent per (kund, mall, version, bokning):
 * ett omförsök av samma bokning loggar inte en gång till. */
export async function recordInformedConsentsIn(
  q: Queryable,
  input: {
    businessId: string;
    customerId: string;
    bookingId: string | null;
    items: readonly AcceptedConsent[];
    source: ConsentSource;
  },
): Promise<void> {
  for (const item of input.items) {
    await q.query(
      `insert into public.consent_events
         (business_id, customer_id, subject, kind, version, channel, granted,
          consent_template_id, booking_id, source)
       select $1, $2, 'customer', 'informed', $3, 'web', true, $4, $5, $6
        where not exists (
          select 1 from public.consent_events
           where business_id = $1 and customer_id = $2
             and consent_template_id = $4 and version = $3
             and booking_id is not distinct from $5::uuid
             and source is not null
        )`,
      [
        input.businessId,
        input.customerId,
        item.version,
        item.templateId,
        input.bookingId,
        input.source,
      ],
    );
  }
}

export async function recordInformedConsents(input: {
  businessId: string;
  customerId: string;
  bookingId: string | null;
  items: readonly AcceptedConsent[];
  source: ConsentSource;
}): Promise<void> {
  if (input.items.length === 0) return;
  await withServiceTx((q) => recordInformedConsentsIn(q, input));
}

/** Mallar som tjänsten kräver och som kunden inte godkänt i aktuell version. */
export async function pendingConsentsForCustomerIn(
  q: Queryable,
  businessId: string,
  customerId: string,
  serviceId: string,
): Promise<PublicConsent[]> {
  const required =
    (await loadServiceConsentsIn(q, businessId, [serviceId]))[serviceId] ?? [];
  if (required.length === 0) return [];
  const done = await q.query<{ consent_template_id: string; version: string }>(
    `select consent_template_id, version from public.consent_events
      where business_id = $1 and customer_id = $2 and source is not null
        and granted and consent_template_id is not null`,
    [businessId, customerId],
  );
  const accepted = new Set(
    done.rows.map((d) => `${d.consent_template_id}:${d.version}`),
  );
  return required.filter((c) => !accepted.has(`${c.templateId}:${c.version}`));
}

// ---------------------------------------------------------------------------
// Engångslänk för att signera i salongen (`/r/firma/[token]`)
// ---------------------------------------------------------------------------

export function hashSigningToken(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}

export function createSigningToken(): { token: string; hash: Buffer } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashSigningToken(token) };
}

/** Samma format som `createSigningToken` (43 tecken base64url). */
export function isSigningTokenFormat(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export type SigningView =
  | {
      status: "open";
      businessName: string;
      consent: PublicConsent;
    }
  | { status: "done"; businessName: string }
  | { status: "invalid" };

type LinkRow = {
  id: string;
  business_id: string;
  customer_id: string;
  template_id: string;
  booking_id: string | null;
  expires_at: Date;
  used_at: Date | null;
};

/** Uppslag på bara hashen (unik) — token är det enda kunden har. All vidare
 * SQL filtrerar på länkens `business_id`. */
async function linkForToken(
  q: Queryable,
  token: string,
  lock: boolean,
): Promise<LinkRow | null> {
  if (!isSigningTokenFormat(token)) return null;
  const r = await q.query<LinkRow>(
    `select id, business_id, customer_id, template_id, booking_id, expires_at, used_at
       from public.consent_signing_links
      where token_hash = $1${lock ? " for update" : ""}`,
    [hashSigningToken(token)],
  );
  return r.rows[0] ?? null;
}

async function templateIn(
  q: Queryable,
  businessId: string,
  templateId: string,
): Promise<(PublicConsent & { active: boolean; businessName: string }) | null> {
  const r = await q.query<{
    id: string;
    title: string;
    body: string;
    version: string;
    active: boolean;
    business_name: string;
  }>(
    `select ct.id, ct.title, ct.body, ct.version, ct.active, b.name as business_name
       from public.consent_templates ct
       join public.businesses b on b.id = ct.business_id
      where ct.business_id = $1 and b.id = $1 and ct.id = $2`,
    [businessId, templateId],
  );
  const row = r.rows[0];
  if (!row) return null;
  return {
    templateId: row.id,
    title: row.title,
    body: row.body,
    version: row.version,
    active: row.active,
    businessName: row.business_name,
  };
}

export async function loadSigningLink(
  token: string,
  now: Date,
): Promise<SigningView> {
  return withServiceTx(async (q) => {
    const link = await linkForToken(q, token, false);
    if (!link) return { status: "invalid" };
    const t = await templateIn(q, link.business_id, link.template_id);
    if (!t) return { status: "invalid" };
    if (link.used_at) return { status: "done", businessName: t.businessName };
    if (link.expires_at.getTime() <= now.getTime() || !t.active) {
      return { status: "invalid" };
    }
    return {
      status: "open",
      businessName: t.businessName,
      consent: {
        templateId: t.templateId,
        title: t.title,
        body: t.body,
        version: t.version,
      },
    };
  });
}

export type AcceptResult =
  { ok: true } | { ok: false; code: "invalid" | "outdated" };

/** Kunden godkänner via engångslänken. Länken förbrukas i samma transaktion. */
export async function acceptSigningLink(
  token: string,
  version: string,
  now: Date,
): Promise<AcceptResult> {
  return withServiceTx(async (q) => {
    const link = await linkForToken(q, token, true);
    if (!link || link.used_at || link.expires_at.getTime() <= now.getTime()) {
      return { ok: false, code: "invalid" };
    }
    const t = await templateIn(q, link.business_id, link.template_id);
    if (!t || !t.active) return { ok: false, code: "invalid" };
    if (t.version !== version) return { ok: false, code: "outdated" };
    const customer = await q.query(
      `select 1 from public.customers
        where business_id = $1 and id = $2 and anonymized_at is null`,
      [link.business_id, link.customer_id],
    );
    if (customer.rows.length === 0) return { ok: false, code: "invalid" };
    await recordInformedConsentsIn(q, {
      businessId: link.business_id,
      customerId: link.customer_id,
      bookingId: link.booking_id,
      items: [{ templateId: t.templateId, version: t.version }],
      source: "in_person",
    });
    await q.query(
      `update public.consent_signing_links set used_at = now()
        where business_id = $1 and id = $2`,
      [link.business_id, link.id],
    );
    return { ok: true };
  });
}
