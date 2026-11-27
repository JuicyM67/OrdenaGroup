// Delad layout för /app/* (WP-15). `src/proxy.ts` redirectar redan utloggade till /login
// (försvar #1); den här kontrollen är försvar i djupet (#2, samma mönster som
// design-lab/layout.tsx + varje sidas egen isDesignLabEnabled()-koll) för den som anropar
// sidan direkt utan att gå via proxyn (t.ex. ett internt RSC-anrop). Ingen egen marginal
// eller ram här — annars påverkas skärmdumparna i npm run visual för Inicio/Agenda/Hoy
// (samma regel som design-lab/layout.tsx).
//
// WP-90 (D-076): en plattformsadmin i modo soporte får en banderoll med "Salir".
// WP-98 (D-082): ett konto med flera företag får en väljare i profilmenyn.
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { SupportBanner } from "@/components/admin/support-banner";
import {
  BusinessSwitcherProvider,
  type SwitcherBusiness,
} from "@/components/shared/business-switcher-context";
import { PlatformAdminProvider } from "@/components/shared/platform-admin-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/server/admin/auth";
import {
  getCurrentMember,
  listMyBusinesses,
} from "@/server/onboarding/owner-business";

import { switchBusinessAction } from "./business-actions";
import { endSupportAction } from "./support-actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // Länken "Panel de admin" i profilmenyn (bara för plattformsadmins).
  const isAdmin = await isPlatformAdmin(user.id).catch(() => false);
  const mine = await listMyBusinesses(user.id).catch(() => []);
  // Bara en plattformsadmin kan ha en supportrad, och bara den som har flera
  // företag behöver veta vilket som är aktivt; övriga slipper frågan.
  const current =
    isAdmin || mine.length > 1 ? await getCurrentMember(user.id) : null;
  const switcher: SwitcherBusiness[] =
    mine.length > 1
      ? mine.map((b) => ({
          id: b.id,
          name: b.name,
          active: !current?.support && current?.business.id === b.id,
          select: switchBusinessAction.bind(null, b.id),
        }))
      : [];
  return (
    <PlatformAdminProvider isAdmin={isAdmin}>
      <BusinessSwitcherProvider businesses={switcher}>
        {children}
      </BusinessSwitcherProvider>
      {current?.support ? (
        <SupportBanner
          businessName={current.business.name}
          until={current.support.until}
          onEnd={endSupportAction}
        />
      ) : null}
    </PlatformAdminProvider>
  );
}
