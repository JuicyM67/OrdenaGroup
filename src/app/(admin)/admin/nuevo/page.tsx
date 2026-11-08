// /admin/nuevo: bjud in någon att skapa ett företag (F19/WP-36). Text via
// `adminPanel` (es-CL).
import { AdminShell } from "@/components/admin/admin-shell";
import { InviteForm } from "@/components/admin/invite-form";
import { adminPanel } from "@/i18n";
import { requireAdminPage } from "@/server/admin/auth";

import { inviteBusinessAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminNewBusinessPage() {
  await requireAdminPage();

  return (
    <AdminShell
      active="negocios"
      title={adminPanel.nav.nuevo}
      back={{ href: "/admin", label: adminPanel.nav.volver }}
    >
      <div className="flex max-w-4xl flex-col gap-6">
        <div className="rounded-card bg-surface p-6">
          <InviteForm onSubmit={inviteBusinessAction} />
        </div>
      </div>
    </AdminShell>
  );
}
