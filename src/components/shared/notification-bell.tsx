"use client";

// NotificationBell — WP-45 (D-033): la campana de notificaciones en la
// topprad de Inicio (escritorio), Hoy (mobile), Ajustes (escritorio) y la
// topprad mobil compartida (`owner-top-bar.tsx`, Agenda/Ajustes/Inicio en
// mobile). No hay referencia *.dc.html para el popover ni el bottenark
// (WP-45 plan, FRÅGA 5): construido con componentes existentes (IconButton,
// Button, `RechazarDialog`/`ConfirmDialog`), solo tokens — el dueño aprueba
// una captura como línea base (Ägarens svar #5).
//
// Responsive: Radix Popover anclado bajo la campana en escritorio (≥ lg,
// 1024 px, mismo umbral que `event-popover.tsx`), Radix Dialog como
// bottenark en mobile (mismo patrón `items-end`/`rounded-t-panel`/
// `useSheetDrag` que `move-dialog.tsx`/`manual-booking-dialog.tsx`).
import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import { Bell, X } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconButton, type IconButtonProps } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import { useSheetDrag } from "@/components/ui/use-sheet-drag";
import { appHref } from "@/config/routes";
import { comun, nav, smsCreditos, solicitudes } from "@/i18n";
import {
  APP_TZ,
  formatLocalDate,
  formatTime,
  parseInstant,
  toLocalDate,
} from "@/lib/format/dates";
import type { PendingRequestItem } from "@/lib/validation/requests";
import type { SmsBellNotice } from "@/lib/validation/sms-credits";

import { RechazarDialog } from "./rechazar-dialog";
import { useCompactViewport } from "./use-compact-viewport";

// Tipo compartido con el servidor (`listPendingRequests`), definido en
// `src/lib/validation/requests.ts`; se re-exporta aquí para los importadores
// existentes.
export type { PendingRequestItem };

export type NotificationBellResult = { ok: boolean };

export type NotificationBellProps = {
  requests: readonly PendingRequestItem[];
  /** WP-76 (D-053): sms-varningar (80 % / slut), överst i listan med en länk
   * till Inställningar → Plan. Härleds på servern (`loadSmsBellNotices`). */
  notices?: readonly SmsBellNotice[];
  onConfirm: (bookingId: string) => Promise<NotificationBellResult>;
  /** `reason`: ägarens valfria motiv (`RechazarDialog`), ≤ 300 tecken,
   * skickas som `motivo` i mejlet till kunden (`declineBooking`,
   * `ownerDecisionRequestSchema.reason`). */
  onDecline: (
    bookingId: string,
    reason?: string,
  ) => Promise<NotificationBellResult>;
  /** WP-56: filas `kind: "cancel"` — "Aprobar cancelación"/"Rechazar" en
   * lugar de "Confirmar"/"Rechazar". `undefined` oculta los botones de esas
   * filas (misma convención que `onMover` en `EventPopover`). */
  onApproveCancel?: (bookingId: string) => Promise<NotificationBellResult>;
  onDeclineCancel?: (bookingId: string) => Promise<NotificationBellResult>;
  /** Tamaño/tono del `IconButton` disparador — igual que la campana ya
   * dibujada en cada pantalla antes de WP-45. */
  triggerSize?: IconButtonProps["size"];
  triggerTone?: IconButtonProps["tone"];
  /** Inicio/Ajustes envuelven el disparador en un `Tooltip` (escritorio);
   * Hoy y la topprad mobil no. */
  withTooltip?: boolean;
  className?: string;
};

function rowText(request: PendingRequestItem): string {
  const r = parseInstant(request.start);
  if (!r.ok) return request.clientName;
  const date = toLocalDate(r.value, APP_TZ);
  return solicitudes.fila({
    cliente: request.clientName,
    servicio: request.service,
    fecha: formatLocalDate(date, "weekdayDayMonthShort"),
    hora: formatTime(r.value, APP_TZ),
  });
}

function notificationsLabel(count: number): string {
  return count > 0
    ? nav.notificacionesNuevas({ n: count })
    : nav.notificaciones;
}

export function NotificationBell({
  requests,
  notices = [],
  onConfirm,
  onDecline,
  onApproveCancel,
  onDeclineCancel,
  triggerSize,
  triggerTone,
  withTooltip = false,
  className,
}: NotificationBellProps) {
  const sheetDescId = useId();
  const count = requests.length + notices.length;
  const [open, setOpen] = useState(false);
  // WP-47 (tillägg D): dra-för-att-stänga på mobil (bottenark), samma hook som
  // move-dialog.tsx/manual-booking-dialog.tsx.
  const { panelRef, handleProps: dragHandleProps } = useSheetDrag(() =>
    setOpen(false),
  );
  // Bort optimistiskt ur listan (WP-47-mönstret, `handledIds` i
  // inicio-screen.tsx): ingen `useEffect`-synk mot `requests` behövs —
  // filtret räknas om varje rendering, och anroparens `router.refresh()`
  // (efter `revalidatePath`) ger till slut samma lista utan lokal state.
  const [handledIds, setHandledIds] = useState<ReadonlySet<string>>(new Set());
  const items = requests.filter((r) => !handledIds.has(r.id));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  // WP-56: fila `kind: "cancel"` cuya "Rechazar" está confirmándose
  // (`ConfirmDialog`, sin motivo — distinto de `decliningId`/`RechazarDialog`).
  const [decliningCancelId, setDecliningCancelId] = useState<string | null>(
    null,
  );
  const [announcement, setAnnouncement] = useState<{
    id: number;
    text: string;
  } | null>(null);

  function announce(text: string) {
    setAnnouncement((prev) => ({ id: (prev?.id ?? 0) + 1, text }));
  }

  async function handleConfirm(bookingId: string) {
    if (busyId) return;
    setBusyId(bookingId);
    try {
      const result = await onConfirm(bookingId);
      if (result.ok) {
        setHandledIds((prev) => new Set(prev).add(bookingId));
        announce(solicitudes.toast.confirmada);
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleDecline(bookingId: string, reason: string) {
    setBusyId(bookingId);
    try {
      const result = await onDecline(bookingId, reason || undefined);
      if (result.ok) {
        setHandledIds((prev) => new Set(prev).add(bookingId));
        announce(solicitudes.toast.rechazada);
      }
    } finally {
      setBusyId(null);
      setDecliningId(null);
    }
  }

  async function handleApproveCancel(bookingId: string) {
    if (busyId || !onApproveCancel) return;
    setBusyId(bookingId);
    try {
      const result = await onApproveCancel(bookingId);
      if (result.ok) {
        setHandledIds((prev) => new Set(prev).add(bookingId));
        announce(solicitudes.toast.cancelacionAprobada);
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeclineCancel(bookingId: string) {
    if (!onDeclineCancel) return;
    setBusyId(bookingId);
    try {
      const result = await onDeclineCancel(bookingId);
      if (result.ok) {
        setHandledIds((prev) => new Set(prev).add(bookingId));
        announce(solicitudes.toast.cancelacionRechazada);
      }
    } finally {
      setBusyId(null);
      setDecliningCancelId(null);
    }
  }

  // `useSyncExternalStore` (inte `useState`+`useEffect`, som gav en
  // hydreringskrock här — se use-compact-viewport.ts).
  const compact = useCompactViewport();

  const label = notificationsLabel(count);
  // Ingen extra <button> runt IconButton (ogiltig nästlad interaktiv HTML):
  // på mobil öppnar knappen bottenarket direkt, på skrivbordet sköter
  // `Popover.Trigger asChild` klicket i stället (ingen `onClick` behövs där).
  const iconButtonEl = (
    <IconButton
      label={label}
      tone={triggerTone ?? "surface"}
      size={triggerSize}
      badge={count > 0}
      className={className}
      onClick={compact ? () => setOpen(true) : undefined}
    >
      <Bell aria-hidden="true" className="size-5" strokeWidth={1.9} />
    </IconButton>
  );

  const noticeRows = notices.map((n) => (
    <div
      key={n.kind}
      className="flex flex-col gap-2 border-b border-line-strong px-1 py-3 last:border-b-0"
    >
      <p className="text-13 font-semibold text-ink">
        {n.kind === "smsAgotados"
          ? smsCreditos.campana.agotados
          : smsCreditos.campana.cuota80}
      </p>
      <Button asChild variant="primary" size="xs" className="self-start">
        <Link href={appHref("appAjustesPlan")} onClick={() => setOpen(false)}>
          {smsCreditos.campana.cta}
        </Link>
      </Button>
    </div>
  ));

  const list = (
    <div className="flex max-h-96 flex-col gap-1 overflow-y-auto">
      {noticeRows}
      {items.length === 0 && notices.length > 0 ? null : items.length === 0 ? (
        <p className="px-1 py-4 text-13 text-muted">
          {solicitudes.campana.vacio}
        </p>
      ) : (
        items.map((request) => (
          <div
            key={request.id}
            className="flex flex-col gap-2 border-b border-line-strong px-1 py-3 last:border-b-0"
          >
            {request.kind === "cancel" ? (
              <Chip tone="deposit" size="xs" className="self-start">
                {solicitudes.etiquetaCancelacion}
              </Chip>
            ) : null}
            <p className="text-13 font-semibold text-ink">{rowText(request)}</p>
            {request.kind === "cancel" ? (
              onApproveCancel && onDeclineCancel ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="xs"
                    disabled={busyId === request.id}
                    onClick={() => void handleApproveCancel(request.id)}
                  >
                    {solicitudes.acciones.aprobarCancelacion}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    disabled={busyId === request.id}
                    onClick={() => setDecliningCancelId(request.id)}
                  >
                    {solicitudes.acciones.rechazar}
                  </Button>
                </div>
              ) : null
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="xs"
                  disabled={busyId === request.id}
                  onClick={() => void handleConfirm(request.id)}
                >
                  {solicitudes.acciones.confirmar}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  disabled={busyId === request.id}
                  onClick={() => setDecliningId(request.id)}
                >
                  {solicitudes.acciones.rechazar}
                </Button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const decliningRequest = items.find((r) => r.id === decliningId) ?? null;
  const decliningCancelRequest =
    items.find((r) => r.id === decliningCancelId) ?? null;

  return (
    <>
      {compact ? (
        <>
          {withTooltip ? (
            <Tooltip label={label} side="bottom">
              {iconButtonEl}
            </Tooltip>
          ) : (
            iconButtonEl
          )}
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-20 flex items-end justify-center bg-ink/45">
                <Dialog.Content
                  ref={panelRef}
                  aria-describedby={sheetDescId}
                  className="flex max-h-full w-full max-w-sm translate-y-0 flex-col gap-3 overflow-y-auto rounded-t-panel bg-canvas p-5 shadow-popover transition-transform duration-200 ease-out sheet-closed:translate-y-full"
                >
                  <div
                    aria-hidden="true"
                    className="-mt-2 mb-1 h-1.5 w-10 shrink-0 touch-none self-center rounded-full bg-line-strong"
                    {...dragHandleProps}
                  />
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="text-17 font-bold text-ink">
                      {solicitudes.campana.titulo}
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <IconButton label={comun.cerrar} tone="ghost" size={30}>
                        <X
                          aria-hidden="true"
                          className="size-4"
                          strokeWidth={2.2}
                        />
                      </IconButton>
                    </Dialog.Close>
                  </div>
                  <Dialog.Description id={sheetDescId} className="sr-only">
                    {solicitudes.campana.titulo}
                  </Dialog.Description>
                  {list}
                </Dialog.Content>
              </Dialog.Overlay>
            </Dialog.Portal>
          </Dialog.Root>
        </>
      ) : (
        <Popover.Root open={open} onOpenChange={setOpen}>
          {withTooltip ? (
            <Tooltip label={label} side="bottom">
              <Popover.Trigger asChild>{iconButtonEl}</Popover.Trigger>
            </Tooltip>
          ) : (
            <Popover.Trigger asChild>{iconButtonEl}</Popover.Trigger>
          )}
          <Popover.Portal>
            <Popover.Content
              align="end"
              side="bottom"
              sideOffset={8}
              collisionPadding={12}
              aria-label={solicitudes.campana.titulo}
              className="z-20 flex w-80 flex-col gap-2 rounded-panel bg-surface p-4 shadow-popover"
            >
              <div className="text-15 font-bold text-ink">
                {solicitudes.campana.titulo}
              </div>
              {list}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}

      <RechazarDialog
        open={decliningRequest != null}
        onOpenChange={(next) => {
          if (!next) setDecliningId(null);
        }}
        onConfirm={async (motivo) => {
          if (decliningRequest)
            await handleDecline(decliningRequest.id, motivo);
        }}
      />

      <ConfirmDialog
        open={decliningCancelRequest != null}
        onOpenChange={(next) => {
          if (!next) setDecliningCancelId(null);
        }}
        title={solicitudes.rechazarCancelacionDialog.titulo}
        body={solicitudes.rechazarCancelacionDialog.cuerpo}
        confirmLabel={solicitudes.rechazarCancelacionDialog.ctaSi}
        cancelLabel={solicitudes.rechazarCancelacionDialog.ctaNo}
        onConfirm={async () => {
          if (decliningCancelRequest) {
            await handleDeclineCancel(decliningCancelRequest.id);
          }
        }}
      />

      <div role="status" className="sr-only">
        {announcement ? (
          <span key={announcement.id}>{announcement.text}</span>
        ) : null}
      </div>
    </>
  );
}
