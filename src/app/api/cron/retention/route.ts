// WP-26 steg 4: lagringsjobbet. Samma mönster som `/api/cron/outbox`
// (D-030): GitHub Actions anropar den här routen en gång om dagen per
// marknad med `CRON_SECRET`, timing-safe jämförelse.
//
// Två oberoende delar:
//   1. `private.run_retention()` (db-engineer, 20260930080100_run_retention.sql):
//      anonymiserar kunder utan bokning på 24 mån och radera gamla
//      utkorgsrader (sent/dead/cancelled, 90 dagar).
//   2. `purgeBusiness` (src/server/privacy/business.ts): oåterkallelig
//      radering av företag vars 30 dagars ångerfrist (D-033 ägarens svar
//      2026-09-30) har gått ut, ett företag i taget i sin egen transaktion.
//
// Bara antal loggas och returneras (regel 8: ingen persondata).
import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { withServiceTx } from "@/server/db/tx";
import { purgeBusiness } from "@/server/privacy/business";

export const dynamic = "force-dynamic";

/** Konstant tid oavsett längdskillnad (annars läcker en tidig retur
 * längden på hemligheten via svarstiden). Samma som `/api/cron/outbox`. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

const BEARER_PREFIX = "Bearer ";

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith(BEARER_PREFIX)) return false;
  return safeEqual(header.slice(BEARER_PREFIX.length), secret);
}

async function runRetention(): Promise<{
  anonymizedCustomers: number;
  purgedOutbox: number;
  purgedConsentEvents: number;
}> {
  return withServiceTx(async (q) => {
    const r = await q.query<{
      anonymized_customers: number;
      purged_outbox: number;
      purged_consent_events: number;
    }>(`select * from private.run_retention()`);
    const row = r.rows[0];
    return {
      anonymizedCustomers: row?.anonymized_customers ?? 0,
      purgedOutbox: row?.purged_outbox ?? 0,
      purgedConsentEvents: row?.purged_consent_events ?? 0,
    };
  });
}

/** Företag vars ångerfrist (30 dagar) har gått ut. `purgeBusiness`
 * kontrollerar fristen igen själv (försvar i djupet), den här frågan
 * väljer bara vilka som är värda att försöka. */
async function overdueBusinessIds(): Promise<string[]> {
  return withServiceTx(async (q) => {
    const r = await q.query<{ id: string }>(
      `select id from public.businesses
        where deletion_requested_at is not null
          and deletion_requested_at <= now() - interval '30 days'`,
    );
    return r.rows.map((row) => row.id);
  });
}

async function purgeOverdueBusinesses(): Promise<{
  purgedBusinesses: number;
  skippedBusinesses: number;
}> {
  const ids = await overdueBusinessIds();
  let purgedBusinesses = 0;
  let skippedBusinesses = 0;
  for (const id of ids) {
    const result = await purgeBusiness(id);
    if (result.ok) purgedBusinesses++;
    else skippedBusinesses++;
  }
  return { purgedBusinesses, skippedBusinesses };
}

async function handle(request: NextRequest): Promise<NextResponse> {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const retention = await runRetention();
  const businesses = await purgeOverdueBusinesses();
  const result = { ...retention, ...businesses };
  // Bara räknare (regel 8: ingen persondata i loggar).
  console.log("retention: pass klart", result);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}
