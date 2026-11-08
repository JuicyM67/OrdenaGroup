// "Descubre växer" (WP-85, D-070): inforuta i stället för en egen flik. Förklarar
// att katalogen fylls på, och länkar till att tipsa ett företag (kontakt) och till
// registreringen (`SIGNUP_PATH`, som under betan visar hur man ber om en inbjudan). Serverrenderad, ingen JS.
import { ArrowRight, Sprout } from "lucide-react";
import Link from "next/link";

import { cn } from "@/components/ui/cn";
import { href, SIGNUP_PATH } from "@/config/routes";
import { descubre } from "@/i18n";

const t = descubre.creciendo;

export function GrowingNotice({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "flex flex-col gap-4 rounded-card bg-lilac p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7",
        className,
      )}
    >
      <span className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface/70"
        >
          <Sprout className="size-5" strokeWidth={2} />
        </span>
        <span className="flex flex-col gap-1">
          <b className="font-display text-20 font-semibold">{t.titulo}</b>
          <span className="text-14 text-ink-soft">{t.texto}</span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col gap-2 sm:items-end">
        <Link
          href={SIGNUP_PATH}
          className="flex h-11 w-fit items-center gap-2 rounded-full bg-ink px-5 text-14 font-bold text-on-dark transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {t.paraNegocios}
          <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2} />
        </Link>
        <Link
          href={href("contacto")}
          className="rounded-badge text-13 font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ink"
        >
          {t.recomendar}
        </Link>
      </span>
    </aside>
  );
}
