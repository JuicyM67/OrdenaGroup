// /app/flash (WP-30, F13): ägarens Horas flash. Service-katalogen (personal/tjänster)
// kommer från `src/server/owner/ajustes.ts` (samma läsning som Ajustes → Servicios/
// Equipo); listan över flash-tider och mutationerna kommer från `src/server/flash/`
// (scheduling-engineer).
//
// UX-granskning (sección "Blixttider"): `listFreeGaps` (tomma lägets lediga luckor),
// `ownerName`/`myProfile`/`pendingRequests` (punkt 6, gemensamt sidhuvud) och
// `?ny=1&staff=<id>&start=<ISO>` (direktlänk från Hoy, A:s sida) tolkas server-side här,
// samma mönster som Agendans `?vista=&fecha=` (`src/app/(app)/app/agenda/page.tsx`).
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { logout } from "@/app/auth/actions";
import type { FlashCatalogService, FlashStaff } from "@/components/flash/types";
import { FlashScreen } from "@/components/flash/flash-screen";
import { UpgradeNotice } from "@/components/plans/upgrade-notice";
import { appHref, href } from "@/config/routes";
import { flash as flashCopy } from "@/i18n";
import { APP_TZ, toLocalDate, toWallClock } from "@/lib/format/dates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listFlashSlots, listFreeGaps } from "@/server/flash";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import { loadAjustesServices, loadAjustesStaff } from "@/server/owner/ajustes";
import {
  approveCancelRequest,
  confirmRequest,
  declineCancelRequest,
  declineRequest,
  listPendingRequests,
} from "@/server/owner/requests";
import { ownerNameParts } from "@/server/owner/shared";
import { loadBusinessPlan, planCan } from "@/server/plans/entitlements";

import {
  confirmMyPhotoUploadAction,
  createMyPhotoUploadAction,
  deleteMyPhotoAction,
  loadMyProfileAction,
  updateMyTitleAction,
} from "../my-profile-actions";
import {
  cancelFlashSlotAction,
  createFlashSlotAction,
  sendFlashCampaignAction,
} from "./actions";

export const metadata: Metadata = {
  title: flashCopy.titulo,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000").replace(
    /\/$/,
    "",
  );
}

// `?ny=1&staff=<id>&start=<ISO>` (länk från Hoy): `staff` måste vara ett uuid, `start` ett
// giltigt instant-datum — annars ignoreras hela direktlänken (dialogen öppnas som vanligt,
// tom) i stället för att krascha sidan.
const staffIdSchema = z.guid();

export default async function FlashPage({
  searchParams,
}: {
  searchParams: Promise<{ ny?: string; staff?: string; start?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const current = await getCurrentMember(user.id);
  if (!current) redirect(appHref("appOnboarding"));

  const businessId = current.business.id;
  const now = new Date();
  const today = toLocalDate(now, APP_TZ);

  const { ny, staff: staffParam, start: startParam } = await searchParams;
  let initialDialogDefaults: {
    date: ReturnType<typeof toLocalDate>;
    time: ReturnType<typeof toWallClock>["time"];
    staffId: string;
  } | null = null;
  if (ny === "1" && staffParam && startParam) {
    const parsedStaffId = staffIdSchema.safeParse(staffParam);
    const instant = new Date(startParam);
    if (parsedStaffId.success && !Number.isNaN(instant.getTime())) {
      const wall = toWallClock(instant, APP_TZ);
      initialDialogDefaults = {
        date: wall.date,
        time: wall.time,
        staffId: parsedStaffId.data,
      };
    }
  }

  const [staffRows, serviceRows, slots, gaps, myProfile, pendingRequests] =
    await Promise.all([
      loadAjustesStaff(user.id, businessId),
      loadAjustesServices(user.id, businessId),
      listFlashSlots(user.id, businessId, now),
      listFreeGaps(user.id, businessId, now),
      loadMyProfileAction(),
      listPendingRequests(user.id, businessId, now),
    ]);

  const staff: FlashStaff[] = staffRows
    .filter((s) => s.active)
    .map((s) => ({ id: s.id, name: s.name }));

  const serviceNameById = new Map(serviceRows.map((s) => [s.id, s.name]));
  const services: FlashCatalogService[] = serviceRows
    .filter((s) => s.active)
    .map((s) => ({
      id: s.id,
      name: s.name,
      durationMin: s.durationMin,
      staffIds: staffRows
        .filter((st) => st.serviceIds.includes(s.id))
        .map((st) => st.id),
    }));

  const staffNameById = new Map(staffRows.map((s) => [s.id, s.name]));
  const views = slots.map((slot) => ({
    id: slot.id,
    staffId: slot.staffId,
    staffName: staffNameById.get(slot.staffId) ?? slot.staffName,
    start: slot.start,
    end: slot.end,
    serviceNames: slot.serviceIds
      ? slot.serviceIds
          .map((id) => serviceNameById.get(id) ?? "")
          .filter(Boolean)
      : null,
    discountPct: slot.discountPct,
    status: slot.status,
  }));

  const canManageCampaigns =
    current.view.perms.can_manage_all_bookings || current.view.role === "owner";

  const onConfirmRequest = async (bookingId: string) => {
    "use server";
    const result = await confirmRequest(
      user.id,
      businessId,
      new Date(),
      bookingId,
    );
    return { ok: result.ok };
  };
  const onDeclineRequest = async (bookingId: string, reason?: string) => {
    "use server";
    const result = await declineRequest(
      user.id,
      businessId,
      new Date(),
      bookingId,
      reason,
    );
    return { ok: result.ok };
  };
  const onApproveCancelRequest = async (bookingId: string) => {
    "use server";
    const result = await approveCancelRequest(
      user.id,
      businessId,
      new Date(),
      bookingId,
    );
    return { ok: result.ok };
  };
  const onDeclineCancelRequest = async (bookingId: string) => {
    "use server";
    const result = await declineCancelRequest(
      user.id,
      businessId,
      new Date(),
      bookingId,
    );
    return { ok: result.ok };
  };

  const plan = await loadBusinessPlan(businessId);
  const planNotice = planCan(plan, "flash") ? undefined : (
    <UpgradeNotice
      manualBilling={plan.billingMode === "manual"}
      feature="flash"
      linkHref={current.view.role === "owner" ? undefined : href("precios")}
    />
  );

  return (
    <FlashScreen
      planNotice={planNotice}
      active={views.filter((v) => v.status === "active")}
      past={views.filter((v) => v.status === "booked")}
      staff={staff}
      services={services}
      today={today}
      gaps={gaps}
      publicBase={`${appUrl()}/${current.business.slug}`}
      onSend={canManageCampaigns ? sendFlashCampaignAction : undefined}
      canViewReports={current.view.perms.can_view_reports}
      onLogout={logout}
      onCreate={createFlashSlotAction}
      onCancel={cancelFlashSlotAction}
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
      initialDialogDefaults={initialDialogDefaults}
    />
  );
}
