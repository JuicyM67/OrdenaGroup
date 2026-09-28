"use client";

// Pantalla /app/ajustes (WP-15b slim): compone las cuatro secciones dentro del AppShell
// compartido (DESIGN.md §7, igual que Inicio). Sin referencia *.dc.html (no hay pantalla de
// diseño para Ajustes todavía) y sin `npm run visual` para esta pantalla — ver el reporte.
import { useState } from "react";

import { AppShell } from "@/components/dashboard/app-shell";
import { MainNav } from "@/components/dashboard/main-nav";
import { PageHeader } from "@/components/ui/page-header";
import { TuLinkCard } from "@/components/shared/tu-link-card";
import { nav } from "@/i18n";

import { BusinessSection } from "./business-section";
import { HoursSection } from "./hours-section";
import { ServicesSection } from "./services-section";
import { StaffSection } from "./staff-section";
import type { AjustesActions, AjustesBusiness, AjustesData } from "./types";

export type AjustesScreenProps = {
  data: AjustesData;
  actions: AjustesActions;
};

export function AjustesScreen({ data, actions }: AjustesScreenProps) {
  const [business, setBusiness] = useState<AjustesBusiness>(data.business);

  return (
    <AppShell rail={<MainNav active="ajustes" />}>
      <PageHeader variant="desktop" title={nav.ajustes} />

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-2">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <BusinessSection
            business={business}
            onSaved={setBusiness}
            action={actions.updateBusinessSettings}
          />

          <TuLinkCard slug={business.slug} businessName={business.name} />

          <ServicesSection
            services={data.services}
            actions={{
              create: actions.createService,
              update: actions.updateService,
              setActive: actions.setServiceActive,
            }}
          />

          <StaffSection
            staff={data.staff}
            services={data.services}
            actions={{
              create: actions.createStaff,
              update: actions.updateStaff,
              setActive: actions.setStaffActive,
            }}
          />

          <HoursSection hours={data.hours} action={actions.updateHours} />
        </div>
      </div>
    </AppShell>
  );
}
