import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Arkitekturgränser för src/lib/format (WP-04, §4):
 * rena funktioner, inga UI-/serverimporter, Zod bara i schemas.ts,
 * ingen dold klocka och inga lokala Date-metoder.
 */
const formatDir = path.dirname(fileURLToPath(import.meta.url));

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectTsFiles(full));
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const allFiles = collectTsFiles(formatDir);
const sourceFiles = allFiles.filter((f) => !/\.test\.tsx?$/.test(f));

function rel(file: string): string {
  return path.relative(formatDir, file);
}

/** Tar bort kommentarer så att dokumentation kan nämna förbjudna mönster. */
function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

function importSpecifiers(code: string): string[] {
  const specs: string[] = [];
  const re =
    /(?:import|export)\s[^"';]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']/g;
  for (const m of code.matchAll(re)) {
    const spec = m[1] ?? m[2] ?? m[3];
    if (spec) specs.push(spec);
  }
  return specs;
}

describe("src/lib/format gränser", () => {
  it("hittar källfilerna", () => {
    expect(sourceFiles.map(rel)).toContain("result.ts");
  });

  it("importerar inte react, next, @/server, @/components, @/app eller node:*", () => {
    const forbidden = [
      /^react(\/|$)/,
      /^react-dom(\/|$)/,
      /^next(\/|$)/,
      /^@\/server(\/|$)/,
      /^@\/components(\/|$)/,
      /^@\/app(\/|$)/,
      /^node:/,
    ];
    const offenders: string[] = [];
    for (const file of sourceFiles) {
      for (const spec of importSpecifiers(fs.readFileSync(file, "utf8"))) {
        if (forbidden.some((re) => re.test(spec)))
          offenders.push(`${rel(file)}: ${spec}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("zod importeras bara i schemas.ts", () => {
    const offenders = allFiles
      .filter((f) => rel(f) !== "schemas.ts" && rel(f) !== "schemas.test.ts")
      .filter((f) =>
        importSpecifiers(fs.readFileSync(f, "utf8")).some(
          (s) => s === "zod" || s.startsWith("zod/"),
        ),
      )
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it("har ingen dold klocka, inga lokala Date-metoder, ingen toLocale* och ingen Intl.NumberFormat", () => {
    const patterns: [string, RegExp][] = [
      ["Date.now(", /\bDate\.now\s*\(/],
      ["new Date() utan argument", /\bnew\s+Date\s*\(\s*\)/],
      ["new Date utan parentes", /\bnew\s+Date\b(?!\s*\()/],
      [
        "lokal get-metod",
        /\.get(?:FullYear|Month|Date|Day|Hours|Minutes|Seconds|Milliseconds|Year|TimezoneOffset)\s*\(/,
      ],
      [
        "lokal set-metod",
        /\.set(?:FullYear|Month|Date|Hours|Minutes|Seconds|Milliseconds|Year)\s*\(/,
      ],
      ["toLocale*", /\btoLocale\w*\s*\(/],
      ["Intl.NumberFormat", /\bIntl\.NumberFormat\b/],
      ["Date.parse", /\bDate\.parse\s*\(/],
    ];
    const offenders: string[] = [];
    for (const file of sourceFiles) {
      const code = stripComments(fs.readFileSync(file, "utf8"));
      for (const [name, re] of patterns) {
        if (re.test(code)) offenders.push(`${rel(file)}: ${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("har inget barrel-index", () => {
    expect(allFiles.map(rel)).not.toContain("index.ts");
  });
});
