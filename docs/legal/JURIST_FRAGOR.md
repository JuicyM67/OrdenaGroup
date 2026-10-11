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
