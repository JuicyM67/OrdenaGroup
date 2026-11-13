// WP-26 steg 4: lagringsjobbet. Samma mönster som `/api/cron/outbox`
// (D-030): GitHub Actions anropar den här routen en gång om dagen med
// `CRON_SECRET`, timing-safe jämförelse.
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

import { runWinback } from "@/server/campaigns";
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

/** WP-31 (F14): "Te echamos de menos" automatiskt, en gång/dag från det
 * här passet (planens ord: "befintlig retention-cron"). Ett fel stoppar
 * aldrig resten av passet (samma "fortsätt ändå"-princip som
 * `purgeOverdueBusinesses`) — bara räknare loggas, aldrig persondata. */
async function runWinbackSafely(): Promise<{
  winbackBusinesses: number;
  winbackQueued: number;
}> {
  try {
    const r = await runWinback(new Date());
    return { winbackBusinesses: r.businesses, winbackQueued: r.queued };
  } catch {
    return { winbackBusinesses: 0, winbackQueued: 0 };
  }
}

/** WP-63 (D-043): rulla demoföretaget (`brand.demoSlug`) så att
 * bokningar och horas flash alltid ligger kring dagens datum. Funktionen rör
 * bara demoföretagets fasta id. Ett fel stoppar aldrig resten av passet. */
async function rollDemoSafely(): Promise<{ demoRolled: boolean }> {
  try {
    await withServiceTx((q) =>
      // Databasfunktionen tar fortfarande en marknadskod (migrationerna är
      // oförändrade, D-062); det här repot kör bara Chile.
      q.query(`select private.seed_demo('CL')`),
    );
    return { demoRolled: true };
  } catch {
    return { demoRolled: false };
  }
}

/** WP-90 (D-076): ta bort utgångna supportmedlemskap. Databasen godkänner
 * dem redan inte efter tidsgränsen; det här är bara städning. */
async function purgeExpiredSupportSafely(): Promise<{
  purgedSupport: number;
}> {
  try {
    const r = await withServiceTx((q) =>
      q.query<{ n: number }>(`select private.purge_expired_support() as n`),
    );
    return { purgedSupport: r.rows[0]?.n ?? 0 };
  } catch {
    return { purgedSupport: 0 };
  }
}

async function handle(request: NextRequest): Promise<NextResponse> {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const retention = await runRetention();
  const businesses = await purgeOverdueBusinesses();
  const winback = await runWinbackSafely();
  const demo = await rollDemoSafely();
  const support = await purgeExpiredSupportSafely();
  const result = {
    ...retention,
    ...businesses,
    ...winback,
    ...demo,
    ...support,
  };
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
