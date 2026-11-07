// ProfileServiceHeader — huvudet på en tjänsterad (accordion, WP-72, `Main.dc.html`
// "Frisör"-listan): namn + längd, små cirklar med initialer för dem som utför tjänsten,
// pris och chevron. Serverkomponent (WP-53/D-040): all text och formatering renderas på
// servern; accordionen själv (`ProfileServiceList`, profile-interactive.tsx) är klientön.
import { ChevronDown } from "lucide-react";

import { paquetes, perfil } from "@/i18n";
import { formatDuration } from "@/lib/format/dates";
import { initialsOf } from "@/lib/format/initials";
import { formatMoney } from "@/lib/format/money";

import { formatServicePrice } from "./format-price";
import { staffTone, type StaffTone } from "./profile-view";
import type { BookingService, BookingStaffMember } from "./types";

const TONE_BG: Record<StaffTone, string> = {
  lilac: "bg-lilac",
  peach: "bg-peach",
  sky: "bg-sky",
};

const MAX_CIRCLES = 4;

export function ProfileServiceHeader({
  service,
  staff,
}: {
  service: BookingService;
  staff: readonly BookingStaffMember[];
}) {
  const ids = new Set(service.staffIds ?? []);
  const doing = staff
    .map((member, i) => ({ member, tone: staffTone(i) }))
    .filter(({ member }) => ids.has(member.id));
  const shown = doing.slice(0, MAX_CIRCLES);
  const extra = doing.length - shown.length;

  return (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-15 font-bold text-ink">{service.name}</span>
        <span className="mt-0.5 block text-12 text-muted">
          {formatDuration(service.durationMin)}
        </span>
        {service.packageOffer ? (
          <span className="mt-0.5 block text-12 text-muted">
            {paquetes.publico.disponible({
              n: service.packageOffer.sessions,
              precio: formatMoney(service.packageOffer.priceClp),
            })}
          </span>
        ) : null}
      </span>
      {doing.length > 0 ? (
        <span
          role="img"
          aria-label={perfil.publico.haceElServicio({
            nombre: doing.map(({ member }) => member.name).join(", "),
          })}
          className="flex shrink-0 pl-1.5"
        >
          {shown.map(({ member, tone }) => (
            <span
              key={member.id}
              aria-hidden="true"
              title={member.name}
              className={`-ml-1.5 flex size-7 items-center justify-center rounded-full border-2 border-surface text-11 font-bold text-ink ${TONE_BG[tone]}`}
            >
              {initialsOf(member.name).slice(0, 1)}
            </span>
          ))}
          {extra > 0 ? (
            <span
              aria-hidden="true"
              className="-ml-1.5 flex size-7 items-center justify-center rounded-full border-2 border-surface bg-canvas text-11 font-bold text-ink"
            >
              +{extra}
            </span>
          ) : null}
        </span>
      ) : null}
      <span className="w-18.5 shrink-0 text-right text-15 font-bold text-ink">
        {formatServicePrice(service)}
      </span>
      <span
        aria-hidden="true"
        className="flex size-7.5 shrink-0 items-center justify-center rounded-chip bg-canvas transition-transform duration-300 ease-out group-aria-expanded:rotate-180"
      >
        <ChevronDown className="size-3.5 text-ink" strokeWidth={2.5} />
      </span>
    </>
  );
}
