// WP-86 (D-072): kundens paket på `/r/[token]` — namn, kvarvarande sessioner
// och giltighet, inga priser. Ingen "use client": renderas på servern och
// skickas som färdigt innehåll till `ManageScreen` (`packagesSlot`).
import { Card } from "@/components/ui/card";
import { paquetes } from "@/i18n";
import type { LocalDate } from "@/lib/format/dates";

import { formatExpiry } from "./types";

export type ManagePackage = {
  id: string;
  name: string;
  sessionsTotal: number;
  remaining: number;
  expiresOn: LocalDate | null;
};

export function ManagePackages({
  packages,
}: {
  packages: readonly ManagePackage[];
}) {
  if (packages.length === 0) return null;
  return (
    <Card radius="tile" padding="lg" className="flex flex-col gap-3">
      <h2 className="text-15 font-bold text-ink">{paquetes.gestion.titulo}</h2>
      <ul className="flex flex-col gap-3">
        {packages.map((p) => (
          <li key={p.id} className="flex flex-col gap-0.5">
            <span className="text-14 font-bold text-ink">{p.name}</span>
            <span className="text-13 text-ink">
              {paquetes.gestion.quedan({
                n: p.remaining,
                total: p.sessionsTotal,
              })}
            </span>
            {p.expiresOn ? (
              <span className="text-12 text-muted">
                {paquetes.gestion.vence({ fecha: formatExpiry(p.expiresOn) })}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="text-12 text-muted">{paquetes.gestion.ayuda}</p>
    </Card>
  );
}
