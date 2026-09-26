// ESLint läser inte CSS, så den här testet är CSS-motsvarigheten till
// no-restricted-syntax i eslint.config.mjs (hård regel 1, D-015).
// Alla src/**/*.css utom tokens.css själv ska bara använda tokens, aldrig hex eller rgb().
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const currentFile = fileURLToPath(import.meta.url);
const srcRoot = path.resolve(path.dirname(currentFile), "..");
const tokensFile = path.resolve(path.dirname(currentFile), "tokens.css");

function collectCssFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectCssFiles(fullPath));
    } else if (entry.name.endsWith(".css")) {
      files.push(fullPath);
    }
  }
  return files;
}

const hexPattern = /#[0-9a-fA-F]{3,8}\b/;
const colorFnPattern = /\b(rgba?|hsla?|oklch|oklab)\(/;

describe("no-raw-values (hård regel 1)", () => {
  const files = collectCssFiles(srcRoot).filter((f) => f !== tokensFile);

  it("hittar minst en css-fil att kontrollera (globals.css)", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((f) => [path.relative(srcRoot, f), f] as const))(
    "%s innehåller inga hex-värden eller färgfunktioner",
    (_relative, file) => {
      const content = fs.readFileSync(file, "utf8");
      expect(hexPattern.test(content)).toBe(false);
      expect(colorFnPattern.test(content)).toBe(false);
    },
  );
});
