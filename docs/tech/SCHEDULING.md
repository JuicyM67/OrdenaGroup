# Schemamotorn

Ägare: `scheduling-engineer`. Kod i `src/server/scheduling/` (tillgänglighet, ren kärna i `core/`) och `src/server/bookings/` (skapa, flytta, avboka). Databasåtkomst via `src/server/db/` (D-019, ägs av `db-engineer`). Ren logik, fullt testad.

## Tillgänglighet för en tjänst, en profesional och en dag

```
fönster  = business_hours(dag) ∩ staff_hours(dag)                 -- personal snävar in, vidgar aldrig
         − time_off (företag + personal) som överlappar
         − bookings.blocked (aktiva statusar)
         − [nu, nu + min_notice_minutes]
behov    = duration_min + buffer_after_min
slots    = starttider i varje fritt fönster där start + behov ≤ fönstrets slut
```

**Rutnät:**
- Starttider läggs på `slot_interval_minutes` (default 15) räknat från fönstrets start, så att tider linjerar ("10:00, 10:15 …").
- Visa inte fler än ca 12 tider per dag på kundsidan. Välj jämnt fördelade och föredra tider som inte lämnar luckor kortare än företagets kortaste tjänst ("tight packing").

**"Cualquiera":** unionen av alla profesionales som utför tjänsten. Vid bokning tilldelas den med minst bokningar den dagen (tiebreak: sort, sedan id).

Exakt algoritm och policy: se "Algoritm och policy (WP-10)" nedan.

**Horas flash:** en `flash_slot` gör att tiden visas med rabatt för den tjänsten. Priset räknas på servern.

## Invarianter (tester krävs)

1. Dubbelbokning är omöjlig även vid samtidiga anrop (DB-constraint; test med två parallella transaktioner).
2. Sommartid: `America/Santiago` byter tid (normalt första lördagen i april och första lördagen i september). Tester för en bokning som korsar bytet, för dagar med 23 och 25 timmar, och för en tid som inte finns eller finns två gånger.
3. Personalens schema kan aldrig vidga företagets.
4. Buffert blockerar nästa bokning men visas inte för kunden som del av tjänsten.
5. `min_notice_minutes` och `max_days_ahead` gäller alltid för kunder, aldrig för ägarens manuella bokning.
6. Allt räknas om i `createBooking()`; klientens val är bara en önskan.

## API (server, WP-10)

Rena funktioner i `src/server/scheduling/core/*` tar en ögonblicksbild (öppettider, personal, frånvaro, upptagna intervall, inställningar och `now`) och ger slots eller dagstatus. DB-lagret (`load.ts`, `src/server/bookings/*`) hämtar ögonblicksbilden och skriver. Servermoduler börjar med `import "server-only"`, och det finns inget barrel-index (import per modul).

**Regel för indata: request från klienten, kontext från servern.**
Varje funktion tar två argument, `(request, ctx)`:
- `request` innehåller bara det som valts i ett formulär: tjänst, profesional, tid, kunduppgifter och länkens token. Schemana i `src/server/scheduling/schemas.ts` är strikta. Okända fält ger `invalid_input`, till exempel `actor`, `now`, `source`, `audience`, `limit`, `businessId` eller ett pris.
- `ctx: { businessId, actor, now }` sätts bara av servern och byggs aldrig av formulärdata:
  - `businessId` kommer från sluggen i den publika vägen, eller från ägarens verifierade medlemskap.
  - `actor` kommer från den verifierade sessionen (WP-15) och är annars `{ kind: "customer" }`.
  - `now` är `systemClock()`.

  En ogiltig kontext är ett programmeringsfel och kastar `TypeError`.
- Allt annat härleds på servern:
  - `audience` följer aktören: kund ger kundvy, ägare ger ägarvy.
  - Kunden får alltid högst 12 tider, och ägaren alla.
  - `source` är `web` för kund och `manual` för ägare. Servern kan sätta `ctx.source = "waitlist"` (WP-23).
  - `cancelBooking` har inget `by`; det följer aktören.

**Övriga regler:**
- **Klockan injiceras.** Enda stället som läser systemklockan är `src/server/scheduling/clock.ts` (`systemClock()`).
- **Förväntade fel returneras** som `Result<T, E>` (samma form som `ParseResult` i `@/lib/format/result`), och ett förväntat fel rullar tillbaka hela transaktionen. Infrastrukturfel kastas som `SchedulingInfraError` med bara SQLSTATE (inga persondata, ingen token, ingen SQL). UI mappar det till `errores.reserva.network`.
- **Instanter** är ISO-strängar i UTC. Lokala datum är `LocalDate` och lokala tider `LocalTime`.
- **Transaktion per aktör:**
  - Kund: `withServiceTx`, alltså service role med `business_id = $1` i varje fråga. Det kontrolleras statiskt och dynamiskt i `src/server/tenant-queries.db.test.ts`.
  - Ägare: `withOwnerTx`, alltså authenticated och RLS. Rollen och `request.jwt.claims`/`request.jwt.claim.sub`/`request.jwt.claim.role` sätts lokalt, så en förorenad session vinner aldrig.
  - Varje transaktion har `statement_timeout` 10 s, `lock_timeout` 3 s (överskridet lås ger infrastrukturfel 55P03) och `idle_in_transaction_session_timeout` 15 s.
- **Kundens flytt och avbokning** identifierar bokningen bara med länkens token (`manageToken`). Bokningen slås upp på `business_id = $1 and manage_token_hash = sha256(token)`. Fel token ger `not_found`. Bara ägaren använder `bookingId`.
- **Företagets status:** när `businesses.status <> 'active'` får kundens tillgänglighet, `createBooking` och flytt `business_unavailable`. Kunden kan fortfarande avboka, och ägaren påverkas inte.

```ts
type EngineContext = { businessId: string; actor: { kind: "customer" } | { kind: "owner"; userId: string }; now: Date };

// src/server/scheduling/availability.ts
getAvailableDays({ serviceId, staffId /* uuid | "any" */, from, to /* ≤ 62 dagar */ }, ctx)
  : Promise<Result<{ date: LocalDate; status: "available" | "full" | "closed"; hasFlash: false }[], "invalid_input" | "service_not_offered" | "business_unavailable">>
getAvailableSlots({ serviceId, staffId, date }, ctx)       // kund högst 12, ägare alla
  : Promise<Result<{ start: string; time: LocalTime; end: string; staffIds: string[] }[], "invalid_input" | "service_not_offered" | "business_unavailable">>

// src/server/bookings/create.ts, move.ts, cancel.ts
createBooking({ serviceId, staffId, start, customer: { phone, name, email? }, notes? }, ctx & { source?: "waitlist" })
  : Promise<Result<CreatedBooking /* inkl. manageToken en gång */, BookingError>>
moveBooking({ manageToken, newStart, newStaffId? } /* kund */ | { bookingId, newStart, newStaffId? } /* ägare */, ctx)
  : Promise<Result<{ booking: MovedBooking; freed: { staffId; blocked: Interval } }, BookingError>>
cancelBooking({ manageToken, reason? } /* kund */ | { bookingId, reason? } /* ägare */, ctx)
  : Promise<Result<{ bookingId; freed: { staffId; blocked: Interval } | null }, BookingError>>
```

- `closed` betyder ingen arbetstid alls den dagen (stängt, eller all personal ledig), eller för kund ett datum före idag eller efter `idag + max_days_ahead`. `full` betyder att arbetstid finns men inga lediga tider (F8: väntelistan erbjuds bara här). `available` betyder minst en tid.
- `AvailableSlot.start` är det enda som skickas tillbaka till `createBooking`. `time` är den färdiga etiketten i företagets tidszon. `end` är `start + duration_min`, alltså utan buffert (inv. 4). `staffIds` är lediga profesionales i tilldelningsordning.
- `hasFlash` är alltid `false` och `flash` saknas tills WP-30.
- **Handpenning (R9):** alla bokningar skapas som `confirmed` med `deposit_clp = 0` och `discount_clp = 0` tills WP-25/WP-30, även för tjänster med `deposit_kind <> 'none'`.
- Kunden hittas eller skapas på `(business_id, phone_e164)` i bokningens transaktion. En befintlig kunds namn och e-post skrivs aldrig över, anonymiserade kunder (`anonymized_at` satt) återanvänds aldrig, och inga `consent_*` skrivs (WP-20/WP-26). En ny kundrad finns bara kvar om bokningen lyckas. WP-26 ska nolla `phone_e164` vid anonymisering. Annars blockerar den gamla raden numret, och bokningen ger ett infrastrukturfel.
- Länk-token: 32 slumpbyte som base64url returneras en gång i `CreatedBooking.manageToken`. Bara SHA-256 sparas (`manage_token_hash`). Token loggas aldrig.
- Kunden får flytta och avboka fram till `start − cancel_window_hours`, ägaren alltid. `cancelBooking` är idempotent. `moveBooking` behåller längd, buffert och pris. Väntelistan (WP-23) anropas inte av motorn. Anroparen får det frigjorda intervallet (`freed`).

### Felkoder (kontrakt mot WP-20/21, texter i `errores.reserva`/`errores.agenda`, WP-03b)

| Kod | När |
|---|---|
| `invalid_input` | Zod-fel i request, till exempel ett okänt fält, eller `bookingId` från kund eller token från ägare |
| `service_not_offered` | Tjänsten eller profesionalen finns inte i företaget, är inaktiv eller utför inte tjänsten (även ägare mot ett annat företag, via RLS) |
| `business_unavailable` | Kund: företaget är inte aktivt (`businesses.status <> 'active'`), vid tillgänglighet, bokning och flytt |
| `outside_hours` | Tiden ligger inte i ett arbetsfönster (öppettider ∩ personal − frånvaro), är inte en hel minut, eller ligger (för kund) inte på rutnätet |
| `too_soon` | Kund: `start < now + min_notice_minutes` |
| `too_far` | Kund: lokalt datum efter `idag + max_days_ahead` |
| `slot_taken` | Tiden ryms i arbetstiden men krockar med en bokning eller buffert, `23P01` från `no_overlap`, eller alla "any"-kandidater tagna |
| `not_found` | Bokningen finns inte i företaget, eller kundens token matchar ingen bokning där (move/cancel, även via RLS) |
| `invalid_status` | Move/cancel på något annat än `confirmed`/`pending_payment` (redan avbokad ger ok vid cancel) |
| `outside_cancel_window` | Kund senare än `cancel_window_hours` före start |

## Algoritm och policy (WP-10)

1. **Arbetsfönster per profesional och lokal dag.** Öppettiderna är väggtid. Varje intervall `[start_time, end_time)` konverteras med `fromLocal(date, t, tz)` ("compatible") i båda ändar, och `24:00:00` blir nästa dags 00:00. Intervallet får alltså den verkliga längd som konverteringen ger. En starttid som inte finns (sön 6 sep 2026 00:30) flyttas fram (01:30). En tvetydig tid (lör 4 apr 2026 23:30) blir första förekomsten (−03). Därefter snitt med `staff_hours`: en profesional utan rader följer företaget, och en med rader arbetar bara inom snittet (en veckodag utan rad = ledig). Sedan dras `time_off` (företag + profesional) och `blocked` för bokningar med status `pending_payment`/`confirmed`/`completed` bort. Fönster slås aldrig ihop över midnatt.
2. **Behov** = `duration_min + buffer_after_min` i verkliga minuter. En tid är giltig om `[start, start + behov)` ryms i ett fritt fönster.
3. **Rutnät.** Kandidaterna är `arbetsfönstrets start + k · slot_interval_minutes` (verklig tid), plus starten på varje fritt fönster som börjar mitt i arbetsfönstret (direkt efter en bokning, frånvaro eller buffert). Fönstrets start ger "tight packing" utan luckor och avrundas uppåt till hel minut, så en frånvaro som slutar 14:30:30 ger 14:31. Exempel: 10:00–19:00, intervall 15 och 35 min ger 10:00 … 18:15 (34 tider).
4. **Kund.** `start ≥ now + min_notice_minutes`, och det lokala datumet ligger i `[idag, idag + max_days_ahead]` räknat i kalenderdagar. Finns fler än `limit` (12) tider väljs de deterministiskt:
   - Först "bra" tider, alltså tider som varken före eller efter sig lämnar en lucka i det fria fönstret som är större än 0 men kortare än företagets kortaste aktiva tjänst. De väljs jämnt fördelade i tid, med närmaste kandidat till `limit` jämnt utspridda mål mellan första och sista bra tid.
   - Räcker de bra inte, fylls det på med den övriga tid som ligger längst från de redan valda.

   `createBooking` godtar alla kandidater (före gallringen), så en tid som visats avvisas aldrig som `outside_hours`.
5. **Ägare.** Ingen `min_notice`, ingen horisont och ingen gallring (inv. 5). Tider tidigare samma dag och bakåt i tiden går att boka. Öppettider, frånvaro och överlapp gäller (`outside_hours`/`slot_taken`). Starten måste vara en hel minut men behöver inte ligga på rutnätet. Att "forzar" utanför öppettiderna finns i IDEAS.
6. **"Cualquiera".** Unionen över aktiva profesionales med `staff_services` för tjänsten, grupperad per instant. Ordningen är minst antal aktiva bokningar samma lokala dag, sedan `sort`, sedan `id`. Vid bokning provas kandidaterna i den ordningen, en i taget i en savepoint. `23P01` betyder nästa kandidat, och när alla är slut blir svaret `slot_taken`.
   **Serialisering:**
   - Före insert eller update låses kandidaternas profesionales med `pg_advisory_xact_lock` (`src/server/db/locks.ts`). Låset gäller på transaktionsnivå, så det fungerar i Supavisor transaction mode. Låsen tas en i taget i sorterad ordning.
   - Två krockande skrivningar ger då 23P01 och inte deadlock. Utan låset kan exclusion constraint ge 40P01, eftersom båda transaktionerna väntar på den andras ännu inte committade indexpost.
   - Blir det ändå 40P01 eller 40001 körs hela transaktionen om en gång, och därefter blir svaret `slot_taken`.
7. **Pris.** `price_clp = services.price_clp` läses i samma transaktion som insert. Klientens pris finns inte i indata.
8. **Dubbel timme i april.** Tider i den upprepade timmen (23:00–23:59 första lördagen i april) visas för båda förekomsterna. De har olika `start` men samma etikett `time`. Det rör bara företag med öppet efter 23:00 den dagen.

**Frågor per anrop:** `loadSnapshot` gör högst 6 frågor oberoende av antalet dagar: företag + tjänst, personal, öppettider, personaltider, frånvaro och bokningar. `getAvailableDays` för en månad gör alltså 6 frågor.

**Samtidighet (F4, invariant 1).** `src/server/bookings/concurrency.db.test.ts` kör mot lokal Supabase (`npm run db:start`, sedan `npm run test:integration`, och i CI-jobbet `db`):
- Två råa `pg.Client`. Testet väntar tills klient 2 syns som låsväntande i `pg_stat_activity`. När klient 1 committar får klient 2 `23P01` (`no_overlap`), och när klient 1 rullar tillbaka lyckas klient 2.
- Två parallella `createBooking` av samma tid ger exakt en `ok` och en `slot_taken`, i 20 av 20 varv.
- "Cualquiera" med tre parallella och två lediga ger två `ok` och en `slot_taken`.
- Buffert samtidigt: exakt en lyckas.

`supabase/tests/042_bookings_concurrency.test.sql` är kvar som skip och pekar hit.

## Väntelista

- `onSlotFreed(booking)` hittar väntande poster för samma dag och tjänst (och profesional, om angiven) med en tid som nu passar.
- `sequential`: erbjud nr 1, vänta `offer_ttl` (default 20 min, kortare om tiden ligger inom 3 h), sedan nästa.
- `broadcast`: erbjud alla; första *Sí* vinner (transaktion + constraint), övriga får "ya fue tomada".
- Källa `waitlist` sparas på bokningen och räknas i veckorapporten.

## Tidszon och sommartid

Beslut: **D-017** (lokal väggtid ↔ UTC bara via `src/lib/format/dates.ts`, disambiguering "compatible"). Primitiverna byggdes i WP-04.

**Regler**
- Instanter lagras och skickas som UTC (`timestamptz`, ISO med `Z`/offset). Datum och tider resoneras i företagets tidszon (`businesses.timezone`, i MVP `America/Santiago`).
- Lokal tid konverteras **bara** via `dates.ts`: `toWallClock`/`toLocalDate` (UTC → lokal) och `fromLocal`/`fromLocalStrict` (lokal → UTC). Ingen annan kod använder lokala `Date`-metoder (`getHours`, `setHours`, `toLocale*` …), `new Date()` utan argument eller `Date.now()`. Klockan (`now`) injiceras.
- Standard för `fromLocal` är `"compatible"` (Temporal/RFC 5545): en tid som inte finns flyttas fram med glappets längd, en tvetydig tid blir den första förekomsten (−03). `"earlier"`/`"later"` väljs explicit. Kundinmatning som inte får gissas använder `fromLocalStrict` (`nonexistent_local_time` / `ambiguous_local_time`).
- En lokal dag är `localDayRange(date, tz)` = [start, end). Den kan vara 23, 24 eller 25 h och kan börja 01:00. Räkna kalenderdagar med `addLocalDays`, aldrig med +24 h.
- **date-fns och date-fns-tz används inte** (D-018): inte för konvertering, formatering eller datumaritmetik, och de är inte beroenden i projektet. All tidslogik går via `dates.ts`, som bara bygger på `Intl.DateTimeFormat#formatToParts` med explicit `timeZone`. Bakgrund: i date-fns-tz 3.2.0 tolkar `getTimezoneOffset(tz, date)` `date` som lokal väggtid via värdens lokala getters, och `formatInTimeZone`/`toZonedTime` ger fel väggtid när den hamnar i ett sommartidsglapp i *värdens* tidszon. Verifierat, en instant per värdzon, där Santiago-tiden 02:00 ligger i värdens glapp: med `TZ=Europe/Stockholm` blir 2026-03-29T05:00Z "03:00" i stället för "02:00"; med `TZ=America/Los_Angeles` blir 2026-03-08T05:00Z "03:00" i stället för "02:00" (med `TZ=UTC` blir båda rätt, så felet syns inte i CI).

**Övergångar i `America/Santiago`** (tzdata-regeln `Chile`: slut "Apr Sun>=2 3:00u", start "Sep Sun>=2 4:00u"). Hela tabellen 2020–2030 finns i `src/lib/format/__fixtures__/santiago-dst.ts`. Den speglas i `supabase/tests/061_santiago_dst_mirror.test.sql` (offset före och vid varje övergång och dagslängd 23/25 h i Postgres tzdata), och `src/server/scheduling/dst-mirror.test.ts` kontrollerar att SQL-filen och fixturen är identiska.

| Övergång | UTC | Lokalt | Följd |
|---|---|---|---|
| Slut 2026 | 2026-04-05T03:00Z | 00:00 −03 → 23:00 −04 | lör 2026-04-04 har 25 h, 23:00–23:59 finns två gånger |
| Start 2026 | 2026-09-06T04:00Z | 00:00 −04 → 01:00 −03 | sön 2026-09-06 har 23 h, 00:00–00:59 finns inte, dagen börjar 01:00 |
| Slut 2027 | 2027-04-04T03:00Z | 00:00 −03 → 23:00 −04 | lör 2027-04-03 har 25 h |
| Start 2027 | 2027-09-05T04:00Z | 00:00 −04 → 01:00 −03 | sön 2027-09-05 har 23 h |

Öppettider påverkas inte: 10:00 är 13:00Z under sommartid och 14:00Z under vintertid. En bokning 23:30 + 60 min natten mot 6 sep 2026 visas "23:30 – 01:30", och natten mot 5 apr 2026 "23:30 – 23:30". Motorn skapar aldrig en bokning som korsar midnatt, eftersom fönster inte slås ihop över dygnsgränsen (policy punkt 1). Exemplen gäller alltså bara hur ett sådant intervall skulle visas.

**Rutin när Chile ändrar sommartiden** (senast 2022, med ungefär en månads varsel)
1. Ägaren prenumererar på IANA `tz-announce` och startar rutinen vid en ny release som rör `America/Santiago`.
2. Node-patch med den nya tzdata (`.nvmrc` = `24` följer senaste 24.x i CI och på Vercel). Kontrollera `process.versions.tz`.
3. Uppdatera `__fixtures__/santiago-dst.ts`, DST-testerna och golvet `TZDATA_FLOOR` i `dates.tzdata.test.ts`. Canary-testet (2022-bytet) fångar en för gammal tzdata.
4. Supabase/Postgres har egen tzdata: uppdatera raderna i `supabase/tests/061_santiago_dst_mirror.test.sql` (samma som fixturen, `dst-mirror.test.ts` larmar annars), kör `npm run test:db` och följ upp Supabase-uppdateringen separat.
5. Kontrollera framtida bokningar kring de ändrade datumen: instanterna i UTC ändras inte, men deras lokala tid kan ändras.
