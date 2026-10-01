"use client";

// /app/flash (WP-30, F13): ägarens Horas flash — aktiva och tidigare, "Nueva hora flash".
// Ingen *.dc.html-referens (ny funktion, ingen specifik skärmbild i planen) — AppShell/
// PageHeader/Card, samma formspråk som /app/clientes/utskick.
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AppShell } from "@/components/dashboard/app-shell";
import { MainNav } from "@/components/dashboard/main-nav";
import { OwnerMobileTabBar } from "@/components/mobile/owner-tab-bar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { flash } from "@/i18n";
import type { LocalDate } from "@/lib/format/dates";

import { FlashSlotCard } from "./flash-slot-card";
import { FlashSlotDialog } from "./flash-slot-dialog";
import type {
  CancelFlashResult,
  CreateFlashResult,
  CreateFlashSlotInput,
  FlashCatalogService,
  FlashSlotView,
  FlashStaff,
  SendFlashCampaignInput,
  SendFlashCampaignResult,
} from "./types";

export type FlashScreenProps = {
  active: readonly FlashSlotView[];
  past: readonly FlashSlotView[];
  staff: readonly FlashStaff[];
  services: readonly FlashCatalogService[];
  today: LocalDate;
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
};

export function FlashScreen({
  active,
  past,
  staff,
  services,
  today,
  publicBase,
  onSend,
  smsAvailable = false,
  canViewReports,
  onLogout,
  onCreate,
  onCancel,
}: FlashScreenProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

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
    >
      <PageHeader
        variant="desktop"
        title={flash.titulo}
        actions={
          staff.length > 0 ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={() => setDialogOpen(true)}
            >
              {flash.nueva.cta}
            </Button>
          ) : null
        }
      />

      <section
        aria-label={flash.activas.titulo}
        className="flex flex-col gap-3"
      >
        <h2 className="text-16 font-bold text-ink">{flash.activas.titulo}</h2>
        {active.length === 0 ? (
          <p className="text-14 text-muted">{flash.activas.vacio}</p>
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
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        staff={staff}
        services={services}
        defaultDate={today}
        onSubmit={async (input) => {
          const result = await onCreate(input);
          if (result.ok) router.refresh();
          return result;
        }}
      />
    </AppShell>
  );
}
