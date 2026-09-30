// /app/caja (WP-24, F10): kassan och informes. Kräver `can_view_reports`
// (eller ägare) — annars redirect till /app/agenda (D-034, planen §Caja).
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { logout } from "@/app/auth/actions";
import { CajaScreen } from "@/components/caja/caja-screen";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import { MANUAL_METHODS } from "@/server/payments/mark-paid";

import {
  loadCajaAction,
  loadInformesAction,
  markPaidAction,
  undoPaymentAction,
} from "./actions";

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
  if (!current) redirect("/app/onboarding");
  if (!current.view.perms.can_view_reports) redirect("/app/agenda");

  const initialData = await loadCajaAction({ kind: "today" });

  return (
    <CajaScreen
      initialData={initialData}
      manualMethods={MANUAL_METHODS}
      canViewReports
      onLogout={logout}
      actions={{
        loadCaja: loadCajaAction,
        loadInformes: loadInformesAction,
        markPaid: markPaidAction,
        undoPayment: undoPaymentAction,
      }}
    />
  );
}
