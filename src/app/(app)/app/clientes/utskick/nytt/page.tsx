// /app/clientes/utskick/nytt (WP-31, F14): formulario de una nueva
// campaña. Mismo acceso que el historial (ägare eller
// `can_manage_all_bookings`). `?kunder=id,id` (kundkortets "Enviar oferta")
// precarga la audiencia "selected"; `?audiencia=inactivos` (Inicio, "Te
// echamos de menos") precarga "inactive".
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { logout } from "@/app/auth/actions";
import { NewCampaignScreen } from "@/components/campaigns/new-campaign-screen";
import type { SelectedCustomer } from "@/components/campaigns/types";
import { appHref } from "@/config/routes";
import { campanas } from "@/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import { getCustomerContact } from "@/server/owner/clientes";
import { ownerNameParts } from "@/server/owner/shared";
import { loadBusinessPlan, planCan } from "@/server/plans/entitlements";

import {
  confirmMyPhotoUploadAction,
  createMyPhotoUploadAction,
  deleteMyPhotoAction,
  loadMyProfileAction,
  updateMyTitleAction,
} from "../../../my-profile-actions";
import { previewCampaignAction, sendCampaignAction } from "../actions";

export const metadata: Metadata = {
  title: campanas.nueva.titulo,
  robots: { index: false, follow: false },
};

// VERCEL_ENV måste läsas per request, se src/app/design-lab/layout.tsx.
export const dynamic = "force-dynamic";

// z.guid() (inte z.uuid()): samma motiv som src/app/(app)/app/clientes/[id]/page.tsx
// — seedens "vanity"-id har inte en giltig RFC 4122-version/variant.
const idSchema = z.guid();

export default async function NuevoUtskickPage({
  searchParams,
}: {
  searchParams: Promise<{ kunder?: string; audiencia?: string }>;
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
  // WP-73 (D-048): utan utskick i planen → listan med uppgraderingsrutan.
  if (!planCan(await loadBusinessPlan(current.business.id), "campaigns")) {
    redirect(appHref("appClientesUtskick"));
  }

  const { kunder, audiencia } = await searchParams;

  const customerIds = (kunder ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => idSchema.safeParse(id).success);

  const selectedCustomers: SelectedCustomer[] = [];
  for (const id of customerIds) {
    const contact = await getCustomerContact(user.id, current.business.id, id);
    if (contact?.name) selectedCustomers.push({ id, name: contact.name });
  }

  const owner = ownerNameParts(user.email);
  const myProfile = await loadMyProfileAction();

  return (
    <NewCampaignScreen
      selectedCustomers={
        selectedCustomers.length > 0 ? selectedCustomers : undefined
      }
      defaultAudience={audiencia === "inactivos" ? "inactive" : undefined}
      canViewReports={current.view.perms.can_view_reports}
      onLogout={logout}
      onPreview={previewCampaignAction}
      onSend={sendCampaignAction}
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
