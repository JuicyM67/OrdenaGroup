import type { ReactNode } from "react";
// Sidopanelens kort (dator: `ProfilDesktop.dc.html` rad 49–65) och mobilens
// flik "Info" (`ProfilMobil.dc.html` rad 34–37) delar samma fyra kort:
// "Más rápido" (mörk), "Horario", "Cómo llegar" och "Contacto". Ingen
// inbäddad karta i v1 (plan WP-41, "Skjuts upp") — bara en länk till Google
// Maps (`mapsUrl`), medveten avvikelse mot referensens `[Karta]`-platshållare.
import { Card } from "@/components/ui/card";
import { perfil } from "@/i18n";
import { APP_TZ, formatDuration, formatTime } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import { formatPhone, type E164 } from "@/lib/format/phone";

import { ProfileServiceButton } from "./profile-interactive";
import {
  fastestTimeDetail,
  hoursRows,
  mapsUrl,
  mustParseInstant,
} from "./profile-view";
import type { BookingProfile, BookingService, IsoInstant } from "./types";

// Rena externa länkar (Google Maps) — `<a>` rakt av, inte `TextLink`
// (`next/link`): `next/link` finns annars ingenstans i den här routens
// klientbunt (`/{slug}` har ingen intern navigation), så den skulle bara dra
// in `next/link`s klientkod för en länk som aldrig navigerar inom appen
// (JS-budgeten, D-032, e2e/reserva.spec.ts). Samma textstil som `TextLink`
// (text-link.tsx), kopierad hit av samma skäl. Instagram/TikTok/Facebook
// (WP-51) har egna ikonknappar, se `SocialLinks` (social-icons.tsx).
const EXTERNAL_LINK_CLASS =
  "text-13 font-semibold text-ink underline transition-colors duration-150 ease-out hover:text-pending-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none";

function formatTimeOnly(start: IsoInstant): string {
  return formatTime(mustParseInstant(start, "formatTimeOnly"), APP_TZ);
}

export function FastestTimesCard({
  profile,
  now,
  services,
}: {
  profile: BookingProfile;
  now: IsoInstant;
  services: readonly BookingService[];
}) {
  const next = profile.nextAvailable;
  if (!next) return null;
  const service = services.find((s) => s.id === next.serviceId);
  if (!service) return null;

  return (
    <Card
      tone="dark"
      radius="tile"
      padding="lg"
      className="flex flex-col gap-3"
      data-tour="flash"
    >
      <p className="text-16 font-semibold">{perfil.publico.masRapido}</p>
      <ProfileServiceButton
        serviceId={next.serviceId}
        className="rounded-event bg-lime px-3 py-2.5 text-center text-13 font-bold text-ink transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime focus-visible:transition-none"
      >
        {formatTimeOnly(next.start)}
      </ProfileServiceButton>
      <span className="text-12 text-on-dark-muted">
        {fastestTimeDetail(now, next.start, service.name)}
        {" · "}
        {formatDuration(service.durationMin)} · {formatMoney(service.priceClp)}
      </span>
    </Card>
  );
}

export function HoursCard({ profile }: { profile: BookingProfile }) {
  const rows = hoursRows(profile.hours);
  return (
    <Card radius="tile" padding="lg" className="flex flex-col gap-2.5">
      <p className="text-15 font-bold text-ink">
        {perfil.publico.secciones.horario}
      </p>
      <div className="flex flex-col gap-1 text-14 text-ink-soft">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-2.5"
          >
            <span>{row.label}</span>
            <span>{row.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function MapCard({ address }: { address: string | null }) {
  if (!address) return null;
  return (
    <Card radius="tile" padding="lg" className="flex flex-col gap-2.5">
      <p className="text-15 font-bold text-ink">
        {perfil.publico.secciones.comoLlegar}
      </p>
      <span className="text-14 text-ink">{address}</span>
      <a
        href={mapsUrl(address)}
        target="_blank"
        rel="noopener noreferrer"
        className={EXTERNAL_LINK_CLASS}
      >
        {perfil.publico.verRuta}
      </a>
    </Card>
  );
}

export function ContactCard({
  phone,
  hasSocial,
  social,
}: {
  phone: string | null;
  hasSocial: boolean;
  social?: ReactNode;
}) {
  if (!phone && !hasSocial) return null;
  return (
    <Card radius="tile" padding="lg" className="flex flex-col gap-2.5">
      <p className="text-15 font-bold text-ink">
        {perfil.publico.secciones.contacto}
      </p>
      {phone ? (
        <span className="text-14 text-ink">{formatPhone(phone as E164)}</span>
      ) : null}
      {social}
    </Card>
  );
}
