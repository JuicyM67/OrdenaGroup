// ProfileBrowse — vyn innan bokningsflödet startar (WP-41 steg 4):
// `ProfilDesktop.dc.html` (dator, ≥ lg) och `ProfilMobil.dc.html` (mobil,
// < lg) i en och samma komponent, växlade med Tailwinds `lg:`-brytpunkt
// (ingen tidigare skärm har behövt båda bredderna i samma route). Rent
// presentationslager: all tillstånd (kategoriflik, mobilflik, val av
// tjänst) ägs av `booking-screen.tsx` och kommer in som props, så
// komponenten här kan återanvändas oförändrad om profilen någon gång
// server-renderas separat (planens JS-budgetnot, se booking-screen.tsx).
import { Button } from "@/components/ui/button";
import { perfil } from "@/i18n";
import { formatMoney } from "@/lib/format/money";
import { formatDuration } from "@/lib/format/dates";

import type { CategoryTab } from "./categories";
import { CategoryTabs } from "./category-tabs";
import { ProfileGallery } from "./profile-gallery";
import { ProfileChipsDesktop, ProfileHeader } from "./profile-header";
import { ProfileServiceRow } from "./profile-service-row";
import {
  ContactCard,
  FastestTimesCard,
  HoursCard,
  MapCard,
} from "./profile-side-panels";
import { ProfileStaff } from "./profile-staff";
import { nextAvailableChipLabel } from "./profile-view";
import type { BookingPageData, BookingProfile } from "./types";

export type MobileTab = "servicios" | "personal" | "nosotros" | "info";

const MOBILE_TABS: readonly { id: MobileTab; label: string }[] = [
  { id: "servicios", label: perfil.publico.tabs.servicios },
  { id: "personal", label: perfil.publico.tabs.equipo },
  { id: "nosotros", label: perfil.publico.tabs.nosotros },
  { id: "info", label: perfil.publico.tabs.info },
];

export function ProfileBrowse({
  data,
  profile,
  tabs,
  categoryId,
  onSelectCategory,
  visibleServices,
  onBookService,
  mobileTab,
  onSelectMobileTab,
}: {
  data: BookingPageData;
  profile: BookingProfile;
  tabs: readonly CategoryTab[];
  categoryId: string;
  onSelectCategory: (id: string) => void;
  visibleServices: BookingPageData["services"];
  onBookService: (serviceId: string) => void;
  mobileTab: MobileTab;
  onSelectMobileTab: (tab: MobileTab) => void;
}) {
  const { business, staff } = data;

  return (
    <div className="flex flex-1 flex-col">
      <ProfileHeader business={business} profile={profile} now={data.now} />

      {/* Dator */}
      <div className="hidden px-30 pt-20 pb-20 lg:block">
        <div className="flex gap-8">
          <main className="flex min-w-0 flex-1 flex-col gap-4.5">
            <ProfileChipsDesktop profile={profile} now={data.now} />
            <h2 className="font-display text-28 font-bold text-ink">
              {perfil.publico.secciones.reservarHora}
            </h2>
            {tabs.length > 0 ? (
              <CategoryTabs
                tabs={tabs}
                selectedId={categoryId}
                onSelect={onSelectCategory}
              />
            ) : null}
            <div className="rounded-tile bg-surface px-5">
              {visibleServices.map((service) => (
                <ProfileServiceRow
                  key={service.id}
                  service={service}
                  onSelect={() => onBookService(service.id)}
                />
              ))}
            </div>

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
          </main>

          <aside className="flex w-90 shrink-0 flex-col gap-4">
            <FastestTimesCard
              profile={profile}
              now={data.now}
              services={data.services}
              onSelect={onBookService}
            />
            <HoursCard profile={profile} />
            <MapCard address={profile.address} />
            <ContactCard
              phone={profile.phone}
              instagram={profile.instagram}
              businessName={business.name}
            />
          </aside>
        </div>
      </div>

      {/* Mobil */}
      <div className="flex flex-1 flex-col lg:hidden">
        <div
          role="tablist"
          aria-label={perfil.publico.secciones.reservarHora}
          className="flex border-b border-border px-4"
        >
          {MOBILE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={mobileTab === tab.id}
              onClick={() => onSelectMobileTab(tab.id)}
              className={`border-b-2 px-2.5 py-3 text-14 transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none ${
                mobileTab === tab.id
                  ? "border-ink font-bold text-ink"
                  : "border-transparent font-semibold text-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3.5 px-4 py-3.5 pb-32">
          {mobileTab === "servicios" ? (
            <>
              {tabs.length > 0 ? (
                <CategoryTabs
                  tabs={tabs}
                  selectedId={categoryId}
                  onSelect={onSelectCategory}
                />
              ) : null}
              <div className="flex flex-col gap-2.5">
                {visibleServices.map((service) => (
                  <ProfileServiceRow
                    key={service.id}
                    service={service}
                    onSelect={() => onBookService(service.id)}
                  />
                ))}
              </div>
            </>
          ) : null}

          {mobileTab === "personal" ? <ProfileStaff staff={staff} /> : null}

          {mobileTab === "nosotros" ? (
            profile.about ? (
              <p className="text-15 leading-relaxed text-ink-soft">
                {profile.about}
              </p>
            ) : null
          ) : null}

          {mobileTab === "info" ? (
            <div className="flex flex-col gap-3.5">
              <HoursCard profile={profile} />
              <MapCard address={profile.address} />
              <ContactCard
                phone={profile.phone}
                instagram={profile.instagram}
                businessName={business.name}
              />
            </div>
          ) : null}
        </div>

        <MobileBookBar
          profile={profile}
          data={data}
          onBookService={onBookService}
        />
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
  onBookService,
}: {
  profile: BookingProfile;
  data: BookingPageData;
  onBookService: (serviceId: string) => void;
}) {
  const next = profile.nextAvailable;
  const service = next
    ? data.services.find((s) => s.id === next.serviceId)
    : null;
  const label = nextAvailableChipLabel(data.now, profile.nextAvailable);

  return (
    <div className="fixed inset-x-3 bottom-3.5 z-10 flex items-center justify-between gap-3 rounded-panel bg-ink px-3.5 py-3 text-on-dark shadow-popover">
      <div className="min-w-0">
        {label ? <p className="truncate text-12 text-on-dark-muted">{label}</p> : null}
        {service ? (
          <p className="truncate text-13 text-on-dark-soft">
            {formatDuration(service.durationMin)} ·{" "}
            {formatMoney(service.priceClp)}
          </p>
        ) : null}
      </div>
      <Button
        variant="accent"
        size="lg"
        className="shrink-0"
        onClick={() => {
          if (next) onBookService(next.serviceId);
        }}
      >
        {perfil.publico.reservarAhora}
      </Button>
    </div>
  );
}
