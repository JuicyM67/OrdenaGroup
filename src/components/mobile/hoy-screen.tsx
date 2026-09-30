"use client";

// Se Hoy.dc.html + docs/tasks/plans/WP-14.md §4 steg 2–4. Skalet, headern och flikraden, samt
// statushanteringen för Llegó/No vino (FRÅGA 1, svar: ja — fixture-läget ändras lokalt). WP-21:
// `onArrival` sparar samma ändring mot servern (server action bunden i page.tsx) — `undefined`
// i design lab, bara den lokala statusen ändras.
//
// WP-47: den egna flikraden (Hoy/Agenda/Clientes/Caja, två av dem 404:ade) byts mot
// `OwnerMobileTabBar` (Inicio/Agenda/Hoy/Ajustes, samma som resten av ägarappen). Avataren
// öppnar samma kontomeny som Inicio/Ajustes (`UserMenu`, "Cerrar sesión" inkluderad) — Hoy
// hade ingen utloggningsväg alls tidigare, men får den via avataren, inte en extra mörk
// topprad (`OwnerMobileTopBar`, se motiveringen vid render nedan). `QuickActions` (Crear
// hora flash/Lista de espera/Cobrar) döljs: ingen av de tre rutterna finns än — WP-xx: visas
// när funktionen finns. Ett fel vid Llegó/No vino visas nu i stället för att sväljas tyst
// (`role="alert"`, återanvänder `errores.agenda.network`).
import { Bell } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { UserMenu } from "@/components/shared/user-menu";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { agenda, errores, hoy, nav } from "@/i18n";
import { initialsOf } from "@/lib/format/initials";

import { OwnerMobileTabBar } from "./owner-tab-bar";
import {
  nextBooking,
  parseInstantOrThrow,
  restOfDay,
  todayLabel,
} from "./hoy-view";
import { NextClientCard } from "./next-client-card";
import { RestOfDay } from "./rest-of-day";
import type { HoyBooking, HoyData } from "./types";

export type HoyScreenProps = {
  data: HoyData;
  /** WP-21: sparar Llegó/No vino mot servern. `undefined` i design lab. */
  onArrival?: (
    bookingId: string,
    status: "completed" | "no_show",
  ) => void | Promise<void>;
  /** WP-47: `/${slug}` — till "Ver mi página" i kontomenyn. */
  publicPageHref?: string;
  /** WP-47: `logout` (server action). `undefined` i design lab. */
  onLogout?: () => void | Promise<void>;
};

/** Hur länge Llegó/No vino-knapparna är inaktiva efter ett tryck (optimistisk uppdatering). */
const OPTIMISTIC_LOCK_MS = 400;

export function HoyScreen({
  data,
  onArrival,
  publicPageHref,
  onLogout,
}: HoyScreenProps) {
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
  // WP-47: fel vid Llegó/No vino visas nu (var tidigare tyst, `.catch(() => undefined)`).
  const [arrivalError, setArrivalError] = useState<string | null>(null);
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
    setArrivalError(null);
    const previous = bookings;
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b)),
    );
    setAnnouncement((prev) => ({ id: (prev?.id ?? 0) + 1, text: message }));
    // WP-47: ett fel (t.ex. nätverk) återställer den optimistiska ändringen och visas —
    // sväljdes tidigare tyst (`.catch(() => undefined)`).
    void Promise.resolve(onArrival?.(id, status)).catch(() => {
      setBookings(previous);
      setArrivalError(errores.agenda.network);
    });
    pendingTimeoutRef.current = window.setTimeout(() => {
      setPendingId(null);
      pendingTimeoutRef.current = null;
    }, OPTIMISTIC_LOCK_MS);
  }

  const hasUnread = data.unreadNotifications > 0;

  return (
    <div className="min-h-dvh bg-canvas">
      {/* WP-47: ingen `OwnerMobileTopBar` här (till skillnad från Inicio/Agenda/Ajustes) —
          Hoy har redan en egen `PageHeader` med utloggning via `UserMenu`-avataren
          (samma "Cerrar sesión" som Inicio/Ajustes), och en andra mörk topprad ovanpå den
          skulle skjuta ner hela sidans innehåll ~64 px och ge en avvikelse mot Hoy.dc.html
          på över 25 % (`npm run visual hoy`) för en funktion som redan finns. */}
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
              <UserMenu
                name={data.owner.name}
                initials={initialsOf(data.owner.name)}
                variant="avatar"
                publicPageHref={publicPageHref ?? "/"}
                onLogout={onLogout}
              />
            </>
          }
        />

        {arrivalError ? (
          <p role="alert" className="text-13 font-semibold text-ink">
            {arrivalError}
          </p>
        ) : null}

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

        {/* WP-47: QuickActions (Crear hora flash/Lista de espera/Cobrar) döljs — ingen av
            de tre rutterna finns än. WP-xx: visas när funktionen finns. */}

        <RestOfDay
          bookings={rest}
          dayCount={data.dayCount}
          dayTotalClp={data.dayTotalClp}
          closedToday={data.closedToday}
        />
      </div>

      <OwnerMobileTabBar active="hoy" />

      <div role="status" className="sr-only">
        {announcement ? (
          <span key={announcement.id}>{announcement.text}</span>
        ) : null}
      </div>
    </div>
  );
}
