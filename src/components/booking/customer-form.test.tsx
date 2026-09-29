import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { errores, reserva } from "@/i18n";
import type { LocalDate } from "@/lib/format/dates";

import { CustomerForm } from "./customer-form";
import type { BookingSelection } from "./flow-state";
import type {
  BookingPageData,
  CustomerContact,
  DayAvailability,
} from "./types";

const d = (s: string) => s as LocalDate;

const day: DayAvailability = {
  date: d("2026-10-02"),
  state: "open",
  hasFlash: false,
  slots: [
    { id: "slot-1000", start: "2026-10-02T13:00:00.000Z", priceClp: 12000 },
  ],
};

const data: BookingPageData = {
  now: "2026-10-02T09:00:00-03:00",
  business: {
    slug: "barberia-norte",
    name: "Barbería Norte",
    comuna: "Providencia",
    city: "Santiago",
    weekdaysOpen: [1, 2, 3, 4, 5, 6],
    open: "10:00" as never,
    close: "19:00" as never,
    cancelWindowHours: 4,
    status: "active",
  },
  services: [
    {
      id: "c",
      name: "Corte clásico",
      durationMin: 35,
      priceClp: 12000,
      tint: "lilac",
    },
  ],
  staff: [{ id: "diego", name: "Diego" }],
  availability: { c: { any: [day] } },
};

const selection: BookingSelection = {
  serviceId: "c",
  staffId: "any",
  date: day.date,
  slotId: "slot-1000",
};

const NO_CONTACT: CustomerContact = { name: "", phone: "", email: "" };

/** Håller `contact`-state precis som `BookingScreen` gör (qa-granskning,
 * item 9: namn/telefon/e-post ägs inte längre av CustomerForm själv). */
function Harness() {
  const [contact, setContact] = useState<CustomerContact>(NO_CONTACT);
  return (
    <>
      <CustomerForm
        formId="f"
        data={data}
        selection={selection}
        day={day}
        submitting={false}
        serverErrorCode={null}
        contact={contact}
        onContactChange={(patch) => {
          setContact((prev) => ({ ...prev, ...patch }));
        }}
        onBack={vi.fn()}
        onSubmitBooking={vi.fn()}
        onSubmitWaitlist={vi.fn()}
      />
      {/* BookingBar renderar CTA:n utanför formuläret, kopplad via form= (planens
       * steg 5). Testet härmar det utan att importera hela BookingBar. */}
      <button type="submit" form="f">
        {reserva.antesDeConfirmar.ctaConfirmar}
      </button>
    </>
  );
}

function renderForm() {
  return render(<Harness />);
}

describe("CustomerForm — samtycken", () => {
  it("båda rutorna är checked === false vid första renderingen", () => {
    renderForm();
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(2);
    for (const box of boxes) expect(box).not.toBeChecked();
  });

  it("checked === false även efter att man gått tillbaka och fram igen (ny mount)", () => {
    const { unmount } = renderForm();
    unmount();
    renderForm();
    for (const box of screen.getAllByRole("checkbox")) {
      expect(box).not.toBeChecked();
    }
  });

  it("submit utan villkor visar felet och flyttar fokus till rutan", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(
      screen.getByLabelText(reserva.clienteForm.nombreLabel),
      "Ana",
    );
    await user.type(
      screen.getByLabelText(reserva.clienteForm.telefonoLabel),
      "+56 9 1234 5678",
    );
    // D-030: e-post obligatorisk i CL (installationens marknad i testmiljön,
    // se `client-validation.test.ts`) — annars stannar fokus på e-postfältet
    // i stället för villkorsrutan, som testet gäller.
    await user.type(
      screen.getByLabelText(reserva.clienteForm.emailLabel),
      "ana@ejemplo.cl",
    );
    await user.click(
      screen.getByRole("button", {
        name: reserva.antesDeConfirmar.ctaConfirmar,
      }),
    );

    expect(
      screen.getByText(errores.reserva.consentimientoRequerido),
    ).toBeInTheDocument();
    const [terms] = screen.getAllByRole("checkbox");
    expect(terms).toHaveFocus();
  });
});
