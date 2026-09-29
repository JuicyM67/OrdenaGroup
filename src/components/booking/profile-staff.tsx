// ProfileStaff — sección "Personal" (`ProfilDesktop.dc.html` rad 39–44). Sin
// referencia de ancho fijo en mobil (el mockup solo tiene la versión de
// escritorio): en mobil las tarjetas envuelven en vez de desbordar
// horizontalmente (`flex-wrap`), mismo ancho de tarjeta.
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
    <div className="flex flex-wrap gap-3.5">
      {staff.map((member, i) => (
        <div
          key={member.id}
          className="flex w-50 items-center gap-2.5 rounded-icon bg-surface p-3.5"
        >
          <Avatar
            initials={initialsOf(member.name)}
            size={46}
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
