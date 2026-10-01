"use client";

// MoreSheet — WP-57 punkt 3 (ägarens UX-genomgång, "Mobilens flikrad"): mobilens flikrad
// visar bara fem mål (Inicio, Agenda, Hoy, Clientes, Mer) i stället för sex — Blixttider,
// Caja, Utskick och Inställningar flyttas hit, ett bottenark som öppnas av "Mer"
// (owner-tab-bar.tsx). Samma bottenark-mönster som NotificationBell/ManualBookingDialog/
// MoveDialog (Radix Dialog, `items-end`/`rounded-t-panel`, `useSheetDrag` för
// dra-ner-för-att-stänga).
//
// Inga nya texter: etiketterna kommer från `src/i18n/es-CL.ts` (`nav`/`campanas`), samma
// strängar som redan används i MainNav/AgendaRail/campaigns-screen.
import * as Dialog from "@radix-ui/react-dialog";
import { BarChart3, LogOut, Send, SlidersHorizontal, X, Zap } from "lucide-react";
import Link from "next/link";
import { useId, type ReactNode } from "react";

import { IconButton } from "@/components/ui/icon-button";
import { strokeNav } from "@/components/ui/icons";
import { useSheetDrag } from "@/components/ui/use-sheet-drag";
import { campanas, comun, nav } from "@/i18n";

export type MoreSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** WP-24 (D-034): döljer raden till Caja när medlemmen saknar `can_view_reports`. */
  showCaja: boolean;
  /** `logout` (server action). `undefined` → raden finns kvar men gör inget (samma
   * `onLogout ?? (() => {})`-mönster som NavRailFormAction m.fl.) — de flesta skärmar som
   * renderar den här har redan en egen, fungerande utloggning (den mörka mobila topprraden,
   * `owner-top-bar.tsx`, eller `UserMenu` på Hoy). */
  onLogout?: () => void | Promise<void>;
};

const ROW_ICON = "size-5";

export function MoreSheet({
  open,
  onOpenChange,
  showCaja,
  onLogout,
}: MoreSheetProps) {
  const descId = useId();
  const { panelRef, handleProps: dragHandleProps } = useSheetDrag(() =>
    onOpenChange(false),
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-20 flex items-end justify-center bg-ink/45">
          <Dialog.Content
            ref={panelRef}
            aria-describedby={descId}
            className="flex w-full max-w-sm flex-col gap-1 rounded-t-panel bg-canvas p-5 shadow-popover transition-transform duration-200 ease-out sheet-closed:translate-y-full"
          >
            <div
              aria-hidden="true"
              className="-mt-2 mb-1 h-1.5 w-10 shrink-0 touch-none self-center rounded-full bg-line-strong"
              {...dragHandleProps}
            />
            <div className="mb-2 flex items-center justify-between">
              <Dialog.Title className="text-17 font-bold text-ink">
                {nav.masOpciones}
              </Dialog.Title>
              <Dialog.Close asChild>
                <IconButton label={comun.cerrar} tone="ghost" size={30}>
                  <X aria-hidden="true" className="size-4" strokeWidth={2.2} />
                </IconButton>
              </Dialog.Close>
            </div>
            <Dialog.Description id={descId} className="sr-only">
              {nav.masOpciones}
            </Dialog.Description>

            <MoreSheetLink
              href="/app/flash"
              label={nav.horasFlash}
              icon={<Zap aria-hidden="true" className={ROW_ICON} strokeWidth={strokeNav} />}
              onNavigate={() => onOpenChange(false)}
            />
            {showCaja ? (
              <MoreSheetLink
                href="/app/caja"
                label={nav.caja}
                icon={
                  <BarChart3
                    aria-hidden="true"
                    className={ROW_ICON}
                    strokeWidth={strokeNav}
                  />
                }
                onNavigate={() => onOpenChange(false)}
              />
            ) : null}
            <MoreSheetLink
              href="/app/clientes/utskick"
              label={campanas.titulo}
              icon={<Send aria-hidden="true" className={ROW_ICON} strokeWidth={strokeNav} />}
              onNavigate={() => onOpenChange(false)}
            />
            <MoreSheetLink
              href="/app/ajustes"
              label={nav.ajustes}
              icon={
                <SlidersHorizontal
                  aria-hidden="true"
                  className={ROW_ICON}
                  strokeWidth={strokeNav}
                />
              }
              onNavigate={() => onOpenChange(false)}
            />
            <form action={onLogout ?? (() => {})}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-control px-2 py-3.5 text-left text-15 font-semibold text-ink transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none"
              >
                <LogOut aria-hidden="true" className={ROW_ICON} strokeWidth={strokeNav} />
                {nav.cerrarSesion}
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function MoreSheetLink({
  href,
  label,
  icon,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-control px-2 py-3.5 text-15 font-semibold text-ink transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none"
    >
      {icon}
      {label}
    </Link>
  );
}
