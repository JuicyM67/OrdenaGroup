import "server-only";

import { formatAdminDateTime } from "@/components/admin/admin-dates";
import { brand } from "@/config/brand";
import { fichaAtencion } from "@/i18n";
import { withServiceTx } from "@/server/db/tx";
import { ownerDenial } from "@/server/privacy/authz";

/**
 * WP-91 (D-077): fichan som en läsbar fil att spara. Företaget ansvarar för
 * att spara ficha clínica i minst 15 år (Ley 20.584, art. 13; Términos,
 * "Fichas y datos de salud"); JSON-exporten är komplett men går inte att
 * läsa. Den här filen är fristående HTML (inga externa resurser) som går
 * att öppna i vilken webbläsare som helst och spara som PDF med "Imprimir".
 *
 * Bara ägaren (samma regel som företagsexporten, `ownerDenial`). Läses med
 * service role efter kontrollen, som `exportBusiness`. Innehållet loggas
 * aldrig.
 */

const t = fichaAtencion.archivo;

export type FichasExportResult =
  | { ok: true; filename: string; html: string; patients: number }
  | { ok: false; code: string };

type Customer = {
  id: string;
  name: string | null;
  phone_e164: string | null;
  email: string | null;
  created_at: string;
};
type RecordRow = {
  customer_id: string;
  allergies: string | null;
  contraindications: string | null;
  observations: string | null;
  updated_at: string;
};
type EntryRow = {
  customer_id: string;
  body: string;
  created_at: string;
  author_name: string | null;
  service_name: string | null;
  booking_start: string | null;
  voided_at: string | null;
  void_reason: string | null;
  voider_name: string | null;
};
type ConsentRow = {
  customer_id: string;
  created_at: string;
  source: string | null;
  version: string;
  title: string | null;
  body: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function multiline(s: string): string {
  return esc(s).replaceAll("\n", "<br>");
}

function sourceText(s: string | null): string {
  if (s === "manage_link") return t.origen.manage_link;
  if (s === "in_person") return t.origen.in_person;
  return t.origen.booking;
}

export async function exportFichasHtml(
  userId: string,
  businessId: string,
  customerId: string | null,
  now: Date = new Date(),
): Promise<FichasExportResult> {
  if (customerId !== null && !UUID.test(customerId)) {
    return { ok: false, code: "invalid_input" };
  }
  return withServiceTx(async (q) => {
    const denied = await ownerDenial(q, userId, businessId);
    if (denied) return { ok: false, code: denied };

    const biz = await q.query<{ name: string; slug: string }>(
      `select name, slug from public.businesses where id = $1`,
      [businessId],
    );
    const business = biz.rows[0];
    if (!business) return { ok: false, code: "not_found" };

    // Kunder som har en ficha: anteckning, fast fält eller consentimiento.
    const customers = await q.query<Customer>(
      `select c.id, c.name, c.phone_e164, c.email, c.created_at
         from public.customers c
        where c.business_id = $1
          and c.anonymized_at is null
          and ($2::uuid is null or c.id = $2::uuid)
          and (exists (select 1 from public.customer_record_entries e
                        where e.business_id = c.business_id and e.customer_id = c.id)
               or exists (select 1 from public.customer_records r
                           where r.business_id = c.business_id and r.customer_id = c.id)
               or exists (select 1 from public.consent_events ce
                           where ce.business_id = c.business_id and ce.customer_id = c.id
                             and ce.kind = 'informed'))
        order by c.name nulls last, c.created_at`,
      [businessId, customerId],
    );
    if (customerId !== null && customers.rows.length === 0) {
      return { ok: false, code: "not_found" };
    }
    const ids = customers.rows.map((c) => c.id);

    const records = await q.query<RecordRow>(
      `select customer_id, allergies, contraindications, observations, updated_at
         from public.customer_records
        where business_id = $1 and customer_id = any($2::uuid[])`,
      [businessId, ids],
    );
    const entries = await q.query<EntryRow>(
      `select e.customer_id, e.body, e.created_at, st.name as author_name,
              sv.name as service_name, lower(bk.period) as booking_start,
              e.voided_at, e.void_reason, vst.name as voider_name
         from public.customer_record_entries e
         left join public.staff st
           on st.business_id = e.business_id and st.id = e.author_staff_id
         left join public.bookings bk
           on bk.business_id = e.business_id and bk.id = e.booking_id
         left join public.services sv
           on sv.business_id = bk.business_id and sv.id = bk.service_id
         left join public.memberships vm
           on vm.business_id = e.business_id and vm.user_id = e.voided_by
         left join public.staff vst
           on vst.business_id = vm.business_id and vst.id = vm.staff_id
        where e.business_id = $1 and e.customer_id = any($2::uuid[])
        order by e.created_at`,
      [businessId, ids],
    );
    const consents = await q.query<ConsentRow>(
      `select ce.customer_id, ce.created_at, ce.source, ce.version,
              v.title, v.body
         from public.consent_events ce
         left join public.consent_template_versions v
           on v.business_id = ce.business_id
          and v.template_id = ce.consent_template_id
          and v.version = ce.version
        where ce.business_id = $1 and ce.customer_id = any($2::uuid[])
          and ce.kind = 'informed' and ce.granted
        order by ce.created_at`,
      [businessId, ids],
    );

    const html = renderFichasHtml({
      negocio: business.name,
      generado: formatAdminDateTime(now),
      customers: customers.rows,
      records: records.rows,
      entries: entries.rows,
      consents: consents.rows,
    });
    const day = now.toISOString().slice(0, 10);
    const filename =
      customerId === null
        ? `fichas-${business.slug}-${day}.html`
        : `ficha-${business.slug}-${day}.html`;
    return { ok: true, filename, html, patients: customers.rows.length };
  });
}

function dt(v: string | Date): string {
  return formatAdminDateTime(v);
}

export function renderFichasHtml(input: {
  negocio: string;
  generado: string;
  customers: readonly Customer[];
  records: readonly RecordRow[];
  entries: readonly EntryRow[];
  consents: readonly ConsentRow[];
}): string {
  const sections = input.customers.map((c) => {
    const rec = input.records.find((r) => r.customer_id === c.id);
    const fields = rec
      ? (
          [
            [t.campos.allergies, rec.allergies],
            [t.campos.contraindications, rec.contraindications],
            [t.campos.observations, rec.observations],
          ] as const
        )
          .filter(([, v]) => v && v.trim() !== "")
          .map(
            ([k, v]) =>
              `<tr><th>${esc(k)}</th><td>${multiline(v ?? "")}</td></tr>`,
          )
          .join("")
      : "";
    const entries = input.entries
      .filter((e) => e.customer_id === c.id)
      .map((e) => {
        const meta = [
          dt(e.created_at),
          t.por({ autor: e.author_name ?? t.equipo }),
          e.service_name && e.booking_start
            ? `${e.service_name}, ${dt(e.booking_start)}`
            : null,
        ]
          .filter(Boolean)
          .map((x) => esc(String(x)))
          .join(" · ");
        const voided =
          e.voided_at && e.void_reason
            ? `<p class="void">${esc(
                t.anulada({
                  fecha: dt(e.voided_at),
                  autor: e.voider_name ?? t.equipo,
                  motivo: e.void_reason,
                }),
              )}</p>`
            : "";
        return `<div class="entry${e.voided_at ? " voided" : ""}"><p class="meta">${meta}</p><p class="body">${multiline(e.body)}</p>${voided}</div>`;
      })
      .join("");
    const consents = input.consents
      .filter((x) => x.customer_id === c.id)
      .map(
        (x) =>
          `<div class="entry"><p class="meta">${esc(
            t.consentimiento({
              titulo: x.title ?? t.sinTitulo,
              fecha: dt(x.created_at),
              origen: sourceText(x.source),
              version: x.version.slice(0, 12),
            }),
          )}</p>${x.body ? `<p class="body">${multiline(x.body)}</p>` : ""}</div>`,
      )
      .join("");
    const contact = [c.phone_e164, c.email]
      .filter(Boolean)
      .map((x) => esc(String(x)))
      .join(" · ");
    return `<section class="patient">
<h2>${esc(c.name ?? t.sinNombre)}</h2>
<p class="meta">${contact ? `${contact} · ` : ""}${esc(t.clienteDesde({ fecha: dt(c.created_at) }))}</p>
${fields ? `<h3>${esc(t.datos)}</h3><table>${fields}</table>` : ""}
<h3>${esc(t.notas)}</h3>
${entries || `<p class="empty">${esc(t.sinNotas)}</p>`}
<h3>${esc(t.consentimientos)}</h3>
${consents || `<p class="empty">${esc(t.sinConsentimientos)}</p>`}
</section>`;
  });

  return `<!doctype html>
<html lang="es-CL">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.titulo({ negocio: input.negocio }))}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;color:#16161A;background:#fff;margin:0 auto;max-width:820px;padding:32px 24px;line-height:1.45;font-size:14px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:20px;margin:0 0 4px}h3{font-size:15px;margin:20px 0 8px;border-bottom:1px solid #E2E2DC;padding-bottom:4px}
.meta{color:#3E3E46;font-size:12px;margin:0 0 4px}.notice{background:#F4F4F0;border-radius:8px;padding:12px 16px;font-size:13px;margin:16px 0 24px}
.patient{border-top:2px solid #16161A;padding-top:16px;margin-top:32px;break-before:page;page-break-before:always}
.patient:first-of-type{break-before:auto;page-break-before:auto}
table{border-collapse:collapse;width:100%}th{text-align:left;width:30%;vertical-align:top;padding:4px 8px 4px 0;font-weight:600}td{padding:4px 0}
.entry{margin:0 0 12px}.body{margin:0;white-space:normal}.voided .body{text-decoration:line-through;color:#6B6B74}.void{font-size:12px;color:#A33814;margin:2px 0 0}
.empty{color:#6B6B74;font-size:13px}
</style>
</head>
<body>
<h1>${esc(t.titulo({ negocio: input.negocio }))}</h1>
<p class="meta">${esc(t.generado({ fecha: input.generado, n: input.customers.length }))}</p>
<div class="notice">${esc(t.aviso({ marca: brand.name }))}</div>
${sections.join("\n") || `<p class="empty">${esc(t.vacio)}</p>`}
</body>
</html>
`;
}
