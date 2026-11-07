// ProfileBrowse — vyn innan bokningsflödet startar (WP-41 steg 4):
// `ProfilDesktop.dc.html` (dator, ≥ lg) och `ProfilMobil.dc.html` (mobil,
// < lg) i en och samma komponent, växlade med Tailwinds `lg:`-brytpunkt
// (ingen tidigare skärm har behövt båda bredderna i samma route).
//
// WP-53 (D-040): serverkomponent — hela trädet (format-funktioner, i18n-text,
// markup) renderas på servern och skickas som en färdig `profileContent`-prop
// till `BookingScreen` (`/[slug]/page.tsx`), i stället för att importeras
// (och därmed klientbuntas) av den. Bara kategori-/mobilflikarna och
// "Boka"-knapparna är klientöar (`profile-interactive.tsx`) som läser
// `ProfileFlowContext` för att nå tillbaka till `BookingScreen`s tillstånd
// (kategoriflik, mobilflik, vilken tjänst som startar bokningsflödet).
import type { ReactNode } from "react";

import {
  RatingChip,
  ReviewsSection,
  type PublicReviewsView,
} from "@/components/reviews/public-reviews";

import { formulario, perfil, resenas } from "@/i18n";
import { formatDuration } from "@/lib/format/dates";

import { categoryTabs } from "./categories";
import { MobileBookBar } from "./mobile-book-bar";
import { ProfileGallery } from "./profile-gallery";
import { ProfileChipsDesktop, ProfileHeader } from "./profile-header";
import {
  ProfileCategoryTabs,
  ProfileMobileTabs,
  ProfileServiceList,
  type ProfileServiceRowEntry,
} from "./profile-interactive";
import type { MobileTab } from "./profile-flow-context";
import { ProfileServiceHeader } from "./profile-service-row";
import {
  ContactCard,
  FastestTimesCard,
  HoursCard,
  MapCard,
} from "./profile-side-panels";
import { ProfileStaff } from "./profile-staff";
import type { BookingPageData, BookingProfile } from "./types";

/** Serverrenderade ikonknappar (chips-raden och Kontakt-kortet). */
export type ProfileSocialSlots = { chips: ReactNode; contact: ReactNode };

const MOBILE_TABS: readonly { id: MobileTab; label: string }[] = [
  { id: "servicios", label: perfil.publico.tabs.servicios },
  { id: "personal", label: perfil.publico.tabs.equipo },
  { id: "nosotros", label: perfil.publico.tabs.nosotros },
  // WP-65: bara när företaget har recensioner (filtreras nedan).
  { id: "resenas", label: resenas.publico.titulo },
  { id: "info", label: perfil.publico.tabs.info },
];

export function ProfileBrowse({
  data,
  profile,
  social,
  reviews,
  reviewsMoreHref,
  giftCardNote,
}: {
  data: BookingPageData;
  profile: BookingProfile;
  social?: ProfileSocialSlots;
  /** WP-65 (D-045): `undefined` = inga recensioner, allt om dem döljs. */
  reviews?: PublicReviewsView;
  /** `?resenas=N#resenas` när det finns fler än de som visas. */
  reviewsMoreHref?: string;
  /** WP-87 (D-073): "Regala una tarjeta de regalo · cómprala en el local"
   * (serverrenderad rad, bara när företaget slagit på den). */
  giftCardNote?: ReactNode;
}) {
  const { business, staff } = data;
  const tabs = categoryTabs(data.categories ?? [], data.services);
  const rows: ProfileServiceRowEntry[] = data.services.map((service) => ({
    id: service.id,
    categoryId: service.categoryId ?? null,
    staffIds: service.staffIds ?? [],
    header: <ProfileServiceHeader service={service} staff={staff} />,
    description: service.description ?? null,
    ariaLabel: `${service.name} · ${formatDuration(service.durationMin)}`,
    cta: perfil.publico.elegirHora,
  }));
  const hasSocial = Boolean(
    profile.instagramUrl || profile.tiktokUrl || profile.facebookUrl,
  );

  const infoPanel = (
    <div className="flex flex-col gap-3.5">
      <HoursCard profile={profile} />
      <MapCard address={profile.address} geo={profile.geo} />
      <ContactCard
        phone={profile.phone}
        hasSocial={hasSocial}
        social={social?.contact}
      />
      {giftCardNote}
    </div>
  );

  const mobileTabs = reviews
    ? MOBILE_TABS
    : MOBILE_TABS.filter((tab) => tab.id !== "resenas");

  return (
    <div className="flex flex-1 flex-col">
      <ProfileHeader
        business={business}
        profile={profile}
        now={data.now}
        social={social?.chips}
        rating={
          reviews ? (
            <span data-tour="rating" className="inline-flex">
              <RatingChip reviews={reviews} />
            </span>
          ) : undefined
        }
      />

      {/* Dator */}
      <div className="hidden px-30 pt-20 pb-20 lg:block">
        <div className="flex gap-8">
          <main className="flex min-w-0 flex-1 flex-col gap-4.5">
            <ProfileChipsDesktop
              profile={profile}
              now={data.now}
              social={social?.chips}
              rating={
                reviews ? (
                  <span data-tour="rating" className="inline-flex">
                    <RatingChip reviews={reviews} href="#resenas" />
                  </span>
                ) : undefined
              }
            />
            <ProfileGallery
              id="galeria-escritorio"
              images={profile.gallery}
              negocio={business.name}
              className="mb-2"
            />
            <h2
              id="reservar-hora"
              className="scroll-mt-6 font-display text-28 font-bold text-ink"
            >
              {perfil.publico.secciones.reservarHora}
            </h2>
            {tabs.length > 0 ? <ProfileCategoryTabs tabs={tabs} /> : null}
            <ProfileServiceList
              rows={rows}
              emptyLabel={formulario.categorias.vacia}
              tour="services"
            />

            {staff.length > 0 ? (
              <>
                <h2 className="mt-1 font-display text-24 font-bold text-ink">
                  {perfil.publico.secciones.profesionales}
                </h2>
                <ProfileStaff staff={staff} />
              </>
            ) : null}

            {profile.about ? (
              <>
                <h2 className="mt-1 font-display text-24 font-bold text-ink">
                  {perfil.publico.secciones.sobreNosotros}
                </h2>
                <p className="max-w-160 text-15 leading-relaxed text-ink-soft">
                  {profile.about}
                </p>
              </>
            ) : null}

            {reviews ? (
              <ReviewsSection
                reviews={reviews}
                negocio={business.name}
                moreHref={reviewsMoreHref}
                headingClassName="mt-1 font-display text-24 font-bold text-ink"
              />
            ) : null}
          </main>

          <aside className="flex w-90 shrink-0 flex-col gap-4">
            <FastestTimesCard
              profile={profile}
              now={data.now}
              services={data.services}
            />
            <HoursCard profile={profile} />
            <MapCard address={profile.address} geo={profile.geo} />
            <ContactCard
              phone={profile.phone}
              hasSocial={hasSocial}
              social={social?.contact}
            />
          </aside>
        </div>
      </div>

      {/* Mobil */}
      <div className="flex flex-1 flex-col lg:hidden">
        <ProfileGallery
          id="galeria-movil"
          images={profile.gallery}
          negocio={business.name}
          className="px-4 pt-4"
        />
        <ProfileMobileTabs
          tabs={mobileTabs}
          tablistLabel={perfil.publico.secciones.reservarHora}
          panels={{
            servicios: (
              <>
                {tabs.length > 0 ? <ProfileCategoryTabs tabs={tabs} /> : null}
                <ProfileServiceList
                  rows={rows}
                  emptyLabel={formulario.categorias.vacia}
                  tour="services"
                />
              </>
            ),
            personal: <ProfileStaff staff={staff} />,
            nosotros: profile.about ? (
              <p className="text-15 leading-relaxed text-ink-soft">
                {profile.about}
              </p>
            ) : null,
            resenas: reviews ? (
              <ReviewsSection
                id="resenas-movil"
                reviews={reviews}
                negocio={business.name}
                moreHref={reviewsMoreHref}
                headingClassName="sr-only"
              />
            ) : null,
            info: infoPanel,
          }}
        />

        <MobileBookBar profile={profile} data={data} />
      </div>
    </div>
  );
}
