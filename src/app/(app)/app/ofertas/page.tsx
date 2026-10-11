// /app/erbjudanden (CL /app/ofertas) — WP-70 (D-056): företagets erbjudanden i
// marknadsplatsen. Dold där marknadsplatsen är dold (CL, `NEXT_PUBLIC_MARKETPLACE=0`):
// 404. Kräver katalogrätt (`can_edit_catalog`, D-034); bara ägaren publicerar.
// Uppgraderingsrutan visas när planen saknar `offers` (Team och uppåt, D-048).
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { logout } from "@/app/auth/actions";
import { OffersScreen } from "@/components/offers/offers-screen";
import { UpgradeNotice } from "@/components/plans/upgrade-notice";
import { marketplaceEnabled } from "@/config/marketplace";
import { appHref, href } from "@/config/routes";
import { ofertas } from "@/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadOffersEditor } from "@/server/marketplace/owner";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import {
  approveCancelRequest,
  confirmRequest,
  declineCancelRequest,
  declineRequest,
  listPendingRequests,
} from "@/server/owner/requests";
import { ownerNameParts } from "@/server/owner/shared";

import {
  confirmMyPhotoUploadAction,
  createMyPhotoUploadAction,
  deleteMyPhotoAction,
  loadMyProfileAction,
  updateMyTitleAction,
} from "../my-profile-actions";
import {
  createOfferImageUploadAction,
  saveOfferAction,
  setOfferStatusAction,
} from "./actions";

export const metadata: Metadata = {
  title: ofertas.titulo,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OfertasPage() {
  if (!marketplaceEnabled()) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const current = await getCurrentMember(user.id);
  if (!current) redirect(appHref("appOnboarding"));
  if (!current.view.perms.can_edit_catalog) redirect(appHref("appInicio"));

  const businessId = current.business.id;
  const [data, myProfile, pendingRequests] = await Promise.all([
    loadOffersEditor(user.id, businessId),
    loadMyProfileAction(),
    listPendingRequests(user.id, businessId, new Date()),
  ]);

  const onConfirmRequest = async (bookingId: string) => {
    "use server";
    const r = await confirmRequest(user.id, businessId, new Date(), bookingId);
    return { ok: r.ok };
  };
  const onDeclineRequest = async (bookingId: string, reason?: string) => {
    "use server";
    const r = await declineRequest(
      user.id,
      businessId,
      new Date(),
      bookingId,
      reason,
    );
    return { ok: r.ok };
  };
  const onApproveCancelRequest = async (bookingId: string) => {
    "use server";
    const r = await approveCancelRequest(
      user.id,
      businessId,
      new Date(),
      bookingId,
    );
    return { ok: r.ok };
  };
  const onDeclineCancelRequest = async (bookingId: string) => {
    "use server";
    const r = await declineCancelRequest(
      user.id,
      businessId,
      new Date(),
      bookingId,
    );
    return { ok: r.ok };
  };

  const planNotice = data.planOk ? undefined : (
    <UpgradeNotice
      feature="offers"
      linkHref={current.view.role === "owner" ? undefined : href("precios")}
    />
  );

  return (
    <OffersScreen
      offers={data.offers}
      services={data.services}
      canPublish={data.canPublish}
      defaultCategory={data.defaultCategory}
      business={data.business}
      actions={{
        save: saveOfferAction,
        setStatus: setOfferStatusAction,
        createImageUpload: createOfferImageUploadAction,
      }}
      planNotice={planNotice}
      canViewReports={current.view.perms.can_view_reports}
      onLogout={logout}
      ownerName={ownerNameParts(user.email).name}
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
      pendingRequests={pendingRequests}
      onConfirmRequest={onConfirmRequest}
      onDeclineRequest={onDeclineRequest}
      onApproveCancelRequest={onApproveCancelRequest}
      onDeclineCancelRequest={onDeclineCancelRequest}
    />
  );
}
