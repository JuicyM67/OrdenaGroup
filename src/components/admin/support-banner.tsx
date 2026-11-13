// WP-105 (D-079): flytande banderoll i företagets panel när en plattformsadmin
// är inne i modo soporte. Serverkomponent: "Salir" är ett vanligt formulär
// (server action). Ligger fast ovanför mobilmenyn och påverkar inte layouten.
import { LifeBuoy } from "lucide-react";

import { adminPanel } from "@/i18n";
import { APP_TZ, formatTime } from "@/lib/format/dates";

export function SupportBanner({
  businessName,
  until,
  onEnd,
}: {
  businessName: string;
  until: string;
  onEnd: () => Promise<void>;
}) {
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-xl items-center gap-3 rounded-full bg-ink py-2 pr-2 pl-4 text-14 text-on-dark shadow-soft lg:bottom-6"
    >
      <LifeBuoy
        aria-hidden="true"
        className="size-4.5 shrink-0 text-lime"
        strokeWidth={2}
      />
      <p className="min-w-0 flex-1 truncate font-semibold">
        {adminPanel.soporte.banner({
          nombre: businessName,
          hora: formatTime(new Date(until), APP_TZ),
        })}
      </p>
      <form action={onEnd}>
        <button
          type="submit"
          className="h-9 shrink-0 rounded-full bg-lime px-4 text-13 font-bold text-ink transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
        >
          {adminPanel.soporte.salir}
        </button>
      </form>
    </div>
  );
}
