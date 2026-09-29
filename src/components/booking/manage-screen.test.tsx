import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { comun, gestion } from "@/i18n";

import { ManageScreen } from "./manage-screen";
import type { ManageCancelResult, ManagedBooking } from "./manage-view";

// 2026-10-06 10:00–10:35 America/Santiago (verano, -03:00).
const START = "2026-10-06T13:00:00.000Z";
const END = "2026-10-06T13:35:00.000Z";
const NOW_BEFORE = "2026-10-01T12:00:00.000Z";

function booking(overrides: Partial<ManagedBooking> = {}): ManagedBooking {
  return {
    businessId: "b0000000-0000-4000-8000-000000000001",
    bookingId: "b0000000-0000-4000-8000-0000000000aa",
    business: {
      name: "Barbería Norte",
      slug: "barberia-norte",
      phone: "+56223456789",
      address: "Av. Providencia 1234",
      comuna: "Providencia",
      timezone: "America/Santiago",
    },
    serviceName: "Corte clásico",
    staffName: "Diego",
    start: START,
    end: END,
    priceClp: 12000,
    status: "confirmed",
    cancelWindowHours: 3,
    canCancel: true,
    ...overrides,
  };
}

describe("ManageScreen — bokningskortet", () => {
  it("visar tjänst, dag, tid, profesional, adress och pris", () => {
    render(
      <ManageScreen
        booking={booking()}
        now={NOW_BEFORE}
        onCancel={async () => ({ ok: true }) as ManageCancelResult}
      />,
    );
    expect(screen.getByText("Corte clásico")).toBeInTheDocument();
    expect(screen.getByText("Diego")).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument();
    expect(screen.getByText("Av. Providencia 1234")).toBeInTheDocument();
    expect(screen.getByText("$12.000")).toBeInTheDocument();
    expect(screen.getByText("Barbería Norte")).toBeInTheDocument();
  });
});

describe("ManageScreen — avboka (dentro del plazo)", () => {
  it("öppnar dialogen, bekräftar och visar cancelacionConfirmada + länken", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn(
      async (): Promise<ManageCancelResult> => ({ ok: true }),
    );
    render(
      <ManageScreen booking={booking()} now={NOW_BEFORE} onCancel={onCancel} />,
    );

    await user.click(
      screen.getByRole("button", { name: gestion.ctaCancelarReserva }),
    );
    expect(
      screen.getByRole("heading", { name: gestion.confirmarCancelacion.titulo }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: gestion.confirmarCancelacion.ctaSi }),
    );

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(gestion.cancelacionConfirmada)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: gestion.ctaReservarOtraHora }),
    ).toHaveAttribute("href", "/barberia-norte");
  });

  it("'No, mantener' stänger dialogen utan att anropa onCancel", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn(
      async (): Promise<ManageCancelResult> => ({ ok: true }),
    );
    render(
      <ManageScreen booking={booking()} now={NOW_BEFORE} onCancel={onCancel} />,
    );

    await user.click(
      screen.getByRole("button", { name: gestion.ctaCancelarReserva }),
    );
    await user.click(
      screen.getByRole("button", { name: gestion.confirmarCancelacion.ctaNo }),
    );

    expect(onCancel).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("heading", {
        name: gestion.confirmarCancelacion.titulo,
      }),
    ).not.toBeInTheDocument();
  });

  it("ett serverfel visar comun.algoSalioMal i stället för att krascha", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn(
      async (): Promise<ManageCancelResult> => ({
        ok: false,
        code: "outside_cancel_window",
      }),
    );
    render(
      <ManageScreen booking={booking()} now={NOW_BEFORE} onCancel={onCancel} />,
    );

    await user.click(
      screen.getByRole("button", { name: gestion.ctaCancelarReserva }),
    );
    await user.click(
      screen.getByRole("button", { name: gestion.confirmarCancelacion.ctaSi }),
    );

    expect(await screen.findByText(comun.algoSalioMal)).toBeInTheDocument();
    expect(
      screen.queryByText(gestion.cancelacionConfirmada),
    ).not.toBeInTheDocument();
  });
});

describe("ManageScreen — dödlägen", () => {
  it("redan avbokad: yaCancelada + ctaReservarOtraHora, ingen avboka-knapp", () => {
    render(
      <ManageScreen
        booking={booking({ status: "cancelled", canCancel: false })}
        now={NOW_BEFORE}
        onCancel={async () => ({ ok: true }) as ManageCancelResult}
      />,
    );
    expect(screen.getByText(gestion.yaCancelada)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: gestion.ctaReservarOtraHora }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: gestion.ctaCancelarReserva }),
    ).not.toBeInTheDocument();
  });

  it("redan avbokad efter en lyckad avbokning visar cancelacionConfirmada, inte yaCancelada", async () => {
    const user = userEvent.setup();
    render(
      <ManageScreen
        booking={booking()}
        now={NOW_BEFORE}
        onCancel={async () => ({ ok: true }) as ManageCancelResult}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: gestion.ctaCancelarReserva }),
    );
    await user.click(
      screen.getByRole("button", { name: gestion.confirmarCancelacion.ctaSi }),
    );
    expect(await screen.findByText(gestion.cancelacionConfirmada)).toBeInTheDocument();
    expect(screen.queryByText(gestion.yaCancelada)).not.toBeInTheDocument();
  });

  it("redan passerad: yaPaso + ctaReservarOtraHora, ingen avboka-knapp", () => {
    render(
      <ManageScreen
        booking={booking({ canCancel: false })}
        now={END}
        onCancel={async () => ({ ok: true }) as ManageCancelResult}
      />,
    );
    expect(screen.getByText(gestion.yaPaso)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: gestion.ctaReservarOtraHora }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: gestion.ctaCancelarReserva }),
    ).not.toBeInTheDocument();
  });

  it("utanför fönstret men fortfarande i framtiden: fueraDePlazo med telefonen, ingen avboka-knapp", () => {
    render(
      <ManageScreen
        booking={booking({ canCancel: false })}
        now="2026-10-06T11:00:00.000Z"
        onCancel={async () => ({ ok: true }) as ManageCancelResult}
      />,
    );
    expect(
      screen.getByText(
        gestion.fueraDePlazo({ horas: 3, telefonoNegocio: "+56223456789" }),
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: gestion.ctaCancelarReserva }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: gestion.ctaReservarOtraHora }),
    ).not.toBeInTheDocument();
  });
});
