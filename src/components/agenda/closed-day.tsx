// Se DESIGN.md §7 "Byggt i WP-12". Ingen geometri räknad ur data — bara tokens/klasser.
import { agenda } from "@/i18n";

export function ClosedDay() {
  return (
    <div className="absolute top-5 right-1.5 bottom-4 left-1.5 flex items-center justify-center rounded-avatar bg-closed-stripes text-13 font-semibold text-muted">
      {agenda.diaCerrado}
    </div>
  );
}
