# Register över behandlingar (RAT) — utkast

> Utkast från WP-26 (security-reviewer). Granskas av jurist före lansering (WP-27). Juridisk enhet: platshållare i `src/config/brand.ts` (`legal`).

**Ansvarig:** [SpA, RUT – pendiente] (CL) / [AB, org.nr – saknas] (SE). Kontakt: privacidad@ordenagroup.cl / integritet@bookingbuddy.se.

| # | Behandling | Roll | Registrerade | Uppgifter | Ändamål | Rättslig grund | Lagring | Mottagare / överföring |
|---|---|---|---|---|---|---|---|---|
| 1 | Bokningar och kundregister | Biträde (företaget ansvarigt) | Slutkunder | Namn, telefon (E.164), e-post, bokningshistorik, svar på bokningsfrågor, ägarens anteckningar, antal besök/uteblivna | Utföra och administrera bokningen | Avtal (kund–företag) | Anonymiseras 24 mån efter senaste bokning eller på ägarens begäran | Supabase (sa-east-1 / eu-north-1), Vercel (gru1 / arn1) |
| 1a | Känsliga uppgifter i bokningsfrågor/anteckningar (t.ex. kinesiologi) | Biträde | Slutkunder | Hälsouppgifter | Som ovan | Uttryckligt samtycke (Ley 21.719) / GDPR art. 9.2 a | Som ovan | Som ovan. **Juristfråga:** krävs separat samtyckesruta för tjänster med hälsofrågor? |
| 2 | Transaktionella meddelanden | Biträde | Slutkunder | Telefon/e-post (hämtas vid sändning), mall, status, engångstoken | Bekräftelse, påminnelse, ändringslänk | Avtal | Utkorgsrader 90 dagar; payload töms vid sänd/död/avbruten | Meta WhatsApp (US), Resend (US), ClickSend (AU) |
| 3 | Samtyckeslogg | Biträde (kund) / ansvarig (ägare) | Slutkunder, ägare | Typ, version, kanal, granted, tid | Visa att samtycke gavs | Rättslig förpliktelse (bevisbörda) | 5 år efter frikoppling från kund | Supabase |
| 4 | Marknadsföring (WP-30) | Biträde | Slutkunder | Telefon, samtycke | Kampanjer | Samtycke (aldrig förkryssat) | Tills återkallelse/anonymisering | Meta |
| 5 | Ägarkonton och autentisering | Ansvarig | Ägare, personal | E-post, auth-metadata, medlemskap/roll | Tillhandahålla tjänsten | Avtal | Tills kontot raderas + 30 dagars ångerfrist | Supabase Auth |
| 6 | Företagsprofil och personal | Biträde | Personal | Namn, titel, foto | Visa bokningssidan | Avtal / berättigat intresse | Foto raderas vid inaktivering; allt vid kontoradering | Supabase Storage, Vercel CDN |
| 7 | Betalningar (WP-25) | Biträde / ansvarig för abonnemang | Slutkunder, ägare | Belopp, metod, referens | Handpenning, kassa | Avtal; bokföringsplikt (SII 6 år / Bokföringslagen 7 år) | Följer bokningen i dag — ses över i WP-34 | Mercado Pago, Flow (CL); Stripe (SE, abonnemang) |
| 8 | Drift- och felloggar | Ansvarig | Alla | IP, request-id, SQLSTATE; ingen persondata i applikationsloggar | Säkerhet, drift | Berättigat intresse | Enligt Vercel/Supabase (fylls i) | Vercel, Supabase, GitHub Actions (bara räknare) |
| 9 | Kundkonton (WP-67, D-054) | **Ansvarig** (plattformen) | Konsumenter | E-post, visningsnamn (från Google eller kundens senaste bokning), bokningar där kontots bekräftade e-post angavs (eller som gjordes inloggad), favoriter, erbjudande-samtycke + logg | Samla kundens bokningar, avboka, recensera, favoriter | Avtal (kontovillkor); samtycke för erbjudanden (aldrig förkryssat). **Juristfråga:** grund för att koppla befintliga kundrader (berättigat intresse eller samtycke?) | Tills kunden raderar kontot (export + radering i `/konto/integritet`); samtyckesloggen anonymiseras och recensionernas namn + kommentar nollas vid radering | Supabase Auth, Google (bara vid Google-inloggning) |
| 10 | Marknadsplats Upptäck: geokodning och karta (WP-68, D-055; bara SE) | **Ansvarig** (plattformen) | Företag (adress); besökare | Företagets offentliga adress → koordinater, stadsdel. Besökarens position bara avrundad (~1 km) i cookien `nara` (30 min, bara Upptäck-sidorna) — lagras inte på servern, loggas inte | Visa företag och erbjudanden på karta, sortera efter avstånd | Berättigat intresse (företagets adress är offentlig, företaget har publicerat erbjudanden/blixttider); positionen: användarens begäran (frivillig knapp) | Koordinater tills adressen ändras eller företaget raderas; positionen 30 min i webbläsaren | OpenStreetMap Foundation/Nominatim (adresser, EU/UK); OpenFreeMap (kartbilder — besökarens IP vid hämtning) |
| 11 | Köp av värdebevis i marknadsplatsen (WP-69, D-057; bara SE) | **Ansvarig** (plattformen) för köpet och kontot; företaget är säljare och ansvarig för sin kassa/bokföring | Konsumenter (kundkonto) | Konto-id, e-post (kvittot, hämtas vid sändning), köpt erbjudande, belopp, Stripe-id:n (session, PaymentIntent), värdebevisets kod, status, giltighet, koppling till bokningen där det löses in. Inga kortuppgifter (Stripe Checkout, hostad) | Sälja och lösa in värdebevis, kvitto, ångerrätt, återbetalning/tvist | Avtal (köpet); rättslig förpliktelse (bokföring hos säljaren, 7 år) | Köp och värdebevis behålls så länge bokföringsplikten gäller; vid kontoradering raderas bara konsumentdelen när köp finns (FK utan kaskad, D-054) | Stripe (US, Connect — direct charge på företagets konto), Resend (US), Supabase |

## Säkerhetsåtgärder
RLS på alla tabeller, inga anon-policies, sammansatta FK per företag · service_role bara på servern med `business_id`-filter och gränstest · `manage_token` bara som hash · webhooks/cron verifieras timing-safe · TLS och kryptering i vila · ingen persondata i loggar · 30 dagars ångerfrist vid kontoradering.

## Rättigheter
Ägaren exporterar/anonymiserar åt kunden i v1 (agendans kundpanel). Kundens egen väg via `r/[token]` finns i IDEAS.

## Öppna punkter
Standardavtalsklausuler / överföringsgrund för US och AU · juristfrågor 6, 7, 10, 11 (`JURIST_FRAGOR.md`) · lagringstid för fakturor (WP-34) · incidentrutin · underbiträdesförteckning i DPA.
