import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { emailColors } from "./colors";

const TOKENS = fs.readFileSync(
  path.resolve(process.cwd(), "src/styles/tokens.css"),
  "utf8",
);

/** `--color-<token>: <hex>;` → hex, skiftlägesokänsligt. */
function tokenValue(name: string): string | undefined {
  const m = new RegExp(`--color-${name}:\\s*(#[0-9A-Fa-f]{3,8})`).exec(TOKENS);
  return m?.[1]?.toUpperCase();
}

// Mejlets namn → tokens.css-namnet (kebab-case efter `--color-`).
const TOKEN_NAMES: Record<keyof typeof emailColors, string> = {
  ink: "ink",
  dark: "dark",
  darkLine: "dark-line",
  canvas: "canvas",
  surface: "surface",
  border: "border",
  line: "line",
  muted: "muted",
  subtle: "subtle",
  onDark: "on-dark",
  onDarkSoft: "on-dark-soft",
  onDarkMuted: "on-dark-muted",
  lime: "lime",
  onLimeSoft: "on-lime-soft",
  lilac: "lilac",
  onLilacSoft: "on-lilac-soft",
  peach: "peach",
  onPeachSoft: "on-peach-soft",
  peach50: "peach-50",
  successBg: "success-bg",
  successFg: "success-fg",
  depositBg: "deposit-bg",
  depositFg: "deposit-fg",
  alert: "alert",
};

describe("emailColors matchar src/styles/tokens.css", () => {
  it.each(Object.entries(TOKEN_NAMES))("%s == --color-%s", (key, tokenName) => {
    const expected = tokenValue(tokenName);
    expect(
      expected,
      `--color-${tokenName} finns inte i tokens.css`,
    ).toBeDefined();
    expect(emailColors[key as keyof typeof emailColors].toUpperCase()).toBe(
      expected,
    );
  });
});
