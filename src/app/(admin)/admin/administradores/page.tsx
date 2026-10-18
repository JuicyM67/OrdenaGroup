// /admin/administradores (WP-80, D-061): lista, lägg till och ta bort
// plattformsadmins. Kräver admin + aal2 som resten av /admin.
import Link from "next/link";

import { AddAdminForm } from "@/components/admin/add-admin-form";
import { RemoveAdminButton } from "@/components/admin/remove-admin-button";
import { adminPanel } from "@/i18n";
import { listPlatformAdmins } from "@/server/admin/admins";
import { requireAdminPage } from "@/server/admin/auth";

import { addAdminAction, removeAdminAction } from "./actions";

export const dynamic = "force-dynamic";

const t = adminPanel.administradores;

export default async function AdminAdministratorsPage() {
  const session = await requireAdminPage();
  const admins = await listPlatformAdmins();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-22 font-bold text-ink">{t.titulo}</h1>
        <Link
          href="/admin"
          className="text-13 font-semibold text-ink underline"
        >
          ←
        </Link>
      </div>
      <p className="text-14 text-ink-soft">{t.intro}</p>

      <div className="overflow-x-auto rounded-card bg-surface">
        <table className="w-full text-left text-13">
          <thead>
            <tr className="border-b border-border text-ink-soft">
              <th className="px-4 py-3 font-semibold">{t.correo}</th>
              <th className="px-4 py-3 font-semibold">{t.verificacion}</th>
              <th className="px-4 py-3 font-semibold">{t.desde}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => {
              const self = a.userId === session.userId;
              return (
                <tr
                  key={a.userId}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 text-ink">
                    {a.email ?? "—"}
                    {self ? (
                      <span className="ml-2 text-12 text-ink-soft">
                        ({t.tu})
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {a.mfaEnrolled === null
                      ? t.mfaDesconocida
                      : a.mfaEnrolled
                        ? t.mfaActiva
                        : t.mfaPendiente}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {new Date(a.createdAt).toLocaleDateString("es-CL")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {self || admins.length <= 1 ? null : (
                      <RemoveAdminButton
                        action={removeAdminAction.bind(null, a.userId)}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="flex flex-col gap-3 rounded-card bg-surface p-5">
        <h2 className="text-15 font-bold text-ink">{t.agregarTitulo}</h2>
        <p className="text-13 text-ink-soft">{t.agregarAyuda}</p>
        <AddAdminForm onSubmit={addAdminAction} />
      </section>
    </main>
  );
}
