import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UpgradeNotice } from "@/components/plans/upgrade-notice";
import { brand } from "@/config/brand";
import { planes } from "@/i18n";

import { PlanSection, type PlanSectionData } from "./plan-section";

// WP-80 (D-061): "Facturación manual" döljer planköp/uppgradering.
const base: PlanSectionData = {
  plan: "free",
  staff: { used: 1, limit: 1 },
  services: { used: 1, limit: 3 },
};

describe("PlanSection · billingMode", () => {
  it("app: visar Cambiar plan", () => {
    render(<PlanSection data={base} />);
    expect(
      screen.getByRole("link", { name: planes.ajustes.cambiarPlan }),
    ).toBeTruthy();
  });

  it("manual: ingen Cambiar plan, bara texten + Contáctanos", () => {
    render(<PlanSection data={{ ...base, billingMode: "manual" }} />);
    expect(
      screen.queryByRole("link", { name: planes.ajustes.cambiarPlan }),
    ).toBeNull();
    expect(
      screen.getByText(planes.ajustes.administrado({ marca: brand.name })),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: planes.ajustes.contacto }),
    ).toBeTruthy();
  });
});

describe("UpgradeNotice · manualBilling", () => {
  it("manual: ingen Ver planes", () => {
    render(<UpgradeNotice feature="flash" manualBilling />);
    expect(
      screen.queryByRole("link", { name: planes.bloqueo.verPlanes }),
    ).toBeNull();
    expect(
      screen.getByRole("link", { name: planes.ajustes.contacto }),
    ).toBeTruthy();
  });
});
