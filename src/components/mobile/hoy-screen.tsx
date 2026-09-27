"use client";

// Se Hoy.dc.html + docs/tasks/plans/WP-14.md §4 steg 2–4. Skalet, headern och flikraden, samt
// statushanteringen för Llegó/No vino (FRÅGA 1, svar: ja — fixture-läget ändras lokalt och
// callbacken byts mot servern i WP-21).
import {
  Bell,
  Calendar,
  ChartNoAxesColumn,
  LayoutGrid,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { agenda, hoy, nav } from "@/i18n/es-CL";
import { initialsOf } from "@/lib/format/initials";

import {
  nextBooking,
  parseInstantOrThrow,
  restOfDay,
  todayLabel,
} from "./hoy-view";
import { MobileTabBar, type MobileTabItem } from "./mobile-tab-bar";
import { NextClientCard } from "./next-client-card";
import { QuickActions } from "./quick-actions";
import { RestOfDay } from "./rest-of-day";
import type { HoyBooking, HoyData } from "./types";

export type HoyScreenProps = {
  data: HoyData;
};

/** Hur länge Llegó/No vino-knapparna är inaktiva efter ett tryck (optimistisk uppdatering). */
const OPTIMISTIC_LOCK_MS = 400;

export function HoyScreen({ data }: HoyScreenProps) {
  // `data` byts bara genom en ny instans av skärmen (anroparen sätter `key`, t.ex. per
  // `?estado=` i design lab) — annars skulle den lokala Llegó/No vino-statusen tappas varje
  // gång servern skickar samma dag på nytt.
  const now = useMemo(() => parseInstantOrThrow(data.now), [data.now]);
  const [bookings, setBookings] = useState<HoyBooking[]>(data.bookings);
  const [pendingId, setPendingId] = useState<string | null>(null);
  // `id` ökar på varje anrop så att samma text (t.ex. två "Llegó" i rad) ändå ger en ny DOM-nod
  // i role="status" och läses upp igen (annars: text som inte ändras annonseras inte om).
  const [announcement, setAnnouncement] = useState<{
    id: number;
    text: string;
  } | null>(null);
  const nextCardRef = useRef<HTMLElement>(null);
  const previousNextId = useRef<string | undefined>(undefined);
  const isFirstNext = useRef(true);
  // `number` (inte `NodeJS.Timeout`): det här körs bara i webbläsaren, via window.setTimeout.
  const pendingTimeoutRef = useRef<number | null>(null);

  const next = data.closedToday ? undefined : nextBooking(bookings, now);
  const rest = data.closedToday ? [] : restOfDay(bookings, now, next);

  useEffect(() => {
    if (isFirstNext.current) {
      isFirstNext.current = false;
    } else if (previousNextId.current !== next?.id) {
      nextCardRef.current?.focus();
    }
    previousNextId.current = next?.id;
  }, [next?.id]);

  // Rensa den väntande timern om komponenten avmonteras medan Llegó/No vino-låsningen pågår.
  useEffect(() => {
    return () => {
      if (pendingTimeoutRef.current !== null) {
        window.clearTimeout(pendingTimeoutRef.current);
      }
    };
  }, []);

  function markStatus(
    id: string,
    status: "completed" | "no_show",
    message: string,
  ) {
    if (pendingId) return; // dubbeltryck ger en enda ändring
    setPendingId(id);
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b)),
    );
    setAnnouncement((prev) => ({ id: (prev?.id ?? 0) + 1, text: message }));
    pendingTimeoutRef.current = window.setTimeout(() => {
      setPendingId(null);
      pendingTimeoutRef.current = null;
    }, OPTIMISTIC_LOCK_MS);
  }

  const tabItems: MobileTabItem[] = [
    {
      key: "hoy",
      href: data.links.tabs.hoy,
      label: nav.hoy,
      icon: (
        <LayoutGrid aria-hidden="true" className="size-5.5" strokeWidth={1.9} />
      ),
    },
    {
      key: "agenda",
      href: data.links.tabs.agenda,
      label: nav.agenda,
      icon: (
        <Calendar aria-hidden="true" className="size-5.5" strokeWidth={1.9} />
      ),
    },
    {
      key: "clientes",
      href: data.links.tabs.clientes,
      label: nav.clientes,
      icon: <Users aria-hidden="true" className="size-5.5" strokeWidth={1.9} />,
    },
    {
      key: "caja",
      href: data.links.tabs.caja,
      label: nav.caja,
      icon: (
        <ChartNoAxesColumn
          aria-hidden="true"
          className="size-5.5"
          strokeWidth={1.9}
        />
      ),
    },
  ];

  const hasUnread = data.unreadNotifications > 0;

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mx-auto flex max-w-120 flex-col gap-3.5 px-5 pt-5 pb-28">
        <PageHeader
          variant="mobile"
          title={hoy.titulo}
          meta={todayLabel(now)}
          actions={
            <>
              <IconButton
                label={
                  hasUnread
                    ? nav.notificacionesNuevas({ n: data.unreadNotifications })
                    : nav.notificaciones
                }
                tone="surface"
                size={46}
                badge={hasUnread}
              >
                <Bell aria-hidden="true" className="size-5" strokeWidth={1.9} />
              </IconButton>
              <span aria-hidden="true" className="contents">
                <Avatar
                  initials={initialsOf(data.owner.name)}
                  tone="lilac"
                  size={46}
                />
              </span>
            </>
          }
        />

        <NextClientCard
          ref={nextCardRef}
          booking={next}
          now={now}
          disabled={pendingId !== null}
          emptyMessage={data.closedToday ? hoy.restoDia.diaCerrado : undefined}
          onArrived={() =>
            next && markStatus(next.id, "completed", agenda.toast.llego)
          }
          onNoShow={() =>
            next && markStatus(next.id, "no_show", agenda.toast.noVino)
          }
        />

        <QuickActions links={data.links} waitlistCount={data.waitlistCount} />

        <RestOfDay
          bookings={rest}
          dayCount={data.dayCount}
          dayTotalClp={data.dayTotalClp}
          closedToday={data.closedToday}
        />
      </div>

      <MobileTabBar items={tabItems} active="hoy" />

      <div role="status" className="sr-only">
        {announcement ? (
          <span key={announcement.id}>{announcement.text}</span>
        ) : null}
      </div>
    </div>
  );
}
