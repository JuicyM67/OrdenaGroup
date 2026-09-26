import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Arkitekturgränser för src/lib/format (WP-04, §4):
 * rena funktioner, inga UI-/serverimporter, Zod bara i schemas.ts,
 * ingen dold klocka och inga lokala Date-metoder. D-018: date-fns och
 * date-fns-tz används inte någonstans i src/.
 */
const formatDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(formatDir, "../..");
const repoRoot = path.resolve(srcDir, "..");

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
    /(?:import|export)\s[^"';]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']|require\s*\(\s*["']([^"']+)["']\s*\)/g;
  for (const m of code.matchAll(re)) {
    const spec = m[1] ?? m[2] ?? m[3] ?? m[4];
    if (spec) specs.push(spec);
  }
  return specs;
}

/** Argumenttexten i varje `Intl.DateTimeFormat(...)`-anrop (balanserade parenteser). */
function dateTimeFormatCallArgs(code: string): string[] {
  const out: string[] = [];
  for (const m of code.matchAll(/\bIntl\.DateTimeFormat\s*\(/g)) {
    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;
    while (i < code.length && depth > 0) {
      if (code[i] === "(") depth++;
      else if (code[i] === ")") depth--;
      i++;
    }
    out.push(code.slice(start, i - 1));
  }
  return out;
}

const DATE_FNS = /^date-fns(?:-tz)?(?:\/|$)/;

const clockPatterns: [string, RegExp][] = [
  ["Date.now(", /\bDate\.now\s*\(/],
  ["new Date() utan argument", /\bnew\s+Date\s*\(\s*\)/],
  ["new Date utan parentes", /\bnew\s+Date\b(?!\s*\()/],
  ["Date() utan new", /(?<![\w$.])(?<!\bnew\s+)Date\s*\(/],
  ["new Date med strängargument", /\bnew\s+Date\s*\(\s*["'`]/],
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

function clockOffenders(code: string): string[] {
  const stripped = stripComments(code);
  const found = clockPatterns
    .filter(([, re]) => re.test(stripped))
    .map(([name]) => name);
  if (dateTimeFormatCallArgs(stripped).some((a) => !/\btimeZone\b/.test(a))) {
    found.push("Intl.DateTimeFormat utan timeZone");
  }
  return found;
}

describe("detektorerna själva", () => {
  it.each([
    ["const d = Date();", "Date() utan new"],
    ["const s = Date ( );", "Date() utan new"],
    ['const d = new Date("2026-10-02T14:30");', "new Date med strängargument"],
    ["const d = new Date(`2026-10-02`);", "new Date med strängargument"],
    ["const d = new Date();", "new Date() utan argument"],
    ["const n = Date.now();", "Date.now("],
    [
      'new Intl.DateTimeFormat("es-CL", { hour: "2-digit" });',
      "Intl.DateTimeFormat utan timeZone",
    ],
    ["Intl.DateTimeFormat();", "Intl.DateTimeFormat utan timeZone"],
    [
      'Intl.DateTimeFormat("es-CL", opts(f(1)));',
      "Intl.DateTimeFormat utan timeZone",
    ],
  ])("%j fångas (%s)", (code, name) => {
    expect(clockOffenders(code)).toContain(name);
  });

  it.each([
    "const d = new Date(ms);",
    "const d = new Date(0);",
    "const ms = Date.UTC(2026, 0, 1);",
    "parseLocalDate(s); toLocalDate(x, tz); formatLocalDate(d, p);",
    "function f(instant: Date): Date { return instant; }",
    'new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit" });',
    '// Date() och new Date("x") i en kommentar',
  ])("%j godtas", (code) => {
    expect(clockOffenders(code)).toEqual([]);
  });

  it.each([
    ['import { format } from "date-fns";', "date-fns"],
    ['import { formatInTimeZone } from "date-fns-tz";', "date-fns-tz"],
    ['import { addDays } from "date-fns/addDays";', "date-fns/addDays"],
    ['const tz = await import("date-fns-tz");', "date-fns-tz"],
    ['const x = require("date-fns");', "date-fns"],
  ])("%j fångas som date-fns-import", (code, spec) => {
    expect(importSpecifiers(code).filter((s) => DATE_FNS.test(s))).toEqual([
      spec,
    ]);
  });
});

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

  it("har ingen dold klocka, inga lokala Date-metoder, ingen strängparsning av Date, ingen toLocale*, ingen Intl.NumberFormat och ingen Intl.DateTimeFormat utan timeZone", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles) {
      for (const name of clockOffenders(fs.readFileSync(file, "utf8"))) {
        offenders.push(`${rel(file)}: ${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("D-018: ingen fil i src/ importerar date-fns eller date-fns-tz", () => {
    const offenders: string[] = [];
    // Den här filen innehåller exempel för detektorerna och hoppas över.
    const self = fileURLToPath(import.meta.url);
    for (const file of collectTsFiles(srcDir).filter((f) => f !== self)) {
      for (const spec of importSpecifiers(fs.readFileSync(file, "utf8"))) {
        if (DATE_FNS.test(spec))
          offenders.push(`${path.relative(srcDir, file)}: ${spec}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("D-018: date-fns och date-fns-tz är inte beroenden", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"),
    ) as Record<string, Record<string, string> | undefined>;
    const deps = [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
    ].flatMap((k) => Object.keys(pkg[k] ?? {}));
    expect(deps.filter((d) => DATE_FNS.test(d))).toEqual([]);
  });

  it("har inget barrel-index", () => {
    expect(allFiles.map(rel)).not.toContain("index.ts");
  });
});
