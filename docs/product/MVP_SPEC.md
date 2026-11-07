# MVP-specifikation

Mål: en version som **förmedlarna i Santiago kan visa och sälja** inom 6–8 veckor (fas 1), plus de unika funktionerna 4 veckor senare (fas 2).

Varje funktion har ett ID. Arbetspaketen i [BACKLOG](../tasks/BACKLOG.md) refererar till dem.

## Roller

| Roll | Vem | Loggar in |
|---|---|---|
| **Dueño** (ägare) | Äger företaget, betalar abonnemanget | Ja (e-post + magisk länk eller WhatsApp-kod) |
| **Profesional** | Personal (frisör, barberare) | Valfritt i v1: ser sin egen agenda |
| **Cliente** | Slutkund som bokar | Nej. Identifieras via telefonnummer |
| **Vendedor** | Vår förmedlare i fält | Ja, säljarvy (fas 2) |
| **Admin** | Vi | Ja, intern konsol |

---

## Fas 1 — MVP

### F1. Konto och onboarding
- Ägaren skapar konto, anger företagsnamn, kommun, bransch och telefon.
- Guidad uppsättning i 4 steg: tjänster → personal → öppettider → bokningslänk. Varje steg går att hoppa över; förmedlaren kan göra alla steg åt ägaren.
- **Klart när:** ett nytt företag har en fungerande bokningslänk på under 10 minuter.

### F2. Tjänster
- Namn, längd (min), pris (CLP, heltal), buffert efter (min), valfri handpenning (belopp eller %), vilka profesionales utför den, kategori.
- **Klart när:** tjänster visas på bokningssidan i vald ordning.

### F3. Personal och öppettider
- Profesional: namn, färg (från personalpaletten), tjänster, eget schema (får aldrig vara bredare än företagets öppettider), frånvaro och blockeringar (t.ex. lunch).
- Företagets öppettider per veckodag med flera intervall per dag.
- **Klart när:** tillgängligheten respekterar alla lager (företag ∩ personal − frånvaro − bokningar − buffertar).

### F4. Schemamotor och bokning
- Lediga tider beräknas **bara på servern**. Dubbelbokning förhindras i databasen (exclusion constraint).
- Minsta framförhållning (t.ex. 1 h) och max framåt (t.ex. 30 dagar) per företag.
- Tidszon `America/Santiago`, och sommartidsbyten ska vara testade.
- **Klart när:** två samtidiga bokningar av samma tid ger en lyckad och en med ett tydligt fel.

### F5. Publik bokningssida (kund, mobil)
- URL: `/{slug}`. Flöde: tjänst (väljs på profilsidan eller via `?flash=`/`?oferta=`, D-066) → profesional (eller "Cualquiera") → dag → tid → namn + telefon → bekräfta.
- Inget konto. Samtyckesrutor (villkor obligatoriskt, marknadsföring valfritt och aldrig förkryssat).
- Visar avbokningspolicy **innan** bekräftelse.
- Design: `docs/design/reference/Reserva.dc.html`.
- **Klart när:** en bokning tar ≤ 3 skärmar och fungerar på en billig Android-telefon över 4G.

### F6. Agenda för ägaren
- Desktop: veckovy (design `Agenda.dc.html`) och dagvy med en kolumn per profesional.
- Mobil: "Hoy" (design `Hoy.dc.html`).
- Skapa, flytta och avboka bokningar manuellt (walk-ins). Markera *Llegó* / *No vino*.
- **Klart när:** ägaren kan sköta en hel dag från mobilen.

### F7. WhatsApp-bekräftelser och påminnelser
- Ett gemensamt plattformsnummer. Mallar: bekräftelse, påminnelse 24 h innan med knapparna *Confirmo / Necesito cambiar*, avbokning, ombokning.
- E-post som reserv om WhatsApp misslyckas.
- Kunden kan avboka och flytta via en personlig länk (token), inom företagets avbokningsfönster.
- **Klart när:** varje bokning ger bekräftelse inom 1 minut, och påminnelsen går ut 24 h innan (±5 min).

### F8. Väntelista *(unik funktion, med redan i fas 1)*
- När en dag är full kan kunden skriva upp sig (tjänst, dag, eventuellt profesional).
- När någon avbokar skickas en WhatsApp till de på väntelistan i turordning, eller till alla samtidigt (företaget väljer). Först att trycka *Sí* får tiden; de andra får "ya fue tomada".
- **Klart när:** en avbokning fylls automatiskt utan att ägaren gör något.

### F9. Kundregister
- Kund per företag, nyckel = telefonnummer (E.164). Historik, antal besök, antal no-shows, anteckningar, samtycken.
- **Klart när:** ägaren ser allt om en kund från bokningskortet.

### F10. Enkel kassa
- Markera bokning som betald: efectivo, débito/crédito (egen terminal), transferencia, Mercado Pago.
- Dagens, veckans och månadens intäkter.
- **Klart när:** summorna stämmer med bokningarna.

### F11. Handpenning via Mercado Pago (valfritt per företag)
- Företaget kopplar sitt **eget** Mercado Pago-konto via OAuth. Kunden betalar handpenningen i bokningsflödet; bokningen bekräftas först efter godkänd betalning (webhook).
- **Klart när:** pengarna hamnar på företagets konto och bokningen syns som "Abono pagado".

### F12. Dataskydd och villkor
- Integritetspolicy, villkor, biträdesavtal i villkoren, export och radering av kunddata, register över behandlingar. Se [COMPLIANCE](../legal/COMPLIANCE.md).

---

## Fas 2 — Det som gör oss unika + intäkter

### F13. Horas flash
- Ägaren markerar lediga tider med rabatt med ett tryck. Systemet skapar en länk och en story-bild (design `HoraFlash.dc.html`, 1080×1920) och kan skicka till kunder med marknadsföringssamtycke.
- Rabatten gäller bara den tiden. Flash-tider märks i agendan.

### F14. Te echamos de menos
- Per tjänst: "påminn efter X veckor" (t.ex. 5 veckor för klippning). Skickas bara till kunder med samtycke, max 1 gång per period.

### F15. Digitalt stämpelkort
- "Var N:te besök gratis/rabatterat", räknas automatiskt per telefonnummer vid *Llegó*.

### F16. Veckorapport "recuperaste"
- Måndagsraden i appen och ett WhatsApp till ägaren: återvunna timmar och pengar från väntelista och horas flash (se design `Main.dc.html`, hero).

### F17. Abonnemang och fakturering
- Planer (se [GO_TO_MARKET](../gtm/GO_TO_MARKET.md)), 30 dagars provperiod, Flow- eller Mercado Pago-prenumeration, factura electrónica till kunden, kvoter för WhatsApp och tilläggspaket.

### F18. Säljarvy för förmedlare
- Egna företag, status i trattens steg, provision, referral-länk.

### F19. Intern admin
- Alla företag, planer, frysning/förlängning av provperiod, meddelandekö, fel.

---

## Senare (ej i MVP)
AI-assistent i WhatsApp, automatisk boleta (OpenFactura/Bsale), dagvy med resurser (stolar, rum), flera lokaler, Webpay/Fintoc, konsumentmarknadsplats för horas flash, native-app.
