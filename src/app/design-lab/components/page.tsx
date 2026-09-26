import {
  ArrowUpRight,
  Bell,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { strokeArrow, strokeCard } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import { LogoMark } from "@/components/ui/logo-mark";

import {
  avatarFixtures,
  cardFixtures,
  chipFixtures,
  pillFixtures,
} from "../_fixtures/components";
import { PillDemo } from "./pill-demo";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-line-strong pt-6 first:border-t-0 first:pt-0">
      <h2 className="text-18 font-bold">{title}</h2>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

export default function ComponentsCatalogPage() {
  return (
    <main className="mx-auto flex max-w-240 flex-col gap-8 px-6 py-10 text-ink">
      <h1 className="font-display text-32 font-bold tracking-display">
        Katalog
      </h1>

      <Section title="Button — variant">
        <Button variant="primary">Nueva reserva</Button>
        <Button variant="secondary">No vino</Button>
        <Button variant="accent">Reservar</Button>
        <Card
          as="div"
          tone="dark"
          radius="tile"
          padding="md"
          className="inline-flex"
        >
          <Button variant="outline-dark">No vino</Button>
        </Card>
        <Card
          as="div"
          tone="dark"
          radius="tile"
          padding="md"
          className="inline-flex"
        >
          <Button variant="inverse">
            VER DETALLE
            <ArrowUpRight
              aria-hidden="true"
              className="size-4"
              strokeWidth={strokeArrow}
            />
          </Button>
        </Card>
      </Section>

      <Section title="Button — storlek">
        <Button size="xs">Hoy</Button>
        <Button size="sm" variant="secondary">
          Mover
        </Button>
        <Button size="md" variant="inverse">
          VER DETALLE
        </Button>
        <Button size="lg">Nueva reserva</Button>
        <Button size="xl" variant="accent">
          Llegó
        </Button>
        <Button size="2xl" variant="accent">
          Reservar
        </Button>
      </Section>

      <Section title="Button — tillstånd">
        <Button disabled>No disponible</Button>
        <Button asChild variant="accent">
          <a href="#reservar">Reservar (asChild, länk)</a>
        </Button>
      </Section>

      <Section title="IconButton — tone/shape">
        <IconButton label="Buscar" tone="surface">
          <Search aria-hidden="true" className="size-5" strokeWidth={1.9} />
        </IconButton>
        <IconButton label="Notificaciones (nuevas)" tone="surface" badge>
          <Bell aria-hidden="true" className="size-5" strokeWidth={1.9} />
        </IconButton>
        <IconButton label="Mes anterior" tone="canvas" size={32}>
          <ChevronLeft
            aria-hidden="true"
            className="size-4"
            strokeWidth={strokeArrow}
          />
        </IconButton>
        <IconButton label="Cerrar" tone="ghost" size={30}>
          <X aria-hidden="true" className="size-4" strokeWidth={strokeArrow} />
        </IconButton>
        <Card
          as="div"
          tone="dark"
          radius="tile"
          padding="md"
          className="inline-flex gap-3"
        >
          <IconButton label="Mes siguiente" tone="ghost-dark" size={30}>
            <ChevronRight
              aria-hidden="true"
              className="size-4"
              strokeWidth={strokeArrow}
            />
          </IconButton>
          <IconButton
            label="Nueva reserva"
            tone="dark-2"
            size={56}
            shape="square"
          >
            <ArrowUpRight
              aria-hidden="true"
              className="size-5.5"
              strokeWidth={strokeCard}
            />
          </IconButton>
        </Card>
        <IconButton label="Inaktiv" tone="surface" disabled>
          <X aria-hidden="true" className="size-5" strokeWidth={1.9} />
        </IconButton>
      </Section>

      <Section title="Chip — tone/storlek">
        {chipFixtures.map((c) => (
          <Chip key={c.label} tone={c.tone} size={c.size}>
            {c.label}
          </Chip>
        ))}
      </Section>

      <Section title="Pill — vald/ovald">
        <PillDemo labels={pillFixtures} />
      </Section>

      <Section title="Avatar">
        {avatarFixtures.map((a) => (
          <Avatar
            key={a.initials}
            initials={a.initials}
            tone={a.tone}
            size={a.size}
          />
        ))}
        <Avatar initials="DI" tone="staff-1" shape="square" size={40} />
      </Section>

      <Section title="LogoMark">
        <LogoMark label="Ir al inicio" />
      </Section>

      <Section title="Card — tone">
        {cardFixtures.map((c) => (
          <Card
            key={c.label}
            tone={c.tone}
            padding="lg"
            className="h-20 w-32 text-13 font-semibold"
          >
            {c.label}
          </Card>
        ))}
      </Section>
    </main>
  );
}
