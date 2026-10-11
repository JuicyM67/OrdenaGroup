// "Logga in" i headern: liten glas-popover med två val, kund (kundinloggningen) eller
// företag (`/login`). Radix Popover ger tangentbord, fokusfångst och Escape. Samma
// glas-stil som megamenyns paneler. Utan marknadsplats/kundkonton (CL) är "Logga in" en
// vanlig länk, se `site-header.tsx`.
"use client";

import * as Popover from "@radix-ui/react-popover";
import { ChevronDown, Store, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { strokeNav } from "@/components/ui/icons";
import { cuentaHref } from "@/config/routes";
import { paraClientes } from "@/i18n";
import { paginas } from "@/i18n/paginas";

const t = paraClientes.nav;

const itemClass =
  "flex items-center gap-3 rounded-panel p-3 transition-colors duration-200 ease-out hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export function LoginMenu() {
  const [open, setOpen] = useState(false);
  const items = [
    {
      href: cuentaHref("cuentaIngresar"),
      icon: UserRound,
      tone: "bg-staff-1",
      titulo: t.soyCliente,
      texto: t.soyClienteTexto,
    },
    {
      href: "/login",
      icon: Store,
      tone: "bg-lime",
      titulo: t.tengoNegocio,
      texto: t.tengoNegocioTexto,
    },
  ] as const;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="hidden gap-1.5 rounded-full hover:bg-canvas sm:inline-flex"
        >
          {paginas.nav.entrar}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-4 transition-transform duration-200 ease-out",
              open ? "rotate-180" : "",
            )}
            strokeWidth={strokeNav}
          />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={14}
          className="z-50 w-80 animate-fade-up rounded-shell border border-surface/80 bg-surface/92 p-2.5 shadow-popover backdrop-blur-glass backdrop-saturate-150"
        >
          <ul className="flex flex-col gap-0.5">
            {items.map((it) => (
              <li key={it.href}>
                <Link
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className={itemClass}
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full text-ink ${it.tone}`}
                  >
                    <it.icon className="size-4.5" strokeWidth={2} />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <b className="text-15">{it.titulo}</b>
                    <span className="text-13 text-muted">{it.texto}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
