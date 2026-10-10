// USP-karusellen längst ner i heron: bara glasrutor (ikon + rubrik + rad) som rullar
// långsamt och pausar när man hovrar (WP-71, Konv1.dc.html). Listan dubbleras för en
// sömlös loop; kopian är `aria-hidden`.
import {
  BarChart3,
  Bell,
  CalendarDays,
  Contact,
  CreditCard,
  Download,
  Gift,
  Hourglass,
  LayoutTemplate,
  Link2,
  MailPlus,
  Star,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/components/ui/cn";
import { strokeCard } from "@/components/ui/icons";
import { brand } from "@/config/brand";
import { copy } from "@/i18n/marketing";

const t = copy.home.hero;

const ICONS: Record<string, LucideIcon> = {
  reserva: CalendarDays,
  pago: CreditCard,
  resenas: Star,
  flash: Zap,
  espera: Hourglass,
  recordatorios: Bell,
  flytt: Download,
  pagina: LayoutTemplate,
  volver: MailPlus,
  caja: BarChart3,
  equipo: Users,
  clientes: Contact,
};
const TONES = [
  "bg-lavender",
  "bg-success-bg",
  "bg-peach-50",
  "bg-lime-50",
  "bg-sky",
];

function UspCard({ index }: { index: number }) {
  const u = t.usps[index]!;
  const Icon = ICONS[u.id] ?? Link2 ?? Gift;
  return (
    <div className="flex h-32 w-48 flex-none flex-col justify-between rounded-card p-3.5 glass-light transition-all duration-300 ease-out hover:-translate-y-1.5 hover:scale-102 lg:h-37.5 lg:w-57.5 lg:p-4.5">
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-avatar text-ink",
          TONES[index % TONES.length],
        )}
      >
        <Icon className="size-5" strokeWidth={strokeCard} aria-hidden="true" />
      </span>
      <span className="flex flex-col gap-1">
        <b className="text-15 leading-snug lg:text-16">{u.titulo}</b>
        <span className="text-12 leading-body text-ink-soft lg:text-event-title">
          {u.texto}
        </span>
      </span>
    </div>
  );
}

export function UspMarquee({ className }: { className?: string }) {
  const idx = t.usps.map((_, i) => i);
  return (
    <div
      role="region"
      aria-label={t.marqueeAria({ nombre: brand.name })}
      className={cn("overflow-hidden", className)}
    >
      <div className="flex w-max animate-marquee-slow gap-3.5 py-2 pr-3.5 marquee-pausable">
        {idx.map((i) => (
          <UspCard key={i} index={i} />
        ))}
        <div aria-hidden="true" className="contents">
          {idx.map((i) => (
            <UspCard key={`b${i}`} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
