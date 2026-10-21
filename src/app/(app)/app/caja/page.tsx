// /app/caja (WP-24, F10): kassan och informes. Kräver `can_view_reports`
// (eller ägare) — annars redirect till /app/agenda (D-034, planen §Caja).
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { logout } from "@/app/auth/actions";
import { CajaScreen } from "@/components/caja/caja-screen";
import { appHref } from "@/config/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import { MANUAL_METHODS } from "@/server/payments/mark-paid";
import { ownerNameParts } from "@/server/owner/shared";

import {
  confirmMyPhotoUploadAction,
  createMyPhotoUploadAction,
  deleteMyPhotoAction,
  loadMyProfileAction,
  updateMyTitleAction,
} from "../my-profile-actions";
import { loadCajaAction, markPaidAction, undoPaymentAction } from "./actions";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// VERCEL_ENV måste läsas per request, se src/app/design-lab/layout.tsx.
export const dynamic = "force-dynamic";

export default async function CajaPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const current = await getCurrentMember(user.id);
  if (!current) redirect(appHref("appOnboarding"));
  if (!current.view.perms.can_view_reports) redirect(appHref("appAgenda"));

  const initialData = await loadCajaAction({ kind: "today" });
  const owner = ownerNameParts(user.email);
  const myProfile = await loadMyProfileAction();

  return (
    <CajaScreen
      initialData={initialData}
      manualMethods={MANUAL_METHODS}
      canViewReports
      onLogout={logout}
      actions={{
        loadCaja: loadCajaAction,
        markPaid: markPaidAction,
        undoPayment: undoPaymentAction,
      }}
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
