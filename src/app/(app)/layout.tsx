// Delad layout för /app/* (WP-15). `src/proxy.ts` redirectar redan utloggade till /login
// (försvar #1); den här kontrollen är försvar i djupet (#2, samma mönster som
// design-lab/layout.tsx + varje sidas egen isDesignLabEnabled()-koll) för den som anropar
// sidan direkt utan att gå via proxyn (t.ex. ett internt RSC-anrop). Ingen egen marginal
// eller ram här — annars påverkas skärmdumparna i npm run visual för Inicio/Agenda/Hoy
// (samma regel som design-lab/layout.tsx).
//
// WP-90 (D-076): en plattformsadmin i modo soporte får en banderoll med "Salir".
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { SupportBanner } from "@/components/admin/support-banner";
import { PlatformAdminProvider } from "@/components/shared/platform-admin-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/server/admin/auth";
import { getCurrentMember } from "@/server/onboarding/owner-business";

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
  // Bara en plattformsadmin kan ha en supportrad; övriga slipper frågan.
  const current = isAdmin ? await getCurrentMember(user.id) : null;
  return (
    <PlatformAdminProvider isAdmin={isAdmin}>
      {children}
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
