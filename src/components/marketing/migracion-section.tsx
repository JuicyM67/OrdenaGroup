// Sektion "Smärtfri flytt" på startsidan (WP-70): berättar om AI-importen (WP-66) med en
// liten 3-stegsvisual (länk -> "Läser in…" -> färdig lista). Visualen är dekorativ
// (`aria-hidden`); stegen och texten bär informationen. Rörelsen stängs av av
// `prefers-reduced-motion` (src/app/globals.css).
import { Check, Link2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { strokeCard } from "@/components/ui/icons";
import { copy } from "@/i18n/marketing";
import { SIGNUP_PATH } from "@/config/routes";

const t = copy.sitio.inicio.migracion;

const PASOS = [t.pasos.pegar, t.pasos.leer, t.pasos.revisar] as const;

function MigracionVisual() {
  return (
    <div
      aria-hidden="true"
      className="flex w-full max-w-sm flex-col gap-3 sm:gap-4"
    >
      <Card
        tone="surface"
        radius="tile"
        padding="md"
        className="animate-fade-up"
      >
        <div className="flex items-center gap-2.5">
          <Link2
            className="size-4 shrink-0 text-muted"
            strokeWidth={strokeCard}
          />
          <span className="truncate text-14 font-semibold text-ink">
            {t.visual.link}
          </span>
        </div>
      </Card>
      <Card tone="dark" radius="tile" padding="md" className="animate-pop-in">
        <span className="text-13 font-semibold text-on-dark">
          {t.visual.leyendo}
        </span>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-dark-2">
          <div className="h-full origin-left animate-load-bar rounded-full bg-lime" />
        </div>
      </Card>
      <Card
        tone="surface"
        radius="tile"
        padding="md"
        className="animate-fade-up"
      >
        <span className="text-12 font-bold tracking-caps text-muted uppercase">
          {t.visual.listo}
        </span>
        <ul className="mt-3 flex flex-col gap-2">
          {[t.visual.item1, t.visual.item2, t.visual.item3].map((item) => (
            <li key={item} className="flex items-center gap-2 text-14 text-ink">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-lime">
                <Check className="size-3" strokeWidth={2.6} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function MigracionSection() {
  return (
    <section
      id="migracion-facil"
      className="mx-auto max-w-6xl scroll-mt-24 px-4 py-10 sm:px-8 sm:py-14"
    >
      <div className="flex flex-col items-center gap-10 rounded-hero bg-lilac p-6 sm:p-10 lg:flex-row">
        <div className="flex flex-1 flex-col gap-4">
          <span className="w-fit rounded-full border border-border bg-surface px-3.5 py-1.5 text-12 font-bold tracking-caps text-ink uppercase">
            {t.etiqueta}
          </span>
          <h2 className="font-display text-32 leading-hero font-semibold tracking-display text-ink sm:text-40">
            {t.titulo}
          </h2>
          <p className="max-w-md text-16 leading-relaxed text-ink-soft">
            {t.texto}
          </p>
          <ol className="flex flex-col gap-2">
            {PASOS.map((paso, i) => (
              <li
                key={paso}
                className="flex items-center gap-3 text-15 font-semibold text-ink"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-13 font-bold">
                  {i + 1}
                </span>
                {paso}
              </li>
            ))}
          </ol>
          <Button asChild variant="primary" size="xl" className="mt-2 w-fit">
            <Link href={SIGNUP_PATH}>{t.cta}</Link>
          </Button>
        </div>
        <div className="flex w-full flex-1 items-center justify-center">
          <MigracionVisual />
        </div>
      </div>
    </section>
  );
}
