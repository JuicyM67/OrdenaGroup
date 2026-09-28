// Landningssida (/, offentlig, indexerbar — ingen noindex). Route group "(marketing)"
// påverkar inte URL:en. Textkällor: `landing`, `PLANES_LANDING`, `brand.tagline`
// (src/i18n/es-CL.ts, WP-XX-kommentaren ovanför `landing`: sidan har ingen egen
// *.dc.html-referens, bara ton/design-tokens). Ingen `npm run visual` för den här
// skärmen (inget referensfoto finns) — se PR-rapporten.
import type { Metadata } from "next";
import {
  Banknote,
  Bell,
  Calendar,
  Check,
  ChevronDown,
  CreditCard,
  Gem,
  HeartPulse,
  Link2,
  List,
  Scissors,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogoMark } from "@/components/ui/logo-mark";
import { TextLink } from "@/components/ui/text-link";
import { strokeCard } from "@/components/ui/icons";
import { brand } from "@/config/brand";
import { landing, nav, PLANES_LANDING } from "@/i18n";
import { formatClp } from "@/lib/format/clp";

export const metadata: Metadata = {
  title: landing.meta.titulo({ nombre: brand.name }),
  description: landing.meta.descripcion({ nombre: brand.name }),
};

const SECTION_TITLE =
  "font-display text-30 font-bold tracking-display text-ink sm:text-32";

type Tone = "lilac" | "peach" | "lime";
const TONE_CYCLE: readonly Tone[] = ["lilac", "peach", "lime"];
const TONE_TEXT: Record<Tone, string> = {
  lilac: "text-on-lilac-soft",
  peach: "text-on-peach-soft",
  lime: "text-on-lime-soft",
};

const PASOS = [
  landing.comoFunciona.pasos.crear,
  landing.comoFunciona.pasos.compartir,
  landing.comoFunciona.pasos.reservan,
] as const;

const BENEFICIOS = [
  { icon: Link2, ...landing.beneficios.items.linkPropio },
  { icon: Calendar, ...landing.beneficios.items.agendaPorProfesional },
  { icon: Bell, ...landing.beneficios.items.recordatorios },
  { icon: List, ...landing.beneficios.items.listaDeEspera },
  { icon: CreditCard, ...landing.beneficios.items.abono },
  { icon: Banknote, ...landing.beneficios.items.precioUnico },
] as const;

const PARA_QUIEN = [
  { icon: Scissors, label: landing.paraQuien.items.barberias },
  { icon: Sparkles, label: landing.paraQuien.items.peluquerias },
  { icon: Gem, label: landing.paraQuien.items.esteticaYUnas },
  { icon: HeartPulse, label: landing.paraQuien.items.kinesiologiaYMasajes },
] as const;

const PREGUNTAS = [
  landing.preguntas.items.instalar,
  landing.preguntas.items.comoReservan,
  landing.preguntas.items.noLlego,
  landing.preguntas.items.permanencia,
  landing.preguntas.items.datos,
  landing.preguntas.items.ayudaConfig,
] as const;

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <LogoMark label={brand.name} size={40} decorative />
            <span className="font-display text-19 font-bold tracking-display text-ink">
              {brand.name}
            </span>
          </Link>

          <nav aria-label={nav.principal} className="hidden sm:block">
            <div className="flex items-center gap-8">
              <Link
                href="#precios"
                className="text-14 font-semibold text-ink transition-colors duration-150 ease-out hover:text-muted"
              >
                {landing.nav.precios}
              </Link>
              <Link
                href="#preguntas"
                className="text-14 font-semibold text-ink transition-colors duration-150 ease-out hover:text-muted"
              >
                {landing.nav.preguntas}
              </Link>
            </div>
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/login"
              className="hidden text-14 font-semibold text-ink underline transition-colors duration-150 ease-out hover:text-pending-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:inline"
            >
              {landing.nav.entrar}
            </Link>
            <Button asChild variant="primary" size="sm">
              <Link href="/login">{landing.nav.ctaCrearAgenda}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
          <Card
            as="section"
            aria-label={landing.hero.titulo({ tagline: brand.tagline })}
            tone="dark"
            radius="hero"
            padding="xl"
            className="flex flex-col gap-6"
          >
            <h1 className="font-display text-30 leading-hero font-semibold tracking-display text-on-dark sm:text-40">
              {landing.hero.titulo({ tagline: brand.tagline })}
            </h1>
            <p className="max-w-2xl text-16 leading-relaxed text-on-dark-soft">
              {landing.hero.subtitulo}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="accent" size="xl">
                <Link href="/login">{landing.hero.ctaPrimario}</Link>
              </Button>
              <Button asChild variant="outline-dark" size="xl">
                <Link href="/barberia-norte">{landing.hero.ctaSecundario}</Link>
              </Button>
            </div>
          </Card>
        </section>

        {/* Cómo funciona */}
        <section
          id="como-funciona"
          className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-8"
        >
          <h2 className={SECTION_TITLE}>{landing.comoFunciona.titulo}</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {PASOS.map((paso, i) => {
              const tone = TONE_CYCLE[i % TONE_CYCLE.length]!;
              return (
                <Card
                  key={paso.titulo}
                  tone={tone}
                  radius="tile"
                  padding="lg"
                  className="flex flex-col gap-3"
                >
                  <span className="text-13 font-semibold text-ink">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-19 leading-snug font-bold text-ink">
                    {paso.titulo}
                  </h3>
                  <p className={`text-14 ${TONE_TEXT[tone]}`}>{paso.texto}</p>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Beneficios */}
        <section
          id="beneficios"
          className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-8"
        >
          <h2 className={SECTION_TITLE}>{landing.beneficios.titulo}</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFICIOS.map((item, i) => {
              const tone = TONE_CYCLE[i % TONE_CYCLE.length]!;
              const Icon = item.icon;
              return (
                <Card
                  key={item.titulo}
                  tone={tone}
                  radius="tile"
                  padding="lg"
                  className="flex flex-col gap-3"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-11 shrink-0 items-center justify-center rounded-icon bg-ink text-on-dark"
                  >
                    <Icon className="size-5.5" strokeWidth={strokeCard} />
                  </span>
                  <h3 className="text-19 leading-snug font-bold text-ink">
                    {item.titulo}
                  </h3>
                  <p className={`text-14 ${TONE_TEXT[tone]}`}>{item.texto}</p>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Para quién */}
        <section
          id="para-quien"
          className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-8"
        >
          <h2 className={SECTION_TITLE}>{landing.paraQuien.titulo}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PARA_QUIEN.map(({ icon: Icon, label }) => (
              <Card
                key={label}
                radius="tile"
                padding="lg"
                className="flex flex-col items-center gap-3 text-center"
              >
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-icon bg-canvas text-ink"
                >
                  <Icon className="size-5.5" strokeWidth={strokeCard} />
                </span>
                <span className="text-15 font-semibold text-ink">{label}</span>
              </Card>
            ))}
          </div>
        </section>

        {/* Precios */}
        <section
          id="precios"
          className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-8"
        >
          <h2 className={SECTION_TITLE}>{landing.precios.titulo}</h2>
          <p className="mt-2 max-w-2xl text-15 text-muted">
            {landing.precios.subtitulo}
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PLANES_LANDING.map((plan) => (
              <Card
                key={plan.id}
                radius="tile"
                padding="lg"
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-2">
                  <h3 className="text-18 font-bold text-ink">{plan.nombre}</h3>
                  <p className="font-display text-32 font-semibold tracking-display text-ink">
                    {plan.precioClp === 0
                      ? plan.nombre
                      : formatClp(plan.precioClp)}
                  </p>
                </div>
                <ul className="flex flex-1 flex-col gap-2">
                  {plan.puntos.map((punto) => (
                    <li
                      key={punto}
                      className="flex items-start gap-2 text-14 text-ink"
                    >
                      <Check
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-muted"
                        strokeWidth={2.4}
                      />
                      {punto}
                    </li>
                  ))}
                </ul>
                <Button asChild variant="secondary" size="lg">
                  <Link href="/login">{plan.cta}</Link>
                </Button>
              </Card>
            ))}
          </div>
          <Card
            tone="lime"
            radius="tile"
            padding="md"
            className="mt-6 text-14 font-semibold text-ink"
          >
            {landing.precios.fundador}
          </Card>
        </section>

        {/* Preguntas */}
        <section
          id="preguntas"
          className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-8"
        >
          <h2 className={SECTION_TITLE}>{landing.preguntas.titulo}</h2>
          <Card radius="card" padding="none" className="mt-8">
            {PREGUNTAS.map((item) => (
              <details
                key={item.pregunta}
                className="group border-t border-line px-6 py-5 first:border-t-0"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-16 font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
                  {item.pregunta}
                  <ChevronDown
                    aria-hidden="true"
                    className="size-5 shrink-0 text-muted transition-transform duration-150 ease-out group-open:rotate-180"
                    strokeWidth={2}
                  />
                </summary>
                <p className="mt-3 text-14 text-muted">{item.respuesta}</p>
              </details>
            ))}
          </Card>
        </section>

        {/* CTA final */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
          <Card
            tone="dark"
            radius="hero"
            padding="xl"
            className="flex flex-col items-center gap-5 text-center"
          >
            <h2 className="font-display text-28 font-bold tracking-display text-on-dark sm:text-32">
              {landing.ctaFinal.titulo}
            </h2>
            <p className="max-w-xl text-16 leading-relaxed text-on-dark-soft">
              {landing.ctaFinal.texto}
            </p>
            <Button asChild variant="accent" size="xl">
              <Link href="/login">{landing.ctaFinal.boton}</Link>
            </Button>
          </Card>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2.5">
            <LogoMark label={brand.name} size={40} decorative />
            <div>
              <p className="text-14 font-bold text-ink">{brand.name}</p>
              <p className="text-13 text-muted">{landing.footer.texto}</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <TextLink href="#precios">{landing.footer.links.precios}</TextLink>
            <TextLink href="/login">{landing.footer.links.entrar}</TextLink>
          </div>
        </div>
        <p className="pb-8 text-center text-13 text-muted">
          {landing.footer.hechoEnSantiago}
        </p>
      </footer>
    </div>
  );
}
