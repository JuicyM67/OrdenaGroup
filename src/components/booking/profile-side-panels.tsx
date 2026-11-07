import type { ReactNode } from "react";
// Sidopanelens kort (dator: `ProfilDesktop.dc.html` rad 49–65) och mobilens
// flik "Info" (`ProfilMobil.dc.html` rad 34–37) delar samma fyra kort:
// "Más rápido" (mörk), "Horario", "Cómo llegar" och "Contacto". WP-81:
// "Cómo llegar" visar en stillbild av kartan (OpenStreetMap) och knappar för
// vägbeskrivning. Externa länkar är vanliga `<a>`, inte `next/link` (JS-
// budgeten, D-032, e2e/reserva.spec.ts).
import { MapPin } from "lucide-react";

import { Card } from "@/components/ui/card";
import { perfil } from "@/i18n";
import { APP_TZ, formatDuration, formatTime } from "@/lib/format/dates";
import { formatPhone, type E164 } from "@/lib/format/phone";

import { formatServicePrice } from "./format-price";
import { ProfileServiceButton } from "./profile-interactive";
import {
  appleMapsUrl,
  directionsUrl,
  fastestTimeDetail,
  hoursRows,
  mapsUrl,
  mustParseInstant,
  osmTileMap,
} from "./profile-view";
import type { BookingProfile, BookingService, IsoInstant } from "./types";

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
        {formatDuration(service.durationMin)} · {formatServicePrice(service)}
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

/** WP-81: stillbild av OpenStreetMap med vår egen nål och bara den
 * attribution licensen kräver. Ett klick på kartan öppnar vägbeskrivningen. */
function MapPreview({
  address,
  geo,
}: {
  address: string;
  geo: { lat: number; lng: number };
}) {
  const map = osmTileMap(geo);
  return (
    <div className="relative aspect-16/10 w-full overflow-hidden rounded-control bg-canvas">
      <div
        aria-hidden="true"
        className="absolute saturate-50"
        style={{
          left: `calc(50% - ${map.offset.x.toFixed(1)}px)`,
          top: `calc(50% - ${map.offset.y.toFixed(1)}px)`,
          width: map.grid.width,
          height: map.grid.height,
        }}
      >
        {map.tiles.map((t) => (
          // eslint-disable-next-line @next/next/no-img-element -- externa kartrutor, ingen optimering behövs
          <img
            key={t.src}
            src={t.src}
            alt=""
            width={256}
            height={256}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute max-w-none select-none"
            style={{ left: t.left, top: t.top }}
          />
        ))}
      </div>
      <MapPin
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 size-9 -translate-x-1/2 -translate-y-full fill-ink text-surface"
        strokeWidth={1.5}
      />
      <a
        href={directionsUrl(address, geo)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={perfil.publico.mapaTitulo({ direccion: address })}
        className="absolute inset-0 rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      />
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute right-1.5 bottom-1.5 rounded-badge bg-surface/85 px-1.5 py-0.5 text-11 text-muted hover:text-ink"
      >
        {perfil.publico.mapaAtribucion}
      </a>
    </div>
  );
}

/** "Cómo llegar" (WP-81): liten karta (stillbild, ingen JS i bokningssidans
 * bunt, D-039), adress och vägbeskrivning i Google Maps/Apple Maps. Utan
 * geokodad position: adress + vägbeskrivning på adressen. */
export function MapCard({
  address,
  geo,
}: {
  address: string | null;
  geo?: { lat: number; lng: number } | null;
}) {
  if (!address) return null;
  return (
    <Card radius="tile" padding="lg" className="flex flex-col gap-3">
      <p className="text-15 font-bold text-ink">
        {perfil.publico.secciones.comoLlegar}
      </p>
      {geo ? <MapPreview address={address} geo={geo} /> : null}
      <a
        href={mapsUrl(address)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-14 text-ink hover:underline"
      >
        {address}
      </a>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={directionsUrl(address, geo)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 items-center rounded-full bg-ink px-4 text-13 font-bold text-on-dark hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {perfil.publico.indicaciones}
        </a>
        <a
          href={appleMapsUrl(address, geo)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 items-center rounded-full border border-border bg-surface px-4 text-13 font-bold text-ink hover:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {perfil.publico.appleMaps}
        </a>
      </div>
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
