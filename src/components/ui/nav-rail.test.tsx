import { render, screen } from "@testing-library/react";
import { LayoutGrid, Calendar } from "lucide-react";
import { describe, expect, it } from "vitest";

import { NavRail, NavRailLink, NavRailLogo } from "./nav-rail";

describe("NavRail", () => {
  it("bara den aktiva länken har aria-current=page, och alla länkar har ett tillgängligt namn", () => {
    render(
      <NavRail variant="bare" aria-label="Principal">
        <NavRailLogo label="Ir al inicio" href="/" />
        <NavRailLink
          href="/inicio"
          label="Inicio"
          icon={<LayoutGrid aria-hidden="true" />}
          active
        />
        <NavRailLink
          href="/agenda"
          label="Agenda"
          icon={<Calendar aria-hidden="true" />}
        />
      </NavRail>,
    );

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3); // logo + 2 navlänkar
    for (const link of links) {
      expect(link).toHaveAccessibleName();
    }

    const active = links.filter(
      (l) => l.getAttribute("aria-current") === "page",
    );
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveAccessibleName("Inicio");
  });
});
