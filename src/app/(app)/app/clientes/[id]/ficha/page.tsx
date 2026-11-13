// /app/clientes/[id]/ficha (WP-88, D-074): fichan och kundens consentimientos.
// Bara ägaren och personal med `can_view_records` — övriga skickas tillbaka
// till kundkortet. Varje action kontrollerar behörighet och plan igen på
// servern (`src/server/records/ficha.ts`), och RLS gäller.
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { logout } from "@/app/auth/actions";
import { UpgradeNotice } from "@/components/plans/upgrade-notice";
import { FichaScreen } from "@/components/records/ficha-screen";
import type { FichaActions } from "@/components/records/types";
import { appHref, href } from "@/config/routes";
import { fichaAtencion } from "@/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import { ownerNameParts } from "@/server/owner/shared";
import {
  addRecordEntry,
  createSigningLink,
  markRecordEntryVoided,
  loadFicha,
  saveRecordFields,
} from "@/server/records/ficha";
import { exportFichasHtml } from "@/server/records/export";
import { systemClock } from "@/server/scheduling/clock";

import {
  confirmMyPhotoUploadAction,
  createMyPhotoUploadAction,
  deleteMyPhotoAction,
  loadMyProfileAction,
  updateMyTitleAction,
} from "../../../my-profile-actions";

export const metadata: Metadata = {
  title: fichaAtencion.titulo,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const idSchema = z.guid();

export default async function FichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const current = await getCurrentMember(user.id);
  if (!current) redirect(appHref("appOnboarding"));

  const { id } = await params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) notFound();
  const customerId = parsedId.data;
  const businessId = current.business.id;
  const userId = user.id;

  const result = await loadFicha(userId, businessId, customerId);
  if (!result.ok) {
    if (result.code === "not_found") notFound();
    redirect(appHref("appClienteDetail", customerId));
  }

  const owner = ownerNameParts(user.email);
  const myProfile = await loadMyProfileAction();

  const actions: FichaActions = {
    saveFields: async (values) => {
      "use server";
      return saveRecordFields(userId, businessId, customerId, values);
    },
    addEntry: async (input) => {
      "use server";
      return addRecordEntry(userId, businessId, customerId, input);
    },
    voidEntry: async (input) => {
      "use server";
      return markRecordEntryVoided(userId, businessId, customerId, input);
    },
    ...(current.view.role === "owner"
      ? {
          exportFicha: async () => {
            "use server";
            const r = await exportFichasHtml(userId, businessId, customerId);
            return r.ok
              ? { ok: true as const, filename: r.filename, html: r.html }
              : { ok: false as const, code: r.code };
          },
        }
      : {}),
    createSigningLink: async (input) => {
      "use server";
      return createSigningLink(
        userId,
        businessId,
        customerId,
        input,
        systemClock(),
      );
    },
  };

  return (
    <FichaScreen
      data={result.data}
      actions={actions}
      planNotice={
        <UpgradeNotice
          feature="records"
          linkHref={
            current.view.role === "owner"
              ? appHref("appAjustesPlan")
              : href("precios")
          }
        />
      }
      canViewReports={current.view.perms.can_view_reports}
      onLogout={logout}
      ownerName={owner.name}
      publicPageHref={`/${current.business.slug}`}
      myProfile={myProfile ?? undefined}
      myProfileActions={
        myProfile
          ? {
              updateTitle: updateMyTitleAction,
              createPhotoUpload: createMyPhotoUploadAction,
              confirmPhotoUpload: confirmMyPhotoUploadAction,
              deletePhoto: deleteMyPhotoAction,
            }
          : undefined
      }
    />
  );
}
