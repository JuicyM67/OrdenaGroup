# Beslutslogg (ADR light)

Nya beslut läggs till överst. Format: datum, beslut, varför, konsekvens. Ändra aldrig ett gammalt beslut — skriv ett nytt som ersätter det.

---

### D-024 · 2026-09-28 · D-020s grind tas bort för `/[slug]`, kvar för `/app/inicio|agenda|hoy`
**Varför:** WP-20 kopplar Reserva (`/{slug}`) mot riktig data (schemamotorn, `createBooking`, samtycke på kundraden) och slug→business_id-uppslagningen ersätter D-020s `isDesignLabEnabled()`-grind: en okänd slug ger 404, ett `frozen`-företag visar det redan byggda frozen-läget. `/app/inicio`, `/app/agenda` och `/app/hoy` (WP-21) är oförändrade och stängda tills vidare. **Konsekvens:** `/[slug]/page.tsx` slår upp företaget via `src/server/bookings/business.ts` (den enda `businesses`-frågan som filtrerar på `slug` — `server/boundaries.test.ts` har ett uttryckligt, namngivet undantag för just den filen) och laddar sidan via `src/server/bookings/page-data.ts`. `noindex` står kvar (ingen SEO-strategi bestämd än). Väntelistan (F8/WP-23) och kundens `r/[token]`-sida är utanför WP-20: en full dag utelämnas helt ur riktig data (som en stängd dag), så `WaitlistCard`/"Avísame" syns aldrig där — fixturerna i `/design-lab/reserva` har kvar fulla dagar och väntelistans stubbe (`src/app/design-lab/reserva/actions.ts`, flyttad ut ur `/[slug]/actions.ts` i samma PR). Kunden ser tillgänglighet 21 dagar framåt (inte hela `max_days_ahead`), en avvägning mot sidstorleken/prestandabudgeten. **Granskningsfynd (samma PR):** `idempotencyKey` (redan validerad i formuläret) användes aldrig — ett omförsök efter ett tappat svar kunde skapa en andra bekräftad bokning. Ny migration: `bookings.idempotency_key uuid null` + unikt index på `(business_id, idempotency_key)` där satt; `createBooking` (motorn) svarar med den befintliga bokningen vid en nyckelkrock i stället för ett fel. Samtycket sparas på kundraden (`consent_terms_at/marketing_at/version/channel='web'`) i en egen transaktion efter bokningen, inte atomiskt med den (en fullständig samtyckeslogg hör till WP-26) — misslyckas den skrivningen svarar `/[slug]/actions.ts` ändå att bokningen lyckades (loggar bara SQLSTATE, aldrig persondata); ett omförsök med samma nyckel skriver samtycket på nytt. (WP-20)

### D-023 · 2026-09-27 · Handpenning vid ombokning och när företaget avbokar
**Varför:** villkorstexten i samtycke `2026-10-v2` behöver täcka alla fall kunden kan hamna i (Ley 19.496). **Konsekvens:** kompletterar D-022: flyttar kunden tiden följer handpenningen med till den nya tiden; avbokar företaget betalar företaget tillbaka handpenningen. Plattformen lovar aldrig själv återbetalning (D-008). Juristen granskar (JURIST_FRAGOR 8).

### D-022 · 2026-09-27 · Handpenning i v1: fast regel, återbetalning görs av företaget
**Varför:** en regel som kunden kan läsa före bekräftelsen (Ley 19.496), inga nya kolumner och inga pengar som plattformen rör (D-008). **Konsekvens:** handpenningen dras av från priset. Avbokning inom avbokningsfönstret: företaget betalar tillbaka. Avbokning utanför fönstret eller no-show: företaget behåller den. Obetald bokning släpps efter 15 min. Företaget återbetalar själv i sitt Mercado Pago-konto; systemet visar "Abono por devolver". Villkoret ingår i samtyckesversionen; juristen granskar (JURIST_FRAGOR 5). Mercado Pago som manuell metod i Caja visas inte i v1. (WP-03b)

### D-021 · 2026-09-27 · `style` i komponenter bara för geometri som räknas ur data
**Varför:** agendablock placeras efter starttid och längd, och nu-linjen efter klockan; det går inte med klasser utan godtyckliga värden (D-015). **Konsekvens:** lint tillåter `style` i `src/components/**` bara när nycklarna är `top`, `height`, `left` eller `width`. Inga färger eller andra värden. Geometrikonstanter bara i `src/components/agenda/geometry.ts`, testade mot tokens. (WP-12)

### D-020 · 2026-09-27 · Skärmar med fixtures på riktiga routes är stängda i produktion
**Varför:** WP-11–14 byggs före auth och riktig data, men fiktiva bokningar får inte synas publikt. **Konsekvens:** `/app/inicio`, `/app/agenda`, `/app/hoy` och `/[slug]` anropar `notFound()` och har `noindex` när `isDesignLabEnabled()` är falsk (samma grind och `DESIGN_LAB`-flagga som design lab, så de syns i staging). Grinden tas bort i samma PR som kopplar på riktig data (WP-20/21). (WP-11)

### D-019 · 2026-09-27 · Serverns databasåtkomst via `pg` i `src/server/db/` med rollbyte per transaktion
**Varför:** bokning, kund och outbox-rad ska skrivas i en transaktion, "Cualquiera" behöver savepoints efter `23P01`, och samtidighetstestet kräver riktiga anslutningar. **Konsekvens:** `withServiceTx` (`set local role service_role`, alltid explicit `business_id`) för publika flöden, cron och webhooks; `withOwnerTx(userId)` (`set local role authenticated` + JWT-claims) så att RLS gäller för ägarens åtgärder. `DATABASE_URL` bara på servern; på Vercel via Supavisor i transaction mode (port 6543, inga sessionsberoende features). `@supabase/ssr` bara för auth (WP-15, `src/lib/supabase/`). (WP-10)

### D-018 · 2026-09-27 · Ingen date-fns/date-fns-tz; all tidslogik via `dates.ts` (Intl)
**Varför:** WP-04 och granskningen visade att date-fns-tz 3.2.0 ger fel väggtid och offset beroende på värdens tidszon (t.ex. `TZ=Europe/Stockholm`: 2026-03-29T05:00Z blir 03:00 i Santiago i stället för 02:00), och date-fns-kärnan använder lokala `Date`-getters, vilket D-017 förbjuder. `src/lib/format/dates.ts` bygger bara på `Intl.DateTimeFormat` med explicit `timeZone` och är verifierad mot Temporal. **Konsekvens:** ersätter datumraden i D-003 och meningen "date-fns + date-fns-tz behålls" i D-017. Paketen avinstalleras och importer stoppas av gränstestet. Temporal omprövas enligt D-017.

### D-017 · 2026-09-27 · Tid: lokal väggtid ↔ UTC bara via `src/lib/format/dates.ts`
**Varför:** Chiles sommartidsbyten sker vid midnatt, så en dag kan sakna 00:00 (september) eller ha 23:00–23:59 två gånger (april), och bibliotek hanterar det olika. **Konsekvens:** date-fns + date-fns-tz behålls (D-003). Standardregeln är "compatible" (tid som inte finns flyttas fram, tvetydig tid blir första förekomsten); `fromLocalStrict` eller explicit `disambiguation` där annat behövs. Ingen kod använder lokala `Date`-metoder. Temporal omprövas när Node LTS har det utan flagga. (WP-04)

### D-016 · 2026-09-27 · UI-text: ett typat TS-objekt, bara es-CL, inget i18n-bibliotek
**Varför:** ett språk, typade nycklar och parametrar fångar fel vid kompilering, liten bundle. **Konsekvens:** all produkttext (UI, WhatsApp, e-post) finns i `src/i18n/` och ägs av `copywriter-es-cl`. Komponenter tar text som props. Mallarnas variabelordning är kontraktet mot WP-16. Veckodagar och månader ligger i `src/lib/format/` (WP-04), granskade av copywriter. Ett andra språk kräver nytt beslut. (WP-03)

### D-015 · 2026-09-27 · Tailwinds standardtema nollställs, bara projektets tokens finns
**Varför:** hård regel 1 och D-012 ska kontrolleras av verktygen, inte av granskaren. **Konsekvens:** `tokens.css` nollställer color, radius, shadow, text, tracking och leading; varje ny visuell storhet kräver en token (tokens.css + DESIGN.md i samma PR). Spacing och font-weight behålls från Tailwind. (WP-02)

### D-014 · 2026-09-27 · Tenant-integritet i databasen
**Varför:** RLS skyddar mot fel användare men inte mot en serverbugg som med service role kopplar ihop rader från två företag. **Konsekvens:** (1) alla tenant-tabeller har `business_id` och refererar varandra med sammansatta FK `(business_id, id)`, (2) RLS-hjälpfunktioner ligger i schemat `private`, `security definer` med `search_path = ''`, (3) `anon` har inga grants i `public`, `authenticated` får uttryckliga grants per tabell, (4) nya företag skapas bara via `create_business()`. Schemavakten i pgTAP fångar avsteg. (WP-01)

### D-013 · 2026-09-26 · Verktygskedja: Node 24 LTS, npm, exakta versioner, Supabase CLI som dev-beroende
**Varför:** samma verktyg lokalt, i worktrees, i CI och på Vercel, och ingen global installation krävs. **Konsekvens:** `.nvmrc` och `engines` styr Node-versionen, lockfilen checkas in, uppgraderingar görs i egna PR:er och CLI-kommandon körs via `npm run db:*`.

### D-012 · 2026-09-26 · Designen är fastställd och återskapas exakt
**Varför:** premiumkänsla är en del av erbjudandet. **Konsekvens:** `docs/design/reference/*.dc.html` är källan till sanning, bara tokens får användas, och visuell jämförelse krävs innan en skärm är klar.

### D-011 · 2026-09-26 · Startmarknad Santiago, våg 1 Providencia + Ñuñoa
**Varför:** vi har förmedlare på plats; tätheten ger referenser. **Konsekvens:** UI på chilensk spanska, CLP, `America/Santiago`.

### D-010 · 2026-09-26 · Egen kärna, ingen fork
**Varför:** Cal.com är stängt och Cal.diy saknar personal och workflows. Det bästa MIT-projektet saknar personal och resurser, och det projekt som ligger närmast saknar licens. **Konsekvens:** vi bygger själva och får läsa MIT-projekt för mönster (med licenstext om kod kopieras).

### D-009 · 2026-09-26 · Platt pris per företag, inte per person
**Varför:** den tydligaste skillnaden mot AgendaPro. **Konsekvens:** kvoter styr kostnaden (WhatsApp), inte antalet användare.

### D-008 · 2026-09-26 · Vi rör aldrig kundernas pengar
**Varför:** undviker reglering som betalningsförmedlare och Groupon-risken. **Konsekvens:** handpenning via företagets eget Mercado Pago-konto (OAuth); vårt abonnemang via Flow/Mercado Pago-prenumeration.

### D-007 · 2026-09-26 · Ett gemensamt WhatsApp-nummer för plattformen
**Varför:** en Meta-verifiering i stället för en per kund; Tech Provider/Embedded Signup tar veckor till månader. **Konsekvens:** mallar skrivs i företagets namn ("tu hora en Barbería Norte…"). Eget nummer per företag blir en senare premiumfunktion.

### D-006 · 2026-09-26 · Metas Cloud API direkt, ingen BSP
**Varför:** BSP:er lägger på 10–50 % per meddelande. **Konsekvens:** vi bygger webhook, utkorg (outbox) och mallhantering själva.

### D-005 · 2026-09-26 · Differentiering = "Tu agenda se llena sola"
**Varför:** billigare räcker inte; funktioner som fyller tomma timmar syns i ägarens kassa. **Konsekvens:** väntelista i fas 1; horas flash, te echamos de menos, stämpelkort och veckorapport i fas 2.

### D-004 · 2026-09-26 · Ingen marknadsplats i MVP
**Varför:** en marknadsplats utan täthet dör, och det kostar mycket att bygga upp trafik. **Konsekvens:** horas flash går till företagets egna kunder. Marknadsplats omprövas vid några hundra företag i samma kommuner.

### D-003 · 2026-09-26 · Stack: Next.js + Supabase + Vercel
**Varför:** en kodbas, Postgres med RLS och exclusion constraints, låg latens från São Paulo, stark med Claude Code. **Konsekvens:** se [ARCHITECTURE](../tech/ARCHITECTURE.md).

### D-002 · 2026-09-26 · Målgrupp: de klassiska pymes, generellt men sålt vertikalt
**Varför:** datamodellen ska klara alla tjänsteföretag, men säljet börjar i en bransch (barberías/peluquerías) för täthet och referenser.

### D-001 · 2026-09-26 · Arbetsnamn "llena"
**Varför:** knyter an till löftet. **Konsekvens:** namnet definieras bara i `src/config/brand.ts` och `docs/`; det slutgiltiga namnet kontrolleras mot INAPI och domäner.
