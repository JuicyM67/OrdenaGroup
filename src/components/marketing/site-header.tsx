// Header delad av alla sidor på sitio-webben. Flytande "liquid glass"-nav (halvtransparent
// yta, `backdrop-blur-glass`, tunn ljus kant och `--shadow-glass`). WP-75 bytte innehållet
// mot den nya megamenyn (`docs/design/reference/undersidor/Main.dc.html`, `Branscher.dc.html`,
// `Mobil.dc.html`): "Funktioner" och "Branscher" öppnar var sin glaspanel (se `mega-menu.tsx`),
// "Demo" öppnar en liten panel med kund- och företagsdemot, "Priser" är en vanlig länk. Radix NavigationMenu ger tangentbordet
// (Enter/mellanslag öppnar, pil ned går in i panelen, Tab fortsätter genom den, Escape stänger
// och flyttar tillbaka fokus till triggern), `aria-expanded`/`aria-controls` och hover-intent
// (`delayDuration`). Panelen är `fixed` och placeras under sidhuvudet med uppmätt `top`
// (headern ligger på olika höjd före och efter scroll). Mobil: helskärms-glaspanel (Radix
// Dialog) med native `<details>` för "Funktioner" och "Branscher". Root körs kontrollerad
// bara för att kunna ge den öppna triggern en egen pill (CSS-attributvarianter är
// förbjudna, D-015).
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { IconButton } from "@/components/ui/icon-button";
import { strokeNav } from "@/components/ui/icons";
import { brand } from "@/config/brand";
import {
  funcionesDisponibles,
  href,
  hrefFuncion,
  hrefRubro,
  hrefRubros,
  RUBRO_IDS,
} from "@/config/routes";
import { copy } from "@/i18n/marketing";
import { paginas } from "@/i18n/paginas";

import { BrandLogo } from "./brand-logo";
import { DemoPanel, FuncionesPanel, RubrosPanel } from "./mega-menu";
import { FUNCION_UI, TONE_CLASS } from "./paginas/registry";

const t = paginas.nav;

// Länkens/triggerns "inre pill" vid hover — och, för triggerna, när den egna panelen är
// öppen. Samma klass på länkar och triggers, så alla nav-punkter känns likadana.
const navLinkClass =
  "rounded-full px-3 py-1.75 text-14 font-semibold text-ink transition-colors duration-150 ease-out hover:bg-surface/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

const navLinkOpenClass = "bg-surface/70 shadow-popover";

const mobileRowClass =
  "border-t border-ink/10 py-3.5 text-18 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

const mobileSummaryClass =
  "flex cursor-pointer list-none items-center justify-between rounded-event py-3.5 text-18 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

const PANELS = [
  ["funciones", t.funciones, FuncionesPanel],
  ["rubros", t.rubros, RubrosPanel],
  ["demo", t.ejemplo, DemoPanel],
] as const;

export function SiteHeader({ className }: { className?: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuValue, setMenuValue] = useState("");
  const [panelTop, setPanelTop] = useState(0);
  const headerRef = useRef<HTMLElement>(null);

  // Panelen följer headerns underkant (headern är sticky och ligger lägre före scroll).
  useEffect(() => {
    if (!menuValue) return;
    const place = () => {
      const r = headerRef.current?.getBoundingClientRect();
      if (r) setPanelTop(Math.round(r.bottom) - 6);
    };
    place();
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
    };
  }, [menuValue]);

  return (
    <header
      ref={headerRef}
      className={cn("sticky top-4 z-40 px-4 sm:px-8", className)}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 rounded-full border border-surface/60 bg-surface/70 px-3 shadow-glass backdrop-blur-glass backdrop-saturate-150 sm:px-5">
        <Link
          href={href("inicio")}
          className="flex shrink-0 items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <BrandLogo size="sm" badge decorative />
        </Link>

        <NavigationMenu.Root
          aria-label={copy.nav.principal}
          className="hidden lg:block"
          delayDuration={150}
          skipDelayDuration={300}
          value={menuValue}
          onValueChange={setMenuValue}
        >
          <NavigationMenu.List className="flex items-center gap-2">
            {PANELS.map(([value, label, Panel]) => (
              <NavigationMenu.Item key={value} value={value}>
                <NavigationMenu.Trigger
                  className={cn(
                    navLinkClass,
                    "flex items-center gap-1",
                    menuValue === value ? navLinkOpenClass : "",
                  )}
                >
                  {label}
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      "size-4 transition-transform duration-200 ease-out",
                      menuValue === value ? "rotate-180" : "",
                    )}
                    strokeWidth={strokeNav}
                  />
                </NavigationMenu.Trigger>
                <NavigationMenu.Content
                  className="fixed inset-x-0 z-40 px-4 sm:px-8"
                  style={{ top: panelTop }}
                >
                  <div
                    className={cn(
                      "mx-auto rounded-shell border border-surface/80 bg-surface/92 shadow-popover backdrop-blur-glass backdrop-saturate-150",
                      value === "demo" ? "max-w-xl p-3.5" : "max-w-6xl p-5.5",
                    )}
                  >
                    <Panel />
                  </div>
                </NavigationMenu.Content>
              </NavigationMenu.Item>
            ))}

            <NavigationMenu.Item>
              <NavigationMenu.Link asChild>
                <Link href={href("precios")} className={navLinkClass}>
                  {t.precios}
                </Link>
              </NavigationMenu.Link>
            </NavigationMenu.Item>
          </NavigationMenu.List>
        </NavigationMenu.Root>

        <div className="flex shrink-0 items-center gap-2.5">
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="hidden rounded-full hover:bg-canvas sm:inline-flex"
          >
            <Link href="/login">{t.entrar}</Link>
          </Button>
          <Button
            asChild
            variant="primary"
            size="sm"
            className="hidden rounded-full bg-lilac text-ink hover:bg-lilac/85 sm:inline-flex"
          >
            <Link href="/login">{copy.sitio.nav.ctaCrearAgenda}</Link>
          </Button>

          <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
            <Dialog.Trigger asChild>
              <IconButton
                label={t.abrirMenu}
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
              <Dialog.Overlay className="fixed inset-0 z-50 bg-dark/70 backdrop-blur-glass" />
              <Dialog.Content
                aria-label={copy.nav.secciones}
                aria-describedby={undefined}
                className="fixed inset-2.5 z-50 flex animate-fade-up flex-col gap-1 overflow-y-auto rounded-shell border border-surface/80 bg-surface/92 p-4.5 shadow-popover"
              >
                <div className="flex items-center justify-between pb-2">
                  <Dialog.Title asChild>
                    <span>
                      <BrandLogo size="sm" badge decorative />
                    </span>
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <IconButton label={t.cerrarMenu} tone="ghost">
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
                  className="flex flex-1 flex-col"
                >
                  <details className="group border-t border-ink/10">
                    <summary className={mobileSummaryClass}>
                      {t.funciones}
                      <ChevronDown
                        aria-hidden="true"
                        className="size-4.5 transition-transform duration-300 group-open:rotate-180"
                        strokeWidth={strokeNav}
                      />
                    </summary>
                    <ul className="flex flex-col pb-2">
                      {funcionesDisponibles().map((id) => {
                        const ft = paginas.funciones[id]!;
                        const ui = FUNCION_UI[id];
                        return (
                          <li key={id}>
                            <Dialog.Close asChild>
                              <Link
                                href={hrefFuncion(id)}
                                className="flex items-center gap-3 rounded-event px-1 py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                              >
                                <span
                                  aria-hidden="true"
                                  className={`flex size-9.5 shrink-0 items-center justify-center rounded-full ${TONE_CLASS[ui.tone]}`}
                                >
                                  <ui.icon
                                    className="size-4.5"
                                    strokeWidth={2}
                                  />
                                </span>
                                <span className="flex flex-col">
                                  <b className="text-14">{ft.nombre}</b>
                                  <span className="text-12 text-muted">
                                    {ft.resumen}
                                  </span>
                                </span>
                              </Link>
                            </Dialog.Close>
                          </li>
                        );
                      })}
                      <li>
                        <Dialog.Close asChild>
                          <Link
                            href={href("funcionalidades")}
                            className="block rounded-event px-1 py-2.5 text-14 font-bold underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                          >
                            {t.menuFunciones.verTodas}
                          </Link>
                        </Dialog.Close>
                      </li>
                    </ul>
                  </details>

                  <details className="group border-t border-ink/10">
                    <summary className={mobileSummaryClass}>
                      {t.rubros}
                      <ChevronDown
                        aria-hidden="true"
                        className="size-4.5 transition-transform duration-300 group-open:rotate-180"
                        strokeWidth={strokeNav}
                      />
                    </summary>
                    <ul className="flex flex-wrap gap-1.5 pb-3">
                      {RUBRO_IDS.map((id) => (
                        <li key={id}>
                          <Dialog.Close asChild>
                            <Link
                              href={hrefRubro(id)}
                              className="inline-flex rounded-event bg-ink/6 px-3 py-2 text-13 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                            >
                              {paginas.rubros[id].nombre}
                            </Link>
                          </Dialog.Close>
                        </li>
                      ))}
                      <li>
                        <Dialog.Close asChild>
                          <Link
                            href={hrefRubros()}
                            className="inline-flex rounded-event bg-ink px-3 py-2 text-13 font-bold text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                          >
                            {t.menuRubros.todas}
                          </Link>
                        </Dialog.Close>
                      </li>
                    </ul>
                  </details>

                  <Dialog.Close asChild>
                    <Link href={href("precios")} className={mobileRowClass}>
                      {t.precios}
                    </Link>
                  </Dialog.Close>

                  <details className="group border-t border-ink/10">
                    <summary className={mobileSummaryClass}>
                      {t.ejemplo}
                      <ChevronDown
                        aria-hidden="true"
                        className="size-4.5 transition-transform duration-300 group-open:rotate-180"
                        strokeWidth={strokeNav}
                      />
                    </summary>
                    <ul className="flex flex-col pb-2">
                      {[
                        [`/${brand.demoSlug}`, t.menuDemo.cliente],
                        [href("ejemploNegocio"), t.menuDemo.negocio],
                      ].map(([to, it]) => (
                        <li key={to as string}>
                          <Dialog.Close asChild>
                            <Link
                              href={to as string}
                              className="flex flex-col rounded-event px-1 py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                            >
                              <b className="text-14">
                                {(it as typeof t.menuDemo.cliente).titulo}
                              </b>
                              <span className="text-12 text-muted">
                                {(it as typeof t.menuDemo.cliente).texto}
                              </span>
                            </Link>
                          </Dialog.Close>
                        </li>
                      ))}
                    </ul>
                  </details>
                </nav>

                <div className="mt-4 flex flex-col gap-2">
                  <Dialog.Close asChild>
                    <Button
                      asChild
                      variant="primary"
                      size="2xl"
                      className="h-13 rounded-full bg-lilac text-ink hover:bg-lilac/85"
                    >
                      <Link href="/login">{t.crearGratis}</Link>
                    </Button>
                  </Dialog.Close>
                  <Dialog.Close asChild>
                    <Link
                      href="/login"
                      className="flex h-12 items-center justify-center rounded-full bg-ink/6 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      {t.entrar}
                    </Link>
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
