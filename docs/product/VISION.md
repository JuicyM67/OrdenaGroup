# Vision och tankesätt

> Läs detta innan du fattar ett produktbeslut. När något är oklart i en spec: välj det alternativ som ligger närmast principerna här.

## Vad vi bygger

Ett **enkelt, prisvärt och premiumkänsligt bokningssystem för de klassiska pymes i Chile**: barberare, frisörer, manikyr, massage, estetik, kinesiologer, personliga tränare. Tänk AgendaPros grundplaner, fast enklare, vackrare och billigare.

**Arbetsnamn:** `llena` (från "tu agenda se llena sola"). Namnet är inte beslutat, så håll det på ett enda ställe i koden (`src/config/brand.ts`).

## Löftet

> **"Tu agenda se llena sola."**
> Färre tomma timmar och färre uteblivna besök, utan att ägaren behöver skriva till någon.

Allt vi bygger ska antingen göra bokningen enklare eller hjälpa löftet. Funktioner som inte gör något av det väntar.

## Varför vi vinner

AgendaPro och Reservo gör grunderna bra, men de:
- tar betalt **per person** och tar extra för WhatsApp och tillägg,
- är byggda för mellanstora center och upplevs tunga av en ensam barberare,
- gör inget aktivt för att **fylla** agendan.

Vi vinner på fyra saker samtidigt:

1. **Agendan fyller sig själv:** väntelista som automatiskt erbjuder avbokade tider, *horas flash* (rabatterade lediga tider till egna kunder), *te echamos de menos* (påminnelse till kunder som inte kommit tillbaka) och digitalt stämpelkort.
2. **Premium design som känns enkel.** Ägaren ska vilja visa appen för sina kunder.
3. **Platt pris för hela salongen**, med WhatsApp inkluderat.
4. **Människor på plats i Santiago** som sätter upp allt åt kunden ("te lo dejamos listo") och support via WhatsApp på chilensk spanska.

## Designprinciper för produkten

- **Mobil först.** Ägaren står med saxen i handen, och kunden bokar från Instagram.
- **Tre tryck till en bokning** för kunden, utan konto och utan lösenord.
- **Ingenting kräver en manual.** Om en funktion behöver förklaras är den för komplicerad för version 1.
- **Visa pengarna.** Varje måndag: *"La semana pasada recuperaste 4 horas ($72.000)."* Det är både produktens bästa säljargument och bästa skydd mot uppsägning.
- **WhatsApp är huvudkanalen**, e-post är reserv.
- **Vi rör inte kundernas pengar.** Handpenning går direkt till företagets eget Mercado Pago-konto.

## Vad vi medvetet INTE bygger nu

Marknadsplats för konsumenter, lager, provisioner för personal, flera lokaler, egen native-app, automatisk boleta, AI-chatbot. Allt detta finns i [ROADMAP](./ROADMAP.md) för senare. **Säg nej till scope creep.**

## Hur vi arbetar

- Specifikation före kod. Plan före implementation.
- Små steg som går att visa för en riktig salongsägare.
- Designen är redan bestämd (`docs/design/`). Den återskapas exakt, den tolkas inte.
- Säkerhet och dataskydd är krav från dag ett (Ley 21.719 gäller från 1 december 2026).
- Mät: aktiverade konton, första bokning inom 7 dagar, no-show-grad och återvunna timmar.
