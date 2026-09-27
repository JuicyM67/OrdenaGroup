"use client";

// Se Hoy.dc.html + docs/tasks/plans/WP-14.md §4 steg 2–4. Skalet, headern och flikraden, samt
// statushanteringen för Llegó/No vino (FRÅGA 1, svar: ja — fixture-läget ändras lokalt och
// callbacken byts mot servern i WP-21).
import { BarChart3, Bell, Calendar, LayoutGrid, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { agenda, hoy, nav } from "@/i18n/es-CL";

import {
  initialsOf,
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
  /**
   * Visar notisprick. FRÅGA 4: `nav.notificacionesNuevas` saknas ännu (WP-03b). Design lab
   * visar den lokalt för referensens skull; den riktiga routen låter den vara av tills
   * strängen finns.
   */
  notificationBadge?: boolean;
};

/** Hur länge Llegó/No vino-knapparna är inaktiva efter ett tryck (optimistisk uppdatering). */
const OPTIMISTIC_LOCK_MS = 400;

export function HoyScreen({ data, notificationBadge = false }: HoyScreenProps) {
  // `data` byts bara genom en ny instans av skärmen (anroparen sätter `key`, t.ex. per
  // `?estado=` i design lab) — annars skulle den lokala Llegó/No vino-statusen tappas varje
  // gång servern skickar samma dag på nytt.
  const now = useMemo(() => parseInstantOrThrow(data.now), [data.now]);
  const [bookings, setBookings] = useState<HoyBooking[]>(data.bookings);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const nextCardRef = useRef<HTMLElement>(null);
  const previousNextId = useRef<string | undefined>(undefined);
  const isFirstNext = useRef(true);

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
    setAnnouncement(message);
    window.setTimeout(() => setPendingId(null), OPTIMISTIC_LOCK_MS);
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
        <BarChart3 aria-hidden="true" className="size-5.5" strokeWidth={1.9} />
      ),
    },
  ];

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
                label={nav.notificaciones}
                tone="surface"
                size={46}
                badge={notificationBadge}
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
        {announcement}
      </div>
    </div>
  );
}
