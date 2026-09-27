import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Arkitekturgränser för src/server (WP-10, steg 1):
 * - scheduling/ och bookings/: ingen dold klocka, inga lokala Date-metoder
 *   (utom scheduling/clock.ts), ingen date-fns (D-018), ingen console.*.
 * - Varje icke-testfil i src/server börjar med `import "server-only"`.
 * - Ingen "use client"-fil i src/ importerar @/server/* eller pg.
 * - DATABASE_URL och SUPABASE_SERVICE_ROLE_KEY läses bara i db/pool.ts.
 * - SQL mot tenant-tabeller i all produktionskod i src/server och
 *   src/app/api filtrerar på business_id; `businesses` på business_id eller
 *   id (ARCHITECTURE princip 3, INV-4, säkerhet R6). Testkod (testing.ts,
 *   __fixtures__/) körs som postgres och undantas.
 * - Bara testkod importerar @/server/db/testing (säkerhet R5).
 */
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(serverDir, "..");
const self = fileURLToPath(import.meta.url);

function collect(dir: string, re = /\.tsx?$/): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collect(full, re));
    else if (re.test(entry.name)) out.push(full);
  }
  return out;
}

const isTest = (f: string) => /\.test\.tsx?$/.test(f);
const rel = (f: string) => path.relative(srcDir, f);
const read = (f: string) => fs.readFileSync(f, "utf8");

function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
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
  ["Date.parse", /\bDate\.parse\s*\(/],
  ["performance.now", /\bperformance\.now\s*\(/],
  ["Intl.DateTimeFormat", /\bIntl\.DateTimeFormat\b/],
];

function clockOffenders(code: string): string[] {
  const stripped = stripComments(code);
  return clockPatterns.filter(([, re]) => re.test(stripped)).map(([n]) => n);
}

const DATE_FNS = /^date-fns(?:-tz)?(?:\/|$)/;

const serverFiles = collect(serverDir).filter((f) => f !== self);
const serverSources = serverFiles.filter((f) => !isTest(f));
const engineSources = serverSources.filter((f) =>
  /^server\/(scheduling|bookings)\//.test(rel(f)),
);

// ---------------------------------------------------------------------------
// SQL och business_id
// ---------------------------------------------------------------------------

const TENANT_TABLES = [
  "bookings",
  "customers",
  "staff",
  "services",
  "staff_services",
  "business_hours",
  "staff_hours",
  "time_off",
  "businesses",
] as const;

/** Sträng- och mallitteraler som ser ut som SQL. */
function sqlStrings(code: string): string[] {
  const out: string[] = [];
  const re = /`([^`]*)`|"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'/g;
  for (const m of stripComments(code).matchAll(re)) {
    const s = m[1] ?? m[2] ?? m[3] ?? "";
    if (/\b(select|insert\s+into|update|delete\s+from)\b/i.test(s)) out.push(s);
  }
  return out;
}

function tenantTablesIn(sql: string): string[] {
  return TENANT_TABLES.filter((t) =>
    new RegExp(
      `\\b(?:from|join|into|update)\\s+(?:public\\.)?${t}\\b`,
      "i",
    ).test(sql),
  );
}

function sqlOffenders(code: string): string[] {
  return sqlStrings(code)
    .filter((s) => {
      const tables = tenantTablesIn(s);
      if (tables.length === 0 || /\bbusiness_id\b/.test(s)) return false;
      // Bara businesses: filtret är dess egen primärnyckel.
      const onlyBusinesses = tables.every((t) => t === "businesses");
      return !(onlyBusinesses && /\bid\s*=\s*\$\d/.test(s));
    })
    .map((s) => s.replace(/\s+/g, " ").trim().slice(0, 80));
}

const appApiDir = path.join(srcDir, "app", "api");
const isTestSupport = (f: string) =>
  rel(f) === "server/db/testing.ts" || /(^|\/)__fixtures__\//.test(rel(f));
/** All produktionskod som kan köra SQL: src/server och src/app/api. */
const productionSources = [
  ...serverSources,
  ...collect(appApiDir).filter((f) => !isTest(f)),
].filter((f) => !isTestSupport(f));

/** Importen pekar på db/testing (alias eller relativ sökväg). */
function importsDbTesting(file: string, spec: string): boolean {
  if (spec === "@/server/db/testing") return true;
  if (!spec.startsWith(".")) return false;
  const target = path.resolve(path.dirname(file), spec);
  return rel(target).replace(/\.ts$/, "") === "server/db/testing";
}

/** Importen pekar på en __fixtures__-modul. */
function importsFixture(file: string, spec: string): boolean {
  const resolved = spec.startsWith("@/")
    ? spec.slice(2)
    : spec.startsWith(".")
      ? rel(path.resolve(path.dirname(file), spec))
      : "";
  return /(^|\/)__fixtures__\//.test(resolved);
}

const SECRET_ENV = "(?:DATABASE_URL|SUPABASE_SERVICE_ROLE_KEY)";

/** `process.env.X`, `process.env["X"]` eller `{ X } = process.env`. */
function readsSecretEnv(code: string): boolean {
  const c = stripComments(code);
  return (
    new RegExp(`process\\.env\\s*(?:\\.|\\[\\s*["'\`])${SECRET_ENV}\\b`).test(
      c,
    ) || new RegExp(`\\b${SECRET_ENV}\\b[^;]*}\\s*=\\s*process\\.env`).test(c)
  );
}

describe("detektorerna själva", () => {
  it.each([
    "const u = process.env.DATABASE_URL;",
    'const u = process.env["SUPABASE_SERVICE_ROLE_KEY"];',
    "const { DATABASE_URL } = process.env;",
  ])("%j fångas som hemlig env", (code) => {
    expect(readsSecretEnv(code)).toBe(true);
  });

  it("omnämnande i text eller annan env godtas", () => {
    expect(readsSecretEnv('const m = "DATABASE_URL saknas";')).toBe(false);
    expect(readsSecretEnv("process.env.DATABASE_POOL_MAX")).toBe(false);
  });

  it.each([
    ["const d = new Date();", "new Date() utan argument"],
    ["const n = Date.now();", "Date.now("],
    ["x.getHours()", "lokal get-metod"],
    ["const t = performance.now();", "performance.now"],
  ])("%j fångas (%s)", (code, name) => {
    expect(clockOffenders(code)).toContain(name);
  });

  it("new Date(ms) och getTime godtas", () => {
    expect(clockOffenders("new Date(ms).getTime(); d.toISOString();")).toEqual(
      [],
    );
  });

  it("SQL utan business_id fångas, med business_id godtas", () => {
    expect(
      sqlOffenders('q.query("select * from public.bookings where id = $1")'),
    ).toHaveLength(1);
    expect(
      sqlOffenders("q.query(`update bookings set x = 1 where id = $2`)"),
    ).toHaveLength(1);
    expect(
      sqlOffenders(
        "q.query(`select * from public.bookings where business_id = $1`)",
      ),
    ).toEqual([]);
    expect(sqlOffenders('q.query("select current_user")')).toEqual([]);
    expect(
      sqlOffenders('q.query("select status from public.businesses")'),
    ).toHaveLength(1);
    expect(
      sqlOffenders(
        'q.query("select status from public.businesses b where b.id = $1")',
      ),
    ).toEqual([]);
    expect(sqlOffenders('const m = "Selecciona un servicio";')).toEqual([]);
  });
});

describe("importdetektorerna", () => {
  const f = path.join(serverDir, "bookings", "create.ts");
  it("db/testing via alias och relativ sökväg", () => {
    expect(importsDbTesting(f, "@/server/db/testing")).toBe(true);
    expect(importsDbTesting(f, "../db/testing")).toBe(true);
    expect(importsDbTesting(f, "../db/tx")).toBe(false);
  });
  it("__fixtures__ via alias och relativ sökväg", () => {
    expect(importsFixture(f, "./__fixtures__/flat")).toBe(true);
    expect(importsFixture(f, "@/server/scheduling/__fixtures__/snapshot")).toBe(
      true,
    );
    expect(importsFixture(f, "./row")).toBe(false);
  });
});

describe("src/server gränser", () => {
  it("hittar filerna", () => {
    expect(serverSources.map(rel)).toContain("server/db/pool.ts");
  });

  it('varje icke-testfil börjar med import "server-only"', () => {
    const offenders = serverSources
      .filter((f) => {
        const first = stripComments(read(f))
          .split("\n")
          .map((l) => l.trim())
          .find((l) => l !== "");
        return first !== 'import "server-only";';
      })
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it("scheduling/ och bookings/: ingen dold klocka och inga lokala Date-metoder (utom clock.ts)", () => {
    const offenders: string[] = [];
    for (const f of engineSources) {
      if (rel(f) === "server/scheduling/clock.ts") continue;
      for (const n of clockOffenders(read(f)))
        offenders.push(`${rel(f)}: ${n}`);
    }
    expect(offenders).toEqual([]);
  });

  it("ingen console.* i src/server (inga persondata i loggar)", () => {
    const offenders = serverSources
      .filter((f) => /\bconsole\s*\./.test(stripComments(read(f))))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it("D-018: ingen date-fns i src/server", () => {
    const offenders: string[] = [];
    for (const f of serverFiles) {
      for (const s of importSpecifiers(read(f))) {
        if (DATE_FNS.test(s)) offenders.push(`${rel(f)}: ${s}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('ingen "use client"-fil i src/ importerar @/server/* eller pg', () => {
    const offenders: string[] = [];
    for (const f of collect(srcDir)) {
      const code = stripComments(read(f)).trimStart();
      if (!/^["']use client["']/.test(code)) continue;
      for (const s of importSpecifiers(code)) {
        if (/^@\/server(\/|$)/.test(s) || /^pg(\/|$)/.test(s))
          offenders.push(`${rel(f)}: ${s}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("DATABASE_URL och SUPABASE_SERVICE_ROLE_KEY läses bara i server/db/pool.ts", () => {
    const offenders = collect(srcDir)
      .filter((f) => f !== self && rel(f) !== "server/db/pool.ts")
      .filter((f) => readsSecretEnv(read(f)))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it("SQL mot tenant-tabeller i all produktionskod (src/server, src/app/api) innehåller business_id", () => {
    expect(productionSources.map(rel)).toContain("server/bookings/create.ts");
    expect(productionSources.map(rel)).not.toContain("server/db/testing.ts");
    const offenders: string[] = [];
    for (const f of productionSources) {
      for (const s of sqlOffenders(read(f))) offenders.push(`${rel(f)}: ${s}`);
    }
    expect(offenders).toEqual([]);
  });

  it("bara testkod importerar @/server/db/testing", () => {
    const offenders: string[] = [];
    for (const f of collect(srcDir).filter((x) => x !== self)) {
      if (isTest(f) || isTestSupport(f)) continue;
      for (const spec of importSpecifiers(read(f))) {
        if (importsDbTesting(f, spec)) offenders.push(`${rel(f)}: ${spec}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("__fixtures__-moduler importeras bara av tester eller andra fixturer", () => {
    const offenders: string[] = [];
    for (const f of collect(srcDir).filter((x) => x !== self)) {
      if (isTest(f) || /(^|\/)__fixtures__\//.test(rel(f))) continue;
      for (const spec of importSpecifiers(read(f))) {
        if (importsFixture(f, spec)) offenders.push(`${rel(f)}: ${spec}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
