// /app/ajustes (WP-15b slim, F1/F2/F3): la ägaren ändra sitt företag efter onboarding.
// Inloggning krävs redan av src/app/(app)/layout.tsx. Ägare utan företag → /app/onboarding
// (samma mönster som /app/inicio).
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AjustesScreen } from "@/components/settings/ajustes-screen";
import { nav } from "@/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnerBusiness } from "@/server/onboarding/owner-business";
import { loadAjustesData } from "@/server/owner/ajustes";

import {
  createServiceAction,
  createStaffAction,
  setServiceActiveAction,
  setStaffActiveAction,
  updateBusinessSettingsAction,
  updateHoursAction,
  updateServiceAction,
  updateStaffAction,
} from "./actions";

export const metadata: Metadata = {
  title: nav.ajustes,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await getOwnerBusiness(user.id);
  if (!business) redirect("/app/onboarding");

  const data = await loadAjustesData(user.id, business.id);

  return (
    <AjustesScreen
      data={data}
      actions={{
        updateBusinessSettings: updateBusinessSettingsAction,
        createService: createServiceAction,
        updateService: updateServiceAction,
        setServiceActive: setServiceActiveAction,
        createStaff: createStaffAction,
        updateStaff: updateStaffAction,
        setStaffActive: setStaffActiveAction,
        updateHours: updateHoursAction,
      }}
    />
  );
}
