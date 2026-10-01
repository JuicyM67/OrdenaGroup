// /app/clientes/utskick (WP-31, F14): historial de campañas enviadas.
// Requiere ägare eller `can_manage_all_bookings` (planens ord) — annars
// redirect a /app/clientes (samma mönster som Caja i clientes-planen,
// D-034).
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { logout } from "@/app/auth/actions";
import { CampaignsScreen } from "@/components/campaigns/campaigns-screen";
import { appHref } from "@/config/routes";
import { campanas } from "@/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import { ownerNameParts } from "@/server/owner/shared";

import {
  confirmMyPhotoUploadAction,
  createMyPhotoUploadAction,
  deleteMyPhotoAction,
  loadMyProfileAction,
  updateMyTitleAction,
} from "../../my-profile-actions";
import { listCampaignsAction } from "./actions";

export const metadata: Metadata = {
  title: campanas.titulo,
  robots: { index: false, follow: false },
};

// VERCEL_ENV måste läsas per request, se src/app/design-lab/layout.tsx.
export const dynamic = "force-dynamic";

export default async function UtskickPage({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const current = await getCurrentMember(user.id);
  if (!current) redirect(appHref("appOnboarding"));
  if (!current.view.perms.can_manage_all_bookings)
    redirect(appHref("appClientes"));

  const { enviado } = await searchParams;
  const items = await listCampaignsAction();
  const owner = ownerNameParts(user.email);
  const myProfile = await loadMyProfileAction();

  return (
    <CampaignsScreen
      items={items}
      canViewReports={current.view.perms.can_view_reports}
      enviado={enviado === "1"}
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
