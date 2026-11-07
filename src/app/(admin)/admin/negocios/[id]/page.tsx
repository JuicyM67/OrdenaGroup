// /admin/negocios/[id]: företagsdetalj med alla åtgärder (F19/WP-36). Svensk
// text (bara ägaren använder ytan); nya texter via `adminPanel` (es-CL).
// WP-84 (D-069): omgjord layout (port av SE WP-90/91/93/94) — "Rubro y
// ubicación", importen åt företaget och "Borrar ahora". Facturación manual,
// planöverstyrning och medlemmarnas åtgärder ligger kvar.
import { ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { BillingForm } from "@/components/admin/billing-form";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { DeleteNowButton } from "@/components/admin/delete-now-button";
import { MemberActions } from "@/components/admin/member-actions";
import { AdminPlaceForm } from "@/components/admin/place-form";
import { PlanForm } from "@/components/admin/plan-form";
import { ImportSection } from "@/components/settings/import-section";
import { adminPanel, planes } from "@/i18n";
import { listAuditLog } from "@/server/admin/audit";
import { requireAdminPage } from "@/server/admin/auth";
import { getAdminBusinessPlace } from "@/server/admin/business-place";
import { getBusinessDetail } from "@/server/admin/businesses";
import { adminExistingNames } from "@/server/admin/import";
import { platformNames } from "@/server/import/platforms";
import { isImportEnabled } from "@/server/import/runs";

import {
  adminImportAction,
  cancelDeletionAction,
  changeEmailAction,
  deleteNowAction,
  freezeAction,
  requestDeletionAction,
  sendLoginLinkAction,
  setBillingModeAction,
  setBusinessPlaceAction,
  setPlanAction,
  unfreezeAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminBusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;

  const [business, log, place] = await Promise.all([
    getBusinessDetail(id),
    listAuditLog({ businessId: id }),
    getAdminBusinessPlace(id),
  ]);
  if (!business || !place) notFound();
  const existing = await adminExistingNames(id);

  return (
    <AdminShell
      active="negocios"
      back={{ href: "/admin", label: adminPanel.nav.volver }}
      title={business.name}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <span>/{business.slug}</span>
          <span className="rounded-full bg-surface px-3 py-1 text-12 font-semibold text-ink">
            {planes.nombres[business.plan]}
          </span>
          {business.status === "frozen" ? (
            <span className="rounded-full bg-alert-bg px-3 py-1 text-12 font-semibold text-alert-fg">
              {adminPanel.lista.congelado}
            </span>
          ) : (
            <span className="rounded-full bg-success-bg px-3 py-1 text-12 font-semibold text-success-fg">
              {adminPanel.lista.activo}
            </span>
          )}
        </span>
      }
      actions={
        <a
          href={`/${business.slug}`}
          target="_blank"
          rel="noopener"
          className="flex h-11 items-center gap-2 rounded-full bg-surface px-5 text-14 font-bold text-ink shadow-soft hover:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {adminPanel.detalle.verPagina}
          <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={2} />
        </a>
      }
    >
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          {/* WP-84: hjälp företaget med rubro, comuna och adress. */}
          <section className="flex flex-col gap-3 rounded-card bg-surface p-6 fields-on-surface">
            <h2 className="text-18 font-bold text-ink">
              {adminPanel.ubicacion.titulo}
            </h2>
            {place.draft ? (
              <p className="text-13 text-ink-soft">
                {adminPanel.ubicacion.borrador}
              </p>
            ) : (
              <AdminPlaceForm
                value={place}
                onSubmit={setBusinessPlaceAction.bind(null, business.id)}
              />
            )}
          </section>

          {isImportEnabled() && !place.draft ? (
            <section className="flex flex-col gap-3 rounded-card bg-surface p-6 fields-on-surface">
              <h2 className="text-18 font-bold text-ink">
                {adminPanel.importar.titulo}
              </h2>
              <p className="text-13 text-ink-soft">
                {adminPanel.importar.intro}
              </p>
              <ImportSection
                platformNames={platformNames()}
                action={adminImportAction.bind(null, business.id)}
                extract={{
                  url: "/api/admin/import/extract",
                  businessId: business.id,
                }}
                currentPlan={business.plan}
                existingCounts={{
                  services: existing.services.length,
                  staff: existing.staff.length,
                }}
              />
            </section>
          ) : null}

          <section className="flex flex-col gap-3 rounded-card bg-surface p-6 fields-on-surface">
            <h2 className="text-18 font-bold text-ink">Medlemmar</h2>
            <ul className="flex flex-col gap-4">
              {business.members.map((m) => (
                <li
                  key={m.userId}
                  className="flex flex-col gap-1.5 border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <p className="text-14 text-ink">
                    {m.email ?? "(okänd e-post)"}{" "}
                    <span className="text-12 text-ink-soft">{m.role}</span>
                  </p>
                  <MemberActions
                    onSendLoginLink={sendLoginLinkAction.bind(
                      null,
                      business.id,
                      m.userId,
                    )}
                    onChangeEmail={changeEmailAction.bind(
                      null,
                      business.id,
                      m.userId,
                    )}
                  />
                </li>
              ))}
            </ul>
          </section>
        </div>
        <div className="flex flex-col gap-6">
          <section className="grid grid-cols-3 gap-3">
            <div className="rounded-card bg-surface p-6">
              <p className="text-22 font-bold text-ink">
                {business.counts.bookings}
              </p>
              <p className="text-13 text-ink-soft">Bokningar</p>
            </div>
            <div className="rounded-card bg-surface p-6">
              <p className="text-22 font-bold text-ink">
                {business.counts.staff}
              </p>
              <p className="text-13 text-ink-soft">Personal</p>
            </div>
            <div className="rounded-card bg-surface p-6">
              <p className="text-22 font-bold text-ink">
                {business.counts.members}
              </p>
              <p className="text-13 text-ink-soft">Konton</p>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-card bg-surface p-6 fields-on-surface">
            <h2 className="text-18 font-bold text-ink">Status</h2>
            <p className="text-13 text-ink-soft">
              {business.status === "frozen" ? "Fryst" : "Aktiv"}
              {business.deletionRequestedAt
                ? ` · Radering begärd ${new Date(business.deletionRequestedAt).toLocaleString("sv-SE")}`
                : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {business.status === "frozen" ? (
                <ConfirmActionButton
                  label="Avfrys"
                  title="Avfrys företaget?"
                  body="Bokningssidan blir synlig igen."
                  confirmLabel="Avfrys"
                  action={unfreezeAction.bind(null, business.id)}
                />
              ) : (
                <ConfirmActionButton
                  label="Frys"
                  title="Frys företaget?"
                  body="Bokningssidan blir otillgänglig tills du avfryser."
                  confirmLabel="Frys"
                  action={freezeAction.bind(null, business.id)}
                />
              )}
              {business.deletionRequestedAt ? (
                <ConfirmActionButton
                  label="Ångra radering"
                  title="Ångra raderingen?"
                  body="Kontot återställs till sitt tidigare status."
                  confirmLabel="Ångra radering"
                  action={cancelDeletionAction.bind(null, business.id)}
                />
              ) : (
                <ConfirmActionButton
                  label="Begär radering"
                  title="Begär radering av företaget?"
                  body="Bokningssidan stängs direkt. Företaget raderas permanent 30 dagar senare, om inte du ångrar innan dess."
                  confirmLabel="Begär radering"
                  action={requestDeletionAction.bind(null, business.id)}
                />
              )}
              {/* WP-84: radera direkt (testkonton m.m.), med slug som bekräftelse. */}
              <DeleteNowButton
                slug={business.slug}
                action={deleteNowAction.bind(null, business.id)}
              />
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-card bg-surface p-6 fields-on-surface">
            <h2 className="text-18 font-bold text-ink">Plan</h2>
            {business.planRequested &&
            business.planRequested !== business.plan ? (
              <p className="text-13 font-semibold text-ink">
                {adminPanel.lista.quierePlan({
                  plan: planes.nombres[business.planRequested],
                })}
                {business.planRequestedAt
                  ? ` · ${new Date(business.planRequestedAt).toLocaleString("es-CL")}`
                  : null}
              </p>
            ) : null}
            {business.billingMode === "manual" ? (
              <p className="text-13 text-ink-soft">
                {adminPanel.facturacion.planBloqueado}
              </p>
            ) : null}
            <PlanForm
              plan={business.plan}
              overrideUntil={business.planOverrideUntil}
              customLimits={business.customLimits}
              onSubmit={setPlanAction.bind(null, business.id)}
            />
          </section>

          <section className="flex flex-col gap-3 rounded-card bg-surface p-6 fields-on-surface">
            <h2 className="text-18 font-bold text-ink">
              {adminPanel.facturacion.filtro}
            </h2>
            <BillingForm
              billingMode={business.billingMode}
              billingNote={business.billingNote}
              onSubmit={setBillingModeAction.bind(null, business.id)}
            />
          </section>

          <section className="flex flex-col gap-2 rounded-card bg-surface p-6">
            <h2 className="text-18 font-bold text-ink">Senaste aktivitet</h2>
            <p className="text-13 text-ink-soft">
              {business.lastActivityAt
                ? new Date(business.lastActivityAt).toLocaleString("sv-SE")
                : "Ingen bokning ännu."}
            </p>
          </section>

          <section className="flex flex-col gap-2 rounded-card bg-surface p-6">
            <h2 className="text-18 font-bold text-ink">Logg</h2>
            <ul className="flex flex-col gap-1.5">
              {log.map((entry) => (
                <li key={entry.id} className="text-12 text-ink-soft">
                  {new Date(entry.createdAt).toLocaleString("sv-SE")} —{" "}
                  {entry.action}
                  {Object.keys(entry.details).length
                    ? ` (${JSON.stringify(entry.details)})`
                    : ""}
                </li>
              ))}
              {log.length === 0 ? (
                <li className="text-12 text-ink-soft">Inga åtgärder ännu.</li>
              ) : null}
            </ul>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
