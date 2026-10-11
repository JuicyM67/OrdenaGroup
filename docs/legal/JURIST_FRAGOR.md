# Frågor till jurist (före pilot, WP-27)

Samlade från säkerhetsgranskningen av WP-03 (2026-09-27). Texterna finns i `src/i18n/es-CL.ts` (`reserva.consentimientos`, `reserva.antesDeConfirmar`, `whatsappSesion`, `email`) och `docs/content/`. Samtyckesversion `2026-10-v1` är ett utkast.

1. **Villkorsrutan och WhatsApp.** Rutan säger "Acepto los términos … y recibir por WhatsApp la confirmación y los recordatorios de esta hora." Ska meningen vara samtycke eller upplysning (rättslig grund: avtalets fullgörande)? Alternativ: flytta den helt till upplysningen vid telefonfältet.
2. **Roller och överföringar.** Företaget är personuppgiftsansvarigt, plattformen biträde. Hur ska upplysningen lyda ("Tus datos los trata {negocio}; la plataforma los procesa por encargo.")? Överföring till Meta (WhatsApp, USA) och till servrar i São Paulo (Supabase/Vercel). Integritetspolicy och biträdesavtal.
3. **Marknadsföringsrutan.** Är "ofertas y novedades" tillräckligt specifikt för horas flash och "te echamos de menos"? Gäller BAJA per företag eller för alla företag på det gemensamma numret (D-007)?
4. **Känsliga uppgifter i tjänstenamn.** Kinesiologer och skönhet: tjänstenamn kan avslöja hälsa eller intima uppgifter när de skickas via WhatsApp/e-post. Räcker en regel om neutrala namn, eller behövs en inställning som döljer tjänsten?
5. **SERNAC/Ley 19.496.** Bekräftelsens innehåll: säljarens identitet ("gestionada por … para …"), retracto, villkor vid handpenning (F11), "sin costo" i avbokningstexten.
6. **Bevisning av samtycke.** Arkiv per version och append-only-logg (WP-26): räcker det, och hur länge ska loggen sparas?
7. **Export och radering via kundlänken** (WP-26): krav på extra verifiering (engångskod) eftersom länken kan vidarebefordras.

## Tillägg efter granskningen av WP-03b (2026-09-27)

8. **Handpenningens villkor (D-022, D-023):** räcker texten i `abono.reserva.condiciones`? Behövs en tidsfrist för återbetalningen ("dentro de X días hábiles")? Hur förhåller sig en behållen handpenning till ångerrätten (art. 3 bis) och kraven på förverkandeklausuler i Ley 19.496? Kan företaget behålla handpenningen vid no-show utan särskilt avtal?
9. **Skriftlig bekräftelse utan e-post:** räcker en WhatsApp-bekräftelse med länk till `r/[token]` där villkoren står?
10. **Manuellt samtycke (`manual-2026-10-v1`):** räcker ägarens intygande som bevis? Är ett stående samtycke ("esta hora y las próximas") giltigt? Hur fullgörs informationsplikten för en kund som aldrig sett bokningssidan? Behövs samtycke alls för transaktionsmeddelanden?
11. **Väntelistan:** är aviseringen transaktionell eller marknadsföring? Hur länge får en anmälan sparas?
12. **Anteckningar och ansvar:** om ett företag i vårdnära bransch ändå skriver hälsouppgifter i kundanteckningar, vilket ansvar har plattformen som biträde? Räcker hjälptexten, eller behövs ett förbud i villkoren/biträdesavtalet?
13. **Sen betalning:** plattformen visar "{negocio} te devolverá el abono" men betalar inte själv. Krävs mer av plattformen (påminnelse till företaget, tidsfrist)?

## Värdebevis i marknadsplatsen (WP-69, D-057, bara SE) — före skarp lansering

14. **Giltighetstid:** räcker 12 månader (sista dagen 23:59 i företagets tidszon)? Får företaget behålla värdet efter utgång?
15. **Ångerrätt (lag 2005:59):** "Ångra köp" ger full återbetalning t.o.m. dag 14 efter köpet om värdebeviset inte är använt. Förloras ångerrätten om behandlingen genomförs inom 14 dagar utan uttryckligt samtycke före start — behövs en ruta vid bokning med värdebevis?
16. **No-show med värdebevis:** räknas som inlöst (som no-show behåller betalningen, D-044). Skäligt?
17. **Moms och kvitto:** enfunktionsvoucher (moms vid försäljning hos företaget), kassaregisterkrav för onlineförsäljning, moms på plattformens avgift (1 %).
18. **Marknadsplatsens ansvar:** räcker "Säljs av {företag}" + direct charge (företaget är säljare, pengarna går till företaget) för att plattformen inte ska ses som säljare? Vad händer om företaget stänger med oinlösta värdebevis?
19. **Radering av ett företag med värdebevis:** raderingen blockeras så länge det finns oanvända värdebevis (de måste återbetalas först). När företaget raderas försvinner också köpen (`voucher_orders`) och värdebevisen ur vår databas. Behöver plattformen bevara köpunderlaget (bokföringsplikt 7 år, eller som underlag vid tvist) trots att företaget är säljaren — och i så fall avidentifierat eller med köparens konto-id?

## Presentkort hos ett företag (WP-77, D-058, bara SE) — före skarp lansering

20. **Giltighet och preskription:** Konsumentverket anser att presentkort bör gälla minst ett år och att villkoren ska framgå tydligt vid köpet; allmän preskription är 10 år (preskriptionslagen 1981:130) om inget annat avtalats. Räcker 24 månader + villkorstexten vid köpet (rutan är aldrig förkryssad)? Får företaget behålla restvärdet efter utgång?
21. **Ångerrätt (lag 2005:59):** "Ångra köp" ger full återbetalning t.o.m. dag 14 efter köpet om presentkortet är helt oanvänt. Upphör ångerrätten när kortet använts delvis? Vi föreslår: full återbetalning om oanvänt, annars ingen ångerrätt.
22. **Moms (mervärdesskattelagen 2023:200, voucherreglerna):** vi behandlar presentkortet som en flerfunktionsvoucher (ingen skattesats vid försäljning, moms när det löses in). Är det en flerfunktionsvoucher även när alla salongens tjänster har 25 % moms (då kan det vara en enfunktionsvoucher med moms vid försäljning)? Vad gäller om salongen har både momsfria (t.ex. legitimerad vård) och momspliktiga tjänster? Moms på restvärde som förfaller?
23. **Bokföring och kassaregister:** räcker Stripes kvitto + vår kassavy (sålt = skuld, inlöst = betalning på bokningen) som underlag för salongen? Behöver onlineförsäljningen av presentkort registreras i salongens kassaregister?
24. **Konkurs/upphörande:** vad gäller kunderna om salongen stänger med utestående presentkort (radering av företaget blockeras så länge giltiga kort har saldo, men pengarna ligger hos salongen)? Behövs en text i villkoren?
