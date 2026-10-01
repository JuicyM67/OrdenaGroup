// /app/flash (WP-30, F13): ägarens Horas flash. Service-katalogen (personal/tjänster)
// kommer från `src/server/owner/ajustes.ts` (samma läsning som Ajustes → Servicios/
// Equipo); listan över flash-tider och mutationerna kommer från `src/server/flash/`
// (scheduling-engineer).
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { logout } from "@/app/auth/actions";
import type { FlashCatalogService, FlashStaff } from "@/components/flash/types";
import { FlashScreen } from "@/components/flash/flash-screen";
import { market } from "@/config/brand";
import { flash as flashCopy } from "@/i18n";
import { APP_TZ, toLocalDate } from "@/lib/format/dates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listFlashSlots } from "@/server/flash";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import { loadAjustesServices, loadAjustesStaff } from "@/server/owner/ajustes";

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

export default async function FlashPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const current = await getCurrentMember(user.id);
  if (!current) redirect("/app/onboarding");

  const businessId = current.business.id;
  const now = new Date();
  const today = toLocalDate(now, APP_TZ);

  const [staffRows, serviceRows, slots] = await Promise.all([
    loadAjustesStaff(user.id, businessId),
    loadAjustesServices(user.id, businessId),
    listFlashSlots(user.id, businessId, now),
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

  return (
    <FlashScreen
      active={views.filter((v) => v.status === "active")}
      past={views.filter((v) => v.status === "booked")}
      staff={staff}
      services={services}
      today={today}
      publicBase={`${appUrl()}/${current.business.slug}`}
      onSend={canManageCampaigns ? sendFlashCampaignAction : undefined}
      smsAvailable={market === "SE"}
      canViewReports={current.view.perms.can_view_reports}
      onLogout={logout}
      onCreate={createFlashSlotAction}
      onCancel={cancelFlashSlotAction}
    />
  );
}
