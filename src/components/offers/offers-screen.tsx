"use client";

// /app/erbjudanden (WP-70, D-056): företagets erbjudanden. Samma master–detail som
// Inställningar → Tjänster (D-042, `grid-cols-list-editor`): listan till vänster, redigeraren
// i en `lg:sticky`-kolumn till höger; under lg staplas de. Ingen *.dc.html för själva
// redigeraren — appens befintliga formspråk (AppShell/OwnerPageHeader/Card, som Blixttider).
// Förhandsvisningen återanvänder kortet från Upptäck (`Marketplace/Desktop.dc.html`).
import { Tag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

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
import { cn } from "@/components/ui/cn";
import { strokeCard } from "@/components/ui/icons";
import { appHref } from "@/config/routes";
import { ofertas } from "@/i18n";
import { formatLocalDate, type LocalDate } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";

import { OfferEditor, OfferStatusChip } from "./offer-editor";
import type { EditorOffer, EditorService, OffersActions } from "./types";

export type OffersScreenProps = {
  offers: readonly EditorOffer[];
  services: readonly EditorService[];
  canPublish: boolean;
  defaultCategory: string;
  business: { name: string; slug: string; areaName: string | null };
  actions: OffersActions;
  /** Uppgraderingsrutan när planen saknar erbjudanden (D-048). */
  planNotice?: ReactNode;
  canViewReports?: boolean;
  onLogout?: () => void | Promise<void>;
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
};

const L = ofertas.lista;

function day(d: LocalDate): string {
  return formatLocalDate(d, "dayMonthLong");
}

function windowText(o: EditorOffer): string {
  if (o.saleStartsOn && o.saleEndsOn) {
    return L.ventana({ desde: day(o.saleStartsOn), hasta: day(o.saleEndsOn) });
  }
  if (o.saleStartsOn) return L.desde({ fecha: day(o.saleStartsOn) });
  if (o.saleEndsOn) return L.hasta({ fecha: day(o.saleEndsOn) });
  return L.sinVentana;
}

function soldText(o: EditorOffer): string {
  return o.quantityTotal === null
    ? L.vendidos({ n: o.quantitySold })
    : L.vendidosDe({ n: o.quantitySold, total: o.quantityTotal });
}

function EmptyState({
  hasServices,
  onCreate,
}: {
  hasServices: boolean;
  onCreate?: () => void;
}) {
  const v = ofertas.vacio;
  const steps = [v.pasos.uno, v.pasos.dos, v.pasos.tres];
  return (
    <Card
      radius="tile"
      padding="xl"
      className="flex flex-col items-start gap-5"
      data-testid="offers-empty"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-lavender text-ink">
        <Tag aria-hidden="true" className="size-5.5" strokeWidth={strokeCard} />
      </span>
      <div className="flex max-w-140 flex-col gap-2">
        <h2 className="text-22 font-bold text-ink">{v.titulo}</h2>
        <p className="text-15 leading-body text-muted">{v.texto}</p>
      </div>
      <ol className="flex flex-col gap-3">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-3 text-15 text-ink">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-13 font-bold text-on-dark">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
      {hasServices ? (
        onCreate ? (
          <Button type="button" size="lg" onClick={onCreate}>
            {v.cta}
          </Button>
        ) : null
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-14 text-muted">{v.sinServicios}</p>
          <Button asChild variant="secondary" size="lg">
            <Link href={appHref("appAjustesServicios")}>{v.irServicios}</Link>
          </Button>
        </div>
      )}
    </Card>
  );
}

export function OffersScreen({
  offers,
  services,
  canPublish,
  defaultCategory,
  business,
  actions,
  planNotice,
  canViewReports,
  onLogout,
  ownerName,
  publicPageHref,
  myProfile,
  myProfileActions,
  pendingRequests,
  onConfirmRequest,
  onDeclineRequest,
  onApproveCancelRequest,
  onDeclineCancelRequest,
}: OffersScreenProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // `editing`: id för erbjudandet i redigeraren, "new" för ett nytt, null = stängd.
  // `session` byts bara när ägaren väljer en annan rad, så att redigeraren inte
  // nollställs när listan laddas om efter en sparning.
  const [editing, setEditing] = useState<string | null>(null);
  const [session, setSession] = useState(0);
  const canCreate = !planNotice && services.length > 0;

  function open(id: string) {
    setEditing(id);
    setSession((n) => n + 1);
  }

  const current =
    editing && editing !== "new"
      ? (offers.find((o) => o.id === editing) ?? null)
      : null;

  return (
    <AppShell
      rail={
        <MainNav
          active="ofertas"
          onLogout={onLogout}
          canViewReports={canViewReports}
        />
      }
      mobileTabBar={
        <OwnerMobileTabBar
          active="ofertas"
          className="lg:hidden"
          canViewReports={canViewReports}
          onLogout={onLogout}
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
        title={ofertas.titulo}
        subtitle={ofertas.subtitulo}
        actions={
          canCreate && (offers.length > 0 || editing !== null) ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={() => open("new")}
            >
              {ofertas.nueva}
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4">
        {planNotice}

        {offers.length === 0 && editing === null ? (
          <EmptyState
            hasServices={services.length > 0}
            onCreate={canCreate ? () => open("new") : undefined}
          />
        ) : (
          <div
            className={cn(
              "flex flex-col gap-4",
              offers.length > 0 &&
                "lg:grid lg:grid-cols-list-editor lg:items-start",
            )}
          >
            {offers.length > 0 ? (
              <Card
                radius="tile"
                padding="lg"
                className="flex min-w-0 flex-col gap-4"
              >
                <h2 className="text-18 font-bold text-ink">{L.titulo}</h2>
                <div className="flex flex-col gap-3">
                  {offers.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      data-testid="offer-row"
                      onClick={() => open(o.id)}
                      className={cn(
                        "flex flex-col gap-2 rounded-tile border-2 bg-canvas p-4 text-left transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                        editing === o.id ? "border-ink" : "border-transparent",
                        (o.status === "paused" || o.status === "ended") &&
                          "opacity-70",
                      )}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0 text-15 font-bold text-ink">
                          {o.title}
                        </span>
                        <OfferStatusChip status={o.status} />
                      </span>
                      <span className="flex flex-wrap items-baseline gap-x-2 text-13 text-muted">
                        <span>{o.serviceName}</span>
                        <span aria-hidden="true">·</span>
                        <s>{formatMoney(o.regularPriceMinor)}</s>
                        <b className="font-bold text-ink">
                          {formatMoney(o.offerPriceMinor)}
                        </b>
                      </span>
                      <span className="flex flex-wrap gap-x-2 text-13 text-muted">
                        <span>{soldText(o)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{windowText(o)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </Card>
            ) : null}

            {editing !== null ? (
              <div className="flex flex-col gap-3 lg:sticky lg:top-0">
                <OfferEditor
                  key={session}
                  offer={current}
                  services={services}
                  defaultCategory={defaultCategory}
                  business={business}
                  canPublish={canPublish}
                  actions={actions}
                  onSaved={(id) => {
                    setEditing(id);
                    startTransition(() => router.refresh());
                  }}
                  onClose={() => setEditing(null)}
                />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </AppShell>
  );
}
