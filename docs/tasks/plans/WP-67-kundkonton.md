# WP-67 · Kundkonton för privatpersoner (CL + SE) — plan

Status: plan klar 2026-10-10. Beror på: WP-64 (PR #93) och WP-66 mergade (rebase på deras migrationer/`routes.ts`). Kör parallellt med WP-68 **efter steg 0**.
Design: ägarens godkända artifact (riktning A): *Skapa konto*, *Min profil*, *Lämna recension* (+ bottenmenyn Upptäck/Karta/Bokningar/Profil).
Beslut som berörs: D-008, D-014, D-019, D-029, D-034, D-036, D-038, D-045. Nya förslag: **D-047** (konsumentkonton) och **D-048** (recension från konto), se nedan.

## 1. Mål
Privatpersoner kan gratis skapa ett konto (Google eller e-post-magisk länk) och se sina bokningar hos alla anslutna företag, lämna verifierade recensioner, spara favoriter och sköta sin integritet — utan att konsumentrollen någonsin ger åtkomst till företagsdata. (F5/F7/F12-utvidgning, ingen F# i MVP_SPEC; "klart när" nedan ersätter spec-kriteriet.)

## 2. Utanför scope
- Apple-inloggning (IDEAS), Google-inloggning för företagsägare (IDEAS).
- Värdebevis i profilen (sektionen byggs i WP-69; här bara dold plats, D-035).
- Upptäck/Karta-flikarnas innehåll (WP-68). Bottenmenyn byggs i steg 0 men flikarna Upptäck/Karta visas först när `MARKETPLACE` är på.
- Flytta bokning från kontot (kunden länkas till `/[slug]` för ny tid). v1: se + avboka.
- Push-notiser, native-app, kunders profilbild.
- Telefonverifiering i CL (ingen SMS-kanal där, D-030) — bara e-post i CL.

## 3. Ägare och mappar (inga överlapp med WP-68)
| Agent | Rör bara |
|---|---|
| ui-engineer | **Steg 0** (se nedan) · `src/proxy.ts` · `src/lib/supabase/**` · `src/app/auth/**` · `src/app/(auth)/login/**` (bara intent-cookien) · `src/app/(consumer)/cuenta/**` · `src/components/account/**` · `src/app/[slug]/page.tsx` (förifyllning + hjärta) · `src/app/(app)/app/page.tsx` (omdirigering av konsument utan företag) |
| db-engineer | `supabase/migrations/20261020*_*.sql` · `supabase/tests/120–124_*.test.sql` · `supabase/config.toml` (`[auth.external.google]`) · `supabase/templates/magic_link.html` (neutral text) · `src/types/database.ts` · `src/server/accounts/**` (ny) |
| scheduling-engineer | `src/server/bookings/submit.ts`, `src/server/bookings/cancel.ts` (konto-auktorisering + koppling vid bokning) |
| integrations-engineer | `src/server/messaging/**` (mall `codigoVerificacion` för SMS-OTP, bara SE) |
| copywriter-es-cl (+ sv) | `src/i18n/es-CL.cuenta.ts`, `src/i18n/sv-SE.cuenta.ts` |
| security-reviewer | granskar steg 1, 2, 4, 6 |

**Steg 0 — gemensam grund för WP-67 och WP-68 (ui-engineer, en liten PR, mergas FÖRE båda):**
- `src/config/routes.ts`: nya `ConsumerRouteId` (konto + marknadsplats, CL/SE) och `marketplaceHref()` för två dynamiska segment; rewrites/redirects genereras som idag. CL/SE: `/cuenta` `/konto`, `/cuenta/ingresar` `/konto/logga-in`, `/cuenta/reservas` `/konto/bokningar`, `/cuenta/favoritos` `/konto/favoriter`, `/cuenta/privacidad` `/konto/integritet`, `/cuenta/resena/[id]` `/konto/recension/[id]`, `/cuenta/vales` `/konto/vardebevis` (WP-69), `/descubre` `/upptack`, `/descubre/[categoria]` `/upptack/[kategori]`, `/descubre/[categoria]/[ciudad]` `/upptack/[kategori]/[ort]`, `/descubre/mapa` `/upptack/karta`, `/oferta/[id]` `/erbjudande/[id]`, `/app/ofertas` `/app/erbjudanden`.
- `RESERVED_SLUGS` (`src/server/onboarding/schemas.ts` + `src/components/onboarding/client-validation.ts`): alla segment ovan i båda språken. db-engineer kontrollerar i samma PR (SQL-fråga i PR-texten, ingen migration) att inget befintligt företag har en sådan slug.
- `src/config/marketplace.ts`: `MARKETPLACE`-flaggan (env, av som standard), kategorilistan (id + CL/SE-slug), JS-budgetkonstanter.
- `src/app/(consumer)/layout.tsx` + `src/components/consumer/ConsumerShell.tsx` (bottenmeny, toppbar desktop), tomma i18n-filer `*.cuenta.ts`/`*.mercado.ts` med typer.
- Migrations-tidsstämplar reserveras: WP-67 `20261020*`, WP-68 `20261021*`, WP-69 `20261022*`; pgTAP 120–124 / 125–129 / 130–134.
Efter steg 0 äger WP-67 `src/components/account/**` + `(consumer)/cuenta/**`, WP-68 `src/components/marketplace/**` + `(consumer)/descubre/**`, `(consumer)/oferta/**`. `ConsumerShell` ändras bara av WP-68 (WP-67 lämnar önskemål i PR-kommentar). `src/types/database.ts`: den som mergar sist kör `npm run db:types` efter rebase.

## 4. Steg
0. **Gemensam grund** (ovan).
1. **DB: konton och koppling** (db) — `20261020000000_customer_accounts.sql`:
   - `public.customer_accounts` (`user_id` PK → `auth.users` on delete cascade, `display_name`, `phone_e164` null, `phone_verified_at` null, `marketing_consent_at` null **utan default**, `marketing_consent_version`, `created_at`). RLS: select/update bara `user_id = (select auth.uid())`; insert bara via `public.ensure_customer_account()` (security definer). Kolumn-grants: `authenticated` får bara uppdatera `display_name` och samtycket via funktion.
   - `public.customer_account_links` (`user_id`, `business_id`, `customer_id`, `linked_via` `email|phone|booking`, `linked_at`; PK `(user_id, business_id, customer_id)`; FK `(business_id, customer_id)` → `customers (business_id, id)` on delete cascade, D-014). RLS: select egna; inga skriv-grants för `authenticated`.
   - `public.favorites` (`user_id`, `business_id`, PK båda). RLS: select/insert/delete egna.
   - `public.account_consent_events` (oföränderlig logg: `user_id`, `kind`, `granted`, `version`, `at`) — samma mönster som `consent_events`.
   - Funktioner (security definer, `search_path = ''`): `link_customer_rows()` (kopplar alla icke-anonymiserade `customers` där `lower(email) = lower(auth.email())` **och** `auth.users.email_confirmed_at` är satt; idempotent), `my_bookings(p_scope text)`, `my_review_candidates()`, `delete_my_account()`. Returnerar bara kolumner kunden får se (företagsnamn, slug, tjänst, personal, tid, status, pris) — aldrig `notes`, svar på bokningsfrågor eller andra kunders data.
   - **Rollseparation (D-047):** inga ändringar i befintliga tenant-policies. En konsument har ingen `memberships`-rad och ser därför inget via `is_member`. pgTAP bevisar det.
   - Tester `120_customer_accounts.test.sql` (RLS: A ser inte B:s konto/länkar/favoriter; konsument utan membership får 0 rader från `customers`, `bookings`, `reviews`, `payments`; ägare som också är konsument ser företagsdata bara via membership), `121_link_customer_rows.test.sql` (overifierad e-post kopplas inte; anonymiserad kund kopplas inte; idempotent; versaler/gemener), `122_delete_my_account.test.sql`.
2. **Auth: Google + magisk länk + intent** (ui + db för config) —
   - `supabase/config.toml`: `[auth.external.google] enabled = true`, `client_id`/`secret` via `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID|SECRET)`; `additional_redirect_urls` += `/auth/callback`.
   - `src/app/auth/callback/route.ts` (ny): PKCE `exchangeCodeForSession` för OAuth. `src/app/auth/confirm/route.ts`: efter verifiering väljs mål från cookien `auth_intent` (`customer` | `business`, sätts av respektive inloggningssida, whitelist, 15 min, **ingen `next`-parameter** — D-019 öppen-redirect-regeln står kvar). `customer` → `/cuenta` (anropar `ensure_customer_account()` + `link_customer_rows()`), annars `/app` som idag.
   - `src/proxy.ts`: matcher += `/cuenta/:path*` och `/konto/:path*`; utloggad på konto-sidor (utom `ingresar`/`logga-in`) → kontots inloggning, inte `/login`.
   - `src/app/(app)/app/page.tsx`: inloggad utan membership men med `customer_accounts`-rad → `/cuenta`, inte onboarding (länk "¿Tienes un negocio?" leder till onboarding).
   - `magic_link.html`: neutral text som passar både företag och konsument (copywriter), varumärke via mallvariabel.
3. **Sidan Skapa konto / Logga in** (ui + copy) — `src/app/(consumer)/cuenta/ingresar/page.tsx`, `src/components/account/SignInCard.tsx`: Google-knapp, e-postfält → magisk länk, Apple dold (D-035), **ej förkryssad** ruta för erbjudanden (sparas i `account_consent_events`), länk till konsumentintegritetspolicy. Rate limit på magisk länk via `src/server/db/rate-limit.ts` (befintlig).
4. **Min profil + Bokningar** (ui + db-server + scheduling) — `src/server/accounts/profile.ts` (laddar via `withOwnerTx(userId)`-mönstret = `authenticated` + claims, döps om/aliasas till `withUserTx` i `src/server/db/tx.ts`), `cuenta/page.tsx` (nästa bokning med status/betald, recensionspåminnelse, favoriter, kontolista), `cuenta/reservas/page.tsx` (kommande/tidigare). Avboka: `src/server/bookings/cancel.ts` får en ny auktoriseringsväg `byAccount(userId, bookingId)` som kräver länk + samma avbokningsregler som `r/[token]` (D-036/WP-56-godkännande respekteras).
5. **Koppling vid bokning** (scheduling + ui) — inloggad på `/[slug]`: servern förifyller namn/e-post/telefon som props (ingen ny klient-JS utöver fältvärden; budget ≤ 190 kB, D-039) och `submit.ts` skapar länken `linked_via='booking'` i samma transaktion som kundraden. Utloggad: oförändrat flöde.
6. **Telefonverifiering (bara SE, valbar att skära)** (integrations + db) — egen OTP: 6 siffror, bara hash lagras, 10 min, 5 försök, rate limit per konto och nummer, SMS via `message_outbox` (regel 4, ClickSend D-028). Vid lyckad verifiering: `link_customer_rows()` kopplar även på `phone_e164`.
7. **Favoriter + recension från kontot** (ui + db) — hjärta på `/[slug]` (server action, bara inloggad), `cuenta/favoritos`. `cuenta/resena/[bookingId]`: samma formulär och regler som `/resena/[token]` (D-045: en per bokning, genomförd, 7 dagars redigering, 60 dagars fönster) men auktoriserat via länk; delar `src/server/reviews/` (läs, ingen ändring av regler — anrop via ny export `submitReviewForAccount`, ägs av db-engineer i detta WP).
8. **Integritet** (ui + db) — `cuenta/privacidad`: export (JSON: konto, samtyckeslogg, länkade bokningar, favoriter, recensioner) och "Radera mitt konto" (`delete_my_account()` + `auth.admin.deleteUser` med service role). Radering tar bort konto, länkar, favoriter och samtyckesrader (loggen anonymiseras), men **rör inte** företagens `customers`-rader (företaget är ansvarigt för dem; kunden hänvisas till företagets radering, WP-26). Recensioner: namnet nollas som vid anonymisering, betyget behålls (D-045).
9. **Docs** — D-047/D-048 i DECISIONS, `docs/legal/RAT.md` (ny behandling: konsumentkonton, plattformen är personuppgiftsansvarig), BACKLOG ☑.

## 5. Tester
- **pgTAP:** 120–122 enligt steg 1; schemavakten (D-014) grön; `anon` har inga grants på nya tabeller.
- **Enhet (Vitest):** intent-cookie-parsning (bara whitelist, okänt → `business`), OTP-hash/utgång/försök, mappning `my_bookings` → vy, exportens fältlista (ingen `notes`).
- **DB-integration (`*.db.test.ts`):** avboka via konto nekas för olänkad bokning och för annan användares bokning; koppling vid bokning sker i samma transaktion (rollback ⇒ ingen länk).
- **E2E (Playwright, magisk länk via Inbucket/Mailpit lokalt):** skapa konto → se bokning gjord tidigare med samma e-post → favorit → recension → export → radera. Google mockas inte i e2e (manuell kontroll i staging).
- **Kantfall:** samma person är ägare och konsument (båda ytorna fungerar, ingen läcka); e-post med versaler i `customers`; kund anonymiserad efter koppling (länken finns kvar men `my_bookings` visar inget persondata); två företag med samma kund-e-post (två länkar); sommartid: bokningar listas i företagets tidszon via `dates.ts` (D-017/D-018), testfall 2026-04-05 (CL) och 2026-10-25 (SE).
- **Visuell:** `npm run visual cuenta cuenta-ingresar cuenta-resena` mot exporterade referenser (se FRÅGA 1).

## 6. Risker och öppna frågor
- **R1 Rollförväxling:** en konsument som hamnar i `/app` skapar av misstag ett företag. Motåtgärd steg 2 (omdirigering + intent). security-reviewer granskar.
- **R2 Felaktig koppling:** någon som bokat med en annans e-post ⇒ e-postägaren ser bokningen. Accepteras: samma person fick redan bekräftelsemejlet. Koppling på telefon bara efter OTP.
- **R3 Delad e-postmall:** Supabase har en magisk-länk-mall per projekt — texten måste fungera för både företag och konsument.
- **R4 Plattformen blir personuppgiftsansvarig** för konton (inte bara biträde) — ny policytext. `JURIST: konsumentintegritetspolicy SE (GDPR) + CL (Ley 21.719); grund för koppling av befintliga kundrader till konto (berättigat intresse eller samtycke?).`
- **Google OAuth — ägaren gör (en gång per marknad):** Google Cloud Console → nytt projekt per varumärke → OAuth consent screen (External, appnamn = varumärket, logga, domäner `bookingbuddy.se`/`.cl` + `<ref>.supabase.co`, scopes `openid email profile` — inga känsliga scopes, ingen Google-granskning krävs utom varumärkesverifiering) → Credentials → OAuth client ID (Web), Authorized redirect URI `https://<ref>.supabase.co/auth/v1/callback` → Supabase Dashboard → Auth → Providers → Google (Client ID/Secret) → Auth → URL Configuration: lägg till `https://<domän>/auth/callback`. Lokalt: egna test-credentials i `.env` (redirect `http://127.0.0.1:54321/auth/v1/callback`). Staging först, aldrig prod från en agent (regel 8).
- FRÅGA: Ska telefonverifiering (steg 6, SMS-kostnad per kod) ingå i v1 i SE, eller räcker e-postkoppling till att börja med?
- FRÅGA: Ska kunden kunna avboka från kontot i v1 (steg 4), eller bara se bokningar och gå via länken i mejlet?

**D-047 (förslag) · Konsumentkonton skilda från företagsroller.** Konsument = rad i `customer_accounts` (user_id = auth.uid()); samma `auth.users` kan också vara medlem i ett företag. Konsumentens egna tabeller har policies `user_id = (select auth.uid())`; tenant-tabellernas policies (`is_member`) ändras inte, och konsumenten når bokningar/recensioner bara via security definer-funktioner som går via `customer_account_links`. Koppling sker automatiskt på bekräftad e-post (och verifierad telefon i SE). Inloggningsmål styrs av cookien `auth_intent` (ingen `next`-parameter). Gratis för konsumenter; Google + magisk länk, Apple senare. Plattformen är personuppgiftsansvarig för konton.
**D-048 (förslag) · Recension även från inloggat konto (kompletterar D-045).** Samma regler som tokenlänken; auktorisering via kopplad bokning i stället för token.

## 7. Klart när
- [ ] Steg 0 mergat före WP-68 startar; inga slugs krockar.
- [ ] Konsument kan skapa konto med Google (staging) och magisk länk (lokalt + staging), i båda marknaderna.
- [ ] Befintliga bokningar med samma bekräftade e-post syns i Min profil direkt efter första inloggningen.
- [ ] En konsument utan membership får 0 rader från alla tenant-tabeller (pgTAP), och `/app` skickar hen till `/cuenta`.
- [ ] Favoriter, recension från konto, export och radering fungerar end-to-end.
- [ ] Erbjudande-samtycket är aldrig förkryssat och loggas.
- [ ] `/[slug]` ≤ 190 kB gzip och tidskravet oförändrat.
- [ ] `npm run typecheck && npm run lint && npm run test && npm run test:db` gröna; `npm run visual` < 2 % på nya skärmar.
- [ ] security-reviewer godkänd; D-047/D-048, RAT.md och BACKLOG uppdaterade.

## Ägarens beslut 2026-10-10 (ersätter antaganden ovan där de skiljer sig)
- Marknadsplatsavgift: **1 %** (`MARKETPLACE_FEE_BPS = 100`, konfigurerbar).
- Köp av värdebevis **kräver konto** (inga gästköp).
- Blixttider visas på marknadsplatsen **som standard** (företaget kan stänga av).
- **Chile: marknadsplatsen helt dold** tills Mercado Pago finns.
- Samma domän (`/upptack`, CL `/descubre`). Besöket ska ske före värdebevisets utgång. SMS-verifiering av telefon: inte i v1 (e-post räcker). Avbokning från kontot: ja i v1 (återanvänd befintligt manage-flöde).
- Design: riktning A (lista först) — exporterade `.dc.html` från artifacten läggs i `docs/design/reference/marketplace/`.
