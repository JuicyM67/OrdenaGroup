// Sektion 7 under betan: ersätter prissektionen på startsidan (ägarens beslut
// 2026-11-09 — priserna visas inte på startsidan medan produkten är i beta).
// Behåller `id="precios"` så att befintliga ankarlänkar landar här.
import { Check, MessageCircle, Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { Highlight } from "@/components/marketing/highlight";
import { Button } from "@/components/ui/button";
import { SIGNUP_PATH } from "@/config/routes";
import { copy } from "@/i18n/marketing";

const t = copy.home.beta;

const ICONS: Record<string, LucideIcon> = {
  gratis: Check,
  todo: Sparkles,
  contacto: MessageCircle,
};

const TONES: Record<string, string> = {
  gratis: "bg-lime",
  todo: "bg-staff-5",
  contacto: "bg-staff-4",
};

export function Beta() {
  return (
    <section id="precios" className="scroll-mt-24 bg-surface">
      <div className="mx-auto max-w-360 px-4 py-16 sm:px-8 lg:px-22 lg:py-30">
        <div
          data-surface="dark"
          className="relative flex flex-col gap-10 overflow-hidden rounded-cta bg-dark px-6 py-12 text-on-dark sm:px-10 lg:px-18 lg:py-18"
        >
          <div className="relative flex flex-col gap-5 lg:max-w-180">
            <span className="flex w-fit items-center gap-2 rounded-chip bg-lime px-3 py-1.75 text-13 font-bold tracking-label text-ink">
              <span className="size-2 animate-pulse rounded-full bg-ink" />
              {t.etiqueta}
            </span>
            <h2 className="font-display text-36 leading-none font-semibold tracking-headline text-balance sm:text-56">
              {t.tituloPre}
              <Highlight>{t.tituloMarca}</Highlight>
            </h2>
            <p className="max-w-2xl text-16 leading-relaxed text-on-dark/90 sm:text-18">
              {t.texto}
            </p>
          </div>

          <ul className="relative grid grid-cols-1 gap-4 md:grid-cols-3">
            {t.puntos.map((p) => {
              const Icon = ICONS[p.id] ?? Check;
              return (
                <li
                  key={p.id}
                  className="flex flex-col gap-4 rounded-tile border border-dark-border bg-dark-2 p-6"
                >
                  <div className="flex items-center justify-between">
                    <b className="font-display text-44 leading-none font-semibold tracking-headline">
                      {p.valor}
                    </b>
                    <span
                      className={`flex size-10 items-center justify-center rounded-full text-ink ${TONES[p.id] ?? "bg-lime"}`}
                    >
                      <Icon
                        className="size-4.5"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <b className="text-16">{p.titulo}</b>
                    <span className="text-14 leading-body text-on-dark-muted">
                      {p.texto}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4 rounded-tile bg-lime px-6 py-5 text-ink lg:max-w-150">
              <b className="shrink-0 font-display text-30">
                {t.fundador.valor}
              </b>
              <span className="text-14 leading-body">
                <b>{t.fundador.negrita}</b> {t.fundador.texto}
              </span>
            </div>
            <div className="flex flex-col items-start gap-2.5 lg:items-end">
              <Button asChild variant="accent" className="rounded-full">
                <Link href={SIGNUP_PATH}>{t.cta}</Link>
              </Button>
              <span className="text-13 text-on-dark-muted">{t.nota}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
