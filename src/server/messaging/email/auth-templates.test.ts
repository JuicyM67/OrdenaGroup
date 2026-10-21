import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { renderEmail } from "./render";

/**
 * Verifierar att `supabase/templates/es-CL/*.html` och `subjects.json` inte
 * har glidit isär från `email.acceso.*` (i18n) — `scripts/render-auth-templates.ts`
 * genererar dem, men det är ett manuellt steg (kräver
 * `NODE_OPTIONS="--conditions=react-server"`), lätt att glömma efter en
 * textändring. (`supabase/templates/sv-SE/` ligger kvar orörd från tiden med
 * två marknader, D-062; den används inte av `config.toml`.)
 */
const ROOT = path.resolve(process.cwd(), "supabase", "templates");

function read(...parts: string[]): string {
  return fs.readFileSync(path.join(ROOT, ...parts), "utf8");
}

describe("supabase/templates/es-CL: en av config.toml (regenererad av render-auth-templates.ts)", () => {
  it('magic_link.html matchar renderEmail("magicLink", …)', () => {
    const expected = renderEmail("magicLink", {
      confirmUrl:
        "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink",
      token: "{{ .Token }}",
    });
    expect(read("es-CL", "magic_link.html")).toBe(expected.html);
  });

  it('confirmation.html matchar renderEmail("confirmation", …)', () => {
    const expected = renderEmail("confirmation", {
      confirmUrl:
        "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup",
      token: "{{ .Token }}",
    });
    expect(read("es-CL", "confirmation.html")).toBe(expected.html);
  });

  it("subjects.json matchar los asuntos reales", () => {
    const subjects = JSON.parse(read("es-CL", "subjects.json")) as {
      magic_link: string;
      confirmation: string;
    };
    expect(subjects.magic_link).toBe(
      renderEmail("magicLink", { confirmUrl: "x", token: "y" }).subject,
    );
    expect(subjects.confirmation).toBe(
      renderEmail("confirmation", { confirmUrl: "x", token: "y" }).subject,
    );
  });

  it("supabase/config.toml pekar på es-CL-mapen", () => {
    const toml = fs.readFileSync(
      path.resolve(process.cwd(), "supabase", "config.toml"),
      "utf8",
    );
    expect(toml).toContain("./supabase/templates/es-CL/magic_link.html");
    expect(toml).toContain("./supabase/templates/es-CL/confirmation.html");
  });
});
