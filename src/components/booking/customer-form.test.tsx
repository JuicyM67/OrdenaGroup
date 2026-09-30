import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { errores, formulario, reserva } from "@/i18n";
import type { LocalDate } from "@/lib/format/dates";
import type { BookingQuestionDef } from "@/lib/validation/booking-questions";

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
    autoConfirmBookings: true,
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
function Harness({
  data: pageData = data,
  onSubmitBooking = vi.fn(),
}: {
  data?: BookingPageData;
  onSubmitBooking?: (input: unknown) => void;
}) {
  const [contact, setContact] = useState<CustomerContact>(NO_CONTACT);
  return (
    <>
      <CustomerForm
        formId="f"
        data={pageData}
        selection={selection}
        day={day}
        submitting={false}
        serverErrorCode={null}
        contact={contact}
        onContactChange={(patch) => {
          setContact((prev) => ({ ...prev, ...patch }));
        }}
        onBack={vi.fn()}
        onSubmitBooking={onSubmitBooking}
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

function renderForm(props?: {
  data?: BookingPageData;
  onSubmitBooking?: (input: unknown) => void;
}) {
  return render(<Harness {...props} />);
}

async function fillContact(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText(reserva.clienteForm.nombreLabel),
    "Ana",
  );
  await user.type(
    screen.getByLabelText(reserva.clienteForm.telefonoLabel),
    "+56 9 1234 5678",
  );
  await user.type(
    screen.getByLabelText(reserva.clienteForm.emailLabel),
    "ana@ejemplo.cl",
  );
  const [terms] = screen.getAllByRole("checkbox");
  await user.click(terms!);
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

// WP-40 (D-031): dynamiska bokningsfrågor.
const REQUIRED_QUESTION: BookingQuestionDef = {
  id: "hairlength",
  label: "Hårlängd",
  help: null,
  kind: "single_choice",
  options: ["Corto", "Mediano", "Largo"],
  required: true,
  saveToCustomer: false,
};

const dataWithQuestion: BookingPageData = {
  ...data,
  questionsByService: { c: [REQUIRED_QUESTION] },
};

describe("CustomerForm — preguntas dinámicas (WP-40)", () => {
  it("renderiza la pregunta de la tjänst seleccionada", () => {
    renderForm({ data: dataWithQuestion });
    expect(screen.getByText("Hårlängd *")).toBeInTheDocument();
  });

  it("una pregunta obligatoria sin responder bloquea el envío", async () => {
    const user = userEvent.setup();
    const onSubmitBooking = vi.fn();
    renderForm({ data: dataWithQuestion, onSubmitBooking });
    await fillContact(user);
    await user.click(
      screen.getByRole("button", {
        name: reserva.antesDeConfirmar.ctaConfirmar,
      }),
    );

    expect(
      screen.getByText(formulario.errores.respuesta.required),
    ).toBeInTheDocument();
    expect(onSubmitBooking).not.toHaveBeenCalled();
  });

  it("al responder la pregunta y enviar, `answers` llega en el payload", async () => {
    const user = userEvent.setup();
    const onSubmitBooking = vi.fn();
    renderForm({ data: dataWithQuestion, onSubmitBooking });
    await fillContact(user);
    await user.click(screen.getByRole("button", { name: "Corto" }));
    await user.click(
      screen.getByRole("button", {
        name: reserva.antesDeConfirmar.ctaConfirmar,
      }),
    );

    expect(onSubmitBooking).toHaveBeenCalledTimes(1);
    const input = onSubmitBooking.mock.calls[0]![0] as {
      answers: Record<string, unknown>;
    };
    expect(input.answers).toEqual({ hairlength: "Corto" });
  });
});
