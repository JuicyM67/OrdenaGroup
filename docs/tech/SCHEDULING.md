# Schemamotorn

Ägare: `scheduling-engineer`. Kod i `src/server/scheduling/`. Ren logik, fullt testad.

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

**"Cualquiera":** unionen av alla profesionales som utför tjänsten. Vid bokning tilldelas den med minst bokningar den dagen (tiebreak: sort).

**Horas flash:** en `flash_slot` gör att tiden visas med rabatt för den tjänsten. Priset räknas på servern.

## Invarianter (tester krävs)

1. Dubbelbokning är omöjlig även vid samtidiga anrop (DB-constraint; test med två parallella transaktioner).
2. Sommartid: `America/Santiago` byter tid (normalt första lördagen i april och första lördagen i september). Tester för en bokning som korsar bytet, för dagar med 23 och 25 timmar, och för en tid som inte finns eller finns två gånger.
3. Personalens schema kan aldrig vidga företagets.
4. Buffert blockerar nästa bokning men visas inte för kunden som del av tjänsten.
5. `min_notice_minutes` och `max_days_ahead` gäller alltid för kunder, aldrig för ägarens manuella bokning.
6. Allt räknas om i `createBooking()`; klientens val är bara en önskan.

## API (server)

```ts
getAvailableDays(businessId, serviceId, staffId | 'any', from, to): Promise<{ date: string; status: 'available' | 'full' | 'closed'; hasFlash: boolean }[]>
getAvailableSlots(businessId, serviceId, staffId | 'any', date): Promise<{ start: string; staffIds: string[]; flash?: { id: string; discountPct: number } }[]>
createBooking(input): Promise<Result<Booking, 'slot_taken' | 'outside_hours' | 'too_soon' | …>>
moveBooking(id, newStart, newStaffId?) / cancelBooking(id, by: 'owner' | 'customer', reason?)
```

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

**Övergångar i `America/Santiago`** (tzdata-regeln `Chile`: slut "Apr Sun>=2 3:00u", start "Sep Sun>=2 4:00u"). Hela tabellen 2020–2030 finns i `src/lib/format/__fixtures__/santiago-dst.ts` och är underlag för pgTAP-speglingen i WP-10.

| Övergång | UTC | Lokalt | Följd |
|---|---|---|---|
| Slut 2026 | 2026-04-05T03:00Z | 00:00 −03 → 23:00 −04 | lör 2026-04-04 har 25 h, 23:00–23:59 finns två gånger |
| Start 2026 | 2026-09-06T04:00Z | 00:00 −04 → 01:00 −03 | sön 2026-09-06 har 23 h, 00:00–00:59 finns inte, dagen börjar 01:00 |
| Slut 2027 | 2027-04-04T03:00Z | 00:00 −03 → 23:00 −04 | lör 2027-04-03 har 25 h |
| Start 2027 | 2027-09-05T04:00Z | 00:00 −04 → 01:00 −03 | sön 2027-09-05 har 23 h |

Öppettider påverkas inte: 10:00 är 13:00Z under sommartid och 14:00Z under vintertid. En bokning 23:30 + 60 min natten mot 6 sep 2026 visas "23:30 – 01:30", och natten mot 5 apr 2026 "23:30 – 23:30". Hur det visas i UI beslutas i WP-10/UI.

**Rutin när Chile ändrar sommartiden** (senast 2022, med ungefär en månads varsel)
1. Ägaren prenumererar på IANA `tz-announce` och startar rutinen vid en ny release som rör `America/Santiago`.
2. Node-patch med den nya tzdata (`.nvmrc` = `24` följer senaste 24.x i CI och på Vercel). Kontrollera `process.versions.tz`.
3. Uppdatera `__fixtures__/santiago-dst.ts`, DST-testerna och golvet `TZDATA_FLOOR` i `dates.tzdata.test.ts`. Canary-testet (2022-bytet) fångar en för gammal tzdata.
4. Supabase/Postgres har egen tzdata: kör pgTAP-speglingen (WP-10) och följ upp Supabase-uppdateringen separat.
5. Kontrollera framtida bokningar kring de ändrade datumen: instanterna i UTC ändras inte, men deras lokala tid kan ändras.
