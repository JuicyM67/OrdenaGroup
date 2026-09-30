// Header delad av alla sidor på sitio-webben (WP-hemsida, utökad i WP-hemsida v2 med en
// megameny; retro 2026-09-28 punkt 2 bytte skalet mot ett flytande "liquid glass"-nav, se
// `.visual-diff/ref/nav-ref.png` — halvtransparent yta, `backdrop-blur-glass`, tunn ljus
// kant och `--shadow-glass`; ägarens val "Nav A", wp/WP-43-nav-a, bytte innehållet mot
// `.visual-diff/ref/NavA.dc.html`, glaskänslan i skalet är oförändrad): logga, nav (exakt
// fyra ord — "Producto", "Para quién", "Precios", "Por qué elegirnos" — bara "Producto"
// öppnar en panel: en kolumn med sex ikon+text-punkter under rubriken
// `megamenu.titulo`, plus ett mörkt destacado-kort för Horas flash), "Entrar" (vanlig
// textlänk, ingen glasknapp längre) och CTA (ink). Radix NavigationMenu på skrivbord
// (tangentbord: Enter/klick öppnar triggern, Escape stänger, klick utanför stänger — allt
// Radix förvalt, ingen egen hantering behövs). Ingen Viewport-komponent: med en enda
// trigger renderas Content in-place, positionerad mot den (relativa) headern. Root körs
// kontrollerad (`value`/`onValueChange`) bara för att kunna ge den öppna triggerns "inre
// pill" ett eget utseende i JS — CSS-attributvarianter (`data-[state=open]:…`) räknas som
// ett godtyckligt Tailwind-värde och är förbjudna (D-015, `no-restricted-syntax`, se
// globals.css-kommentaren vid `toggle-on`). Mobilmenyn (Radix Dialog) speglar samma
// struktur: "Producto" är en expanderbar grupp (native `<details>`/`<summary>`, samma
// mönster som `FaqAccordion`, tangentbord gratis), de tre andra orden är platta länkar.
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import {
  ArrowUpRight,
  Bell,
  Calendar,
  ChartLine,
  ChevronDown,
  ClipboardCheck,
  Link2,
  List,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { IconButton } from "@/components/ui/icon-button";
import { strokeArrow, strokeCard, strokeNav } from "@/components/ui/icons";
import { href } from "@/config/routes";
import { copy } from "@/i18n/marketing";

import { BrandLogo } from "./brand-logo";

/** `tone` → färgruta bakom ikonen (WP-43 "Nav A"): samma tokens som resten av
 * designsystemet (`docs/design/DESIGN.md` §4), en färg per punkt. */
const ICON_TONE_CLASS: Record<string, string> = {
  lime: "bg-lime",
  lavender: "bg-lavender",
  peach: "bg-peach",
  sky: "bg-sky",
  mint: "bg-mint",
  canvas: "bg-canvas",
};

/** De sex punkterna i panelen "Producto" (WP-43 "Nav A"), i samma ordning som
 * `.visual-diff/ref/NavA.dc.html`: Reservas, Agenda, Recordatorios, Lista de espera,
 * Preguntas (de tu rubro) och Ver todas. `preguntas` länkar a `ventajas` (mismo contenido
 * que `ventajas.diferencias.items.d`, sin sección/ancla propia en `funcionalidades` todavía);
 * los demás van a su ancla en `funcionalidades`. Horas flash ya no vive acá — se mudó a la
 * tarjeta destacada. */
const PRODUCTO_ITEMS: readonly {
  id: string;
  href: string;
  icon: LucideIcon;
  tone: string;
  titulo: string;
  texto: string;
  /** Solo el último ítem ("Ver todas las funcionalidades") lleva la flecha del diseño. */
  flecha?: boolean;
}[] = [
  {
    id: "reservas",
    href: href("funcionalidades", "link-reservas"),
    icon: Link2,
    tone: "lime",
    ...copy.sitio.megamenu.items.reservas,
  },
  {
    id: "agenda",
    href: href("funcionalidades", "agenda"),
    icon: Calendar,
    tone: "lavender",
    ...copy.sitio.megamenu.items.agenda,
  },
  {
    id: "recordatorios",
    href: href("funcionalidades", "recordatorios"),
    icon: Bell,
    tone: "peach",
    ...copy.sitio.megamenu.items.recordatorios,
  },
  {
    id: "lista-espera",
    href: href("funcionalidades", "lista-espera"),
    icon: List,
    tone: "sky",
    ...copy.sitio.megamenu.items.listaEspera,
  },
  {
    id: "preguntas",
    href: href("ventajas"),
    icon: ClipboardCheck,
    tone: "mint",
    ...copy.sitio.megamenu.items.preguntas,
  },
  {
    id: "ver-todas",
    href: href("funcionalidades"),
    icon: ChartLine,
    tone: "canvas",
    ...copy.sitio.megamenu.items.verTodas,
    flecha: true,
  },
];

// Länken/triggerns "inre pill" (glas-knapp) vid hover — och, för triggerna, när den egna
// panelen är öppen (se `isOpen` i `SiteHeader`, aldrig via CSS-attributvarianter). Samma
// klass på länkar och triggers, så alla nav-punkter känns likadana.
const navLinkClass =
  "rounded-full px-3 py-1.75 text-14 font-semibold text-ink transition-colors duration-150 ease-out hover:bg-surface/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

const navLinkOpenClass = "bg-surface/70 shadow-popover";

const productoItemClass =
  "group flex items-start gap-3 rounded-avatar p-2.5 transition-colors duration-150 ease-out hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/** Panelen som öppnas av den enda triggern "Producto" (WP-43 "Nav A"): en kolumn med
 * sex ikon+text-punkter under rubriken `megamenu.titulo`, plus ett mörkt destacado-kort
 * för Horas flash till höger (`w-55` = 220 px, samma bredd som i referensen). */
function ProductoMenuPanel() {
  return (
    <div className="flex w-180 gap-4 rounded-card border border-line bg-surface p-5.5 shadow-popover">
      <div className="flex flex-1 flex-col gap-1.5">
        <span className="px-2.5 pb-1.5 text-12 font-bold tracking-caps text-muted uppercase">
          {copy.sitio.megamenu.titulo}
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {PRODUCTO_ITEMS.map((item) => (
            <NavigationMenu.Link key={item.id} asChild>
              <Link href={item.href} className={productoItemClass}>
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-chip text-ink",
                    ICON_TONE_CLASS[item.tone],
                  )}
                >
                  <item.icon className="size-4" strokeWidth={strokeCard} />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-14 font-bold text-ink">
                    {item.titulo}
                  </span>
                  <span className="inline-flex items-center gap-1 text-12 text-muted">
                    {item.texto}
                    {item.flecha ? (
                      <ArrowUpRight
                        aria-hidden="true"
                        className="size-3.5 shrink-0"
                        strokeWidth={strokeArrow}
                      />
                    ) : null}
                  </span>
                </span>
              </Link>
            </NavigationMenu.Link>
          ))}
        </div>
      </div>

      <NavigationMenu.Link asChild>
        <Link
          href={href("horasFlash")}
          className="group flex w-55 shrink-0 flex-col justify-between rounded-icon bg-dark p-4.5 text-on-dark transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
        >
          <Chip tone="lime" size="xs" className="self-start">
            {copy.sitio.megamenu.destacado.etiqueta}
          </Chip>
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
          href={href("inicio")}
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
            <NavigationMenu.Item value="producto">
              <NavigationMenu.Trigger
                className={cn(
                  navLinkClass,
                  "flex items-center gap-1 outline-none",
                  menuValue === "producto" ? navLinkOpenClass : "",
                )}
              >
                {copy.sitio.nav.producto}
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
                // `mx-auto max-w-6xl` inuti återskapar samma breddram som resten av sidan
                // — panelen själv (`w-180`) fyller inte den bredden, den hamnar bara kvar
                // till vänster i den (samma x-position som referensens `left:220px`).
                // `top-22`: navets höjd (glas-pillen är `h-16` med `top-4` marginal, + 8px
                // luft).
                className="fixed inset-x-0 top-22 z-40"
              >
                <div className="mx-auto max-w-6xl px-4 sm:px-8">
                  <ProductoMenuPanel />
                </div>
              </NavigationMenu.Content>
            </NavigationMenu.Item>

            <NavigationMenu.Item>
              <NavigationMenu.Link asChild>
                <Link
                  href={href("inicio", "para-quien")}
                  className={navLinkClass}
                >
                  {copy.sitio.nav.paraQuien}
                </Link>
              </NavigationMenu.Link>
            </NavigationMenu.Item>
            <NavigationMenu.Item>
              <NavigationMenu.Link asChild>
                <Link href={href("precios")} className={navLinkClass}>
                  {copy.sitio.nav.precios}
                </Link>
              </NavigationMenu.Link>
            </NavigationMenu.Item>
            <NavigationMenu.Item>
              <NavigationMenu.Link asChild>
                <Link href={href("ventajas")} className={navLinkClass}>
                  {copy.sitio.nav.porQue}
                </Link>
              </NavigationMenu.Link>
            </NavigationMenu.Item>
          </NavigationMenu.List>
        </NavigationMenu.Root>

        <div className="flex shrink-0 items-center gap-2.5">
          <Link
            href="/login"
            className={cn(navLinkClass, "hidden sm:inline-flex")}
          >
            {copy.sitio.nav.entrar}
          </Link>
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
                  {/* "Producto" som expanderbar grupp (WP-43 "Nav A"): native
                      <details>/<summary>, samma mönster som FaqAccordion — tangentbord
                      (Enter/mellanslag öppnar/stänger) och skärmläsarstöd gratis, ingen
                      egen JS-status behövs. */}
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-event px-3 py-2.5 font-display text-24 font-semibold text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime">
                      {copy.sitio.nav.producto}
                      <ChevronDown
                        aria-hidden="true"
                        className="size-5 shrink-0 text-on-dark-muted transition-transform duration-150 ease-out group-open:rotate-180"
                        strokeWidth={strokeNav}
                      />
                    </summary>
                    <div className="flex flex-col gap-1 py-1">
                      {PRODUCTO_ITEMS.map((item) => (
                        <Dialog.Close key={item.id} asChild>
                          <Link
                            href={item.href}
                            className="flex items-center gap-3 rounded-event py-2 pr-3 pl-6 text-18 font-semibold text-on-dark-soft hover:bg-dark-2 hover:text-on-dark"
                          >
                            <item.icon
                              aria-hidden="true"
                              className="size-4.5 shrink-0 text-lime"
                              strokeWidth={strokeCard}
                            />
                            {item.titulo}
                          </Link>
                        </Dialog.Close>
                      ))}
                    </div>
                  </details>

                  <Dialog.Close asChild>
                    <Link
                      href={href("inicio", "para-quien")}
                      className="rounded-event px-3 py-2.5 font-display text-24 font-semibold text-on-dark hover:bg-dark-2"
                    >
                      {copy.sitio.nav.paraQuien}
                    </Link>
                  </Dialog.Close>
                  <Dialog.Close asChild>
                    <Link
                      href={href("precios")}
                      className="rounded-event px-3 py-2.5 font-display text-24 font-semibold text-on-dark hover:bg-dark-2"
                    >
                      {copy.sitio.nav.precios}
                    </Link>
                  </Dialog.Close>
                  <Dialog.Close asChild>
                    <Link
                      href={href("ventajas")}
                      className="rounded-event px-3 py-2.5 font-display text-24 font-semibold text-on-dark hover:bg-dark-2"
                    >
                      {copy.sitio.nav.porQue}
                    </Link>
                  </Dialog.Close>
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
