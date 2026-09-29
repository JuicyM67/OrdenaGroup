import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { renderEmail } from "./render";

/**
 * Verifierar att `supabase/templates/{es-CL,sv-SE}/*.html` och
 * `subjects.json` inte har glidit isär från `email.acceso.*` (i18n) —
 * `scripts/render-auth-templates.ts` genererar dem, men det är ett manuellt
 * steg (kräver `NODE_OPTIONS="--conditions=react-server"`), lätt att glömma
 * efter en textändring. Kör bara mot CL (den marknad testprocessen faktiskt
 * har `@/config/brand` inställd på, se `market`/`brand` i D-025) — SE-mallen
 * verifieras bara strukturellt (finns, giltig HTML), inte ord för ord: att
 * rendera SE:s riktiga `brand.name` kräver en egen process (`NEXT_PUBLIC_
 * MARKET=SE`, som `scripts/render-auth-templates.ts` självt kör).
 */
const ROOT = path.resolve(process.cwd(), "supabase", "templates");

function read(...parts: string[]): string {
  return fs.readFileSync(path.join(ROOT, ...parts), "utf8");
}

describe("supabase/templates/es-CL: en av config.toml (regenererad av render-auth-templates.ts)", () => {
  it('magic_link.html matchar renderEmail("magicLink", "CL", …)', () => {
    const expected = renderEmail("magicLink", "CL", {
      confirmUrl:
        "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink",
      token: "{{ .Token }}",
    });
    expect(read("es-CL", "magic_link.html")).toBe(expected.html);
  });

  it('confirmation.html matchar renderEmail("confirmation", "CL", …)', () => {
    const expected = renderEmail("confirmation", "CL", {
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
      renderEmail("magicLink", "CL", { confirmUrl: "x", token: "y" }).subject,
    );
    expect(subjects.confirmation).toBe(
      renderEmail("confirmation", "CL", { confirmUrl: "x", token: "y" })
        .subject,
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

describe("supabase/templates/sv-SE: existencia y forma (no el texto exacto, ver nota arriba)", () => {
  for (const file of [
    "magic_link.html",
    "confirmation.html",
    "subjects.json",
  ]) {
    it(`${file} existe`, () => {
      expect(() => read("sv-SE", file)).not.toThrow();
    });
  }

  it("magic_link.html es HTML válido con lang sv-SE", () => {
    const html = read("sv-SE", "magic_link.html");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('lang="sv-SE"');
    expect(html).toContain(
      "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=magiclink",
    );
  });
});
