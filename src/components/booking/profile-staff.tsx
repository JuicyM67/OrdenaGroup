"use client";

// ProfileStaff — sección "Personal" (`ProfilDesktop.dc.html` rad 39–44
// dibuja una fila horizontal de tarjetas de ancho fijo, avatar a la
// izquierda). WP-51 (ägarens rapport #4): en mobil, `w-50` + `flex-wrap`
// dejaba una tarjeta por fila, pegada a la izquierda y sin centrar
// (`px-4` del contenedor + `gap-3.5` nunca cabían dos tarjetas de 200 px en
// 390 px). Avvikelse medveten mot referensen (ingen `npm run visual` finns
// för profilen, se DESIGN.md §"Byggt i WP-41" — bara `ProfilDesktop.dc.html`
// finns, ingen PNG): ägaren bad uttryckligen om ett rutnät (2 kolumner
// mobil, fler kolumner dator) med jämnt stora, centrerade kort
// (avatar/foto ovanför namn + titel) i stället för raden ur referensen.
// WP-81: korten är knappar — ett klick visar bara personens behandlingar och
// lediga tider (personen förväljs i bokningen), och snittbetyget visas.
import { Star } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/components/ui/cn";
import { reserva } from "@/i18n";
import { initialsOf } from "@/lib/format/initials";

import { useProfileFlow } from "./profile-flow-context";
import { staffTone } from "./profile-view";
import type { BookingStaffMember } from "./types";

export function ProfileStaff({
  staff,
}: {
  staff: readonly BookingStaffMember[];
}) {
  const { staffFilter, onSelectStaff } = useProfileFlow();
  return (
    <div
      data-tour="staff"
      className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4"
    >
      {staff.map((member, i) => {
        const on = staffFilter?.id === member.id;
        return (
          <button
            key={member.id}
            type="button"
            aria-pressed={on}
            aria-label={reserva.verPersonal({ nombre: member.name })}
            onClick={() => {
              onSelectStaff(on ? null : { id: member.id, name: member.name });
              if (!on) {
                document
                  .getElementById("reservar-hora")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            className={cn(
              "flex flex-col items-center gap-2 rounded-icon bg-surface p-4 text-center transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
              on && "ring-2 ring-ink",
            )}
          >
            <Avatar
              initials={initialsOf(member.name)}
              photoUrl={member.photoUrl}
              alt={member.name}
              size={56}
              tone={staffTone(i)}
            />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-15 font-bold text-ink">
                {member.name}
              </span>
              {member.title ? (
                <span className="truncate text-12 text-muted">
                  {member.title}
                </span>
              ) : null}
              {member.rating ? (
                <span className="mt-1 flex items-center justify-center gap-1 text-12 font-semibold text-ink-soft">
                  <Star
                    aria-hidden="true"
                    className="size-3.5 fill-ink-soft text-ink-soft"
                    strokeWidth={0}
                  />
                  {reserva.personalNota({
                    nota: member.rating.average.toFixed(1).replace(".", ","),
                    n: member.rating.count,
                  })}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
