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
import { anchor } from "@/config/url-params";
import type { ReactNode } from "react";

import {
  RatingChip,
  ReviewsSection,
  type PublicReviewsView,
} from "@/components/reviews/public-reviews";
import { CreditCard, Lock } from "lucide-react";

import { formulario, perfil, resenas } from "@/i18n";
import { formatDuration } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";

import { categoryTabs } from "./categories";
import { ProfileGallery } from "./profile-gallery";
import { ProfileChipsDesktop, ProfileHeader } from "./profile-header";
import {
  ProfileBookNowButton,
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
import { nextAvailableChipLabel } from "./profile-view";
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
  paymentNote,
  giftCardLink,
}: {
  data: BookingPageData;
  /** WP-77 (D-058): "Köp presentkort" (serverrenderad länk, bara när
   * företaget säljer presentkort). */
  giftCardLink?: ReactNode;
  /** WP-72: info-raden "Betala direkt …" som bara syns i visningsläget (SE-demon). */
  paymentNote?: { texto: string; via: string };
  profile: BookingProfile;
  social?: ProfileSocialSlots;
  /** WP-65 (D-045): `undefined` = inga recensioner, allt om dem döljs. */
  reviews?: PublicReviewsView;
  /** `?resenas=N#resenas` när det finns fler än de som visas. */
  reviewsMoreHref?: string;
}) {
  const { business, staff } = data;
  const tabs = categoryTabs(data.categories ?? [], data.services);
  const rows: ProfileServiceRowEntry[] = data.services.map((service) => ({
    id: service.id,
    categoryId: service.categoryId ?? null,
    header: <ProfileServiceHeader service={service} staff={staff} />,
    description: service.description ?? null,
    ariaLabel: `${service.name} · ${formatDuration(service.durationMin)}`,
    cta: perfil.publico.elegirHora,
  }));
  const hasSocial = Boolean(
    profile.instagramUrl || profile.tiktokUrl || profile.facebookUrl,
  );

  const payNote = paymentNote ? <PaymentNote {...paymentNote} /> : null;

  const infoPanel = (
    <div className="flex flex-col gap-3.5">
      <HoursCard profile={profile} />
      <MapCard address={profile.address} />
      <ContactCard
        phone={profile.phone}
        hasSocial={hasSocial}
        social={social?.contact}
      />
      {giftCardLink}
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
                    <RatingChip
                      reviews={reviews}
                      href={`#${anchor("resenas")}`}
                    />
                  </span>
                ) : undefined
              }
            />
            <h2 className="font-display text-28 font-bold text-ink">
              {perfil.publico.secciones.reservarHora}
            </h2>
            {tabs.length > 0 ? <ProfileCategoryTabs tabs={tabs} /> : null}
            {payNote}
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

            <ProfileGallery images={profile.gallery} />

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
            <MapCard address={profile.address} />
            <ContactCard
              phone={profile.phone}
              hasSocial={hasSocial}
              social={social?.contact}
            />
            {giftCardLink}
          </aside>
        </div>
      </div>

      {/* Mobil */}
      <div className="flex flex-1 flex-col lg:hidden">
        <ProfileMobileTabs
          tabs={mobileTabs}
          tablistLabel={perfil.publico.secciones.reservarHora}
          panels={{
            servicios: (
              <>
                {tabs.length > 0 ? <ProfileCategoryTabs tabs={tabs} /> : null}
                {payNote}
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
                id={anchor("resenas-movil")}
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

/** Fast "Boka nu"-rad (`ProfilMobil.dc.html` rad 39). Ingen egen textnyckel
 * för etikett+klockslag på var sin rad som i referensen — återanvänder
 * samma hela mening som huvudets chip (`chips.proximaHora`) på en rad,
 * medveten förenkling (ingen `perfil.publico`-nyckel delar upp den). */
function MobileBookBar({
  profile,
  data,
}: {
  profile: BookingProfile;
  data: BookingPageData;
}) {
  const next = profile.nextAvailable;
  const service = next
    ? data.services.find((s) => s.id === next.serviceId)
    : null;
  const label = nextAvailableChipLabel(data.now, profile.nextAvailable);

  return (
    <div
      data-tour="book-bar"
      className="fixed inset-x-3 bottom-3.5 z-10 flex items-center justify-between gap-3 rounded-panel bg-ink px-3.5 py-3 text-on-dark shadow-popover"
    >
      <div className="min-w-0">
        {label ? (
          <p className="truncate text-12 text-on-dark-muted">{label}</p>
        ) : null}
        {service ? (
          <p className="truncate text-13 text-on-dark-soft">
            {formatDuration(service.durationMin)} ·{" "}
            {formatMoney(service.priceClp)}
          </p>
        ) : null}
      </div>
      <ProfileBookNowButton
        serviceId={next ? next.serviceId : null}
        className="shrink-0"
      >
        {perfil.publico.reservarAhora}
      </ProfileBookNowButton>
    </div>
  );
}

/** Info-rad nära Boka-knappen, bara synlig i visningsläget (`tour-note`, tokens.css). */
function PaymentNote({ texto, via }: { texto: string; via: string }) {
  return (
    <p
      data-tour="payment"
      className="tour-note items-center justify-between gap-3 rounded-event bg-surface px-3 py-2.5 text-12 font-semibold text-ink"
    >
      <span className="flex items-center gap-2">
        <CreditCard aria-hidden="true" className="size-4" strokeWidth={2} />
        {texto}
      </span>
      <span className="flex items-center gap-1 text-11 font-normal text-muted">
        <Lock aria-hidden="true" className="size-2.75" strokeWidth={2.5} />
        {via}
      </span>
    </p>
  );
}
