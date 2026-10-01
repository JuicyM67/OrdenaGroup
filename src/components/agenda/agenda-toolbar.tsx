// Se DESIGN.md §7 "Byggt i WP-12" och docs/design/reference/Agenda.dc.html (rad h1…CTA).
//
// WP-61 (ägarens UX-genomgång WP-57, "ett gemensamt sidhuvud på alla flikar"): klockan
// (NotificationBell) och profilmenyn (UserMenu) längst till höger, efter "Nueva reserva" —
// samma ordning/data som `OwnerPageHeader` (owner-page-header.tsx), läst via
// `useOwnerChrome()` (satt av `AgendaShell`, agenda-shell.tsx) i stället för egna props: den
// här komponenten hade annars behövt samma åtta klock-/profilprops som AgendaShell redan tar
// emot.
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { calendario, agenda as agendaCopy } from "@/i18n";
import { initialsOf } from "@/lib/format/initials";

import { NotificationBell } from "@/components/shared/notification-bell";
import { useOwnerChrome } from "@/components/shared/owner-chrome";
import { UserMenu } from "@/components/shared/user-menu";

import { strokeNuevaReserva } from "./icons";

export type AgendaToolbarProps = {
  title: string;
  onToday: () => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  /** WP-46: `undefined` döljer knappen — den inloggade saknar rätt att skapa
   * nya bokningar (varken `can_manage_own_bookings` eller
   * `can_manage_all_bookings`). */
  onNewBooking?: () => void;
  /** WP-50: månadsvyn byter pilarna mot `calendario.mesAnterior`/`mesSiguiente` — standard
   * (vecko-/dagvyn) oförändrad. */
  prevLabel?: string;
  nextLabel?: string;
};

export function AgendaToolbar({
  title,
  onToday,
  onPrevWeek,
  onNextWeek,
  onNewBooking,
  prevLabel = calendario.semanaAnterior,
  nextLabel = calendario.semanaSiguiente,
}: AgendaToolbarProps) {
  const chrome = useOwnerChrome();
  const router = useRouter();
  const initials = initialsOf(chrome.ownerName);

  const onConfirmRequest = chrome.onConfirmRequest;
  const onDeclineRequest = chrome.onDeclineRequest;
  const bell =
    onConfirmRequest && onDeclineRequest ? (
      <NotificationBell
        requests={chrome.pendingRequests}
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
          chrome.onApproveCancelRequest
            ? async (bookingId) => {
                const result = await chrome.onApproveCancelRequest!(bookingId);
                if (result.ok) router.refresh();
                return result;
              }
            : undefined
        }
        onDeclineCancel={
          chrome.onDeclineCancelRequest
            ? async (bookingId) => {
                const result = await chrome.onDeclineCancelRequest!(bookingId);
                if (result.ok) router.refresh();
                return result;
              }
            : undefined
        }
        withTooltip
      />
    ) : null;

  return (
    <div className="flex h-12 items-center gap-3">
      <h1 className="font-display text-30 font-semibold tracking-display">
        {title}
      </h1>
      <Button type="button" variant="primary" size="xs" onClick={onToday}>
        {calendario.hoy}
      </Button>
      <IconButton label={prevLabel} tone="ghost" size={34} onClick={onPrevWeek}>
        <ChevronLeft
          aria-hidden="true"
          className="size-4.5"
          strokeWidth={2.2}
        />
      </IconButton>
      <IconButton label={nextLabel} tone="ghost" size={34} onClick={onNextWeek}>
        <ChevronRight
          aria-hidden="true"
          className="size-4.5"
          strokeWidth={2.2}
        />
      </IconButton>
      <div className="grow" />
      {onNewBooking ? (
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={onNewBooking}
        >
          <Plus
            aria-hidden="true"
            className="size-4"
            strokeWidth={strokeNuevaReserva}
          />
          {agendaCopy.nuevaReserva}
        </Button>
      ) : null}
      {bell}
      <UserMenu
        name={chrome.ownerName}
        initials={initials}
        avatarTone={chrome.avatarTone}
        variant="pill"
        publicPageHref={chrome.publicPageHref}
        onLogout={chrome.onLogout}
        myProfile={chrome.myProfile}
        myProfileActions={chrome.myProfileActions}
      />
    </div>
  );
}
