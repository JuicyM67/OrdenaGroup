"use client";

// Pestaña "Servicios" (WP-55): `ServicesSection` + `CategorySection` comparten el mismo
// `BookingFormBundle` (categorías y preguntas) y el mismo `reload()` — antes vivían juntas
// en `ajustes-screen.tsx`, ahora en su propia ruta (`/app/ajustes/servicios`), así que
// necesitan su propio límite de estado de cliente (la pestaña "Formulario de reserva",
// `formulario-tab.tsx`, tiene el suyo).
import { useCallback, useState } from "react";

import type {
  BookingFormActions,
  BookingFormBundle,
} from "./booking-form-types";
import { CategorySection } from "./category-section";
import { ServicesSection } from "./services-section";
import type { AjustesActions, AjustesService } from "./types";

export function ServiciosTab({
  services,
  actions,
  bookingForm: initialBookingForm,
  bookingFormActions,
  loadBookingFormBundle,
}: {
  services: AjustesService[];
  actions: {
    create: AjustesActions["createService"];
    update: AjustesActions["updateService"];
    setActive: AjustesActions["setServiceActive"];
  };
  bookingForm: BookingFormBundle;
  bookingFormActions: BookingFormActions;
  loadBookingFormBundle: () => Promise<BookingFormBundle | null>;
}) {
  const [bookingForm, setBookingForm] = useState(initialBookingForm);

  const reload = useCallback(async () => {
    const next = await loadBookingFormBundle();
    if (next) setBookingForm(next);
  }, [loadBookingFormBundle]);

  return (
    <>
      <ServicesSection
        services={services}
        actions={actions}
        bookingForm={{
          settings: bookingForm.settings,
          businessCategory: bookingForm.businessCategory,
          actions: bookingFormActions,
          onReload: reload,
        }}
      />

      <CategorySection
        categories={bookingForm.settings.categories}
        services={bookingForm.settings.services}
        actions={bookingFormActions}
        onReload={reload}
      />
    </>
  );
}
