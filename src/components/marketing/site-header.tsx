// Header delad av alla sidor på sitio-webben (WP-hemsida): logga, nav (med undermenyn
// "Para quién"), "Entrar" och CTA. Samma yta som landningens tidigare bespoke header
// (`sticky top-0 border-b border-line bg-canvas`, h-20), nu återanvänd på fler sidor.
// Klientkomponent: undermenyn (Radix Popover, skrivbord) och mobilmenyn (Radix Dialog)
// har eget öppet/stängt-tillstånd.
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { LogoMark } from "@/components/ui/logo-mark";
import { strokeNav } from "@/components/ui/icons";
import { brand } from "@/config/brand";
import { copy } from "@/i18n/marketing";

const NAV_LINK_FUNCIONALIDADES = {
  href: "/funcionalidades",
  label: copy.sitio.nav.funcionalidades,
} as const;

const NAV_LINKS_AFTER_PARA_QUIEN = [
  { href: "/precios", label: copy.sitio.nav.precios },
  { href: "/preguntas", label: copy.sitio.nav.preguntas },
  { href: "/contacto", label: copy.sitio.nav.contacto },
] as const;

const INDUSTRIAS = copy.SITIO_PARA_INDUSTRIAS.map((industria) => ({
  id: industria.id,
  nombre: industria.nombre,
  href: `/para/${industria.id}`,
}));

const navLinkClass =
  "text-14 font-semibold text-ink transition-colors duration-150 ease-out hover:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <LogoMark label={brand.name} size={40} decorative />
          <span className="font-display text-19 font-bold tracking-display text-ink">
            {brand.name}
          </span>
        </Link>

        <nav
          aria-label={copy.nav.principal}
          className="hidden items-center gap-8 lg:flex"
        >
          <Link href="/funcionalidades" className={navLinkClass}>
            {copy.sitio.nav.funcionalidades}
          </Link>

          <Popover.Root>
            <Popover.Trigger
              className={`${navLinkClass} flex items-center gap-1`}
            >
              {copy.sitio.nav.paraQuien}
              <ChevronDown
                aria-hidden="true"
                className="size-4"
                strokeWidth={strokeNav}
              />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                sideOffset={12}
                align="start"
                className="z-10 flex w-56 flex-col gap-1 rounded-panel bg-surface p-2 shadow-popover"
              >
                {INDUSTRIAS.map((industria) => (
                  <Popover.Close key={industria.id} asChild>
                    <Link
                      href={industria.href}
                      className="rounded-event px-3 py-2.5 text-14 font-semibold text-ink transition-colors duration-150 ease-out hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      {industria.nombre}
                    </Link>
                  </Popover.Close>
                ))}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          <Link href="/precios" className={navLinkClass}>
            {copy.sitio.nav.precios}
          </Link>
          <Link href="/preguntas" className={navLinkClass}>
            {copy.sitio.nav.preguntas}
          </Link>
          <Link href="/contacto" className={navLinkClass}>
            {copy.sitio.nav.contacto}
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/login"
            className="hidden text-14 font-semibold text-ink underline transition-colors duration-150 ease-out hover:text-pending-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:inline"
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
                tone="canvas"
                className="lg:hidden"
              >
                <Menu
                  aria-hidden="true"
                  className="size-5"
                  strokeWidth={strokeNav}
                />
              </IconButton>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/45" />
              <Dialog.Content
                aria-label={copy.nav.secciones}
                className="fixed inset-y-0 right-0 z-50 flex w-full max-w-80 flex-col gap-6 bg-surface p-6 shadow-popover"
              >
                <div className="flex items-center justify-between">
                  <Dialog.Title asChild>
                    <span className="font-display text-19 font-bold tracking-display text-ink">
                      {brand.name}
                    </span>
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    {/* TODO_COPY: falta una cadena genérica "Cerrar" en `copy`
                        (existe `comun.cerrar` en es-CL.ts, pero `comun` no está
                        en `MarketingCopy`). Avisado en el reporte de WP-hemsida. */}
                    <IconButton label="TODO_COPY: Cerrar" tone="canvas">
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
                  <Dialog.Close asChild>
                    <Link
                      href={NAV_LINK_FUNCIONALIDADES.href}
                      className="rounded-event px-3 py-3 text-16 font-semibold text-ink hover:bg-canvas"
                    >
                      {NAV_LINK_FUNCIONALIDADES.label}
                    </Link>
                  </Dialog.Close>

                  <span className="mt-3 px-3 text-12 font-bold tracking-caps text-muted uppercase">
                    {copy.sitio.nav.paraQuien}
                  </span>
                  {INDUSTRIAS.map((industria) => (
                    <Dialog.Close key={industria.id} asChild>
                      <Link
                        href={industria.href}
                        className="rounded-event px-3 py-3 text-16 font-semibold text-ink hover:bg-canvas"
                      >
                        {industria.nombre}
                      </Link>
                    </Dialog.Close>
                  ))}

                  <div className="mt-3 border-t border-line pt-3" />
                  {NAV_LINKS_AFTER_PARA_QUIEN.map((link) => (
                    <Dialog.Close key={link.href} asChild>
                      <Link
                        href={link.href}
                        className="rounded-event px-3 py-3 text-16 font-semibold text-ink hover:bg-canvas"
                      >
                        {link.label}
                      </Link>
                    </Dialog.Close>
                  ))}
                </nav>

                <div className="flex flex-col gap-3">
                  <Dialog.Close asChild>
                    <Link
                      href="/login"
                      className="text-center text-14 font-semibold text-ink underline"
                    >
                      {copy.sitio.nav.entrar}
                    </Link>
                  </Dialog.Close>
                  <Dialog.Close asChild>
                    <Button asChild variant="primary" size="xl">
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
