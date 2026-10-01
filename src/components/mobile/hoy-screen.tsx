"use client";

// Se Hoy.dc.html + docs/tasks/plans/WP-14.md §4 steg 2–4. Skalet, headern och flikraden, samt
// statushanteringen för Llegó/No vino (FRÅGA 1, svar: ja — fixture-läget ändras lokalt). WP-21:
// `onArrival` sparar samma ändring mot servern (server action bunden i page.tsx) — `undefined`
// i design lab, bara den lokala statusen ändras.
//
// WP-47: den egna flikraden byts mot `OwnerMobileTabBar` (samma som resten av ägarappen).
// Avataren öppnar samma kontomeny som Inicio/Ajustes (`UserMenu`, "Cerrar sesión"
// inkluderad) — Hoy hade ingen utloggningsväg alls tidigare, men får den via avataren, inte
// en extra mörk topprad (`OwnerMobileTopBar`, se motiveringen vid render nedan). WP-24:
// `OwnerMobileTabBar` har nu Clientes och Caja igen (Caja gömd utan `can_view_reports`).
// Ett fel vid Llegó/No vino visas nu i stället för att sväljas tyst (`role="alert"`,
// återanvänder `errores.agenda.network`).
//
// WP-23/WP-30: `QuickActions` (Crear hora flash/Lista de espera/Cobrar) återinförs — alla
// tre rutter finns nu (`/app/flash`, `/app/agenda`, `/app/caja`, se `links` i
// `src/server/owner/hoy.ts`).
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  NotificationBell,
  type NotificationBellResult,
} from "@/components/shared/notification-bell";
import { UserMenu } from "@/components/shared/user-menu";
import type {
  MyProfileActions,
  MyProfileData,
} from "@/components/shared/my-profile-dialog";
import { MarkPaidDialog } from "@/components/caja/mark-paid-dialog";
import type {
  ManualPaymentMethod,
  MarkBookingPaidInput,
  MarkBookingPaidResult,
} from "@/components/caja/types";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { agenda, errores, hoy } from "@/i18n";
import { initialsOf } from "@/lib/format/initials";

import { OwnerMobileTabBar } from "./owner-tab-bar";
import {
  nextBooking,
  parseInstantOrThrow,
  restOfDay,
  todayLabel,
} from "./hoy-view";
import { NextClientCard } from "./next-client-card";
import { QuickActions } from "./quick-actions";
import { RestOfDay } from "./rest-of-day";
import type { HoyBooking, HoyData, HoyMemberView, HoyPerm } from "./types";

/** WP-46: samma regel som `hasPerm` (`src/server/db/permissions.ts`), men
 * för UI:t. `member === undefined` (design lab/äldre sidor) beter sig som
 * förut: allt visas, ingen filtrering. */
function hasHoyPerm(
  member: HoyMemberView | undefined,
  perm: HoyPerm,
  staffId?: string,
): boolean {
  if (!member) return true;
  if (member.role === "owner") return true;
  if (member.role !== "staff") return false;
  if (!member.perms[perm]) return false;
  if (staffId !== undefined) {
    return member.staffId !== null && member.staffId === staffId;
  }
  return true;
}

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
  /** WP-45 (D-033): klockan. `undefined` i design lab (döljer den). */
  onConfirmRequest?: (bookingId: string) => Promise<NotificationBellResult>;
  onDeclineRequest?: (
    bookingId: string,
    reason?: string,
  ) => Promise<NotificationBellResult>;
  /** WP-56: se `notification-bell.tsx`. */
  onApproveCancelRequest?: (
    bookingId: string,
  ) => Promise<NotificationBellResult>;
  onDeclineCancelRequest?: (
    bookingId: string,
  ) => Promise<NotificationBellResult>;
  /** WP-46: "Min profil" i kontomenyn. `undefined` döljer menyposten (ägare
   * utan egen personalrad, design lab). */
  myProfile?: MyProfileData;
  myProfileActions?: MyProfileActions;
  /** WP-24 (F10): "Marcar pagada" på nästa kund (server action,
   * `markPaidAction`). `undefined` döljer knappen (design lab). */
  onMarkPaid?: (input: MarkBookingPaidInput) => Promise<MarkBookingPaidResult>;
  /** Metoderna "Marcar pagada" ska erbjuda (`MANUAL_METHODS`, CL utan
   * `swish`). `[]` i design lab. */
  manualMethods?: readonly ManualPaymentMethod[];
};

/** Hur länge Llegó/No vino-knapparna är inaktiva efter ett tryck (optimistisk uppdatering). */
const OPTIMISTIC_LOCK_MS = 400;

export function HoyScreen({
  data,
  onArrival,
  publicPageHref,
  onLogout,
  onConfirmRequest,
  onDeclineRequest,
  onApproveCancelRequest,
  onDeclineCancelRequest,
  myProfile,
  myProfileActions,
  onMarkPaid,
  manualMethods = [],
}: HoyScreenProps) {
  const router = useRouter();
  // WP-24 (F10): "Marcar pagada" på nästa kund. `null` = dialogen stängd.
  const [markPaidBooking, setMarkPaidBooking] = useState<HoyBooking | null>(
    null,
  );
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

  // WP-46: filtret "Mis reservas"/"Todo el equipo" (agenda.filtroEquipo,
  // samma texter som Agenda). Standard "todo el equipo" (uppdraget,
  // 2026-09-30). Syns bara när kontot har en egen personalrad och det finns
  // mer än en profesional att filtrera bort.
  const member = data.member;
  const ownStaffId = member?.staffId ?? null;
  const canFilterTeam =
    ownStaffId != null && new Set(data.bookings.map((b) => b.staffId)).size > 1;
  const [teamFilter, setTeamFilter] = useState<"propias" | "equipo">("equipo");
  const visibleBookings =
    teamFilter === "propias" && ownStaffId != null
      ? bookings.filter((b) => b.staffId === ownStaffId)
      : bookings;

  const next = data.closedToday ? undefined : nextBooking(visibleBookings, now);
  const rest = data.closedToday ? [] : restOfDay(visibleBookings, now, next);
  // WP-46: samma regel som `bookings`-RLS — Llegó/No vino kräver
  // `can_manage_all_bookings`, eller `can_manage_own_bookings` + egen bokning.
  const canActOnNext =
    next != null &&
    (hasHoyPerm(member, "can_manage_all_bookings") ||
      hasHoyPerm(member, "can_manage_own_bookings", next.staffId));
  // WP-24 (F10): samma regel som `canPay` (src/server/payments/mark-paid.ts)
  // — egen/alla bokningar ELLER kassan (`can_view_reports`).
  const canMarkNextPaid =
    next != null &&
    onMarkPaid != null &&
    next.paymentId == null &&
    (canActOnNext || hasHoyPerm(member, "can_view_reports"));

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
              {onConfirmRequest && onDeclineRequest ? (
                <NotificationBell
                  requests={data.pendingRequests}
                  onConfirm={async (bookingId) => {
                    const result = await onConfirmRequest(bookingId);
                    if (result.ok) router.refresh();
                    return result;
                  }}
                  onDecline={async (bookingId, reason) => {
                    const result = await onDeclineRequest(bookingId, reason);
                    if (result.ok) router.refresh();
                    return result;
                  }}
                  onApproveCancel={
                    onApproveCancelRequest
                      ? async (bookingId) => {
                          const result =
                            await onApproveCancelRequest(bookingId);
                          if (result.ok) router.refresh();
                          return result;
                        }
                      : undefined
                  }
                  onDeclineCancel={
                    onDeclineCancelRequest
                      ? async (bookingId) => {
                          const result =
                            await onDeclineCancelRequest(bookingId);
                          if (result.ok) router.refresh();
                          return result;
                        }
                      : undefined
                  }
                  triggerSize={46}
                />
              ) : null}
              <UserMenu
                name={data.owner.name}
                initials={initialsOf(data.owner.name)}
                variant="avatar"
                publicPageHref={publicPageHref ?? "/"}
                onLogout={onLogout}
                myProfile={myProfile}
                myProfileActions={myProfileActions}
              />
            </>
          }
        />

        {arrivalError ? (
          <p role="alert" className="text-13 font-semibold text-ink">
            {arrivalError}
          </p>
        ) : null}

        {canFilterTeam ? (
          <div className="flex gap-2">
            <Pill
              selected={teamFilter === "equipo"}
              onClick={() => setTeamFilter("equipo")}
            >
              {agenda.filtroEquipo.todoElEquipo}
            </Pill>
            <Pill
              selected={teamFilter === "propias"}
              onClick={() => setTeamFilter("propias")}
            >
              {agenda.filtroEquipo.misReservas}
            </Pill>
          </div>
        ) : null}

        <NextClientCard
          ref={nextCardRef}
          booking={next}
          now={now}
          disabled={pendingId !== null}
          emptyMessage={data.closedToday ? hoy.restoDia.diaCerrado : undefined}
          onArrived={
            canActOnNext
              ? () =>
                  next && markStatus(next.id, "completed", agenda.toast.llego)
              : undefined
          }
          onNoShow={
            canActOnNext
              ? () =>
                  next && markStatus(next.id, "no_show", agenda.toast.noVino)
              : undefined
          }
          onMarkPaid={
            canMarkNextPaid ? () => setMarkPaidBooking(next ?? null) : undefined
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

      <OwnerMobileTabBar
        active="hoy"
        canViewReports={
          member === undefined
            ? undefined
            : hasHoyPerm(member, "can_view_reports")
        }
      />

      <div role="status" className="sr-only">
        {announcement ? (
          <span key={announcement.id}>{announcement.text}</span>
        ) : null}
      </div>

      {markPaidBooking && onMarkPaid ? (
        <MarkPaidDialog
          open={markPaidBooking != null}
          onOpenChange={(open) => {
            if (!open) setMarkPaidBooking(null);
          }}
          bookingId={markPaidBooking.id}
          dueMinor={Math.max(
            0,
            (markPaidBooking.priceClp ?? 0) -
              (markPaidBooking.discountClp ?? 0) -
              markPaidBooking.depositPaidClp,
          )}
          methods={manualMethods}
          onSubmit={onMarkPaid}
          onPaid={() => {
            setMarkPaidBooking(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
