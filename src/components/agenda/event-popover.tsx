"use client";
// Se DESIGN.md §7 "Byggt i WP-12" och docs/design/reference/Agenda.dc.html (role="dialog").
// Radix Popover (icke-modal): Escape stänger och fokus går tillbaka till blocket (Radix
// standardbeteende). Llegó/No vino sparas mot servern sedan WP-21 (se agenda-screen.tsx).
// Mover finns bara i design lab (WP-12 FRÅGA 7) — `onMover` saknas på den riktiga routen,
// se `agenda-screen.tsx` (`showMover`), och knappen döljs helt (utanför WP-21:s scope).
import * as Popover from "@radix-ui/react-popover";
import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { AnswersList } from "@/components/booking/answers-list";
import { MarkPaidDialog } from "@/components/caja/mark-paid-dialog";
import { BookingPackageActions } from "@/components/packages/booking-package-actions";
import type { BookingPackageActions as PackageActions } from "@/components/packages/types";
import {
  PAGADA_LABEL,
  type ManualPaymentMethod,
  type MarkBookingPaidInput,
  type MarkBookingPaidResult,
  type UndoPaymentInput,
  type UndoPaymentResult,
} from "@/components/caja/types";
import type { NotificationBellResult } from "@/components/shared/notification-bell";
import { RechazarDialog } from "@/components/shared/rechazar-dialog";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconButton } from "@/components/ui/icon-button";
import { roleIcons, strokeCard } from "@/components/ui/icons";
import type { TimeZone } from "@/lib/format/dates";
import { agenda, caja, comun, estados, solicitudes } from "@/i18n";

import { popoverModel } from "./agenda-view";
import {
  CustomerPrivacyActions,
  type CustomerExportResult,
  type CustomerMutationResult,
} from "./customer-privacy-actions";
import type { AgendaBooking } from "./types";

const ClockIcon = roleIcons.tiempo as NonNullable<typeof roleIcons.tiempo>;
const PaymentIcon = roleIcons.pago as NonNullable<typeof roleIcons.pago>;

export type EventPopoverProps = {
  booking: AgendaBooking;
  staffName: string;
  tz: TimeZone;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** WP-46: `undefined` döljer knappen — den inloggade saknar rätt
   * behörighet för just den här bokningen (`can_manage_all_bookings`, eller
   * `can_manage_own_bookings` + egen `staffId`). */
  onLlego?: () => void;
  onNoVino?: () => void;
  /** `undefined` döljer knappen (WP-21: Mover finns bara i design lab; WP-46:
   * döljs även när den inloggade saknar rätt att flytta just den bokningen). */
  onMover?: () => void;
  /** WP-26 steg 7 (F12): "Exportar datos"/"Anonimizar cliente". `undefined`
   * (design lab) eller en bokning utan `customerId` döljer hela raden —
   * se `customer-privacy-actions.tsx`. */
  onExportCustomer?: (customerId: string) => Promise<CustomerExportResult>;
  onAnonymizeCustomer?: (customerId: string) => Promise<CustomerMutationResult>;
  /** WP-45 (D-033): Confirmar/Rechazar en stället för Llegó/No vino/Mover när
   * `booking.status === "requested"`. `undefined` döljer knapparna helt (t.ex.
   * design lab) — samma mönster som `onMover`. */
  onConfirmRequest?: (bookingId: string) => Promise<NotificationBellResult>;
  /** `reason`: ägarens valfria motiv (`RechazarDialog`), se
   * `notification-bell.tsx`. */
  onDeclineRequest?: (
    bookingId: string,
    reason?: string,
  ) => Promise<NotificationBellResult>;
  /** WP-56: "Aprobar cancelación"/"Rechazar" i stället för Confirmar/Rechazar
   * när `booking.status === "cancel_requested"`. `undefined` döljer
   * knapparna helt, samma mönster som `onMover`. */
  onApproveCancelRequest?: (
    bookingId: string,
  ) => Promise<NotificationBellResult>;
  onDeclineCancelRequest?: (
    bookingId: string,
  ) => Promise<NotificationBellResult>;
  /** WP-24 (F10): "Marcar pagada"/"Anular pago" (D-034: egen/alla bokningar
   * eller kassan, `can_view_reports`). `undefined` döljer knapparna — samma
   * mönster som `onMover`. */
  onMarkPaid?: (input: MarkBookingPaidInput) => Promise<MarkBookingPaidResult>;
  onUndoPayment?: (input: UndoPaymentInput) => Promise<UndoPaymentResult>;
  /** Metoderna "Marcar pagada" ska erbjuda (`MANUAL_METHODS`). `[]` i design lab. */
  manualMethods?: readonly ManualPaymentMethod[];
  /** WP-86 (D-072): "Usar paquete"/"Devolver sesión" (samma behörighet som
   * "Marcar pagada"). `undefined` döljer knapparna. */
  packageActions?: PackageActions;
  trigger: ReactNode;
};

export function EventPopover({
  booking,
  staffName,
  tz,
  open,
  onOpenChange,
  onLlego,
  onNoVino,
  onMover,
  onExportCustomer,
  onAnonymizeCustomer,
  onConfirmRequest,
  onDeclineRequest,
  onApproveCancelRequest,
  onDeclineCancelRequest,
  onMarkPaid,
  onUndoPayment,
  manualMethods = [],
  packageActions,
  trigger,
}: EventPopoverProps) {
  const [confirming, setConfirming] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineCancelDialogOpen, setDeclineCancelDialogOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [undoOpen, setUndoOpen] = useState(false);
  const [undoError, setUndoError] = useState<string | null>(null);
  const isPending = booking.status === "requested";
  const isCancelPending = booking.status === "cancel_requested";
  const model = popoverModel(booking, staffName, tz);
  const customerId = booking.customerId;
  // WP-42: `side="left" alignOffset={-49}` (desktopens Agenda.dc.html-placering, 1440 px
  // brett rutnät med gott om utrymme till vänster om triggern) klipps mot vänsterkanten på
  // en 390 px mobil (Radix Popper flippar inte förbi ett explicit `alignOffset`). Under `lg`
  // används i stället en placering under triggern, centrerad och klämd inom skärmen av
  // Poppers egen `shift`. `matchMedia` läses direkt (lazy `useState`-initierare) i stället
  // för `useEffect`: `Popover.Content` monteras bara när `open` är sant (Radix), och
  // popovern öppnas alltid efter ett klick — långt efter hydrering — så det finns inget
  // server-/klientmarkup att stämma av mot (ingen hydreringsrisk) och `npm run visual
  // agenda` (`hasPopover: true`, 1440 px) påverkas inte. `addEventListener("change", …)`
  // täcker bara en live storleksändring av samma flik (sällsynt, men billigt att stödja).
  // jsdom (Vitest) saknar `window.matchMedia` helt — samma vakt som
  // `use-desktop-layout.ts` (agenda-screen.tsx).
  const hasMatchMedia =
    typeof window !== "undefined" && typeof window.matchMedia === "function";
  const [compact, setCompact] = useState(
    () => hasMatchMedia && window.matchMedia("(max-width: 1023px)").matches,
  );
  useEffect(() => {
    if (!hasMatchMedia) return;
    const mq = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setCompact(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [hasMatchMedia]);
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={compact ? "bottom" : "left"}
          align={compact ? "center" : "start"}
          sideOffset={compact ? 8 : 16}
          alignOffset={compact ? 0 : -49}
          collisionPadding={12}
          aria-label={agenda.popover.titulo}
          className="z-10 flex w-72.5 flex-col gap-3 rounded-panel bg-surface px-5 py-4.5 shadow-popover"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-17 font-bold">{model.name}</div>
              <div className="mt-0.5 text-12 text-muted">
                {model.telefonoYVisita}
              </div>
            </div>
            <Popover.Close asChild>
              <IconButton
                label={agenda.popover.cerrar}
                tone="ghost"
                size={30}
                className="text-muted"
              >
                <X aria-hidden="true" className="size-4" strokeWidth={2.2} />
              </IconButton>
            </Popover.Close>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Chip size="sm" tone="pending">
              {booking.service}
            </Chip>
            <Chip size="sm" tone="neutral">
              {model.conProfesional}
            </Chip>
            {model.statusChip ? (
              <Chip size="sm" tone={model.statusChip.tone}>
                {model.statusChip.label}
              </Chip>
            ) : null}
            {booking.paymentId ? (
              <Chip size="sm" tone="success">
                {PAGADA_LABEL}
              </Chip>
            ) : null}
            {booking.isMember ? (
              <Chip size="sm" tone="lavender">
                {estados.socio}
              </Chip>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 text-13">
            <div className="flex items-center gap-2.5">
              <ClockIcon
                aria-hidden="true"
                className="size-4"
                strokeWidth={strokeCard}
              />
              {model.fechaYRango}
            </div>
            <div className="flex items-center gap-2.5">
              <PaymentIcon
                aria-hidden="true"
                className="size-4"
                strokeWidth={strokeCard}
              />
              {model.payment}
            </div>
          </div>

          {booking.answers && booking.answers.length > 0 ? (
            <AnswersList answers={booking.answers} />
          ) : null}

          {isPending && onConfirmRequest && onDeclineRequest ? (
            <div className="mt-0.5 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={confirming}
                onClick={() => {
                  setConfirming(true);
                  onConfirmRequest(booking.id)
                    .then((result) => {
                      if (result.ok) onOpenChange(false);
                    })
                    .finally(() => setConfirming(false));
                }}
              >
                {solicitudes.acciones.confirmar}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setDeclineDialogOpen(true)}
              >
                {solicitudes.acciones.rechazar}
              </Button>
            </div>
          ) : isCancelPending &&
            onApproveCancelRequest &&
            onDeclineCancelRequest ? (
            <div className="mt-0.5 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={confirming}
                onClick={() => {
                  setConfirming(true);
                  onApproveCancelRequest(booking.id)
                    .then((result) => {
                      if (result.ok) onOpenChange(false);
                    })
                    .finally(() => setConfirming(false));
                }}
              >
                {solicitudes.acciones.aprobarCancelacion}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setDeclineCancelDialogOpen(true)}
              >
                {solicitudes.acciones.rechazar}
              </Button>
            </div>
          ) : (
            (() => {
              const count =
                (onLlego ? 1 : 0) + (onNoVino ? 1 : 0) + (onMover ? 1 : 0);
              if (count === 0) return null;
              return (
                <div
                  className={cn(
                    "mt-0.5 grid gap-2",
                    count === 3
                      ? "grid-cols-3"
                      : count === 2
                        ? "grid-cols-2"
                        : "grid-cols-1",
                  )}
                >
                  {onLlego ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={onLlego}
                    >
                      {agenda.popover.acciones.llego}
                    </Button>
                  ) : null}
                  {onNoVino ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={onNoVino}
                    >
                      {agenda.popover.acciones.noVino}
                    </Button>
                  ) : null}
                  {onMover ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={onMover}
                    >
                      {agenda.popover.acciones.mover}
                    </Button>
                  ) : null}
                </div>
              );
            })()
          )}

          {booking.packageInfo &&
          packageActions &&
          !booking.paymentId &&
          booking.status !== "cancelled" ? (
            <BookingPackageActions
              bookingId={booking.id}
              info={booking.packageInfo}
              noShow={booking.status === "no_show"}
              actions={packageActions}
            />
          ) : null}

          {!booking.paymentId && !booking.packageInfo?.use && onMarkPaid ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setMarkPaidOpen(true)}
            >
              {caja.marcarPagada.cta}
            </Button>
          ) : null}
          {booking.paymentId && onUndoPayment ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setUndoError(null);
                setUndoOpen(true);
              }}
            >
              {caja.anular.cta}
            </Button>
          ) : null}

          {customerId && onExportCustomer && onAnonymizeCustomer ? (
            <CustomerPrivacyActions
              customerId={customerId}
              onExport={() => onExportCustomer(customerId)}
              onAnonymize={() => onAnonymizeCustomer(customerId)}
              onAnonymized={() => onOpenChange(false)}
            />
          ) : null}
        </Popover.Content>
      </Popover.Portal>

      {onDeclineRequest ? (
        <RechazarDialog
          open={declineDialogOpen}
          onOpenChange={setDeclineDialogOpen}
          onConfirm={async (motivo) => {
            const result = await onDeclineRequest(
              booking.id,
              motivo || undefined,
            );
            if (result.ok) {
              setDeclineDialogOpen(false);
              onOpenChange(false);
            }
          }}
        />
      ) : null}

      {onDeclineCancelRequest ? (
        <ConfirmDialog
          open={declineCancelDialogOpen}
          onOpenChange={setDeclineCancelDialogOpen}
          title={solicitudes.rechazarCancelacionDialog.titulo}
          body={solicitudes.rechazarCancelacionDialog.cuerpo}
          confirmLabel={solicitudes.rechazarCancelacionDialog.ctaSi}
          cancelLabel={solicitudes.rechazarCancelacionDialog.ctaNo}
          onConfirm={async () => {
            const result = await onDeclineCancelRequest(booking.id);
            if (result.ok) {
              setDeclineCancelDialogOpen(false);
              onOpenChange(false);
            }
          }}
        />
      ) : null}

      {onMarkPaid ? (
        <MarkPaidDialog
          open={markPaidOpen}
          onOpenChange={setMarkPaidOpen}
          bookingId={booking.id}
          dueMinor={Math.max(
            0,
            booking.priceClp -
              (booking.discountClp ?? 0) -
              (booking.depositPaidClp ?? 0),
          )}
          methods={manualMethods}
          onSubmit={onMarkPaid}
          onPaid={() => setMarkPaidOpen(false)}
        />
      ) : null}
      {onUndoPayment ? (
        <ConfirmDialog
          open={undoOpen}
          onOpenChange={(next) => {
            if (!next) setUndoError(null);
            setUndoOpen(next);
          }}
          title={caja.anular.tituloConfirmacion}
          body={
            <>
              {caja.anular.cuerpoConfirmacion}
              {undoError ? (
                <span role="alert" className="mt-2 block text-ink">
                  {undoError}
                </span>
              ) : null}
            </>
          }
          confirmLabel={caja.anular.cta}
          cancelLabel={comun.volver}
          onConfirm={async () => {
            if (!booking.paymentId) return;
            const result = await onUndoPayment({
              paymentId: booking.paymentId,
            });
            if (result.ok) {
              setUndoOpen(false);
            } else {
              setUndoError(
                result.code === "same_day_required"
                  ? caja.errores.same_day_required
                  : comun.algoSalioMal,
              );
            }
          }}
        />
      ) : null}
    </Popover.Root>
  );
}
