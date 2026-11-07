// WP-21: riktig data (D-020s grind och fixtures flyttade till /design-lab/main, se
// docs/decisions/DECISIONS.md D-024). Ägare utan företag → /app/onboarding.
//
// WP-47: Llegó/No vino/Mover (samma server actions som Agenda) och utloggning kopplas här
// och skickas ner som props (closures), samma mönster som /app/agenda/page.tsx.
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { logout } from "@/app/auth/actions";
import { InicioScreen } from "@/components/dashboard/inicio-screen";
import { DescubreReminder } from "@/components/settings/descubre-reminder";
import { marketplaceEnabled } from "@/config/marketplace";
import { appHref } from "@/config/routes";
import { inicio } from "@/i18n";
import { APP_TZ, toLocalDate } from "@/lib/format/dates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnerBusiness } from "@/server/onboarding/owner-business";
import { markArrival, type ArrivalStatus } from "@/server/owner/arrival";
import { loadOwnerInicio } from "@/server/owner/inicio";
import { moveOwnerBooking } from "@/server/owner/manual-booking";
import {
  approveCancelRequest,
  confirmRequest,
  declineCancelRequest,
  declineRequest,
} from "@/server/owner/requests";
import { ownerNameParts } from "@/server/owner/shared";
import { loadDescubreSettings } from "@/server/owner/descubre";

import {
  confirmMyPhotoUploadAction,
  createMyPhotoUploadAction,
  deleteMyPhotoAction,
  loadMyProfileAction,
  updateMyTitleAction,
} from "../my-profile-actions";

export const metadata: Metadata = {
  title: inicio.titulo,
  robots: { index: false, follow: false },
};

// VERCEL_ENV måste läsas per request, se src/app/design-lab/layout.tsx.
export const dynamic = "force-dynamic";

export default async function InicioPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await getOwnerBusiness(user.id);
  if (!business) redirect(appHref("appOnboarding"));

  const now = new Date();
  const today = toLocalDate(now, APP_TZ);
  const owner = ownerNameParts(user.email);
  const data = await loadOwnerInicio(user.id, business.id, today, now, owner);
  const myProfile = await loadMyProfileAction();
  // WP-85 (D-070): påminnelse när företaget vill synas i Descubre men något saknas.
  const descubreSettings = marketplaceEnabled()
    ? await loadDescubreSettings(user.id, business.id).catch(() => null)
    : null;
  const descubreMissing =
    descubreSettings && descubreSettings.listed && !descubreSettings.hidden
      ? descubreSettings.missing
      : [];

  const onArrival = async (bookingId: string, status: ArrivalStatus) => {
    "use server";
    await markArrival(user.id, business.id, bookingId, status);
  };

  const onMoveBooking = async (input: unknown) => {
    "use server";
    const result = await moveOwnerBooking(
      user.id,
      business.id,
      new Date(),
      input,
    );
    if (!result.ok) return { ok: false as const, error: result.error };
    return { ok: true as const };
  };

  const onConfirmRequest = async (bookingId: string) => {
    "use server";
    const result = await confirmRequest(
      user.id,
      business.id,
      new Date(),
      bookingId,
    );
    return { ok: result.ok };
  };

  const onDeclineRequest = async (bookingId: string, reason?: string) => {
    "use server";
    const result = await declineRequest(
      user.id,
      business.id,
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
      business.id,
      new Date(),
      bookingId,
    );
    return { ok: result.ok };
  };

  const onDeclineCancelRequest = async (bookingId: string) => {
    "use server";
    const result = await declineCancelRequest(
      user.id,
      business.id,
      new Date(),
      bookingId,
    );
    return { ok: result.ok };
  };

  return (
    <InicioScreen
      data={data}
      bookingLink={{ slug: business.slug, businessName: business.name }}
      onArrival={onArrival}
      onMoveBooking={onMoveBooking}
      onLogout={logout}
      onConfirmRequest={onConfirmRequest}
      onDeclineRequest={onDeclineRequest}
      onApproveCancelRequest={onApproveCancelRequest}
      onDeclineCancelRequest={onDeclineCancelRequest}
      myProfile={myProfile ?? undefined}
      topBanner={
        descubreMissing.length > 0 ? (
          <DescubreReminder
            missing={descubreMissing}
            href={
              descubreMissing.includes("imagen")
                ? appHref("appAjustesPerfil")
                : descubreMissing.includes("servicio")
                  ? appHref("appAjustesServicios")
                  : appHref("appAjustesNegocio")
            }
          />
        ) : undefined
      }
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
