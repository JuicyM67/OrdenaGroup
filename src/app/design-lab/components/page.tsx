import {
  ArrowUpRight,
  Bell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Search,
  Users,
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
  NavRail,
  NavRailAction,
  NavRailDivider,
  NavRailLink,
  NavRailLogo,
  NavRailSpacer,
} from "@/components/ui/nav-rail";
import { PageHeader } from "@/components/ui/page-header";
import { TextLink } from "@/components/ui/text-link";
import { UserPill } from "@/components/ui/user-pill";

import {
  avatarFixtures,
  cardFixtures,
  chipFixtures,
  miniCalendarLabels,
  miniCalendarMarkedDates,
  navRailFixtures,
  pageHeaderMeta,
  pillFixtures,
  segmentedControlOptions,
  userPillFixture,
} from "../_fixtures/components";
import { MiniCalendarDemo } from "./mini-calendar-demo";
import { PillDemo } from "./pill-demo";
import { SegmentedControlDemo } from "./segmented-control-demo";

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

      <Section title="IconButton — asChild (WP-11)">
        <Card
          as="div"
          tone="dark"
          radius="tile"
          padding="md"
          className="inline-flex"
        >
          <IconButton asChild label="Compartir hora flash" size={44}>
            <a href="#hora-flash">
              <ArrowUpRight
                aria-hidden="true"
                className="size-4.5"
                strokeWidth={strokeCard}
              />
            </a>
          </IconButton>
        </Card>
      </Section>

      <Section title="Chip — tone/storlek">
        {chipFixtures.map((c) => (
          <Chip key={c.label} tone={c.tone} size={c.size}>
            {c.label}
          </Chip>
        ))}
      </Section>

      <Section title="Chip — trend/badge/weight/peach-50 (WP-11)">
        <Chip tone="success" size="trend">
          bajando
        </Chip>
        <Chip size="badge">−20%</Chip>
        <Chip tone="success" size="sm" weight="bold">
          Confirmó
        </Chip>
        <Chip tone="peach-50" size="xs">
          Abono
        </Chip>
      </Section>

      <Section title="TextLink (WP-11)">
        <TextLink href="#agenda">Ver agenda</TextLink>
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

      <Section title="SegmentedControl">
        <SegmentedControlDemo options={segmentedControlOptions} />
      </Section>

      <Section title="NavRail — bare">
        <NavRail variant="bare" aria-label="Principal (bare)">
          <NavRailLogo label="Ir al inicio" href="#inicio" />
          {navRailFixtures.map((n) => (
            <NavRailLink
              key={n.href}
              href={n.href}
              label={n.label}
              active={n.active}
              icon={
                n.label === "Inicio" ? (
                  <LayoutGrid
                    aria-hidden="true"
                    className="size-5.5"
                    strokeWidth={1.8}
                  />
                ) : n.label === "Agenda" ? (
                  <Calendar
                    aria-hidden="true"
                    className="size-5.5"
                    strokeWidth={1.8}
                  />
                ) : (
                  <Users
                    aria-hidden="true"
                    className="size-5.5"
                    strokeWidth={1.8}
                  />
                )
              }
            />
          ))}
        </NavRail>
      </Section>

      <Section title="NavRail — panel (Agenda)">
        <NavRail variant="panel" aria-label="Principal (panel)">
          <NavRailLogo label="Volver al inicio" href="#inicio" />
          <NavRailAction label="Nueva reserva" shape="square">
            <ArrowUpRight
              aria-hidden="true"
              className="size-5.5"
              strokeWidth={strokeCard}
            />
          </NavRailAction>
          <NavRailDivider />
          <NavRailSpacer />
          <NavRailAction label="Agregar profesional">
            <ArrowUpRight
              aria-hidden="true"
              className="size-5"
              strokeWidth={strokeCard}
            />
          </NavRailAction>
        </NavRail>
      </Section>

      <Section title="PageHeader — desktop + UserPill">
        <div className="w-full">
          <PageHeader
            variant="desktop"
            title="Inicio"
            meta={pageHeaderMeta.desktop}
            actions={
              <>
                <IconButton label="Buscar" tone="surface">
                  <Search
                    aria-hidden="true"
                    className="size-5"
                    strokeWidth={1.9}
                  />
                </IconButton>
                <IconButton
                  label="Notificaciones (nuevas)"
                  tone="surface"
                  badge
                >
                  <Bell
                    aria-hidden="true"
                    className="size-5"
                    strokeWidth={1.9}
                  />
                </IconButton>
                <UserPill
                  name={userPillFixture.name}
                  initials={userPillFixture.initials}
                />
              </>
            }
          />
        </div>
      </Section>

      <Section title="PageHeader — mobile">
        <div className="w-90">
          <PageHeader
            variant="mobile"
            title="Hoy"
            meta={pageHeaderMeta.mobile}
            actions={
              <IconButton
                label="Notificaciones (nuevas)"
                tone="surface"
                size={46}
                badge
              >
                <Bell aria-hidden="true" className="size-5" strokeWidth={1.9} />
              </IconButton>
            }
          />
        </div>
      </Section>

      <Section title="MiniCalendar — ljus">
        <div className="w-90">
          <MiniCalendarDemo
            variant="light"
            labels={miniCalendarLabels}
            markedDates={miniCalendarMarkedDates}
          />
        </div>
      </Section>

      <Section title="MiniCalendar — mörk">
        <Card as="div" tone="dark" radius="card" padding="md" className="w-77">
          <MiniCalendarDemo
            variant="dark"
            labels={miniCalendarLabels}
            highlightWeekOf="2026-09-28"
          />
        </Card>
      </Section>
    </main>
  );
}
