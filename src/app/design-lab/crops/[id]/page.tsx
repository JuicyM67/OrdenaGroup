// Visuella utsnitt (WP-02 steg 7). Varje artboard är i referensens fulla storlek (så att
// koordinaterna från crops.json stämmer) med bara den bakgrund som syns i just det utsnittet
// (bg-ink-ram, canvas-panel, bg-agenda-panel, mörkt kort). Se R7: konstruerade sidor, inte en
// fullständig skärm — WP-11–14 bygger de riktiga skärmarna.
import {
  BarChart3,
  Bell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LogOut,
  Plus,
  Search,
  SlidersHorizontal,
  Users,
  Zap,
} from "lucide-react";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { strokeArrow, strokeNav } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/icon-button";
import {
  NavRail,
  NavRailLink,
  NavRailLogo,
  NavRailSpacer,
} from "@/components/ui/nav-rail";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { UserPill } from "@/components/ui/user-pill";

import { MiniCalendarDemo } from "../../components/mini-calendar-demo";
import { SegmentedControlDemo } from "../../components/segmented-control-demo";
import {
  miniCalendarLabels,
  pillFixtures,
  segmentedControlOptions,
} from "../../_fixtures/components";
import crops from "../crops.json";

export function generateStaticParams() {
  return crops.map((c) => ({ id: c.id }));
}

const mainCalendarMarked = new Set([
  "2026-10-03",
  "2026-10-06",
  "2026-10-07",
  "2026-10-09",
  "2026-10-10",
  "2026-10-13",
]);

function MainNavRailCrop() {
  return (
    <div className="relative h-screen w-full bg-ink">
      <NavRail
        variant="bare"
        aria-label="Principal"
        className="absolute top-4 left-4 h-217"
      >
        <NavRailLogo label="Ir al inicio" />
        <NavRailLink
          href="#inicio"
          label="Inicio"
          active
          icon={
            <LayoutGrid
              aria-hidden="true"
              className="size-5.5"
              strokeWidth={strokeNav}
            />
          }
        />
        <NavRailLink
          href="#agenda"
          label="Agenda"
          icon={
            <Calendar
              aria-hidden="true"
              className="size-5.5"
              strokeWidth={strokeNav}
            />
          }
        />
        <NavRailLink
          href="#clientes"
          label="Clientes"
          icon={
            <Users
              aria-hidden="true"
              className="size-5.5"
              strokeWidth={strokeNav}
            />
          }
        />
        <NavRailLink
          href="#flash"
          label="Horas flash"
          icon={
            <Zap
              aria-hidden="true"
              className="size-5.5"
              strokeWidth={strokeNav}
            />
          }
        />
        <NavRailLink
          href="#caja"
          label="Caja e informes"
          icon={
            <BarChart3
              aria-hidden="true"
              className="size-5.5"
              strokeWidth={strokeNav}
            />
          }
        />
        <NavRailLink
          href="#ajustes"
          label="Ajustes"
          icon={
            <SlidersHorizontal
              aria-hidden="true"
              className="size-5.5"
              strokeWidth={strokeNav}
            />
          }
        />
        <NavRailSpacer />
        <NavRailLink
          href="#salir"
          label="Cerrar sesión"
          icon={
            <LogOut
              aria-hidden="true"
              className="size-5.5"
              strokeWidth={strokeNav}
            />
          }
        />
      </NavRail>
    </div>
  );
}

function MainCanvasPanel() {
  return (
    <div className="absolute top-4 left-28 h-217 w-328 rounded-shell bg-canvas" />
  );
}

function MainHeaderCrop() {
  return (
    <div className="relative h-screen w-full bg-ink">
      <MainCanvasPanel />
      <div className="absolute top-11 left-36 w-312">
        <PageHeader
          variant="desktop"
          title="Inicio"
          meta="Viernes 2 de octubre · Barbería Norte, Providencia"
          actions={
            <>
              <IconButton label="Buscar" tone="surface">
                <Search
                  aria-hidden="true"
                  className="size-5"
                  strokeWidth={1.9}
                />
              </IconButton>
              <IconButton label="Notificaciones (nuevas)" tone="surface" badge>
                <Bell aria-hidden="true" className="size-5" strokeWidth={1.9} />
              </IconButton>
              <UserPill name="Camila R." initials="CR" />
            </>
          }
        />
      </div>
    </div>
  );
}

function MainCalendarCrop() {
  return (
    <div className="relative h-screen w-full bg-ink">
      <MainCanvasPanel />
      <div className="absolute top-104 left-258 w-90">
        <Card tone="surface" radius="card" padding="md">
          <MiniCalendarDemo
            variant="light"
            labels={miniCalendarLabels}
            markedDates={mainCalendarMarked}
          />
        </Card>
      </div>
    </div>
  );
}

function AgendaCalendarCrop() {
  return (
    <div className="relative h-screen w-full bg-night">
      <div className="absolute top-4 left-28 w-75">
        <Card tone="dark" radius="card" padding="none" className="p-5">
          <MiniCalendarDemo
            variant="dark"
            labels={miniCalendarLabels}
            highlightWeekOf="2026-09-28"
          />
        </Card>
      </div>
    </div>
  );
}

function AgendaPanel() {
  return (
    <div className="absolute top-4 left-107 h-217 w-249 rounded-hero bg-agenda" />
  );
}

function AgendaToolbarCrop() {
  return (
    <div className="relative h-screen w-full bg-night">
      <AgendaPanel />
      <div className="absolute top-9 left-112 flex h-12 w-239 items-center gap-3">
        <h1 className="font-display text-30 font-semibold tracking-display">
          Octubre 2026
        </h1>
        <Button size="xs">Hoy</Button>
        <IconButton label="Semana anterior" tone="ghost" size={34}>
          <ChevronLeft
            aria-hidden="true"
            className="size-4.5"
            strokeWidth={strokeArrow}
          />
        </IconButton>
        <IconButton label="Semana siguiente" tone="ghost" size={34}>
          <ChevronRight
            aria-hidden="true"
            className="size-4.5"
            strokeWidth={strokeArrow}
          />
        </IconButton>
        <div className="flex-1" />
        <Button size="lg">
          <Plus aria-hidden="true" className="size-4" strokeWidth={2.4} />
          Nueva reserva
        </Button>
      </div>
    </div>
  );
}

function AgendaSegmentedCrop() {
  return (
    <div className="relative h-screen w-full bg-night">
      <AgendaPanel />
      <div className="absolute top-24 left-275">
        <SegmentedControlDemo options={segmentedControlOptions} />
      </div>
    </div>
  );
}

function ReservaPillsCrop() {
  return (
    <div className="relative h-screen w-full bg-canvas">
      <div className="absolute top-135 left-5 flex gap-2">
        {pillFixtures.map((label, i) => (
          <Pill key={label} selected={i === 0}>
            {label}
          </Pill>
        ))}
      </div>
    </div>
  );
}

function HoyHeaderCrop() {
  return (
    <div className="relative h-screen w-full bg-canvas">
      <div className="absolute top-5 left-5 w-87.5">
        <PageHeader
          variant="mobile"
          title="Hoy"
          meta="Viernes 2 de octubre"
          actions={
            <>
              <IconButton
                label="Notificaciones (nuevas)"
                tone="surface"
                size={46}
                badge
              >
                <Bell aria-hidden="true" className="size-5" strokeWidth={1.9} />
              </IconButton>
              <Avatar initials="CR" tone="lilac" size={46} />
            </>
          }
        />
      </div>
    </div>
  );
}

function HoyActionsCrop() {
  return (
    <div className="relative h-screen w-full bg-canvas">
      <div
        className="absolute top-16 left-5 h-70 w-87.5 rounded-hero bg-dark"
        data-surface="dark"
      />
      <div
        className="absolute left-10.5 grid w-76.5 grid-cols-2 gap-2.5"
        style={{ top: 263 }}
      >
        <Button variant="accent" size="xl">
          Llegó
        </Button>
        <Button variant="outline-dark" size="xl">
          No vino
        </Button>
      </div>
    </div>
  );
}

const artboards: Record<string, () => React.JSX.Element> = {
  "main-navrail": MainNavRailCrop,
  "main-header": MainHeaderCrop,
  "main-calendar": MainCalendarCrop,
  "agenda-calendar": AgendaCalendarCrop,
  "agenda-toolbar": AgendaToolbarCrop,
  "agenda-segmented": AgendaSegmentedCrop,
  "reserva-pills": ReservaPillsCrop,
  "hoy-header": HoyHeaderCrop,
  "hoy-actions": HoyActionsCrop,
};

export default async function CropPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const Artboard = artboards[id];
  if (!Artboard) notFound();
  return <Artboard />;
}
