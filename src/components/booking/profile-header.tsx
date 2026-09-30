// ProfileHeader — omslag + logga/initialer + namn + bransch/adress + chips
// (`ProfilDesktop.dc.html` rad 21–30, `ProfilMobil.dc.html` rad 20–26). En enda
// komponent för båda bredderna (Tailwind `lg:`, se booking-screen.tsx): mobil
// har logga+namn kvar inne i omslaget (`bottom-4`), dator låter loggan+namnet
// svälla ut 56 px under omslaget (`-bottom-14`, samma tal som referensens
// `bottom:-56px`). Bilden/gradienten kläs av en egen `overflow-hidden`-yta
// (inte hela omslags-`<div>`:en) så att den utsvämmande delen inte klipps.
// `<img>` normal, inte `next/image` — samma JS-budgetskäl som
// `profile-gallery.tsx` (se den filens kommentar).
import { Chip } from "@/components/ui/chip";
import { initialsOf } from "@/lib/format/initials";

import { SocialLinks } from "./social-icons";
import {
  businessCategoryLabel,
  nextAvailableChipLabel,
  openChipLabel,
} from "./profile-view";
import type { BookingBusiness, BookingProfile, IsoInstant } from "./types";

export function ProfileHeader({
  business,
  profile,
  now,
}: {
  business: BookingBusiness;
  profile: BookingProfile;
  now: IsoInstant;
}) {
  const initials = initialsOf(business.name);
  const proximaHora = nextAvailableChipLabel(now, profile.nextAvailable);
  // WP-51: "Barbería · Providencia" (bransch · comuna), no comuna + dirección
  // completa (esa combinación repetía la comuna dos veces — ver el reporte).
  // Misma forma que la referencia ("Frisör · Götgatan 12").
  const location = [businessCategoryLabel(business.category), business.comuna]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col">
      <div className="relative h-60 shrink-0 bg-dark lg:h-80">
        <div className="absolute inset-0 overflow-hidden">
          {profile.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- se filkommentaren (JS-budgeten).
            <img
              src={profile.coverUrl}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          ) : null}
          {/* Mörk gradient för läsbar vit text ovanpå fotot (design: `linear-gradient(180deg,
           * transparent 30/40%, rgba(22,22,26,.55/.6) 100%)` — förenklad till en gradient utan
           * egna stopp-positioner, samma teknik som `marketing/hero-bento.tsx`). */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-ink/0 to-ink/60"
          />
        </div>

        {/* Mobil: logga + namn kvar inne i omslaget. */}
        <div className="absolute inset-x-4 bottom-4 flex items-end gap-3 text-on-dark lg:hidden">
          <ProfileLogo url={profile.logoUrl} initials={initials} size="sm" />
          <div className="min-w-0">
            <h1 className="truncate font-display text-26 font-bold">
              {business.name}
            </h1>
            <p className="truncate text-13">{location}</p>
          </div>
        </div>

        {/* Dator: loggan+namnet sticker ut 56 px under omslaget. */}
        <div className="absolute -bottom-14 left-30 hidden items-end gap-5 text-on-dark lg:flex">
          <ProfileLogo url={profile.logoUrl} initials={initials} size="lg" />
          <div className="pb-16">
            <h1 className="font-display text-40 font-bold">{business.name}</h1>
            <p className="text-15 opacity-95">{location}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3.5 lg:hidden">
        <Chip tone="success" size="sm">
          {openChipLabel(profile.openNow)}
        </Chip>
        {proximaHora ? (
          <Chip tone="neutral" size="sm">
            {proximaHora}
          </Chip>
        ) : null}
        <SocialLinks
          instagramUrl={profile.instagramUrl}
          tiktokUrl={profile.tiktokUrl}
          facebookUrl={profile.facebookUrl}
          businessName={business.name}
          tone="surface"
          size={36}
          className="ml-auto"
        />
      </div>
    </div>
  );
}

function ProfileLogo({
  url,
  initials,
  size,
}: {
  url: string | null;
  initials: string;
  size: "sm" | "lg";
}) {
  // Referensen sätter ingen kant på mobilens 64 px-logga, bara på datorns
  // 120 px-version (5 px `#F4F4F0`) — Tailwinds fasta breddskala (0/2/4/8,
  // D-015 rör inte den) har ingen `border-5`, så `border-4` är närmaste
  // tillåtna värde i stället för ett godtyckligt `border-[5px]`.
  const box =
    size === "sm"
      ? "size-16 rounded-icon"
      : "size-30 rounded-hero border-4 border-canvas";
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-lime font-display font-bold text-ink ${box} ${
        size === "sm" ? "text-22" : "text-40"
      }`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- se filkommentaren (JS-budgeten).
        <img
          src={url}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}

export function ProfileChipsDesktop({
  profile,
  now,
  businessName,
}: {
  profile: BookingProfile;
  now: IsoInstant;
  businessName: string;
}) {
  const proximaHora = nextAvailableChipLabel(now, profile.nextAvailable);
  return (
    <div className="hidden items-center gap-2 lg:flex">
      <Chip tone="success" size="sm">
        {openChipLabel(profile.openNow)}
      </Chip>
      {proximaHora ? (
        <Chip tone="neutral" size="sm">
          {proximaHora}
        </Chip>
      ) : null}
      <SocialLinks
        instagramUrl={profile.instagramUrl}
        tiktokUrl={profile.tiktokUrl}
        facebookUrl={profile.facebookUrl}
        businessName={businessName}
        tone="surface"
        size={36}
        className="ml-auto"
      />
    </div>
  );
}
