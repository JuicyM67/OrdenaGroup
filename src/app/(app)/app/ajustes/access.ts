import "server-only";

// Delad av de nio flik-rutterna (WP-55): autentisering, behörighet för just DEN fliken och
// det AjustesShell alltid behöver (ägarens namn, "Min profil", klockan). Samma mönster som
// varje sida hade var för sig innan (`getCurrentMember`, redirect till /login eller
// /app/onboarding) — bara flyttat hit så de nio `page.tsx`-filerna inte upprepar det.
import { redirect } from "next/navigation";

import type { MyProfileActions } from "@/components/shared/my-profile-dialog";
import {
  ajustesTabVisible,
  buildAjustesTabs,
  type AjustesTabItem,
  type AjustesTabKey,
} from "@/components/settings/ajustes-tabs";
import type { Feature } from "@/config/plans";
import { appHref, href } from "@/config/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentMember,
  type CurrentMember,
} from "@/server/onboarding/owner-business";
import {
  listPendingRequests,
  type PendingRequestItem,
} from "@/server/owner/requests";
import { ownerNameParts } from "@/server/owner/shared";
import {
  loadBusinessPlan,
  planCan,
  type PlanInfo,
} from "@/server/plans/entitlements";

import {
  confirmMyPhotoUploadAction,
  createMyPhotoUploadAction,
  deleteMyPhotoAction,
  loadMyProfileAction,
  updateMyTitleAction,
} from "../my-profile-actions";

export type AjustesPageContext = {
  userId: string;
  current: CurrentMember;
  owner: { name: string };
  myProfile: Awaited<ReturnType<typeof loadMyProfileAction>>;
  /** `undefined` när `myProfile` är `null` (ägare utan egen personalrad) — samma villkor
   * som förut (`ajustes-screen.tsx`). */
  myProfileActions: MyProfileActions | undefined;
  pendingRequests: PendingRequestItem[];
  tabs: AjustesTabItem[];
  /** WP-73 (D-048): företagets plan, för uppgraderingsrutorna. */
  plan: PlanInfo;
  /** "Se planer": Plan-fliken för ägaren, prissidan för personal. */
  plansHref: string;
};

/** Kräver inloggning OCH behörighet för `tab` — annars samma omdirigeringar som förut
 * (/login, /app/onboarding, /app/agenda). Laddar sedan det `AjustesShell` behöver på varje
 * flik oavsett vilken (klockan, "Min profil", ägarens namn) — flikens EGEN data laddas i
 * respektive `page.tsx`. */
/** WP-73 (D-048): flik → funktionen den kräver. */
const TAB_FEATURE: Partial<Record<AjustesTabKey, Feature>> = {
  socios: "campaigns",
  equipo: "staff_accounts",
  ficha: "records",
};

function lockedTabs(plan: PlanInfo): Set<AjustesTabKey> {
  return new Set(
    (Object.keys(TAB_FEATURE) as AjustesTabKey[]).filter((k) => {
      const f = TAB_FEATURE[k];
      return f !== undefined && !planCan(plan, f);
    }),
  );
}

export async function requireAjustesTab(
  tab: AjustesTabKey,
): Promise<AjustesPageContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const current = await getCurrentMember(user.id);
  if (!current) redirect(appHref("appOnboarding"));
  if (!ajustesTabVisible(tab, current.view)) redirect(appHref("appAgenda"));

  const [myProfile, pendingRequests, plan] = await Promise.all([
    loadMyProfileAction(),
    listPendingRequests(user.id, current.business.id, new Date()),
    loadBusinessPlan(current.business.id),
  ]);

  return {
    userId: user.id,
    current,
    owner: ownerNameParts(user.email),
    myProfile,
    myProfileActions: myProfile
      ? {
          updateTitle: updateMyTitleAction,
          createPhotoUpload: createMyPhotoUploadAction,
          confirmPhotoUpload: confirmMyPhotoUploadAction,
          deletePhoto: deleteMyPhotoAction,
        }
      : undefined,
    pendingRequests,
    plan,
    plansHref:
      current.view.role === "owner"
        ? appHref("appAjustesPlan")
        : href("precios"),
    tabs: buildAjustesTabs(current.view, lockedTabs(plan)),
  };
}
