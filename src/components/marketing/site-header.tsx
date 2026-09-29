// Header delad av alla sidor på sitio-webben (WP-hemsida, utökad i WP-hemsida v2 med en
// megameny; retro 2026-09-28 punkt 2 bytte skalet mot ett flytande "liquid glass"-nav, se
// `.visual-diff/ref/nav-ref.png` — halvtransparent yta, `backdrop-blur-glass`, tunn ljus
// kant och `--shadow-glass`): logga, nav ("Funcionalidades" och "Para quién" öppnar samma
// breda panel — kolumnerna Producto/Para quién/Recursos + ett destacado-kort för Horas
// flash), "Entrar" (glasknapp) och CTA (ink). Radix NavigationMenu på skrivbord
// (tangentbord: pilar mellan triggers, Escape stänger, Tab går igenom panelen). Ingen
// Viewport-komponent: med bara två triggers som delar exakt samma innehåll ger den inget
// extra (ingen bredd-/höjdmorph att vinna), och varje Content renderas i stället in-place,
// positionerad mot den (relativa) headern — samma mönster som undermenyns tidigare Popover.
// `NavigationMenu.Root` körs kontrollerad (`value`/`onValueChange`) bara för att kunna ge
// den öppna triggerns "inre pill" ett eget utseende i JS — CSS-attributvarianter
// (`data-[state=open]:…`) räknas som ett godtyckligt Tailwind-värde och är förbjudna
// (D-015, `no-restricted-syntax`, se globals.css-kommentaren vid `toggle-on`). Mobilmenyn
// (Radix Dialog) grupperar samma innehåll (Producto/Para quién/Recursos) i en enda kolumn,
// oförändrad (solid vit — bara den flytande pillen ovanför blev glas).
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import {
  ArrowUpRight,
  Bell,
  Calendar,
  ChevronDown,
  Link2,
  List,
  Menu,
  Smartphone,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { IconButton } from "@/components/ui/icon-button";
import { strokeArrow, strokeCard, strokeNav } from "@/components/ui/icons";
import { copy } from "@/i18n/marketing";

import { BrandLogo } from "./brand-logo";

const PRODUCTO_ITEMS: readonly {
  id: string;
  href: string;
  icon: LucideIcon;
  titulo: string;
  texto: string;
}[] = [
  {
    id: "reservas",
    href: "/funcionalidades#link-reservas",
    icon: Link2,
    ...copy.sitio.megamenu.producto.items.reservas,
  },
  {
    id: "agenda",
    href: "/funcionalidades#agenda",
    icon: Calendar,
    ...copy.sitio.megamenu.producto.items.agenda,
  },
  {
    id: "hoy",
    href: "/funcionalidades#hoy",
    icon: Smartphone,
    ...copy.sitio.megamenu.producto.items.hoy,
  },
  {
    id: "flash",
    href: "/horas-flash",
    icon: Zap,
    ...copy.sitio.megamenu.producto.items.flash,
  },
  {
    id: "recordatorios",
    href: "/funcionalidades#recordatorios",
    icon: Bell,
    ...copy.sitio.megamenu.producto.items.recordatorios,
  },
  {
    id: "lista-espera",
    href: "/funcionalidades#lista-espera",
    icon: List,
    ...copy.sitio.megamenu.producto.items.listaEspera,
  },
];

// "Ventajas": sin una entrada propia en `copy.sitio.megamenu.recursos` (sitio-v6, ninguna
// pantalla de diseño dibujó el megamenú con esta página todavía) — `titulo` reutiliza
// `ventajas.hero.etiqueta` y `texto` reutiliza `ventajas.comparacion.titulo` (encargo:
// nunca texto inventado), ambas ya dentro del límite de ~60 caracteres del resto de la
// columna.
const RECURSOS_ITEMS = [
  { href: "/precios", ...copy.sitio.megamenu.recursos.precios },
  { href: "/preguntas", ...copy.sitio.megamenu.recursos.preguntas },
  { href: "/contacto", ...copy.sitio.megamenu.recursos.contacto },
  {
    href: "/ventajas",
    titulo: copy.sitio.ventajas.hero.etiqueta,
    texto: copy.sitio.ventajas.comparacion.titulo,
  },
] as const;

const INDUSTRIAS = copy.SITIO_PARA_INDUSTRIAS.map((industria) => ({
  id: industria.id,
  nombre: industria.nombre,
  href: `/para/${industria.id}`,
}));

// Länken/triggerns "inre pill" (glas-knapp) vid hover — och, för triggerna, när den egna
// panelen är öppen (se `isOpen` i `SiteHeader`, aldrig via CSS-attributvarianter). Samma
// klass på länkar och triggers, så alla nav-punkter känns likadana.
const navLinkClass =
  "rounded-full px-3 py-1.75 text-14 font-semibold text-ink transition-colors duration-150 ease-out hover:bg-surface/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

const navLinkOpenClass = "bg-surface/70 shadow-popover";

const megaLinkClass =
  "group flex items-start gap-3 rounded-event p-2.5 transition-colors duration-150 ease-out hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/** Delas av de två megameny-triggerna ("Funcionalidades" och "Para quién"): samma fyra
 * kolumner oavsett vilken av dem som öppnade den. */
function MegaMenuPanel() {
  return (
    <div className="grid grid-cols-12 gap-8 rounded-panel border border-surface/60 bg-surface/95 p-6 shadow-glass backdrop-blur-glass backdrop-saturate-150">
      <div className="col-span-5 flex flex-col gap-3">
        <span className="text-12 font-bold tracking-caps text-muted uppercase">
          {copy.sitio.megamenu.producto.titulo}
        </span>
        <div className="grid grid-cols-2 gap-1">
          {PRODUCTO_ITEMS.map((item) => (
            <NavigationMenu.Link key={item.id} asChild>
              <Link href={item.href} className={megaLinkClass}>
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-icon bg-canvas text-ink transition-colors duration-150 ease-out group-hover:bg-lime"
                >
                  <item.icon className="size-4.5" strokeWidth={strokeCard} />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-14 font-bold text-ink">
                    {item.titulo}
                  </span>
                  <span className="text-13 text-muted">{item.texto}</span>
                </span>
              </Link>
            </NavigationMenu.Link>
          ))}
        </div>
      </div>

      <div className="col-span-2 flex flex-col gap-3">
        <span className="text-12 font-bold tracking-caps text-muted uppercase">
          {copy.sitio.megamenu.paraQuien.titulo}
        </span>
        <ul className="flex flex-col gap-1">
          {INDUSTRIAS.map((industria) => (
            <li key={industria.id}>
              <NavigationMenu.Link asChild>
                <Link
                  href={industria.href}
                  className="block rounded-event px-2.5 py-2 text-14 font-semibold text-ink transition-colors duration-150 ease-out hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  {industria.nombre}
                </Link>
              </NavigationMenu.Link>
            </li>
          ))}
        </ul>
        <NavigationMenu.Link asChild>
          <Link
            href="/#para-quien"
            className="px-2.5 text-13 font-semibold text-ink underline transition-colors duration-150 ease-out hover:text-pending-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {copy.sitio.megamenu.paraQuien.verTodas}
          </Link>
        </NavigationMenu.Link>
      </div>

      <div className="col-span-2 flex flex-col gap-3">
        <span className="text-12 font-bold tracking-caps text-muted uppercase">
          {copy.sitio.megamenu.recursos.titulo}
        </span>
        <ul className="flex flex-col gap-1">
          {RECURSOS_ITEMS.map((item) => (
            <li key={item.href}>
              <NavigationMenu.Link asChild>
                <Link href={item.href} className={megaLinkClass}>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-14 font-bold text-ink">
                      {item.titulo}
                    </span>
                    <span className="text-13 text-muted">{item.texto}</span>
                  </span>
                </Link>
              </NavigationMenu.Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="col-span-3">
        <NavigationMenu.Link asChild>
          <Link
            href="/horas-flash"
            className="group flex h-full flex-col justify-between gap-4 rounded-card bg-dark p-5 text-on-dark transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
          >
            <div className="flex items-center justify-between">
              <span
                aria-hidden="true"
                className="flex size-14 shrink-0 items-center justify-center rounded-icon bg-lime text-ink"
              >
                <Zap className="size-6" strokeWidth={strokeCard} />
              </span>
              <Chip tone="lime" size="xs">
                {copy.sitio.megamenu.destacado.etiqueta}
              </Chip>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-17 font-bold">
                {copy.sitio.megamenu.destacado.titulo}
              </span>
              <span className="text-13 text-on-dark-soft">
                {copy.sitio.megamenu.destacado.texto}
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-13 font-bold text-lime">
              {copy.sitio.megamenu.destacado.cta}
              <ArrowUpRight
                aria-hidden="true"
                className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                strokeWidth={strokeArrow}
              />
            </span>
          </Link>
        </NavigationMenu.Link>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Kontrollerat värde, bara för triggerns "öppen"-pill (se filkommentaren ovan om
  // varför inte `data-[state=open]:…`).
  const [menuValue, setMenuValue] = useState("");

  return (
    <header className="sticky top-4 z-40 px-4 sm:px-8">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 rounded-full border border-surface/60 bg-surface/70 px-3 shadow-glass backdrop-blur-glass backdrop-saturate-150 sm:px-5">
        <Link
          href="/"
          className="flex shrink-0 items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <BrandLogo size="sm" decorative />
        </Link>

        <NavigationMenu.Root
          aria-label={copy.nav.principal}
          className="hidden lg:block"
          delayDuration={100}
          value={menuValue}
          onValueChange={setMenuValue}
        >
          <NavigationMenu.List className="flex items-center gap-2">
            <NavigationMenu.Item value="funcionalidades">
              <NavigationMenu.Trigger
                className={cn(
                  navLinkClass,
                  "flex items-center gap-1 outline-none",
                  menuValue === "funcionalidades" ? navLinkOpenClass : "",
                )}
              >
                {copy.sitio.nav.funcionalidades}
                <ChevronDown
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={strokeNav}
                />
              </NavigationMenu.Trigger>
              <NavigationMenu.Content
                // `fixed` i stället för `absolute`: Radix lägger en egen
                // `position: relative`-wrapper runt <List> (bredd = navraden, inte hela
                // headern), så en `absolute`/`w-full` här skulle bara bli lika bred som
                // navraden. `fixed` + `inset-x-0` gör panelen oberoende av det, och
                // `mx-auto max-w-6xl` inuti återskapar samma breddram som resten av sidan.
                // `top-22`: navets nya höjd (glas-pillen är `h-16` med `top-4` marginal,
                // + 8px luft) i stället för det gamla `h-20`-navets `top-20`.
                className="fixed inset-x-0 top-22 z-40"
              >
                <div className="mx-auto max-w-6xl px-4 sm:px-8">
                  <MegaMenuPanel />
                </div>
              </NavigationMenu.Content>
            </NavigationMenu.Item>

            <NavigationMenu.Item value="para-quien">
              <NavigationMenu.Trigger
                className={cn(
                  navLinkClass,
                  "flex items-center gap-1 outline-none",
                  menuValue === "para-quien" ? navLinkOpenClass : "",
                )}
              >
                {copy.sitio.nav.paraQuien}
                <ChevronDown
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={strokeNav}
                />
              </NavigationMenu.Trigger>
              <NavigationMenu.Content
                // Se kommentaren i "funcionalidades" ovan (samma mönster, samma panel).
                className="fixed inset-x-0 top-22 z-40"
              >
                <div className="mx-auto max-w-6xl px-4 sm:px-8">
                  <MegaMenuPanel />
                </div>
              </NavigationMenu.Content>
            </NavigationMenu.Item>

            <NavigationMenu.Item>
              <NavigationMenu.Link asChild>
                <Link href="/precios" className={navLinkClass}>
                  {copy.sitio.nav.precios}
                </Link>
              </NavigationMenu.Link>
            </NavigationMenu.Item>
            <NavigationMenu.Item>
              <NavigationMenu.Link asChild>
                <Link href="/preguntas" className={navLinkClass}>
                  {copy.sitio.nav.preguntas}
                </Link>
              </NavigationMenu.Link>
            </NavigationMenu.Item>
            <NavigationMenu.Item>
              <NavigationMenu.Link asChild>
                <Link href="/contacto" className={navLinkClass}>
                  {copy.sitio.nav.contacto}
                </Link>
              </NavigationMenu.Link>
            </NavigationMenu.Item>
          </NavigationMenu.List>
        </NavigationMenu.Root>

        <div className="flex shrink-0 items-center gap-2.5">
          <Button
            asChild
            variant="glass"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Link href="/login">{copy.sitio.nav.entrar}</Link>
          </Button>
          <Button
            asChild
            variant="primary"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Link href="/login">{copy.sitio.nav.ctaCrearAgenda}</Link>
          </Button>

          <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
            <Dialog.Trigger asChild>
              <IconButton
                label={copy.nav.secciones}
                tone="ghost"
                className="hover:bg-surface/70 lg:hidden"
              >
                <Menu
                  aria-hidden="true"
                  className="size-5"
                  strokeWidth={strokeNav}
                />
              </IconButton>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-dark" />
              <Dialog.Content
                aria-label={copy.nav.secciones}
                data-surface="dark"
                className="fixed inset-0 z-50 flex animate-fade-up flex-col gap-8 overflow-y-auto bg-dark px-6 pt-6 pb-8 text-on-dark"
              >
                <div className="flex items-center justify-between">
                  <Dialog.Title asChild>
                    <span>
                      <BrandLogo size="sm" decorative />
                    </span>
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <IconButton label={copy.sitio.nav.cerrar} tone="dark-2">
                      <X
                        aria-hidden="true"
                        className="size-5"
                        strokeWidth={strokeNav}
                      />
                    </IconButton>
                  </Dialog.Close>
                </div>

                <nav
                  aria-label={copy.nav.principal}
                  className="flex flex-1 flex-col gap-1"
                >
                  <span className="px-3 text-12 font-bold tracking-caps text-on-dark-muted uppercase">
                    {copy.sitio.megamenu.producto.titulo}
                  </span>
                  {PRODUCTO_ITEMS.map((item) => (
                    <Dialog.Close key={item.id} asChild>
                      <Link
                        href={item.href}
                        className="flex items-center gap-3 rounded-event px-3 py-2.5 font-display text-24 font-semibold text-on-dark hover:bg-dark-2"
                      >
                        <item.icon
                          aria-hidden="true"
                          className="size-5 shrink-0 text-lime"
                          strokeWidth={strokeCard}
                        />
                        {item.titulo}
                      </Link>
                    </Dialog.Close>
                  ))}

                  <span className="mt-3 px-3 text-12 font-bold tracking-caps text-on-dark-muted uppercase">
                    {copy.sitio.megamenu.paraQuien.titulo}
                  </span>
                  {INDUSTRIAS.map((industria) => (
                    <Dialog.Close key={industria.id} asChild>
                      <Link
                        href={industria.href}
                        className="rounded-event px-3 py-2 text-18 font-semibold text-on-dark-soft hover:bg-dark-2 hover:text-on-dark"
                      >
                        {industria.nombre}
                      </Link>
                    </Dialog.Close>
                  ))}
                  <Dialog.Close asChild>
                    <Link
                      href="/#para-quien"
                      className="rounded-event px-3 py-2 text-14 font-semibold text-lime underline"
                    >
                      {copy.sitio.megamenu.paraQuien.verTodas}
                    </Link>
                  </Dialog.Close>

                  <span className="mt-3 px-3 text-12 font-bold tracking-caps text-on-dark-muted uppercase">
                    {copy.sitio.megamenu.recursos.titulo}
                  </span>
                  {RECURSOS_ITEMS.map((item) => (
                    <Dialog.Close key={item.href} asChild>
                      <Link
                        href={item.href}
                        className="rounded-event px-3 py-2 text-18 font-semibold text-on-dark-soft hover:bg-dark-2 hover:text-on-dark"
                      >
                        {item.titulo}
                      </Link>
                    </Dialog.Close>
                  ))}
                </nav>

                <div className="flex flex-col gap-3">
                  <Dialog.Close asChild>
                    <Link
                      href="/login"
                      className="text-center text-16 font-semibold text-on-dark underline"
                    >
                      {copy.sitio.nav.entrar}
                    </Link>
                  </Dialog.Close>
                  <Dialog.Close asChild>
                    <Button asChild variant="accent" size="xl">
                      <Link href="/login">{copy.sitio.nav.ctaCrearAgenda}</Link>
                    </Button>
                  </Dialog.Close>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  );
}
