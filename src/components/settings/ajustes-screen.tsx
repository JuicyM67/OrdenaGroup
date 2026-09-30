"use client";

// Pantalla /app/ajustes (WP-15b slim): compone las cuatro secciones dentro del AppShell
// compartido (DESIGN.md §7, igual que Inicio). Sin referencia *.dc.html para el conjunto
// (no hay pantalla de diseño para Ajustes todavía) — WP-40 añade "Bokningsformulär" y
// las categorías de Servicios con sus propias referencias
// (`.visual-diff/ref/falt-A-bokningsformular.html`, `falt-B-per-tjanst.html`,
// `falt-kategorier.html`).
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { AppShell } from "@/components/dashboard/app-shell";
import { MainNav } from "@/components/dashboard/main-nav";
import { OwnerMobileTabBar } from "@/components/mobile/owner-tab-bar";
import { PageHeader } from "@/components/ui/page-header";
import {
  NotificationBell,
  type NotificationBellResult,
  type PendingRequestItem,
} from "@/components/shared/notification-bell";
import { TuLinkCard } from "@/components/shared/tu-link-card";
import { UserMenu } from "@/components/shared/user-menu";
import type {
  MyProfileActions,
  MyProfileData,
} from "@/components/shared/my-profile-dialog";
import { nav } from "@/i18n";
import { initialsOf } from "@/lib/format/initials";

import type {
  BookingFormActions,
  BookingFormBundle,
} from "./booking-form-types";
import { BookingFormSection } from "./booking-form-section";
import { BusinessSection } from "./business-section";
import { CategorySection } from "./category-section";
import { HoursSection } from "./hours-section";
import { PrivacySection, type PrivacyActions } from "./privacy-section";
import { ProfileSection } from "./profile-section";
import type { ProfileActions, ProfileSettingsData } from "./profile-types";
import { ServicesSection } from "./services-section";
import { StaffSection } from "./staff-section";
import { TeamSection, type TeamActions } from "./team-section";
import type {
  AjustesActions,
  AjustesBusiness,
  AjustesData,
  TeamData,
} from "./types";

export type AjustesScreenProps = {
  data: AjustesData;
  actions: AjustesActions;
  bookingForm: BookingFormBundle;
  bookingFormActions: BookingFormActions;
  /** Laddar om kategorier/frågor från servern efter en ändring (`null` = fel, behåller det gamla). */
  loadBookingFormBundle: () => Promise<BookingFormBundle | null>;
  profile: ProfileSettingsData;
  profileActions: ProfileActions;
  /** WP-26 steg 7: "Privacidad y datos" (F12). */
  deletionRequestedAt: string | null;
  privacyActions: PrivacyActions;
  /** WP-47: namnet till profilmenyn (UserMenu), samma `ownerNameParts` som Inicio/Hoy. */
  owner: { name: string };
  /** WP-47: `logout` (server action). `undefined` i design lab. */
  onLogout?: () => void | Promise<void>;
  /** WP-45 (D-033): klockan i topprraden. `undefined` döljer den. */
  pendingRequests?: readonly PendingRequestItem[];
  onConfirmRequest?: (bookingId: string) => Promise<NotificationBellResult>;
  onDeclineRequest?: (
    bookingId: string,
    reason?: string,
  ) => Promise<NotificationBellResult>;
  /** WP-46: Ajustes → Equipo (åtkomst till kontot). `null`/`undefined` döljer
   * sektionen helt — bara ägaren ser den (`data.member.role === "owner"`,
   * samma villkor som `src/server/team/members.ts` kräver på servern). */
  team?: TeamData | null;
  teamActions?: TeamActions;
  onReloadTeam?: () => Promise<TeamData | null>;
  /** WP-46: "Min profil" i kontomenyn. `undefined` döljer menyposten (ägare
   * utan egen personalrad, design lab). */
  myProfile?: MyProfileData;
  myProfileActions?: MyProfileActions;
};

export function AjustesScreen({
  data,
  actions,
  bookingForm: initialBookingForm,
  bookingFormActions,
  loadBookingFormBundle,
  profile,
  profileActions,
  deletionRequestedAt,
  privacyActions,
  owner,
  onLogout,
  pendingRequests,
  onConfirmRequest,
  onDeclineRequest,
  team,
  teamActions,
  onReloadTeam,
  myProfile,
  myProfileActions,
}: AjustesScreenProps) {
  const router = useRouter();
  const [business, setBusiness] = useState<AjustesBusiness>(data.business);
  const [bookingForm, setBookingForm] = useState(initialBookingForm);
  const publicPageHref = `/${business.slug}`;
  const { perms, role } = data.member;
  const isOwner = role === "owner";

  const reload = useCallback(async () => {
    const next = await loadBookingFormBundle();
    if (next) setBookingForm(next);
  }, [loadBookingFormBundle]);

  return (
    <AppShell
      rail={<MainNav active="ajustes" onLogout={onLogout} />}
      mobileTabBar={
        <OwnerMobileTabBar active="ajustes" className="lg:hidden" />
      }
      onLogout={onLogout}
      pendingRequests={pendingRequests}
      onConfirmRequest={onConfirmRequest}
      onDeclineRequest={onDeclineRequest}
    >
      <PageHeader
        variant="desktop"
        title={nav.ajustes}
        actions={
          <>
            {onConfirmRequest && onDeclineRequest ? (
              <NotificationBell
                requests={pendingRequests ?? []}
                onConfirm={async (bookingId) => {
                  const result = await onConfirmRequest(bookingId);
                  if (result.ok) router.refresh();
                  return result;
                }}
                onDecline={async (bookingId, reason) => {
                  const result = await onDeclineRequest(bookingId, reason);
                  if (result.ok) router.refresh();
                  return result;
                }}
                withTooltip
              />
            ) : null}
            <span className="hidden lg:contents">
              <UserMenu
                name={owner.name}
                initials={initialsOf(owner.name)}
                variant="pill"
                publicPageHref={publicPageHref}
                onLogout={onLogout}
                myProfile={myProfile}
                myProfileActions={myProfileActions}
              />
            </span>
            <span className="contents lg:hidden">
              <UserMenu
                name={owner.name}
                initials={initialsOf(owner.name)}
                variant="avatar"
                publicPageHref={publicPageHref}
                onLogout={onLogout}
                myProfile={myProfile}
                myProfileActions={myProfileActions}
              />
            </span>
          </>
        }
      />

      <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-2">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          {perms.can_edit_settings ? (
            <BusinessSection
              business={business}
              onSaved={setBusiness}
              action={actions.updateBusinessSettings}
            />
          ) : null}

          <TuLinkCard slug={business.slug} businessName={business.name} />

          {perms.can_edit_settings ? (
            <div id="perfil">
              <ProfileSection data={profile} actions={profileActions} />
            </div>
          ) : null}

          {perms.can_edit_catalog ? (
            <>
              <ServicesSection
                services={data.services}
                actions={{
                  create: actions.createService,
                  update: actions.updateService,
                  setActive: actions.setServiceActive,
                }}
                bookingForm={{
                  settings: bookingForm.settings,
                  businessCategory: bookingForm.businessCategory,
                  actions: bookingFormActions,
                  onReload: reload,
                }}
              />

              <CategorySection
                categories={bookingForm.settings.categories}
                services={bookingForm.settings.services}
                actions={bookingFormActions}
                onReload={reload}
              />

              <BookingFormSection
                settings={bookingForm.settings}
                businessCategory={bookingForm.businessCategory}
                actions={bookingFormActions}
                onReload={reload}
              />
            </>
          ) : null}

          {perms.can_manage_team ? (
            <div id="equipo">
              <StaffSection
                staff={data.staff}
                services={data.services}
                photos={profile.staffPhotos}
                actions={{
                  create: actions.createStaff,
                  update: actions.updateStaff,
                  setActive: actions.setStaffActive,
                  updateTitle: profileActions.updateStaffTitle,
                  createImageUpload: profileActions.createImageUpload,
                  confirmImageUpload: profileActions.confirmImageUpload,
                  deleteImage: profileActions.deleteImage,
                }}
              />
            </div>
          ) : null}

          {/* WP-46: acceso a la cuenta (invitar/permisos) — solo el dueño,
              siempre bajo el mismo id="equipo" aunque StaffSection esté oculta
              (una cuenta con can_manage_team pero sin ser dueña no debería
              existir hoy, pero el ancla del menú sigue apuntando aquí). */}
          {isOwner && team && teamActions && onReloadTeam ? (
            <div id={perms.can_manage_team ? undefined : "equipo"}>
              <TeamSection data={team} actions={teamActions} onReload={onReloadTeam} />
            </div>
          ) : null}

          {perms.can_edit_settings ? (
            <HoursSection hours={data.hours} action={actions.updateHours} />
          ) : null}

          {isOwner ? (
            <PrivacySection
              slug={business.slug}
              deletionRequestedAt={deletionRequestedAt}
              actions={privacyActions}
            />
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
