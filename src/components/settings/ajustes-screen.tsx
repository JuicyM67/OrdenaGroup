"use client";

// Pantalla /app/ajustes (WP-15b slim): compone las cuatro secciones dentro del AppShell
// compartido (DESIGN.md §7, igual que Inicio). Sin referencia *.dc.html para el conjunto
// (no hay pantalla de diseño para Ajustes todavía) — WP-40 añade "Bokningsformulär" y
// las categorías de Servicios con sus propias referencias
// (`.visual-diff/ref/falt-A-bokningsformular.html`, `falt-B-per-tjanst.html`,
// `falt-kategorier.html`).
import { useCallback, useState } from "react";

import { AppShell } from "@/components/dashboard/app-shell";
import { MainNav } from "@/components/dashboard/main-nav";
import { OwnerMobileTabBar } from "@/components/mobile/owner-tab-bar";
import { PageHeader } from "@/components/ui/page-header";
import { TuLinkCard } from "@/components/shared/tu-link-card";
import { nav } from "@/i18n";

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
import type { AjustesActions, AjustesBusiness, AjustesData } from "./types";

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
}: AjustesScreenProps) {
  const [business, setBusiness] = useState<AjustesBusiness>(data.business);
  const [bookingForm, setBookingForm] = useState(initialBookingForm);

  const reload = useCallback(async () => {
    const next = await loadBookingFormBundle();
    if (next) setBookingForm(next);
  }, [loadBookingFormBundle]);

  return (
    <AppShell
      rail={<MainNav active="ajustes" />}
      mobileTabBar={
        <OwnerMobileTabBar active="ajustes" className="lg:hidden" />
      }
    >
      <PageHeader variant="desktop" title={nav.ajustes} />

      <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-2">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <BusinessSection
            business={business}
            onSaved={setBusiness}
            action={actions.updateBusinessSettings}
          />

          <TuLinkCard slug={business.slug} businessName={business.name} />

          <ProfileSection data={profile} actions={profileActions} />

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

          <HoursSection hours={data.hours} action={actions.updateHours} />

          <PrivacySection
            slug={business.slug}
            deletionRequestedAt={deletionRequestedAt}
            actions={privacyActions}
          />
        </div>
      </div>
    </AppShell>
  );
}
