// Innehållet i megamenyns två paneler (WP-75, Main.dc.html / Branscher.dc.html):
// "Funktioner" (funktionslista med pastellikoner, fotokort för flytt och ett mörkt kort
// till demot) och "Branscher" (fotorutor per bransch). Alla länkar går till riktiga
// undersidor via `routes.ts`. Samma länkar används i mobilmenyn (se `site-header.tsx`).
"use client";

import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { ArrowRight, CalendarCheck, LayoutDashboard } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  FUNCION_UI,
  TONE_CLASS,
} from "@/components/marketing/paginas/registry";
import { strokeArrow } from "@/components/ui/icons";
import { brand } from "@/config/brand";
import {
  funcionesDisponibles,
  href,
  hrefFuncion,
  hrefRubro,
  hrefRubros,
  RUBRO_IDS,
} from "@/config/routes";
import { paginas } from "@/i18n/paginas";

const t = paginas.nav;

const itemClass =
  "flex items-center gap-3.5 rounded-panel p-3 transition-colors duration-200 ease-out hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

const eyebrow = "text-12 font-bold tracking-label text-muted";

export function FuncionesPanel() {
  return (
    <div className="grid grid-cols-12 gap-5.5">
      <div className="col-span-8 flex flex-col gap-1.5">
        <span className={`${eyebrow} px-3`}>{t.menuFunciones.titulo}</span>
        <ul className="grid grid-cols-2 gap-0.5">
          {funcionesDisponibles()
            .filter((id) => id !== "migracion")
            .map((id) => {
              const ft = paginas.funciones[id]!;
              const ui = FUNCION_UI[id];
              return (
                <li key={id}>
                  <NavigationMenu.Link asChild>
                    <Link href={hrefFuncion(id)} className={itemClass}>
                      <span
                        aria-hidden="true"
                        className={`flex size-11 shrink-0 items-center justify-center rounded-full ${TONE_CLASS[ui.tone]}`}
                      >
                        <ui.icon className="size-4.5" strokeWidth={2} />
                      </span>
                      <span className="flex flex-col gap-0.5">
                        <b className="text-15">{ft.nombre}</b>
                        <span className="text-13 text-muted">{ft.resumen}</span>
                      </span>
                    </Link>
                  </NavigationMenu.Link>
                </li>
              );
            })}
        </ul>
        <NavigationMenu.Link asChild>
          <Link
            href={href("funcionalidades")}
            className="mx-3 mt-1.5 flex w-fit items-center gap-2 rounded-badge text-14 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {t.menuFunciones.verTodas}
            <ArrowRight
              aria-hidden="true"
              className="size-4"
              strokeWidth={strokeArrow}
            />
          </Link>
        </NavigationMenu.Link>
      </div>

      <div className="col-span-4 flex flex-col gap-3">
        <NavigationMenu.Link asChild>
          <Link
            href={hrefFuncion("migracion")}
            className="group relative block h-62.5 overflow-hidden rounded-card text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <Image
              src="/marketing/tatuering.webp"
              alt=""
              fill
              sizes="360px"
              className="object-cover object-photo-top transition-transform duration-500 ease-out group-hover:scale-105"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-scrim-bottom"
            />
            <span className="absolute top-3.5 left-3.5 rounded-event px-3 py-1.5 text-12 font-bold glass-light">
              {t.menuFunciones.migracion.etiqueta}
            </span>
            <span className="absolute inset-x-4.5 bottom-4 flex flex-col gap-1">
              <b className="font-display text-24 leading-snug">
                {t.menuFunciones.migracion.titulo}
              </b>
              <span className="text-13 text-on-dark/90">
                {t.menuFunciones.migracion.texto}
              </span>
            </span>
          </Link>
        </NavigationMenu.Link>
        <NavigationMenu.Link asChild>
          <Link
            href={`/${brand.demoSlug}`}
            className="flex items-center justify-between rounded-panel bg-ink px-4 py-3.5 text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <span className="flex flex-col">
              <b className="text-15">{t.menuFunciones.ejemplo.titulo}</b>
              <span className="text-12 text-on-dark-muted">
                {t.menuFunciones.ejemplo.texto}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-full bg-lime text-ink"
            >
              <ArrowRight className="size-4" strokeWidth={strokeArrow} />
            </span>
          </Link>
        </NavigationMenu.Link>
      </div>
    </div>
  );
}

export function DemoPanel() {
  const items = [
    {
      href: `/${brand.demoSlug}`,
      icon: CalendarCheck,
      tone: "lavender",
      ...t.menuDemo.cliente,
    },
    {
      href: href("ejemploNegocio"),
      icon: LayoutDashboard,
      tone: "lime",
      ...t.menuDemo.negocio,
    },
  ] as const;
  return (
    <ul className="grid grid-cols-2 gap-1">
      {items.map((it) => (
        <li key={it.href}>
          <NavigationMenu.Link asChild>
            <Link href={it.href} className={itemClass}>
              <span
                aria-hidden="true"
                className={`flex size-11 shrink-0 items-center justify-center rounded-full ${TONE_CLASS[it.tone]}`}
              >
                <it.icon className="size-4.5" strokeWidth={2} />
              </span>
              <span className="flex flex-col gap-0.5">
                <b className="text-15">{it.titulo}</b>
                <span className="text-13 text-muted">{it.texto}</span>
              </span>
            </Link>
          </NavigationMenu.Link>
        </li>
      ))}
    </ul>
  );
}

export function RubrosPanel() {
  return (
    <div className="grid grid-cols-12 gap-5.5">
      <div className="col-span-3 flex flex-col gap-3 p-2">
        <span className={eyebrow}>{t.menuRubros.etiqueta}</span>
        <b className="font-display text-30 leading-snug tracking-headline">
          {t.menuRubros.titulo}
        </b>
        <span className="text-14 leading-relaxed text-muted">
          {t.menuRubros.texto}
        </span>
        <NavigationMenu.Link asChild>
          <Link
            href={hrefRubros()}
            className="mt-auto flex w-fit items-center gap-2 rounded-badge text-14 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {t.menuRubros.todas}
            <ArrowRight
              aria-hidden="true"
              className="size-4"
              strokeWidth={strokeArrow}
            />
          </Link>
        </NavigationMenu.Link>
      </div>
      <ul className="col-span-9 grid grid-cols-4 gap-2.5">
        {RUBRO_IDS.map((id) => (
          <li key={id}>
            <NavigationMenu.Link asChild>
              <Link
                href={hrefRubro(id)}
                className="group relative block h-37.5 overflow-hidden rounded-tile text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <Image
                  src={`/marketing/${id}.webp`}
                  alt=""
                  fill
                  sizes="220px"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-scrim-bottom"
                />
                <span className="absolute bottom-2.5 left-2.5 rounded-event px-2.75 py-1.75 text-13 font-bold glass-light">
                  {paginas.rubros[id].nombre}
                </span>
              </Link>
            </NavigationMenu.Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
