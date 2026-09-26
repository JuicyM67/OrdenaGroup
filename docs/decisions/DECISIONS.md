# Beslutslogg (ADR light)

Nya beslut läggs till överst. Format: datum, beslut, varför, konsekvens. Ändra aldrig ett gammalt beslut — skriv ett nytt som ersätter det.

---

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
