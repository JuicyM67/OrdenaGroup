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
