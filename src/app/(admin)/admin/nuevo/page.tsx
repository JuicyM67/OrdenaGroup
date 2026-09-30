// /admin/nuevo: bjud in någon att skapa ett företag (F19/WP-36). Svensk
// text.
import { InviteForm } from "@/components/admin/invite-form";
import { requireAdminPage } from "@/server/admin/auth";

import { inviteBusinessAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminNewBusinessPage() {
  await requireAdminPage();

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-6">
      <h1 className="text-22 font-bold text-ink">Nytt företag</h1>
      <div className="rounded-card bg-surface p-6">
        <InviteForm onSubmit={inviteBusinessAction} />
      </div>
    </main>
  );
}
