// WP-16 steg 2: schemaläggaren är GitHub Actions (D-030), inte pg_cron/
// pg_net — `.github/workflows/outbox-cron.yml` anropar den här routen var
// 5:e minut per marknad (matrix, två repo-hemligheter) med `CRON_SECRET`.
// Bekräftelser går ändå ut inom 1 min via `kickOutbox` (oberoende av cronen);
// det här passet tar hand om påminnelser (24 h) och rader som misslyckades
// första gången (backoff).
//
// WP-45 steg 6: samma pass låter obesvarade förfrågningar (`requested`) gå
// ut FÖRE utkorgen töms, så att `solicitudVencida` (som `expireRequests`
// köar i samma transaktion som statusändringen, se
// `src/server/bookings/confirm.ts`) hinner med
// i samma körning i stället för att vänta till nästa. Ett fel i svepet
// (t.ex. statement timeout) får aldrig stoppa utkorgen: det loggas med bara
// SQLSTATE och passet fortsätter med `processOutbox` (säkerhetsgranskning
// WP-45).
import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { expireRequests } from "@/server/bookings/confirm";
import { pgErrorCode } from "@/server/db/errors";
import { processOutbox } from "@/server/messaging/outbox";
import { systemClock } from "@/server/scheduling/clock";
import { expireWaitlistOffers } from "@/server/waitlist";

export const dynamic = "force-dynamic";

/** Ett något större pass än `kickOutbox`s (10 rader): cronen är den enda
 * vägen för påminnelser och omförsök, så den får plocka mer per gång. */
const CRON_LIMIT = 50;

/** Konstant tid oavsett längdskillnad (annars läcker en tidig retur
 * längden på hemligheten via svarstiden). */
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

async function handle(request: NextRequest): Promise<NextResponse> {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let expired = 0;
  try {
    expired = (await expireRequests(systemClock())).length;
  } catch (e) {
    // Bara SQLSTATE (aldrig pg:s `detail`/`message`, som kan bära värden).
    console.error("outbox: expireRequests misslyckades", {
      code: pgErrorCode(e) ?? "unknown",
    });
  }
  // WP-23: samma idé som ovan — en utgången väntelisteoffert (sequential:
  // nästa i kön; broadcast: ingen efterträdare) ska gå ut FÖRE utkorgen
  // töms, i samma pass. Ett fel här stoppar aldrig utkorgen heller.
  let waitlistExpired = 0;
  try {
    waitlistExpired = (await expireWaitlistOffers(systemClock())).expired;
  } catch (e) {
    console.error("outbox: expireWaitlistOffers misslyckades", {
      code: pgErrorCode(e) ?? "unknown",
    });
  }
  const result = await processOutbox({ limit: CRON_LIMIT });
  // Bara räknare (regel hård 8: ingen persondata i loggar).
  console.log("outbox: pass klart", { expired, waitlistExpired, ...result });
  return NextResponse.json({ ...result, expired, waitlistExpired });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}
