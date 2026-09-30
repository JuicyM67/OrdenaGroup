"use client";

// Pestaña "Formulario de reserva" (WP-55): `BookingFormSection` en su propia ruta
// (`/app/ajustes/formulario`), con su propio `BookingFormBundle`/`reload()` — antes
// compartía el estado con "Servicios" en `ajustes-screen.tsx` (ver `servicios-tab.tsx`).
import { useCallback, useState } from "react";

import { BookingFormSection } from "./booking-form-section";
import type { BookingFormActions, BookingFormBundle } from "./booking-form-types";

export function FormularioTab({
  bookingForm: initialBookingForm,
  actions,
  loadBookingFormBundle,
}: {
  bookingForm: BookingFormBundle;
  actions: BookingFormActions;
  loadBookingFormBundle: () => Promise<BookingFormBundle | null>;
}) {
  const [bookingForm, setBookingForm] = useState(initialBookingForm);

  const reload = useCallback(async () => {
    const next = await loadBookingFormBundle();
    if (next) setBookingForm(next);
  }, [loadBookingFormBundle]);

  return (
    <BookingFormSection
      settings={bookingForm.settings}
      businessCategory={bookingForm.businessCategory}
      actions={actions}
      onReload={reload}
    />
  );
}
