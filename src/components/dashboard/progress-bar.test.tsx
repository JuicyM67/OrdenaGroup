import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgressBar } from "./progress-bar";

describe("ProgressBar", () => {
  it('value=0.6 → width="60%" en el rect de relleno, sin `style`', () => {
    const { container } = render(<ProgressBar value={0.6} />);
    const rects = container.querySelectorAll("rect");
    expect(rects).toHaveLength(2);
    expect(rects[1]).toHaveAttribute("width", "60%");
    expect(rects[0]).toHaveAttribute("width", "100%");
    for (const rect of rects) {
      expect(rect).not.toHaveAttribute("style");
    }
  });

  it("el svg completo es aria-hidden (el número ya está en el texto meta)", () => {
    const { container } = render(<ProgressBar value={0.5} />);
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("valores fuera de rango se acotan a 0–100 %", () => {
    const { container: over } = render(<ProgressBar value={1.4} />);
    expect(over.querySelectorAll("rect")[1]).toHaveAttribute("width", "100%");

    const { container: under } = render(<ProgressBar value={-0.2} />);
    expect(under.querySelectorAll("rect")[1]).toHaveAttribute("width", "0%");
  });
});
