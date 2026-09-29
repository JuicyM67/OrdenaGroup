import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Switch } from "./switch";

describe("Switch", () => {
  it("role=switch, aria-checked reflekterar checked, klick anropar onChange(!checked)", async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="Obligatorisk" />);
    const el = screen.getByRole("switch", { name: "Obligatorisk" });
    expect(el).toHaveAttribute("aria-checked", "false");
    await userEvent.click(el);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
