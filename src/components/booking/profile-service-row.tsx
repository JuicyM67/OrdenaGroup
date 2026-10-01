// ProfileServiceRow — una fila de "Boka tid" (`ProfilDesktop.dc.html` rad 34–37,
// `ProfilMobil.dc.html` rad 30–33). Toda la fila es el control accesible (un
// solo `<button>`, mismo patrón que `service-card.tsx`): el pill "Boka" de la
// referencia es decorativo (`aria-hidden`) para que el nombre accesible del
// botón siga siendo el del servicio — así "Boka" arranca el flujo existente
// (`onSelect`) sin romper el selector que ya usa `e2e/reserva.spec.ts`
// (`getByRole("button", { name: /Corte clásico/ })`).
// WP-53 (D-040): serverkomponent — bara el `<button>` (`ProfileServiceButton`,
// profile-interactive.tsx) es un cliente, lee el `serviceId` y llama a
// `bookService` vía `ProfileFlowContext`. Texto/formato siguen en el servidor.
import { perfil } from "@/i18n";
import { formatMoney } from "@/lib/format/money";
import { formatDuration } from "@/lib/format/dates";

import { ProfileServiceButton } from "./profile-interactive";
import type { BookingService } from "./types";

export function ProfileServiceRow({ service }: { service: BookingService }) {
  const detalle = perfil.publico.servicioDetalle({
    duracion: formatDuration(service.durationMin),
    descripcion: service.description ?? undefined,
  });

  return (
    <ProfileServiceButton
      serviceId={service.id}
      // `aria-label` med namn + varaktighet, INTE hela `detalle` (qa-fynd,
      // e2e/reserva.spec.ts): utan den blir hela radens text — inklusive
      // ägarens fria beskrivningstext — den tillgängliga namnet, och en
      // beskrivning som råkar nämna en annan tjänsts namn ("Corte + barba:
      // incluye un corte clásico y arreglo de barba") gör då
      // `getByRole("button", { name: /Corte clásico/ })` tvetydig (samma
      // krock som QA-testet fångade). Priset utelämnas här av samma skäl
      // som `ServiceCard` tidigare aldrig visade beskrivningen i sitt namn —
      // det är kvar i `BookingBar` när tjänsten väl är vald.
      ariaLabel={`${service.name} · ${formatDuration(service.durationMin)}`}
      className="flex w-full items-center gap-4 rounded-icon bg-surface p-3.5 text-left transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none lg:rounded-none lg:border-b lg:border-line-strong lg:bg-transparent lg:p-0 lg:py-4 lg:last:border-b-0"
    >
      <span aria-hidden="true" className="min-w-0 grow">
        <span className="block text-15 font-bold text-ink">{service.name}</span>
        <span className="mt-0.5 block truncate text-13 text-muted">
          {detalle}
        </span>
      </span>
      <span className="hidden shrink-0 text-15 font-bold text-ink lg:inline">
        {formatMoney(service.priceClp)}
      </span>
      <span
        aria-hidden="true"
        className="shrink-0 rounded-icon bg-lime px-4 py-2.5 text-13 font-bold text-ink"
      >
        {perfil.publico.reservar}
      </span>
    </ProfileServiceButton>
  );
}
