// /admin/negocios/[id]: företagsdetalj med alla åtgärder (F19/WP-36). Svensk
// text (bara ägaren använder ytan).
import { notFound } from "next/navigation";

import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { MemberActions } from "@/components/admin/member-actions";
import { PlanForm } from "@/components/admin/plan-form";
import { listAuditLog } from "@/server/admin/audit";
import { requireAdminPage } from "@/server/admin/auth";
import { getBusinessDetail } from "@/server/admin/businesses";

import {
  cancelDeletionAction,
  changeEmailAction,
  freezeAction,
  requestDeletionAction,
  sendLoginLinkAction,
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

  const [business, log] = await Promise.all([
    getBusinessDetail(id),
    listAuditLog({ businessId: id }),
  ]);
  if (!business) notFound();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-22 font-bold text-ink">{business.name}</h1>
        <p className="text-13 text-ink-soft">{business.slug}</p>
      </div>

      <section className="flex flex-col gap-3 rounded-card bg-surface p-5">
        <h2 className="text-15 font-bold text-ink">Status</h2>
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
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-card bg-surface p-5">
        <h2 className="text-15 font-bold text-ink">Plan</h2>
        <PlanForm
          plan={business.plan}
          overrideUntil={business.planOverrideUntil}
          customLimits={business.customLimits}
          onSubmit={setPlanAction.bind(null, business.id)}
        />
      </section>

      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-card bg-surface p-5">
          <p className="text-22 font-bold text-ink">
            {business.counts.bookings}
          </p>
          <p className="text-13 text-ink-soft">Bokningar</p>
        </div>
        <div className="rounded-card bg-surface p-5">
          <p className="text-22 font-bold text-ink">{business.counts.staff}</p>
          <p className="text-13 text-ink-soft">Personal</p>
        </div>
        <div className="rounded-card bg-surface p-5">
          <p className="text-22 font-bold text-ink">
            {business.counts.members}
          </p>
          <p className="text-13 text-ink-soft">Konton</p>
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-card bg-surface p-5">
        <h2 className="text-15 font-bold text-ink">Senaste aktivitet</h2>
        <p className="text-13 text-ink-soft">
          {business.lastActivityAt
            ? new Date(business.lastActivityAt).toLocaleString("sv-SE")
            : "Ingen bokning ännu."}
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-card bg-surface p-5">
        <h2 className="text-15 font-bold text-ink">Medlemmar</h2>
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

      <section className="flex flex-col gap-2 rounded-card bg-surface p-5">
        <h2 className="text-15 font-bold text-ink">Logg</h2>
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
    </main>
  );
}
