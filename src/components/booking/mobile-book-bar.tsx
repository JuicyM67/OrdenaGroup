// Fast "Boka nu"-rad i mobilen (`ProfilMobil.dc.html` rad 39). Rad 1 är
// samma hela mening som huvudets chip (`chips.proximaHora`). Rad 2 (WP-81)
// visar tjänsten tiden gäller: namnet avkortas med ellips, resten (längd och
// pris) står i ett eget element som aldrig kortas.
import { perfil } from "@/i18n";
import { formatDuration } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";

import { ProfileBookNowButton } from "./profile-interactive";
import { nextAvailableChipLabel } from "./profile-view";
import type { BookingPageData, BookingProfile } from "./types";

export function MobileBookBar({
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
  const duracion = service ? formatDuration(service.durationMin) : "";
  const precio = service ? formatMoney(service.priceClp) : "";

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
          <p
            title={perfil.publico.barraServicio({
              nombre: service.name,
              duracion,
              precio,
            })}
            className="flex min-w-0 gap-1 text-13 text-on-dark-soft"
          >
            <span className="truncate">{service.name}</span>
            <span className="shrink-0">
              {perfil.publico.barraServicioResto({ duracion, precio })}
            </span>
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
