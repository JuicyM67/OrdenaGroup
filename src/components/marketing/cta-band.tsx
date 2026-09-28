// Mörkt CTA-band i botten av varje sida på sitio-webben (WP-hemsida). Samma mörka hero-kort
// och enda accent-knapp som förut (max en lime primärhandling per vy, DESIGN.md §2.3).
// Retro 2026-09-28, punkt 4: bakgrundsfotot (`cta-barberia.webp`) är borta. I stället en liten
// telefonmockup av "Hoy" (dagens bokningar) som sticker ut ovanför kortets överkant, med två
// svävande minikort som överlappar telefonens kant — samma SaaS-liknande komposition som
// hero-visual-preview.tsx, fast i mindre skala och helt statisk (inget behov av animation så
// långt ner på sidan). Delad av alla sidor som importerar `CtaBand`, så de får alla den nya
// looken utan egna ändringar. Rent dekorativ (`aria-hidden`): rubrik/text/knapp bär den
// faktiska informationen, precis som förut.
import { Calendar } from "lucide-react";
import Link from "next/link";

import { staffBgClass } from "@/components/agenda/agenda-view";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { strokeCard } from "@/components/ui/icons";
import { copy } from "@/i18n/marketing";

import { DEMO } from "./demo-data";

/** Vy de "Hoy" con el próximo cliente y el resto del día (`copy.hoy.*`, D-025/D-026), más dos
 * minikort que se superponen a sus esquinas: uno con una cifra + ícono (sin texto inventado,
 * la retro lo permite explícitamente) y otro con una reserva de ejemplo (`DEMO`). */
function CtaPhonePreview({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative mx-auto w-52 shrink-0 sm:w-60", className)}
    >
      <Card
        tone="dark-2"
        radius="hero"
        padding="md"
        className="relative -rotate-2 shadow-popover"
      >
        <span className="text-12 font-bold text-on-dark-muted">
          {copy.hoy.titulo}
        </span>
        <div className="mt-3 flex flex-col gap-1.5">
          <span className="text-11 text-on-dark-muted">
            {copy.hoy.siguiente({
              relativo: copy.hoy.relativo.enMin({ n: 20 }),
            })}
          </span>
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-22 leading-none font-semibold tracking-display text-on-dark">
              15:00
            </span>
            <Chip size="xs" weight="bold" tone="success">
              {copy.estados.confirmada}
            </Chip>
          </div>
          <span className="truncate text-14 font-bold text-on-dark">
            {DEMO.kund}
          </span>
        </div>
        <div className="mt-4 flex flex-col gap-1.5">
          <span className="text-10 font-bold tracking-caps text-on-dark-faint uppercase">
            {copy.hoy.restoDia.titulo}
          </span>
          <div
            className={cn(
              "flex items-center justify-between rounded-event px-2.5 py-1.5 text-ink",
              staffBgClass(2),
            )}
          >
            <span className="truncate text-12 font-bold">
              {DEMO.tjanster[1]}
            </span>
            <span className="text-11 text-ink-soft">16:30</span>
          </div>
          <div
            className={cn(
              "flex items-center justify-between rounded-event px-2.5 py-1.5 text-ink",
              staffBgClass(3),
            )}
          >
            <span className="truncate text-12 font-bold">
              {DEMO.tjanster[2]}
            </span>
            <span className="text-11 text-ink-soft">18:00</span>
          </div>
        </div>
      </Card>

      {/* Cifra + ícono, sin texto (retro: "bara siffror/ikoner" es la opción explícita
          cuando no hay una frase corta ya existente para "+N reservas esta semana"). */}
      <Card
        tone="surface"
        radius="tile"
        padding="md"
        className="absolute -top-5 -left-5 flex w-22 flex-col items-start gap-1 shadow-popover sm:-left-9"
      >
        <Calendar
          aria-hidden="true"
          className="size-4 text-muted"
          strokeWidth={strokeCard}
        />
        <span className="font-display text-24 font-semibold tracking-display text-ink">
          +12
        </span>
      </Card>

      <Card
        tone="surface"
        radius="tile"
        padding="md"
        className="absolute -right-5 -bottom-6 flex w-32 flex-col gap-1.5 shadow-popover sm:-right-9"
      >
        <span className="truncate text-12 font-bold text-ink">{DEMO.kund}</span>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-11 text-muted">{DEMO.kort}</span>
          <Chip size="xs" weight="bold" tone="success">
            {copy.estados.confirmada}
          </Chip>
        </div>
      </Card>
    </div>
  );
}

export function CtaBand({
  title,
  text,
  buttonLabel,
  href,
}: {
  title: string;
  text: string;
  buttonLabel: string;
  href: string;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
      <Card
        tone="dark"
        radius="hero"
        padding="none"
        className="flex flex-col items-center gap-10 p-8 text-center sm:p-10 lg:flex-row lg:items-end lg:justify-between lg:gap-14 lg:py-12 lg:text-left"
      >
        <div className="flex max-w-lg flex-col items-center gap-5 pb-2 lg:items-start">
          <h2 className="font-display text-28 font-bold tracking-display text-on-dark sm:text-32">
            {title}
          </h2>
          <p className="text-16 leading-relaxed text-on-dark-soft">{text}</p>
          <Button asChild variant="accent" size="xl">
            <Link href={href}>{buttonLabel}</Link>
          </Button>
        </div>
        {/* `lg:-mt-24`: el teléfono sube por encima del propio borde superior del `Card`
            (Card no recorta overflow, DESIGN.md §4 — sin ese negativo quedaría centrado
            dentro de la fila, contenido dentro del borde). Solo en `lg:`: en mobile el
            teléfono simplemente sigue al texto en el flujo normal. */}
        <CtaPhonePreview className="lg:-mt-24" />
      </Card>
    </section>
  );
}
