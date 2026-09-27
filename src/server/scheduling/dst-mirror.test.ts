import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { SANTIAGO_DST_TRANSITIONS } from "@/lib/format/__fixtures__/santiago-dst";

/**
 * pgTAP-speglingen (supabase/tests/061_santiago_dst_mirror.test.sql) ska
 * innehålla exakt samma övergångar som fixturen i Node, så att de två inte
 * glider isär när Chile ändrar reglerna (SCHEDULING.md, rutinen punkt 3–4).
 */
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const sql = fs.readFileSync(
  path.join(repoRoot, "supabase/tests/061_santiago_dst_mirror.test.sql"),
  "utf8",
);

const ROW =
  /\('(end|start)', '([^']+)', '(\d{4}-\d{2}-\d{2})', (-?\d+), (-?\d+), (\d+)\)/g;

const rows = [...sql.matchAll(ROW)].map((m) => ({
  kind: m[1],
  utc: m[2],
  localDate: m[3],
  offsetBeforeMinutes: Number(m[4]),
  offsetAfterMinutes: Number(m[5]),
  localDayLengthHours: Number(m[6]),
}));

describe("061_santiago_dst_mirror speglar santiago-dst.ts", () => {
  it("samma övergångar i samma ordning, med offset och dagslängd", () => {
    expect(rows).toEqual(
      SANTIAGO_DST_TRANSITIONS.map((t) => ({
        kind: t.kind,
        utc: t.utc,
        localDate: t.localDate,
        offsetBeforeMinutes: t.offsetBeforeMinutes,
        offsetAfterMinutes: t.offsetAfterMinutes,
        localDayLengthHours: t.localDayLengthHours,
      })),
    );
  });

  it("plan(…) = 3 kontroller per övergång", () => {
    expect(sql).toContain(
      `select plan(${3 * SANTIAGO_DST_TRANSITIONS.length});`,
    );
  });
});
