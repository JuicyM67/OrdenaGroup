// /app/clientes/resenas (SE /app/kunder/omdomen) — WP-65 (D-045): företagets
// recensioner. Hela teamet läser; svara/anmäla kräver ägare eller
// `can_edit_settings` (knapparna döljs annars, servern kontrollerar igen).
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { logout } from "@/app/auth/actions";
import {
  OwnerReviewsScreen,
  type OwnerReviewFilterKey,
} from "@/components/reviews/owner-reviews-screen";
import { appHref } from "@/config/routes";
import { resenas } from "@/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import { ownerNameParts } from "@/server/owner/shared";
import { listOwnerReviews } from "@/server/reviews/owner";

import {
  confirmMyPhotoUploadAction,
  createMyPhotoUploadAction,
  deleteMyPhotoAction,
  loadMyProfileAction,
  updateMyTitleAction,
} from "../../my-profile-actions";
import { replyToReviewAction, reportReviewAction } from "./actions";

export const metadata: Metadata = {
  title: resenas.panel.titulo,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const FILTERS: readonly OwnerReviewFilterKey[] = [
  "todas",
  "sinResponder",
  "bajas",
];

export default async function ResenasPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const current = await getCurrentMember(user.id);
  if (!current) redirect(appHref("appOnboarding"));

  const { filtro } = await searchParams;
  const filter = FILTERS.find((f) => f === filtro) ?? "todas";
  const data = await listOwnerReviews(user.id, current.business.id, filter);
  const owner = ownerNameParts(user.email);
  const myProfile = await loadMyProfileAction();

  return (
    <OwnerReviewsScreen
      filter={filter}
      average={data.average}
      count={data.count}
      unanswered={data.unanswered}
      items={data.items}
      negocio={current.business.name}
      canManage={data.canManage}
      onReply={replyToReviewAction}
      onReport={reportReviewAction}
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
