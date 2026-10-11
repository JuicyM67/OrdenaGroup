// Landningssidan "För kunder" (CL: "Para clientes"): konsumentkontots säljsida. Design:
// docs/design/reference/for-kunder/{Main,Mobil}.dc.html. Foto-hero med e-postfält som
// skickar till kundinloggningen, tre flytande glaskort, funktionsrutor, "klart på en
// minut", frågor och ett avslutande CTA-band. Allt i befintliga marknadskomponenter.
import {
  ArrowRight,
  Check,
  Heart,
  Globe,
  Lock,
  Zap,
  type LucideIcon,
  CalendarDays,
  RefreshCw,
  Gift,
  Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { Highlight } from "@/components/marketing/highlight";
import { EmailForm } from "@/components/marketing/home/email-form";
import { HeroGlass, HeroPrimary } from "@/components/marketing/paginas/ui";
import { cn } from "@/components/ui/cn";
import { cuentaHref, href, hrefMarketplace } from "@/config/routes";
import { paraClientes } from "@/i18n";

const t = paraClientes;

const TRUST: Record<string, { tone: string; icon: LucideIcon }> = {
  gratis: { tone: "bg-mint", icon: Check },
  sinClave: { tone: "bg-lilac", icon: Lock },
  datos: { tone: "bg-peach", icon: Globe },
};

const FEATURE_UI: Record<string, { tone: string; icon: LucideIcon }> = {
  reservas: { tone: "bg-lilac", icon: CalendarDays },
  cambiar: { tone: "bg-mint", icon: RefreshCw },
  favoritos: { tone: "bg-peach", icon: Heart },
  ofertas: { tone: "bg-lime-50", icon: Zap },
  vales: { tone: "bg-sky", icon: Gift },
  resenas: { tone: "bg-lavender", icon: Star },
};

const STEP_TONES = ["bg-lime", "bg-lilac", "bg-mint"] as const;

function Circle({
  tone,
  icon: Icon,
  className,
}: {
  tone: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex flex-none items-center justify-center rounded-full text-ink",
        tone,
        className,
      )}
    >
      <Icon className="size-1/2" strokeWidth={2} />
    </span>
  );
}

function FloatCards() {
  const c = t.tarjetas;
  return (
    <div className="flex w-full flex-col gap-3.5 lg:w-85">
      <div className="rounded-card p-4.5 glass-light">
        <span className="text-11 font-bold tracking-label text-muted">
          {c.proxima}
        </span>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex size-12 flex-none flex-col items-center justify-center rounded-icon bg-lime leading-none font-extrabold">
            <span className="text-10">{c.dia}</span>
            <span className="text-18">{c.numero}</span>
          </span>
          <span className="flex min-w-0 flex-col">
            <b className="text-15">{c.servicio}</b>
            <span className="text-13 text-muted">{c.detalle}</span>
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-card px-4.5 py-3.5 glass-light lg:ml-10">
        <Circle tone="bg-lilac" icon={Heart} className="size-9" />
        <span className="flex flex-col">
          <b className="text-14">{c.favoritos}</b>
          <span className="text-12 text-muted">{c.favoritosTexto}</span>
        </span>
      </div>
      <div className="hidden items-center gap-3 rounded-card px-4.5 py-3.5 glass-light lg:flex">
        <Circle tone="bg-lime-50" icon={Zap} className="size-9" />
        <span className="flex flex-col">
          <b className="text-14">{c.flash}</b>
          <span className="text-12 text-muted">{c.flashTexto}</span>
        </span>
      </div>
    </div>
  );
}

export function ClientesHero() {
  const h = t.hero;
  return (
    <section className="relative -mt-26 flex flex-col overflow-hidden bg-dark text-on-dark lg:min-h-205">
      <Image
        src="/marketing/reservas.webp"
        alt={h.foto}
        fill
        priority
        sizes="100vw"
        className="object-cover object-hero-mobile lg:object-center"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-photo-tint-mobile lg:bg-photo-tint"
      />

      <div className="relative mx-auto flex w-full max-w-360 flex-1 flex-col px-4 pt-32 pb-12 sm:px-8 lg:px-22 lg:pt-44 lg:pb-24">
        <div className="flex flex-col gap-5.5 lg:max-w-175">
          <span className="flex w-fit items-center gap-2 rounded-panel px-3.5 py-2 text-13 font-semibold glass-nav">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full bg-lime"
            />
            {h.etiqueta}
          </span>
          <h1 className="font-display text-40 leading-display font-semibold tracking-hero text-balance sm:text-56 lg:text-68">
            {h.pre}
            <Highlight>{h.marca}</Highlight>
          </h1>
          <p className="max-w-xl text-16 leading-relaxed text-on-dark/90 sm:text-18">
            {h.texto}
          </p>
          <EmailForm
            id="clientes-email"
            tone="nav"
            action={cuentaHref("cuentaIngresar")}
            texts={h}
          />
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-13 font-semibold text-on-dark/95">
            {h.confianza.map((c) => {
              const ui = TRUST[c.id] ?? TRUST.gratis!;
              return (
                <li key={c.id} className="flex items-center gap-2">
                  <Circle tone={ui.tone} icon={ui.icon} className="size-7" />
                  {c.texto}
                </li>
              );
            })}
          </ul>
          <div className="mt-2 lg:hidden">
            <FloatCards />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 mx-auto hidden max-w-360 lg:block">
        <div className="absolute top-52 right-22">
          <FloatCards />
        </div>
      </div>
    </section>
  );
}

export function ClientesFunciones() {
  const f = t.funciones;
  return (
    <section aria-labelledby="clientes-funciones" className="bg-canvas">
      <div className="mx-auto flex max-w-360 flex-col gap-10 px-4 pt-16 pb-6 sm:px-8 lg:px-22 lg:pt-28">
        <h2
          id="clientes-funciones"
          className="font-display text-34 leading-none font-semibold tracking-headline text-balance sm:text-52"
        >
          {f.pre}
          <Highlight tone="lilac">{f.marca}</Highlight>
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4.5 lg:grid-cols-3">
          {f.items.map((it) => {
            const ui = FEATURE_UI[it.id] ?? FEATURE_UI.reservas!;
            return (
              <li
                key={it.id}
                className="flex items-start gap-4 rounded-card bg-surface p-5 sm:flex-col sm:gap-3.5 sm:p-7"
              >
                <Circle
                  tone={ui.tone}
                  icon={ui.icon}
                  className="size-11 sm:size-13"
                />
                <span className="flex flex-col gap-1.5">
                  <h3 className="font-display text-18 font-semibold sm:text-22">
                    {it.titulo}
                  </h3>
                  <p className="text-14 leading-relaxed text-muted sm:text-15">
                    {it.texto}
                  </p>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function ClientesPasos() {
  const p = t.pasos;
  return (
    <section aria-labelledby="clientes-pasos" className="bg-canvas">
      <div className="mx-auto grid max-w-360 grid-cols-1 items-center gap-8 px-4 py-14 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:px-22 lg:py-20">
        <div className="relative hidden h-140 overflow-hidden rounded-cta lg:block">
          <Image
            src="/marketing/massage.webp"
            alt={p.foto}
            fill
            sizes="(min-width: 1440px) 520px, 40vw"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col gap-6 lg:gap-7">
          <h2
            id="clientes-pasos"
            className="font-display text-34 leading-none font-semibold tracking-headline sm:text-44"
          >
            {p.titulo}
          </h2>
          <ol className="flex flex-col gap-5">
            {p.items.map((it, k) => (
              <li key={it.titulo} className="flex items-start gap-4">
                <span
                  className={cn(
                    "flex size-11 flex-none items-center justify-center rounded-full font-display text-20 font-semibold text-ink lg:size-12",
                    STEP_TONES[k % STEP_TONES.length],
                  )}
                >
                  {k + 1}
                </span>
                <span className="flex flex-col gap-1">
                  <b className="text-17 sm:text-18">{it.titulo}</b>
                  <span className="text-14 leading-relaxed text-muted sm:text-15">
                    {it.texto}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <Link
            href={cuentaHref("cuentaIngresar")}
            className="flex min-h-14 w-fit items-center gap-2.5 rounded-full bg-ink px-6.5 text-16 font-bold text-on-dark transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {p.cta}
            <ArrowRight
              aria-hidden="true"
              className="size-4.5"
              strokeWidth={2}
            />
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Slim banner på /upptack: leder besökaren till kundlandningen. */
export function ClientesBanner() {
  const b = t.banner;
  return (
    <aside className="flex flex-col gap-4 rounded-card bg-lilac p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <span className="flex flex-col gap-1">
        <b className="font-display text-20 font-semibold">{b.titulo}</b>
        <span className="text-14 text-ink-soft">{b.texto}</span>
      </span>
      <Link
        href={href("paraClientes")}
        className="flex h-12 w-fit shrink-0 items-center gap-2 rounded-full bg-ink px-5.5 text-15 font-bold text-on-dark transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {b.cta}
        <ArrowRight aria-hidden="true" className="size-4.5" strokeWidth={2} />
      </Link>
    </aside>
  );
}

export function ClientesFaq() {
  const f = t.faq;
  return (
    <section aria-labelledby="clientes-faq" className="bg-canvas">
      <div className="mx-auto grid max-w-360 grid-cols-1 gap-8 px-4 pt-6 pb-16 sm:px-8 lg:grid-cols-3 lg:gap-16 lg:px-22 lg:pb-24">
        <h2
          id="clientes-faq"
          className="font-display text-34 leading-none font-semibold tracking-headline sm:text-44"
        >
          {f.titulo}
        </h2>
        <FaqAccordion items={f.items} className="lg:col-span-2" />
      </div>
    </section>
  );
}

export function ClientesCierre() {
  const c = t.cierre;
  return (
    <section className="bg-canvas px-4 pb-16 lg:px-22 lg:pb-25">
      <div className="mx-auto flex max-w-360 flex-col justify-between gap-8 rounded-cta bg-dark px-6 py-12 text-on-dark sm:px-10 lg:flex-row lg:items-center lg:gap-10 lg:p-16">
        <div className="flex flex-col gap-2.5">
          <h2 className="font-display text-32 leading-none font-semibold tracking-headline text-balance sm:text-44">
            {c.titulo}
          </h2>
          <p className="text-16 text-on-dark-soft sm:text-17">{c.texto}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <HeroPrimary href={cuentaHref("cuentaIngresar")}>
            {c.crear}
          </HeroPrimary>
          <HeroGlass href={hrefMarketplace("descubre")}>{c.descubre}</HeroGlass>
        </div>
      </div>
    </section>
  );
}
