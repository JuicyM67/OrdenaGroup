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
 * - WP-46: varje exporterad mutation i owner/ och privacy/ anropar en
 *   behörighetskontroll (`requirePerm` eller `isOwner`, direkt eller via en
 *   vakt som själv bevisligen gör det); bokningsmotorns ägarvägar
 *   (create/move/cancel/confirm) kontrollerar medlemmen i transaktionen.
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
  // WP-40 (D-031)
  "service_categories",
  "booking_questions",
  "booking_question_targets",
  "booking_answers",
  "customer_answers",
  // WP-41
  "business_images",
  // WP-26
  "consent_events",
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

/**
 * WP-20 (granskningsfynd): den enda tillåtna `businesses`-frågan utan
 * `business_id`/`id = $N` i produktionskod — löser en okänd, klientstyrd
 * `slug` (`/[slug]`-routen) till den betrodda `businessId` som all annan kod
 * sedan filtrerar på (ARCHITECTURE princip 3). Kan inte filtrera på sin egen
 * primärnyckel: den är precis det uppslagningen letar upp. Undantaget gäller
 * per fil, inte per fråga — filen ska bara göra den här ena uppslagningen,
 * se testet nedan som bevisar att undantaget faktiskt gör något.
 */
const SLUG_LOOKUP_EXCEPTION = "server/bookings/business.ts";
/**
 * WP-16 (D-029, IDEAS rad 47): kundens länk `/r/[token]` slår upp bokningen
 * på bara `manage_token_hash` (unik) — token är det enda kunden har. Filen
 * gör exakt ett sådant uppslag (→ `business_id`); all övrig SQL i den
 * filtrerar på `business_id`. Testet nedan håller undantaget så smalt.
 */
const TOKEN_LOOKUP_EXCEPTION = "server/bookings/manage.ts";
/**
 * WP-26: lagringsjobbet letar upp företag vars ångerfrist (30 dagar) gått ut
 * — ett svep över alla företag (service_role, CRON_SECRET), per definition
 * utan ett givet `business_id`. Varje träff hanteras sedan av `purgeBusiness(id)`.
 */
const RETENTION_SWEEP_EXCEPTION = "app/api/cron/retention/route.ts";
/**
 * WP-31 (F14): "Te echamos de menos" automatiskt — ett dagligt svep över
 * alla företag med `winback_days` satt (service_role, samma princip som
 * `RETENTION_SWEEP_EXCEPTION`), per definition utan ett givet `business_id`.
 * Varje träff hanteras sedan per företag (`eligibleCustomerIdsIn` m.fl.,
 * som alla filtrerar på `business_id`).
 */
const WINBACK_SWEEP_EXCEPTION = "server/campaigns/winback.ts";
/**
 * WP-68 (D-056): geokodningssvepet letar upp företag med `geocode_status =
 * 'pending'` — ett svep över alla företag i installationen (service_role,
 * cron), per definition utan ett givet `business_id`. Varje skrivning sker
 * per `id`.
 */
const GEOCODE_SWEEP_EXCEPTION = "server/geocoding/sweep.ts";
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
      if (rel(f) === SLUG_LOOKUP_EXCEPTION) continue;
      if (rel(f) === RETENTION_SWEEP_EXCEPTION) continue;
      if (rel(f) === WINBACK_SWEEP_EXCEPTION) continue;
      if (rel(f) === GEOCODE_SWEEP_EXCEPTION) continue;
      for (const s of sqlOffenders(read(f))) offenders.push(`${rel(f)}: ${s}`);
    }
    expect(offenders).toEqual([]);
  });

  it(`${SLUG_LOOKUP_EXCEPTION} finns och skulle annars ha flaggats (bevisar att undantaget gör något)`, () => {
    const f = productionSources.find((x) => rel(x) === SLUG_LOOKUP_EXCEPTION);
    expect(f).toBeDefined();
    expect(sqlOffenders(read(f!))).not.toEqual([]);
  });

  it(`${RETENTION_SWEEP_EXCEPTION}: den enda frågan utan business_id är svepet över businesses.deletion_requested_at`, () => {
    const f = productionSources.find(
      (x) => rel(x) === RETENTION_SWEEP_EXCEPTION,
    );
    expect(f).toBeDefined();
    const offenders = sqlOffenders(read(f!));
    // Undantaget finns (annars behövs det inte) och är bara svepfrågan.
    expect(offenders).toHaveLength(1);
    expect(offenders[0]).toMatch(
      /from public\.businesses where deletion_requested_at/i,
    );
  });

  it(`${GEOCODE_SWEEP_EXCEPTION}: den enda frågan utan business_id är svepet över businesses.geocode_status`, () => {
    const f = productionSources.find((x) => rel(x) === GEOCODE_SWEEP_EXCEPTION);
    expect(f).toBeDefined();
    const offenders = sqlOffenders(read(f!));
    expect(offenders).toHaveLength(1);
    expect(offenders[0]).toMatch(
      /select id, address, comuna from public\.businesses/i,
    );
  });

  it(`${WINBACK_SWEEP_EXCEPTION}: den enda frågan utan business_id är svepet över businesses.winback_days`, () => {
    const f = productionSources.find((x) => rel(x) === WINBACK_SWEEP_EXCEPTION);
    expect(f).toBeDefined();
    const offenders = sqlOffenders(read(f!));
    // Undantaget finns (annars behövs det inte) och är bara svepfrågan.
    expect(offenders).toHaveLength(1);
    // Trunkerad till 80 tecken (sqlOffenders) — själva select-listan räcker
    // för att visa att det är svepfrågan (`eligibleBusinessesIn`).
    expect(offenders[0]).toMatch(/select id, winback_days, winback_message/i);
  });

  it(`${TOKEN_LOOKUP_EXCEPTION}: de enda frågorna utan business_id-filter slår upp på bara manage_token_hash (D-029)`, () => {
    const f = productionSources.find((x) => rel(x) === TOKEN_LOOKUP_EXCEPTION);
    expect(f).toBeDefined();
    const unfiltered = sqlStrings(read(f!)).filter(
      (s) =>
        tenantTablesIn(s).length > 0 && !/\bbusiness_id\s*=\s*\$\d/.test(s),
    );
    // Undantaget finns (annars behövs det inte) och är bara hash-uppslaget.
    expect(unfiltered).toHaveLength(1);
    for (const s of unfiltered) {
      expect(tenantTablesIn(s)).toEqual(["bookings"]);
      expect(s).toMatch(/\bwhere\s+(?:bk\.)?manage_token_hash\s*=\s*\$1\s*$/);
    }
    // Ingen annan produktionsfil slår upp bokningar på bara token-hashen.
    const others = productionSources
      .filter((x) => rel(x) !== TOKEN_LOOKUP_EXCEPTION)
      .flatMap((x) =>
        sqlStrings(read(x))
          .filter(
            (s) =>
              /\bmanage_token_hash\s*=\s*\$\d/.test(s) &&
              !/\bbusiness_id\s*=\s*\$\d/.test(s),
          )
          .map(
            (s) => `${rel(x)}: ${s.replace(/\s+/g, " ").trim().slice(0, 80)}`,
          ),
      );
    expect(others).toEqual([]);
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

// ---------------------------------------------------------------------------
// WP-46: behörighet i varje mutation
// ---------------------------------------------------------------------------

/** Exporterade funktioner med sin kropp (till nästa `}` i kolumn 0). */
function exportedFunctions(code: string): { name: string; body: string }[] {
  const c = stripComments(code);
  const out: { name: string; body: string }[] = [];
  const re = /^export\s+(?:async\s+)?function\s+(\w+)\s*[<(]/gm;
  for (const m of c.matchAll(re)) {
    const start = m.index ?? 0;
    const end = c.indexOf("\n}", start);
    out.push({
      name: m[1]!,
      body: c.slice(start, end === -1 ? undefined : end),
    });
  }
  return out;
}

/** Namn som betyder "ändrar något" (läsare och inre `*In`-steg undantas). */
const MUTATION_NAME =
  /^(create|update|set|delete|rename|reorder|replace|activate|confirm|decline|mark|move|save|cancel|request|export|anonymize|invite|revoke|remove|accept)[A-Z]/;

/**
 * Vakterna. `requirePerm`/`isOwner` är grundkontrollerna
 * (`db/permissions.ts`, `privacy/authz.ts`); de övriga är tunna omslag som
 * testet nedan bevisar anropar en grundkontroll. Motorns publika
 * funktioner (`createBooking` …) räknas som vakter eftersom motorn själv
 * kontrollerar medlemmen (se testet för bokningsmotorn).
 */
const BASE_GUARDS = ["requirePerm", "isOwner"] as const;
const WRAPPER_GUARDS: Record<string, string> = {
  requireMemberPerm: "server/owner/member.ts",
  requireOwnerMember: "server/owner/member.ts",
  catalogMutation: "server/owner/booking-questions.ts",
  requireBookingPerm: "server/bookings/authz.ts",
  ownerDenial: "server/privacy/authz.ts",
};
const ENGINE_GUARDS = [
  "createBooking",
  "moveBooking",
  "cancelBooking",
  "confirmBooking",
  "declineBooking",
  "approveCancellation",
  "declineCancellation",
] as const;
const ALL_GUARDS = [
  ...BASE_GUARDS,
  ...Object.keys(WRAPPER_GUARDS),
  ...ENGINE_GUARDS,
];

/** Mutationer som medvetet saknar inloggad användare (cron, service role). */
const NO_USER_MUTATIONS = new Set(["server/privacy/business.ts#purgeBusiness"]);

function calls(body: string, fn: string): boolean {
  return new RegExp(`\\b${fn}\\s*[<(]`).test(body);
}

function unguardedMutations(file: string, code: string): string[] {
  return exportedFunctions(code)
    .filter((f) => MUTATION_NAME.test(f.name) && !/In$/.test(f.name))
    .filter((f) => !NO_USER_MUTATIONS.has(`${file}#${f.name}`))
    .filter((f) => !ALL_GUARDS.some((g) => calls(f.body, g)))
    .map((f) => `${file}: ${f.name}`);
}

describe("WP-46: behörighetsdetektorerna själva", () => {
  it("en mutation utan vakt fångas, med vakt godtas, läsare ignoreras", () => {
    const code = [
      "export async function updateThing(q) {",
      "  await q.query(`update x`);",
      "}",
      "export async function setOther(q) {",
      '  requirePerm(m, "can_edit_catalog");',
      "}",
      "export async function loadThing(q) {",
      "  return 1;",
      "}",
      "export async function updateThingIn(q) {",
      "  return 1;",
      "}",
    ].join("\n");
    expect(unguardedMutations("x.ts", code)).toEqual(["x.ts: updateThing"]);
  });
});

describe("WP-46: behörighet i varje mutation", () => {
  const scoped = serverSources.filter((f) =>
    /^server\/(owner|privacy)\//.test(rel(f)),
  );

  it("hittar owner/ och privacy/", () => {
    expect(scoped.map(rel)).toContain("server/owner/ajustes.ts");
    expect(scoped.map(rel)).toContain("server/privacy/customer.ts");
  });

  it("varje exporterad mutation i owner/ och privacy/ anropar requirePerm eller isOwner (direkt eller via en vakt)", () => {
    const offenders = scoped.flatMap((f) =>
      unguardedMutations(rel(f), read(f)),
    );
    expect(offenders).toEqual([]);
  });

  it("varje omslagsvakt anropar själv requirePerm eller isOwner", () => {
    const offenders: string[] = [];
    for (const [guard, file] of Object.entries(WRAPPER_GUARDS)) {
      const code = stripComments(read(path.join(srcDir, file)));
      const start = code.search(
        new RegExp(`\\b(?:async\\s+)?function\\s+${guard}\\s*[<(]`),
      );
      if (start === -1) {
        offenders.push(`${file}: ${guard} saknas`);
        continue;
      }
      const end = code.indexOf("\n}", start);
      const body = code.slice(start, end === -1 ? undefined : end);
      if (
        ![...BASE_GUARDS, ...Object.keys(WRAPPER_GUARDS)]
          .filter((g) => g !== guard)
          .some((g) => calls(body, g))
      ) {
        offenders.push(`${file}: ${guard}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("bokningsmotorns ägarvägar (create/move/cancel/confirm) läser medlemmen och mappar 42501 till forbidden", () => {
    const offenders: string[] = [];
    for (const name of ["create", "move", "cancel", "confirm"]) {
      const file = `server/bookings/${name}.ts`;
      const code = stripComments(read(path.join(srcDir, file)));
      if (!calls(code, "actorMember")) offenders.push(`${file}: actorMember`);
      if (
        !["requireBookingPerm", "bookingPermOk", "canManageStaffBookings"].some(
          (g) => calls(code, g),
        )
      ) {
        offenders.push(`${file}: ingen bokningsvakt`);
      }
      if (!/\bonForbidden\s*:/.test(code)) {
        offenders.push(`${file}: onForbidden`);
      }
    }
    const authz = stripComments(
      read(path.join(srcDir, "server/bookings/authz.ts")),
    );
    if (!calls(authz, "requirePerm") || !calls(authz, "hasPerm")) {
      offenders.push("server/bookings/authz.ts: requirePerm/hasPerm");
    }
    expect(offenders).toEqual([]);
  });
});
