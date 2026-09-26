# Frågor till jurist (före pilot, WP-27)

Samlade från säkerhetsgranskningen av WP-03 (2026-09-27). Texterna finns i `src/i18n/es-CL.ts` (`reserva.consentimientos`, `reserva.antesDeConfirmar`, `whatsappSesion`, `email`) och `docs/content/`. Samtyckesversion `2026-10-v1` är ett utkast.

1. **Villkorsrutan och WhatsApp.** Rutan säger "Acepto los términos … y recibir por WhatsApp la confirmación y los recordatorios de esta hora." Ska meningen vara samtycke eller upplysning (rättslig grund: avtalets fullgörande)? Alternativ: flytta den helt till upplysningen vid telefonfältet.
2. **Roller och överföringar.** Företaget är personuppgiftsansvarigt, plattformen biträde. Hur ska upplysningen lyda ("Tus datos los trata {negocio}; la plataforma los procesa por encargo.")? Överföring till Meta (WhatsApp, USA) och till servrar i São Paulo (Supabase/Vercel). Integritetspolicy och biträdesavtal.
3. **Marknadsföringsrutan.** Är "ofertas y novedades" tillräckligt specifikt för horas flash och "te echamos de menos"? Gäller BAJA per företag eller för alla företag på det gemensamma numret (D-007)?
4. **Känsliga uppgifter i tjänstenamn.** Kinesiologer och skönhet: tjänstenamn kan avslöja hälsa eller intima uppgifter när de skickas via WhatsApp/e-post. Räcker en regel om neutrala namn, eller behövs en inställning som döljer tjänsten?
5. **SERNAC/Ley 19.496.** Bekräftelsens innehåll: säljarens identitet ("gestionada por … para …"), retracto, villkor vid handpenning (F11), "sin costo" i avbokningstexten.
6. **Bevisning av samtycke.** Arkiv per version och append-only-logg (WP-26): räcker det, och hur länge ska loggen sparas?
7. **Export och radering via kundlänken** (WP-26): krav på extra verifiering (engångskod) eftersom länken kan vidarebefordras.
