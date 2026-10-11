// WP-68 (D-055): geokodar befintliga företag (`geocode_status = 'pending'`) i
// små pass med Nominatims takt (1 anrop/s), tills inga återstår. Körs av en
// människa mot lokal databas eller staging — aldrig mot produktion från en
// agent (regel hård 8). Samma kod som cron-svepet (`runGeocodeSweep`).
//
//   NEXT_PUBLIC_MARKET=SE GEOCODING_PROVIDER=nominatim \
//   NOMINATIM_CONTACT_EMAIL=du@example.com DATABASE_URL=... \
//   NODE_OPTIONS="--conditions=react-server" npx tsx scripts/geocode-backfill.ts
import { runGeocodeSweep } from "@/server/geocoding";

async function main(): Promise<void> {
  let total = { ok: 0, notFound: 0 };
  for (let pass = 0; pass < 100; pass += 1) {
    const r = await runGeocodeSweep();
    total = { ok: total.ok + r.ok, notFound: total.notFound + r.notFound };
    console.log(`pass ${pass + 1}:`, r);
    if (r.ok + r.notFound === 0) break;
  }
  console.log("klart:", total);
  process.exit(0);
}

main().catch((e: unknown) => {
  console.error(
    "geocode-backfill misslyckades",
    e instanceof Error ? e.name : "unknown",
  );
  process.exit(1);
});
