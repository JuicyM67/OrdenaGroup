// Trygghetsrad med färgade ikoncirklar (hero, avslutande CTA och inloggningen).
import { Globe, Lock, MessageCircle, type LucideIcon } from "lucide-react";

import { copy } from "@/i18n/marketing";

// Samma pasteller som personalens initialcirklar i bokningssidan.
const TRUST_TONES: Record<string, string> = {
  pago: "bg-staff-1",
  datos: "bg-staff-5",
  soporte: "bg-staff-4",
};

const TRUST_ICONS: Record<string, LucideIcon> = {
  pago: Lock,
  datos: Globe,
  soporte: MessageCircle,
};

export function TrustRow({ className }: { className?: string }) {
  return (
    <ul
      className={`flex flex-wrap gap-x-5 gap-y-2 text-13 font-semibold text-on-dark/95 ${className ?? ""}`}
    >
      {copy.home.confianza.map((c) => {
        const Icon = TRUST_ICONS[c.id] ?? Lock;
        return (
          <li key={c.id} className="flex items-center gap-2">
            <span
              className={`flex size-7 flex-none items-center justify-center rounded-full text-ink ${TRUST_TONES[c.id] ?? "bg-staff-2"}`}
            >
              <Icon className="size-3.5" strokeWidth={2} aria-hidden="true" />
            </span>
            {c.texto}
          </li>
        );
      })}
    </ul>
  );
}
