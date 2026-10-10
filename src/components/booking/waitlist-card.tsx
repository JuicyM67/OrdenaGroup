// WaitlistCard — Reserva.dc.html rad 75–84 / DESIGN.md §7. Ersätter tiderna när
// dagen är full.
import { Check } from "lucide-react";

import { Card } from "@/components/ui/card";
import { errores, reserva } from "@/i18n";
import { formatLocalDate, type LocalDate } from "@/lib/format/dates";

export function WaitlistCard({
  date,
  joined,
  duplicate,
  waitlist = true,
}: {
  date: LocalDate;
  joined: boolean;
  duplicate?: boolean;
  /** WP-73 (D-048): `false` när företagets plan saknar väntelista. */
  waitlist?: boolean;
}) {
  const dia = formatLocalDate(date, "weekdayLongLower");

  return (
    <Card
      tone="peach"
      radius="tile"
      padding="lg"
      className="flex flex-col gap-3"
    >
      <div className="text-16 font-bold text-ink">
        {reserva.waitlist.diaLleno({ dia })}
      </div>
      {waitlist ? (
        <div className="text-14 leading-body text-on-peach-soft">
          {reserva.waitlist.cuerpo}
        </div>
      ) : null}
      {joined ? (
        <div
          role="status"
          className="flex items-center gap-2 text-14 font-bold text-success-fg"
        >
          <Check aria-hidden="true" className="size-4.5" strokeWidth={2.6} />
          {reserva.waitlist.listo}
        </div>
      ) : null}
      {duplicate ? (
        <div role="alert" className="text-13 text-ink">
          {errores.reserva.waitlist_duplicate}
        </div>
      ) : null}
    </Card>
  );
}
