# WP-68 · Marknadsplats — upptäck (CL + SE, SE först) — plan

Status: plan klar 2026-10-10. Beror på: WP-64 (PR #93) och WP-66 mergade + **WP-67 steg 0** (gemensamma rutter, flagga, `ConsumerShell`). Parallellt med WP-67 i övrigt.
Design: ägarens godkända artifact (riktning A, lista först, karta som flik): *A·Upptäck mobil*, *A·Erbjudande mobil*, *B·Karta*, *Upptäck dator*.
Beslut som berörs: D-004 (ersätts, se D-049), D-014, D-024 (noindex på `/[slug]`), D-025/D-026 (marknad/varumärke), D-034, D-035, D-039, D-043 (demoföretaget får erbjudanden), D-045. Nya förslag: **D-049** (marknadsplats), **D-050** (geodata och position), **D-051** (JS-budget marknadsplats).

## 1. Mål
Företag kan skapa och publicera erbjudanden i dashboarden, och besökare hittar dem per kategori och "nära" (stad/område eller min position, närmast först) på server-renderade, indexerbara sidor med verifierade betyg — köpknappen kopplas in i WP-69. (Ingen F# i MVP_SPEC; utökar F1/F13; "klart när" nedan.)

## 2. Utanför scope
- Köp, värdebevis, provision, inlösen (WP-69). Knappen "Köp och välj tid" visas inte förrän WP-69 är klar (D-035); hela ytan ligger bakom `MARKETPLACE` (av i prod) tills dess.
- Kundkonton, favoriter, Min profil (WP-67).
- Sök i fritext med rankning/synonymer (v1: enkel `ilike` på företags-/erbjudandenamn), personlig rekommendation, betald exponering.
- Köp i CL (Mercado Pago, senare). Erbjudanden i CL kan skapas men visas inte publikt förrän ett betalsätt finns (se FRÅGA).
- Egen karttjänst/tiles, adressautokomplettering i formulär.

## 3. Ägare och mappar (inga överlapp med WP-67)
| Agent | Rör bara |
|---|---|
| db-engineer | `supabase/migrations/20261021*_*.sql` · `supabase/tests/125–129_*.test.sql` · `src/types/database.ts` · `src/server/marketplace/**` (ny: publika frågor + ägarens CRUD) · storage-bucket `offer-images` (migration) |
| integrations-engineer | `src/server/geocoding/**` (ny) · `src/app/api/cron/outbox/route.ts` (anropa geokodningssvepet) · `scripts/geocode-backfill.ts` |
| ui-engineer | `src/app/(consumer)/descubre/**` · `src/app/(consumer)/oferta/**` · `src/components/marketplace/**` · `src/components/consumer/**` (ConsumerShell, efter steg 0) · `src/app/(app)/app/ofertas/**` · `src/components/offers/**` · `src/app/sitemap.ts`, `src/app/robots.ts` (nya) · marknadssajtens toppmeny (länk "Upptäck") · `e2e/marketplace.spec.ts` · `docs/design/reference/Marketplace*.dc.html` + `docs/design/screens/` |
| copywriter-es-cl (+ sv) | `src/i18n/es-CL.mercado.ts`, `src/i18n/sv-SE.mercado.ts` |
| security-reviewer | granskar steg 1, 2, 3 |

## 4. Steg
1. **DB: erbjudanden** (db) — `20261021000000_offers.sql`:
   - `public.offers` (`business_id`, `id`, unik `(business_id, id)`; `service_id` med sammansatt FK → `services (business_id, id)` — ett erbjudande = en tjänst, så längd och bokning återanvänder schemamotorn; `title` ≤ 80, `description` ≤ 1000, `includes text[]` (≤ 6 rader à ≤ 80), `terms` ≤ 1000, `image_path` (bara objekt i `offer-images/<business_id>/`), `regular_price_minor` och `offer_price_minor` (heltal i minsta enhet, `offer < regular`, `offer > 0`), `currency`, `category` (id ur `src/config/marketplace.ts`, CHECK-lista), `valid_months` (≥ 12, default 12), `quantity_total` null = obegränsat, `quantity_sold` default 0, `status` `draft|published|paused|ended`, `sale_starts_at`, `sale_ends_at` null, `published_at`, `slug` (ur titel + kort id), timestamps).
   - **Ordinarie pris:** `regular_price_minor` sätts av servern = tjänstens pris och får inte anges fritt. `public.service_price_history` (trigger på `services.price` ändring) gör att publicering nekas om tjänstens pris höjts inom 30 dagar (prisinformationslagen 7 a §, SE). Se jurist-fråga.
   - RLS: medlemmar läser egna; insert/update för ägare eller `can_edit_catalog` (D-034); `status → published` bara ägaren (trigger). Publik läsning **inte** via `anon` — publika sidor läser via `withServiceTx` i `src/server/marketplace/public.ts` med explicit filter (publicerad, inom säljfönster, företag `active`, ej `frozen`, marknadens installation).
   - Tester `125_offers.test.sql` (tenant-isolering, behörighet per flagga, publiceringsvakt, prisvakt, ogiltig `image_path` nekas).
2. **DB + integration: geodata** (db + integrations) — `20261021010000_business_geo.sql`: `businesses.lat`, `lng` (numeric(8,5)), `area_slug` (stad/kommun/comuna normaliserad), `geocoded_at`, `geocode_status` (`pending|ok|not_found|manual`), `geocode_address_hash`. Index på `(area_slug)` och `(lat, lng)`; `private.distance_km(lat1,lng1,lat2,lng2)` (haversine, immutable) — ingen PostGIS i v1 (hundratals företag, bounding box + haversine räcker). Trigger: ändrad adress ⇒ `pending`.
   - `src/server/geocoding/nominatim.ts`: server-anrop till Nominatim (`countrycodes=se|cl`, `User-Agent` med kontaktadress, max 1 anrop/s globalt via `src/server/db/rate-limit.ts`), resultat sparas permanent (ODbL tillåter lagring, kräver attribution), svep i cron-passet tar ≤ 20 `pending` per körning. `not_found` ⇒ ägaren kan sätta nålen manuellt (`manual`). Leverantören bakom ett interface så att byte till Mapbox/Google är en fil.
   - `scripts/geocode-backfill.ts` för befintliga företag (körs mot staging av människa, regel 8).
   - Tester `126_business_geo.test.sql` (kolumn-grants: medlemmar kan inte skriva lat/lng direkt utom `manual` via funktion).
3. **Dashboard: Erbjudanden** (ui + db-server + copy) — `src/app/(app)/app/ofertas/page.tsx` (lista med status, sålda/antal) och redigerare (bild-uppladdning till `offer-images`, tjänst, erbjudandepris → servern visar rabatt %, "Det här ingår", villkor, giltighet ≥ 12 mån, antal, säljfönster, kategori förvald från företaget). Förhandsvisning = samma kort som publikt. Publicera/pausa. Ingång i menyn bara när `MARKETPLACE` är på (D-035). Visar också geokodningsstatus för adressen ("Din salong syns på kartan här: …").
4. **Publika sidor (server-renderade)** (ui + db-server) — i `src/app/(consumer)/`:
   - `descubre/page.tsx` (`/upptack`): position/ort-väljare, sök, kategorirutor, blixttider-remsa (se FRÅGA), kort sorterade närmast först (eller nyast om ingen position), filter avstånd/blixttider/betyg och sortering (desktop 3 kolumner), Lista/Karta-växel. Paginering via `?sida=N`.
   - `descubre/[categoria]/page.tsx` och `descubre/[categoria]/[ciudad]/page.tsx`: SEO-landningssidor (statiskt genererade med `revalidate`, en per kategori × ort som har ≥ 1 publicerat erbjudande).
   - `oferta/[id]/page.tsx` (`/erbjudande/[slug-id]`): bild, rabatt, salong + betyg (D-045, bara synliga recensioner), "Det här ingår", "Så funkar det" 1-2-3, villkor, giltighet, en verifierad recension med företagets svar, "Säljs av <företag>" + org.nr (konsumentinfo), fast CTA (dold till WP-69).
   - `descubre/mapa/page.tsx` (`/upptack/karta`): MapLibre GL + OpenFreeMap-tiles, laddas bara på den här rutten (`next/dynamic`), markörer från samma server-fråga, attribution "© OpenStreetMap".
   - **"Min position":** `navigator.geolocation` i en liten klientö; koordinaterna avrundas till 2 decimaler (~1 km) och sparas i en sessionscookie `nara` (30 min, `SameSite=Lax`) — aldrig i URL:en (hamnar i åtkomstloggar), aldrig i DB, aldrig i PostHog. Utan JS/neka: ortväljare (`area_slug`).
5. **SEO** (ui) — `generateMetadata` (titel, beskrivning, canonical, `hreflang` saknas — en marknad per domän), JSON-LD: `Offer` (pris, `priceCurrency`, `availability`, `validFrom`/`priceValidUntil`, `seller` = `LocalBusiness` med adress och `geo`) och `AggregateRating` bara när ≥ 1 synlig recension. `sitemap.ts` (upptäck, kategori, kategori×ort, erbjudanden), `robots.ts`. Allt `noindex` tills `MARKETPLACE_INDEXABLE=1` (sätts av ägaren när WP-69 är live). `/[slug]` behåller `noindex` (D-024) — egen fråga.
6. **Demo + seed** (db) — `private.seed_demo` (D-043) får 2–3 erbjudanden och koordinater för demoföretagen; `seed.sql` får erbjudanden i två orter för e2e.
7. **Design och texter** (ui + copy) — referenserna exporteras från artifacten till `docs/design/reference/Marketplace.dc.html` (mobil upptäck, erbjudande, karta, desktop) innan bygget (hård regel 1); nya tokens bara via `tokens.css` + DESIGN.md. Texter es-CL + sv-SE.
8. **Docs** — D-049/D-050/D-051, `docs/tech/ARCHITECTURE.md` (geokodning), RAT.md (position behandlas inte på servern utöver avrundad cookie), BACKLOG.

## 5. Tester
- **pgTAP:** 125 (offers), 126 (geo) + schemavakten; `anon` utan grants; publik fråga returnerar aldrig `draft`/`paused`, `frozen`-företag, utgånget säljfönster eller slutsålt.
- **Enhet:** rabatt/öre-avrundning (heltal, aldrig flyttal), slug-generering, haversine mot kända avstånd (Stockholm–Uppsala ~64 km, Providencia–Ñuñoa), avrundning av position, Nominatim-svar → `area_slug` (svenska å/ä/ö, chilenska tecken, "Ñuñoa" → `nunoa`), JSON-LD-byggare (giltigt schema, inga tomma fält).
- **DB-integration:** sortering närmast först med och utan position; filter betyg ≥ 4; paginering stabil vid lika avstånd (sekundärnyckel id).
- **E2E:** skapa erbjudande i dashboarden → publicera → syns i `/upptack`, kategori- och ortsidan, detaljsidan; pausa → försvinner; prisvakt (höj tjänstens pris ⇒ publicering nekas i 30 dagar). Geolocation mockas i Playwright (`context.setGeolocation`), inklusive "neka".
- **Prestanda (D-051):** `e2e/marketplace.spec.ts` mäter first-load JS gzip: upptäck och erbjudande ≤ 120 kB, karta ≤ 330 kB; LCP på erbjudandesidan < 2,5 s på 4G + 4x CPU. Bilder via `next/image` med fasta storlekar.
- **Kantfall:** säljfönster som slutar vid midnatt i företagets tidszon (sommartidsbyte SE 2026-10-25, CL 2027-04-04); erbjudande vars tjänst arkiveras (döljs automatiskt); geokodning `not_found`; företag utan koordinater syns i ortslistan men inte på kartan; två installationer — SE-sidan visar aldrig CL-data (en DB per marknad, D-025).
- **Visuell:** `npm run visual descubre oferta descubre-mapa descubre-desktop app-ofertas` < 2 %.

## 6. Risker och öppna frågor
- **Geokodning — val och motivering:** **Nominatim/OpenStreetMap** (gratis, resultat får lagras permanent enligt ODbL med attribution, adresskvaliteten räcker för gatuadresser i Stockholm/Santiago, volymen är låg — en geokodning per adressändring). Mapbox Geocoding: bra kvalitet men "temporary"-API:t förbjuder lagring, permanent geokodning kostar. Google Geocoding: får bara cacha i 30 dagar och kräver Google-karta för visning. Risk: Nominatims användarpolicy (max 1 anrop/s, inga massanrop) — hanteras med kö + backfill-skript; vid behov byte till betald Nominatim-värd (t.ex. LocationIQ) via samma interface. Kartan: MapLibre + OpenFreeMap (gratis, ingen nyckel).
- **Täthet (skälet bakom D-004):** en tom marknadsplats skadar varumärket. Förslag: publicera per ort först när ≥ N företag med erbjudanden finns (konfig i `marketplace.ts`).
- **Prisinformation SE:** `JURIST: får "ordinarie pris" vara tjänstens pris om det gällt i 30 dagar (prisinformationslagen 7 a §), och räcker vår prisvakt?` `JURIST: informationskrav för onlinemarknadsplatser (Omnibus/P2B): huvudparametrar för rankning ("närmast först, sedan nyast") och att recensionerna är verifierade — var ska texten stå?`
- **Bilder:** företagen laddar upp egna bilder; upphovsrätten ligger på företaget (villkor). Storlek/typ valideras på servern.
- FRÅGA: Ska marknadsplatsen ligga på samma domän under `/upptack` (`/descubre` i CL) — rekommenderat för SEO och en inloggning — eller på en egen subdomän/domän?
- FRÅGA: Blixttider-remsan visar företagens horas flash för alla besökare (i dag bara för egna kunder, D-004/D-005). Ska det vara ett val per företag ("Visa mina blixttider i Upptäck", av som standard) eller på för alla?
- FRÅGA: I CL finns inget köp förrän Mercado Pago byggs — ska marknadsplatsen i CL vara helt dold tills dess, eller visa företag och blixttider utan erbjudanden?

**D-049 (förslag) · Marknadsplats för konsumenter (ersätter D-004).** Upptäck + erbjudanden i båda marknaderna, SE först; erbjudanden är förbetalda värdebevis för en tjänst hos ett företag; företaget är säljare. Ytan ligger bakom `MARKETPLACE` och `MARKETPLACE_INDEXABLE`. Visionens "bygger inte nu"-rad om marknadsplats uppdateras i samma PR.
**D-050 (förslag) · Geodata och position.** Företagsadresser geokodas med Nominatim (lagras på `businesses`, attribution OSM), karta med MapLibre + OpenFreeMap bara på kartrutten. Besökarens position lämnar aldrig webbläsaren i större precision än 2 decimaler, lagras bara i en 30-minuters sessionscookie och loggas aldrig.
**D-051 (förslag) · JS-budget marknadsplats.** Upptäck- och erbjudandesidor ≤ 120 kB gzip first-load, kartan ≤ 330 kB; `/[slug]` oförändrat 190 kB (D-039).

## 7. Klart när
- [ ] Ägare (eller `can_edit_catalog`) skapar, förhandsgranskar, publicerar och pausar ett erbjudande; bara ägaren publicerar.
- [ ] Företagets adress geokodas automatiskt (eller nålen sätts manuellt) och företaget syns på kartan.
- [ ] `/upptack` (CL `/descubre`) listar publicerade erbjudanden per kategori, ort och närmast först med "min position"; kartfliken visar samma urval.
- [ ] Erbjudandesidan visar allt i designen inklusive verifierat betyg och recension med svar; JSON-LD validerar i Googles Rich Results Test.
- [ ] Svenska och spanska URL:er via `routes.ts`; inga slugkrockar med `/[slug]`.
- [ ] JS-budgetar (D-051) och LCP uppfyllda i e2e.
- [ ] `npm run typecheck && npm run lint && npm run test && npm run test:db` gröna; `npm run visual` < 2 %.
- [ ] security-reviewer godkänd; D-049–D-051, ARCHITECTURE, RAT och BACKLOG uppdaterade.

## Ägarens beslut 2026-10-10 (ersätter antaganden ovan där de skiljer sig)
- Marknadsplatsavgift: **1 %** (`MARKETPLACE_FEE_BPS = 100`, konfigurerbar).
- Köp av värdebevis **kräver konto** (inga gästköp).
- Blixttider visas på marknadsplatsen **som standard** (företaget kan stänga av).
- **Chile: marknadsplatsen helt dold** tills Mercado Pago finns.
- Samma domän (`/upptack`, CL `/descubre`). Besöket ska ske före värdebevisets utgång. SMS-verifiering av telefon: inte i v1 (e-post räcker). Avbokning från kontot: ja i v1 (återanvänd befintligt manage-flöde).
- Design: riktning A (lista först) — exporterade `.dc.html` från artifacten läggs i `docs/design/reference/marketplace/`.
