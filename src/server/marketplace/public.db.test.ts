import { afterAll, describe, expect, it } from "vitest";

import { closePool } from "@/server/db/pool";
import { createTestClient } from "@/server/db/testing";

import { listOffersIn } from "./public";

/**
 * WP-68 (S6, säkerhetsgranskning #110): den publika frågan returnerar bara
 * publicerade, giltiga erbjudanden — aldrig utkast, pausade, utgångna,
 * slutsålda eller sådana som inte längre är billigare än tjänsten (S3).
 * Allt i en transaktion som rullas tillbaka.
 */

afterAll(async () => {
  await closePool();
});

describe("listOffersIn", () => {
  it("visar bara publicerade, giltiga erbjudanden", async () => {
    const c = await createTestClient();
    try {
      await c.query("begin");
      const tz = "America/Santiago";
      const biz = (
        await c.query<{ id: string }>(
          // WP-70 (D-056): erbjudanden visas bara när planen har `offers`.
          `insert into public.businesses (slug, name, comuna, category, timezone, plan)
           values ('wp68-s6-test', 'S6 Test', 'Providencia', 'peluqueria', $1, 'equipo')
           returning id`,
          [tz],
        )
      ).rows[0]!.id;
      const svc = (
        await c.query<{ id: string }>(
          `insert into public.services (business_id, name, duration_min, price_clp)
           values ($1, 'S6 servicio', 30, 10000) returning id`,
          [biz],
        )
      ).rows[0]!.id;
      // S3: tjänsten bakom "pricier" sänks under erbjudandepriset — erbjudandet
      // ska då döljas (ordinarie pris räknas från tjänstens aktuella pris).
      // (WP-70 #111 B1: tjänsten kan inte bytas på ett publicerat erbjudande,
      // så "pricier" skapas direkt på den billiga tjänsten.)
      const cheap = (
        await c.query<{ id: string }>(
          `insert into public.services (business_id, name, duration_min, price_clp)
           values ($1, 'S6 billig', 30, 10000) returning id`,
          [biz],
        )
      ).rows[0]!.id;
      const rows: [string, string, string][] = [
        ["s6zz-ok", "published", ""],
        ["s6zz-draft", "draft", ""],
        ["s6zz-paused", "paused", ""],
        [
          "s6zz-expired",
          "published",
          "sale_ends_at = now() - interval '1 day'",
        ],
        ["s6zz-soldout", "published", "quantity_total = 1, quantity_sold = 1"],
        ["s6zz-pricier", "published", ""],
      ];
      for (const [slug, status, extra] of rows) {
        await c.query(
          `insert into public.offers (business_id, service_id, slug, title, offer_price_minor, category, status, regular_price_minor, currency)
           values ($1, $2, $3, $3, 8000, 'har', $4, 1, 'CLP')`,
          [biz, slug === "s6zz-pricier" ? cheap : svc, slug, status],
        );
        if (extra) {
          await c.query(`update public.offers set ${extra} where slug = $1`, [
            slug,
          ]);
        }
      }
      await c.query(
        `update public.services set price_clp = 7000 where business_id = $1 and id = $2`,
        [biz, cheap],
      );

      const page = await listOffersIn(c, { q: "s6zz" });
      expect(page.items.map((o) => o.slug)).toEqual(["s6zz-ok"]);
      expect(page.items[0]!.regularMinor).toBe(10000);
      expect(page.items[0]!.discountPct).toBe(20);
    } finally {
      await c.query("rollback");
      await c.end();
    }
  });
});
