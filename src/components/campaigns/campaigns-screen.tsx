"use client";

// CampaignsScreen — /app/clientes/utskick (WP-31, F14): historial de
// campañas enviadas. Mismo shell que CustomersScreen (`AppShell`, `MainNav`,
// `PageHeader`) — vive "bajo" Clientes en la navegación (flecha atrás a
// `/app/clientes`, sin su propia entrada en `MainNav`/`OwnerMobileTabBar`,
// igual que la ficha del cliente). Ningún *.dc.html de referencia para esta
// pantalla (feature nueva, sin diseño previo) — reutiliza los tokens y
// componentes ya existentes (Card, Chip, PageHeader) en vez de inventar
// nuevos.
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/dashboard/app-shell";
import { MainNav } from "@/components/dashboard/main-nav";
import { OwnerMobileTabBar } from "@/components/mobile/owner-tab-bar";
import type {
  MyProfileActions,
  MyProfileData,
} from "@/components/shared/my-profile-dialog";
import { OwnerPageHeader } from "@/components/shared/owner-page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { IconButton } from "@/components/ui/icon-button";
import { strokeArrow } from "@/components/ui/icons";
import { appHref } from "@/config/routes";
import { campanas, comun } from "@/i18n";
import { APP_TZ, formatDate, parseInstant } from "@/lib/format/dates";

import type { CampaignListItem } from "./types";

export type CampaignsScreenProps = {
  items: readonly CampaignListItem[];
  /** WP-24 (D-034): döljer Caja i navigeringen. `undefined` visar den. */
  canViewReports?: boolean;
  /** `?enviado=1` efter `/app/clientes/utskick/nytt` — toast kort banner. */
  enviado?: boolean;
  onLogout?: () => void | Promise<void>;
  /** WP-57 punkt 7: `<OwnerPageHeader>` (klocka + profilmeny), samma data
   * som Inicio skickar till `AppShell` (`owner-chrome.tsx`). */
  ownerName: string;
  publicPageHref: string;
  myProfile?: MyProfileData;
  myProfileActions?: MyProfileActions;
};

function sentAtLabel(iso: string): string {
  const parsed = parseInstant(iso);
  if (!parsed.ok) return "—";
  return formatDate(parsed.value, APP_TZ, "weekdayDayMonthShort");
}

export function CampaignsScreen({
  items,
  canViewReports,
  enviado,
  onLogout,
  ownerName,
  publicPageHref,
  myProfile,
  myProfileActions,
}: CampaignsScreenProps) {
  return (
    <AppShell
      rail={
        <MainNav
          active="clientes"
          onLogout={onLogout}
          canViewReports={canViewReports}
        />
      }
      mobileTabBar={
        <OwnerMobileTabBar
          active="clientes"
          className="lg:hidden"
          canViewReports={canViewReports}
        />
      }
      onLogout={onLogout}
      ownerName={ownerName}
      publicPageHref={publicPageHref}
      canViewReports={canViewReports}
      myProfile={myProfile}
      myProfileActions={myProfileActions}
      hideMobileTopBar
    >
      <OwnerPageHeader
        title={
          <span className="flex items-center gap-3">
            <IconButton label={comun.volver} tone="ghost" size={36} asChild>
              <Link href={appHref("appClientes")}>
                <ArrowLeft
                  aria-hidden="true"
                  className="size-4.5"
                  strokeWidth={strokeArrow}
                />
              </Link>
            </IconButton>
            {campanas.titulo}
          </span>
        }
        actions={
          <Button asChild variant="primary" size="lg">
            <Link href={appHref("appClientesUtskickNytt")}>
              {campanas.historial.ctaNueva}
            </Link>
          </Button>
        }
      />

      {enviado ? (
        <p
          role="status"
          className="rounded-tile bg-success-bg px-5 py-3 text-13 font-semibold text-success-fg"
        >
          {campanas.historial.enviadoToast}
        </p>
      ) : null}

      {items.length === 0 ? (
        <Card radius="tile" padding="lg" className="text-14 text-muted">
          {campanas.historial.vacio}
        </Card>
      ) : (
        <>
          <div className="hidden grid-cols-4 gap-4 px-5.5 text-11 font-bold tracking-caps text-muted uppercase lg:grid">
            <span>{campanas.nueva.nombreLabel}</span>
            <span>{campanas.historial.columnaFecha}</span>
            <span>{campanas.historial.columnaDestinatarios}</span>
            <span>{campanas.historial.columnaReservas}</span>
          </div>
          <ul className="flex flex-col gap-2.5">
            {items.map((c) => (
              <li key={c.id}>
                <div className="grid grid-cols-1 items-center gap-3 rounded-tile bg-surface px-5.5 py-4 lg:grid-cols-4 lg:gap-4">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-15 font-bold text-ink">
                      {c.name}
                    </span>
                    <span className="mt-0.5">
                      <Chip tone="neutral" size="xs">
                        {campanas.canal[c.channel]}
                      </Chip>
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-13 text-ink lg:block">
                    <span className="text-11 font-semibold text-muted lg:hidden">
                      {campanas.historial.columnaFecha}:
                    </span>
                    {sentAtLabel(c.sentAt)}
                  </span>
                  <span className="flex items-center gap-2 text-13 text-ink lg:block">
                    <span className="text-11 font-semibold text-muted lg:hidden">
                      {campanas.historial.columnaDestinatarios}:
                    </span>
                    {c.recipients}
                  </span>
                  <span className="flex items-center gap-2 lg:block">
                    {c.redeemed > 0 ? (
                      <Chip tone="success" size="sm">
                        {c.redeemed}
                      </Chip>
                    ) : (
                      <span className="text-13 text-muted">—</span>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </AppShell>
  );
}
