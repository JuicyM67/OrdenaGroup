import { LayoutGrid } from "lucide-react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MobileTabBar, type MobileTabItem } from "./mobile-tab-bar";

const items: MobileTabItem[] = [
  {
    key: "hoy",
    href: "/app/hoy",
    label: "Hoy",
    icon: <LayoutGrid aria-hidden="true" />,
  },
  { key: "agenda", href: "/app/agenda", label: "Agenda", icon: <span /> },
  { key: "clientes", href: "/app/clientes", label: "Clientes", icon: <span /> },
  { key: "caja", href: "/app/caja", label: "Caja", icon: <span /> },
];

describe("MobileTabBar", () => {
  it("bara Hoy har aria-current=page", () => {
    render(<MobileTabBar items={items} active="hoy" />);
    const hoy = screen.getByRole("link", { name: "Hoy" });
    expect(hoy).toHaveAttribute("aria-current", "page");
    for (const label of ["Agenda", "Clientes", "Caja"]) {
      expect(screen.getByRole("link", { name: label })).not.toHaveAttribute(
        "aria-current",
      );
    }
  });

  it("de fyra länkarna har tillgängliga namn", () => {
    render(<MobileTabBar items={items} active="hoy" />);
    expect(screen.getAllByRole("link")).toHaveLength(4);
    for (const label of ["Hoy", "Agenda", "Clientes", "Caja"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("hrefen kommer från items", () => {
    render(<MobileTabBar items={items} active="agenda" />);
    expect(screen.getByRole("link", { name: "Agenda" })).toHaveAttribute(
      "href",
      "/app/agenda",
    );
  });
});
