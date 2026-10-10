"use client";

// /app/flash (WP-30, F13): ägarens Horas flash — aktiva och tidigare, "Nueva hora flash".
// Ingen *.dc.html-referens (ny funktion, ingen specifik skärmbild i planen) — AppShell/
// PageHeader/Card, samma formspråk som /app/clientes/utskick.
//
// UX-granskning (sección "Blixttider", 2026-10-01): tomma läget sa bara två rader text.
// Nu förklarar det vad en Hora flash är och listar lediga luckor idag/imorgon
// (`listFreeGaps`, `src/server/flash/gaps.ts`) med en knapp som öppnar "Nueva hora flash"
// redan ifylld. Samma dialog öppnas redan ifylld från `/app/flash?ny=1&staff=<id>&start=
// <ISO>` (länkad från Hoy, A:s sida) — `?ny=/staff=/start=` tolkas server-side i `page.tsx`
// (samma mönster som Agendans `?vista=&fecha=`, `initialDialogDefaults`-prop i stället för
// `useSearchParams()` här, som annars kräver en egen Suspense-gräns). Punkt 6 (gemensamt
// sidhuvud): `OwnerPageHeader` i stället för den gamla manuella PageHeader-kopplingen.
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { AppShell } from "@/components/dashboard/app-shell";
import { MainNav } from "@/components/dashboard/main-nav";
import { OwnerMobileTabBar } from "@/components/mobile/owner-tab-bar";
import type {
  MyProfileActions,
  MyProfileData,
} from "@/components/shared/my-profile-dialog";
import type {
  NotificationBellResult,
  PendingRequestItem,
} from "@/components/shared/notification-bell";
import { OwnerPageHeader } from "@/components/shared/owner-page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { flash } from "@/i18n";
import {
  APP_TZ,
  formatTimeRange,
  toWallClock,
  type LocalDate,
  type LocalTime,
} from "@/lib/format/dates";

import { FlashSlotCard } from "./flash-slot-card";
import { FlashSlotDialog } from "./flash-slot-dialog";
import type {
  CancelFlashResult,
  CreateFlashResult,
  CreateFlashSlotInput,
  FlashCatalogService,
  FlashGapView,
  FlashSlotView,
  FlashStaff,
  SendFlashCampaignInput,
  SendFlashCampaignResult,
} from "./types";

export type FlashScreenProps = {
  /** WP-73 (D-048): uppgraderingsrutan när planen saknar blixttider —
   * befintliga tider visas, men "Ny blixttid" döljs. */
  planNotice?: ReactNode;
  active: readonly FlashSlotView[];
  past: readonly FlashSlotView[];
  staff: readonly FlashStaff[];
  services: readonly FlashCatalogService[];
  today: LocalDate;
  /** UX-granskning: tomma lägets "Lediga luckor idag och i morgon" (`listFreeGaps`). */
  gaps?: readonly FlashGapView[];
  /** "https://llena.cl/{slug}" — "Copiar link" bygger `${publicBase}?flash=<id>`. */
  publicBase: string;
  /** `undefined` döljer "Enviar a clientes" i varje kort. */
  onSend?: (input: SendFlashCampaignInput) => Promise<SendFlashCampaignResult>;
  /** SMS bara en SE (D-025/D-026). */
  smsAvailable?: boolean;
  canViewReports?: boolean;
  onLogout?: () => void | Promise<void>;
  onCreate: (input: CreateFlashSlotInput) => Promise<CreateFlashResult>;
  onCancel?: (id: string) => Promise<CancelFlashResult>;
  /** Punkt 6 (gemensamt sidhuvud): data till `OwnerPageHeader`/`AppShell`s
   * `OwnerChromeProvider`. `undefined` döljer respektive del (design lab). */
  ownerName?: string;
  publicPageHref?: string;
  myProfile?: MyProfileData;
  myProfileActions?: MyProfileActions;
  pendingRequests?: readonly PendingRequestItem[];
  onConfirmRequest?: (bookingId: string) => Promise<NotificationBellResult>;
  onDeclineRequest?: (
    bookingId: string,
    reason?: string,
  ) => Promise<NotificationBellResult>;
  onApproveCancelRequest?: (
    bookingId: string,
  ) => Promise<NotificationBellResult>;
  onDeclineCancelRequest?: (
    bookingId: string,
  ) => Promise<NotificationBellResult>;
  /** `/app/flash?ny=1&staff=<id>&start=<ISO>` (länkad från Hoy), redan tolkad server-side
   * i `page.tsx`. `undefined`/ogiltig → dialogen är stängd som vanligt. */
  initialDialogDefaults?: {
    date: LocalDate;
    time: LocalTime;
    staffId: string;
  } | null;
};

type DialogDefaults = {
  date: LocalDate;
  time: LocalTime;
  staffId: string;
} | null;

/** "Hoy 15:30–17:00 · Diego"/"Mañana 10:00–11:00 · Tomás" — `flash.vacio.hueco`. */
function gapLabel(gap: FlashGapView, today: LocalDate): string {
  return flash.vacio.hueco({
    dia: gap.date === today ? flash.vacio.hoy : flash.vacio.manana,
    rango: formatTimeRange(new Date(gap.start), new Date(gap.end), APP_TZ),
    profesional: gap.staffName,
  });
}

function defaultsFromGap(gap: FlashGapView): DialogDefaults {
  const wall = toWallClock(new Date(gap.start), APP_TZ);
  return { date: wall.date, time: wall.time, staffId: gap.staffId };
}

export function FlashScreen({
  active,
  past,
  staff,
  services,
  today,
  gaps = [],
  publicBase,
  onSend,
  smsAvailable = false,
  canViewReports,
  onLogout,
  onCreate,
  onCancel,
  ownerName,
  publicPageHref,
  myProfile,
  myProfileActions,
  pendingRequests,
  onConfirmRequest,
  onDeclineRequest,
  onApproveCancelRequest,
  onDeclineCancelRequest,
  initialDialogDefaults = null,
  planNotice,
}: FlashScreenProps) {
  const router = useRouter();
  // A länkar hit från Hoy med `?ny=1&staff=<id>&start=<ISO>` (en ledig lucka hen redan ser
  // där) — `page.tsx` tolkar query-parametrarna server-side och skickar dem hit som
  // `initialDialogDefaults`, så dialogen öppnas direkt, redan ifylld, i stället för att
  // ägaren måste fylla i allt själv igen.
  const [dialogOpen, setDialogOpen] = useState(initialDialogDefaults != null);
  const [dialogDefaults, setDialogDefaults] = useState<DialogDefaults>(
    initialDialogDefaults,
  );

  return (
    <AppShell
      rail={
        <MainNav
          active="horasFlash"
          onLogout={onLogout}
          canViewReports={canViewReports}
        />
      }
      mobileTabBar={
        <OwnerMobileTabBar
          active="agenda"
          className="lg:hidden"
          canViewReports={canViewReports}
        />
      }
      onLogout={onLogout}
      pendingRequests={pendingRequests}
      onConfirmRequest={onConfirmRequest}
      onDeclineRequest={onDeclineRequest}
      onApproveCancelRequest={onApproveCancelRequest}
      onDeclineCancelRequest={onDeclineCancelRequest}
      ownerName={ownerName}
      publicPageHref={publicPageHref}
      myProfile={myProfile}
      myProfileActions={myProfileActions}
      hideMobileTopBar
    >
      <OwnerPageHeader
        title={flash.titulo}
        actions={
          staff.length > 0 && !planNotice ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={() => {
                setDialogDefaults(null);
                setDialogOpen(true);
              }}
            >
              {flash.nueva.cta}
            </Button>
          ) : null
        }
      />

      {planNotice}

      <section
        aria-label={flash.activas.titulo}
        className="flex flex-col gap-3"
      >
        <h2 className="text-16 font-bold text-ink">{flash.activas.titulo}</h2>
        {active.length === 0 ? (
          <div className="flex flex-col gap-4">
            <p className="max-w-prose text-14 text-muted">
              {flash.vacio.explicacion}
            </p>
            {gaps.length > 0 ? (
              <Card radius="tile" padding="lg" className="flex flex-col gap-3">
                <h3 className="text-15 font-bold text-ink">
                  {flash.vacio.huecosTitulo}
                </h3>
                <div className="flex flex-col gap-2">
                  {gaps.map((gap) => (
                    <div
                      key={`${gap.staffId}-${gap.start}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-tile bg-canvas p-3"
                    >
                      <span className="text-14 text-ink">
                        {gapLabel(gap, today)}
                      </span>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setDialogDefaults(defaultsFromGap(gap));
                          setDialogOpen(true);
                        }}
                      >
                        {flash.vacio.ctaConvertir}
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {active.map((slot) => (
              <FlashSlotCard
                key={slot.id}
                slot={slot}
                publicUrl={`${publicBase}?flash=${slot.id}`}
                onSend={onSend}
                smsAvailable={smsAvailable}
                onCancel={onCancel}
              />
            ))}
          </div>
        )}
      </section>

      <section
        aria-label={flash.reservadas.titulo}
        className="mt-6 flex flex-col gap-3"
      >
        <h2 className="text-16 font-bold text-ink">
          {flash.reservadas.titulo}
        </h2>
        {past.length === 0 ? (
          <p className="text-14 text-muted">{flash.reservadas.vacio}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {past.map((slot) => (
              <FlashSlotCard
                key={slot.id}
                slot={slot}
                publicUrl={`${publicBase}?flash=${slot.id}`}
              />
            ))}
          </div>
        )}
      </section>

      <FlashSlotDialog
        key={
          dialogDefaults
            ? `${dialogDefaults.date}-${dialogDefaults.time}-${dialogDefaults.staffId}`
            : "flash-default"
        }
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setDialogDefaults(null);
        }}
        staff={staff}
        services={services}
        defaultDate={dialogDefaults?.date ?? today}
        defaultTime={dialogDefaults?.time}
        defaultStaffId={dialogDefaults?.staffId}
        onSubmit={async (input) => {
          const result = await onCreate(input);
          if (result.ok) router.refresh();
          return result;
        }}
      />
    </AppShell>
  );
}
