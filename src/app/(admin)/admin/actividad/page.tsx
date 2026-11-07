// /admin/actividad: global logg över alla adminåtgärder (F19/WP-36).
// Svensk text.
import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { adminPanel } from "@/i18n";
import { listAuditLog } from "@/server/admin/audit";
import { requireAdminPage } from "@/server/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminActivityPage() {
  await requireAdminPage();
  const log = await listAuditLog({ limit: 200 });

  return (
    <AdminShell active="registro" title={adminPanel.nav.registro}>
      <div className="flex max-w-4xl flex-col gap-6">
        <div className="rounded-card bg-surface p-5">
          <ul className="flex flex-col gap-3">
            {log.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-0.5 border-b border-border pb-3 text-13 last:border-0 last:pb-0"
              >
                <span className="text-ink">
                  {new Date(entry.createdAt).toLocaleString("sv-SE")} —{" "}
                  {entry.action}
                </span>
                <span className="text-12 text-ink-soft">
                  {entry.businessId ? (
                    <Link
                      href={`/admin/negocios/${entry.businessId}`}
                      className="underline"
                    >
                      Visa företag
                    </Link>
                  ) : null}
                  {Object.keys(entry.details).length
                    ? ` ${JSON.stringify(entry.details)}`
                    : ""}
                </span>
              </li>
            ))}
            {log.length === 0 ? (
              <li className="text-13 text-ink-soft">Inga åtgärder ännu.</li>
            ) : null}
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
