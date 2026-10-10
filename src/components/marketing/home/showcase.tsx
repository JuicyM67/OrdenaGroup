// Sektion 3: "Så ser din bokningssida ut" (WP-71, SidaP3.dc.html): webbläsarram + mobilram
// över ett suddigt behandlingsrumsfoto. Visar marknadens demoföretag (`brand.demoSlug`).
// Mockuperna är dekorativa (`aria-hidden`). Mobil: bara telefonramen.
import { ArrowRight, Star, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { brand } from "@/config/brand";
import { copy } from "@/i18n/marketing";

import { DemoCover, DemoLogo, DemoStaff } from "./demo-assets";
import { HomeHeading } from "./home-heading";

const t = copy.home.showcase;
const d = copy.home.demo;

export function Showcase() {
  const url = `${brand.domain ? `${brand.domain}/` : "/"}${brand.demoSlug}`;
  return (
    <section className="relative overflow-hidden text-on-dark">
      <Image
        src="/marketing/hero.webp"
        alt=""
        fill
        sizes="100vw"
        className="scale-105 object-cover blur-photo brightness-55"
      />
      <div className="relative mx-auto flex max-w-360 flex-col items-center justify-between gap-12 px-4 py-16 sm:px-8 lg:flex-row lg:gap-15 lg:px-22 lg:py-30">
        <div className="flex max-w-120 flex-col gap-6">
          <HomeHeading
            etiqueta={t.etiqueta}
            pre={t.tituloPre}
            marca={t.tituloMarca}
          />
          <p className="text-16 leading-relaxed text-on-dark/90 sm:text-18">
            {t.texto}
          </p>
          <ul className="flex flex-wrap gap-2">
            {t.chips.map((c) => (
              <li
                key={c}
                className="rounded-control px-3.5 py-2.5 text-14 font-semibold glass-light"
              >
                {c}
              </li>
            ))}
          </ul>
          <Link
            href={`/${brand.demoSlug}`}
            className="flex h-14 items-center gap-3.5 self-start rounded-form bg-lime pr-2 pl-6 text-16 font-bold text-ink transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark"
          >
            {t.cta}
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-full bg-ink text-lime"
            >
              <ArrowRight className="size-4.5" strokeWidth={2.5} />
            </span>
          </Link>
        </div>

        <div
          aria-hidden="true"
          className="relative flex w-full justify-center lg:block lg:h-150 lg:w-175 lg:flex-none"
        >
          {/* Webbläsarram (bara på desktop). */}
          <div className="absolute top-0 left-0 hidden w-160 overflow-hidden rounded-tile bg-surface text-ink shadow-float-lg lg:block">
            <div className="flex h-10 items-center gap-2 bg-canvas px-3.5">
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-border" />
              <span className="ml-3.5 flex h-6 flex-1 items-center rounded-full bg-surface px-3 text-12 text-muted">
                {url}
              </span>
            </div>
            <div className="relative h-42.5">
              <DemoCover sizes="640px" />
              <span className="absolute -bottom-7.5 left-5.5 block size-17 overflow-hidden rounded-icon border-4 border-surface shadow-soft">
                <DemoLogo />
              </span>
              <span className="absolute top-3.5 right-4 flex gap-1.5">
                {t.redes.map((r) => (
                  <span
                    key={r}
                    className="rounded-chip bg-surface/90 px-2.25 py-1.25 text-11 font-bold"
                  >
                    {r}
                  </span>
                ))}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-4.5 px-5.5 pt-10 pb-5.5">
              <div className="col-span-3 flex flex-col gap-2.5">
                <span className="flex flex-col gap-0.5">
                  <b className="font-display text-22">{d.nombre}</b>
                  <span className="flex items-center gap-1.5 text-12 text-muted">
                    <Star
                      className="size-3.5 fill-full-dot text-full-dot"
                      aria-hidden="true"
                    />
                    <b className="text-ink">{d.nota}</b> ·{" "}
                    {t.omdomenRad({ n: d.resenas, zona: d.zona })}
                  </span>
                </span>
                <div className="flex gap-1.5 text-12 font-bold">
                  {t.tabs.map((tab, k) => (
                    <span
                      key={tab}
                      className={
                        k === 0
                          ? "rounded-chip bg-ink px-3 py-1.75 text-on-dark"
                          : "rounded-chip bg-canvas px-3 py-1.75"
                      }
                    >
                      {tab}
                    </span>
                  ))}
                </div>
                {d.servicios.slice(0, 2).map((s) => (
                  <span
                    key={s.nombre}
                    className="flex items-center justify-between rounded-avatar bg-canvas px-3 py-2.5 text-13"
                  >
                    <span>
                      <b>{s.nombre}</b>
                      <span className="block text-11 text-muted">
                        {s.duracion}
                      </span>
                    </span>
                    <span className="flex items-center gap-2.5">
                      <b>{s.precio}</b>
                      <span className="rounded-chip bg-ink px-2.5 py-1.5 text-11 font-bold text-on-dark">
                        {d.boka}
                      </span>
                    </span>
                  </span>
                ))}
              </div>
              <div className="col-span-2 flex flex-col gap-2.5">
                <span className="flex items-center gap-1.5 rounded-avatar bg-lime p-2.5 text-12 font-bold text-on-lime-soft">
                  <Zap
                    className="size-3 fill-current"
                    aria-hidden="true"
                    strokeWidth={0}
                  />
                  {d.flash}
                </span>
                <span className="text-11 font-bold tracking-caps text-muted">
                  {t.team}
                </span>
                <span className="flex gap-2">
                  <DemoStaff
                    n={1}
                    size={44}
                    className="size-11 rounded-avatar"
                  />
                  <DemoStaff
                    n={2}
                    size={44}
                    className="size-11 rounded-avatar"
                  />
                  <span className="flex size-11 items-center justify-center rounded-avatar bg-lavender text-12 font-bold">
                    {d.equipoMas}
                  </span>
                </span>
                <span className="text-12 leading-body text-ink-soft">
                  {d.cita}
                  <b className="mt-1 block text-ink">{d.autor}</b>
                </span>
              </div>
            </div>
          </div>

          {/* Mobilram. */}
          <div className="h-125 w-62.5 rounded-device-sm bg-ink p-2.5 shadow-float-lg lg:absolute lg:right-0 lg:bottom-0">
            <div className="flex size-full flex-col overflow-hidden rounded-screen bg-surface text-ink">
              <div className="relative h-37.5 flex-none">
                <DemoCover sizes="250px" />
                <span className="absolute -bottom-5.5 left-3.5 block size-12 overflow-hidden rounded-avatar border-3 border-surface">
                  <DemoLogo />
                </span>
              </div>
              <div className="flex flex-col gap-2 px-3.5 pt-7.5 pb-3.5">
                <b className="font-display text-17">{d.nombre}</b>
                <span className="text-11 text-muted">
                  ★ {d.nota} · {d.zona}
                </span>
                {d.servicios.slice(0, 3).map((s) => (
                  <span
                    key={s.nombre}
                    className="flex justify-between rounded-event bg-canvas px-2.5 py-2.25 text-12"
                  >
                    <b>{s.nombre}</b>
                    <b>{s.precio}</b>
                  </span>
                ))}
                <span className="mt-1.5 flex h-10.5 items-center justify-center rounded-control bg-ink text-13 font-bold text-on-dark">
                  {d.reservar}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
