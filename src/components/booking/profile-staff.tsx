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
import { Avatar } from "@/components/ui/avatar";
import { initialsOf } from "@/lib/format/initials";

import { staffTone } from "./profile-view";
import type { BookingStaffMember } from "./types";

export function ProfileStaff({
  staff,
}: {
  staff: readonly BookingStaffMember[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
      {staff.map((member, i) => (
        <div
          key={member.id}
          className="flex flex-col items-center gap-2 rounded-icon bg-surface p-4 text-center"
        >
          <Avatar
            initials={initialsOf(member.name)}
            photoUrl={member.photoUrl}
            alt={member.name}
            size={56}
            tone={staffTone(i)}
          />
          <div className="min-w-0">
            <p className="truncate text-15 font-bold text-ink">{member.name}</p>
            {member.title ? (
              <p className="truncate text-12 text-muted">{member.title}</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
