# Idéer utanför scope

Agenter och människor skriver hit idéer som dyker upp under arbetet, så att de inte byggs i fel arbetspaket. Planeraren går igenom listan varje vecka.

| Datum | Idé | Från | Varför intressant | Förslag på fas |
|---|---|---|---|---|
| 2026-09-26 | Eget WhatsApp-nummer per företag (Embedded Signup) | beslut D-007 | Premiumfunktion | 3 |
| 2026-09-26 | AI-assistent som svarar och bokar i WhatsApp-chatten | vision | Stark uppgradering | 3 |
| 2026-09-26 | Automatisk boleta via OpenFactura/Bsale | research | Tar bort manuellt SII-arbete | 3 |
| 2026-09-26 | Offentlig sida för horas flash (marknadsplats) | D-004 | Ny intäktsström när tätheten finns | 4 |
| 2026-09-26 | Lint-regel som stoppar hex-värden och godtyckliga Tailwind-värden (`[...]`) i `src/components/` och `src/app/` | planner (WP-00) | Gör hård regel 1 maskinellt kontrollerbar i stället för att förlita sig på granskning | ☑ genomförd i WP-02 |
| 2026-09-26 | Env-validering med Zod (`src/config/env.ts`) som stoppar start utan nödvändiga hemligheter | planner (WP-00) | Tydliga fel i stället för tysta fake-providers i fel miljö | 1 (WP-01/WP-16) |
| 2026-09-26 | Uppgradera till TypeScript 7 och ESLint 10 när typescript-eslint och eslint-plugin-react stöder dem | WP-00 | Snabbare typecheck (native), aktuellt stöd | 2 |
| 2026-09-27 | Återkommande blockeringar (t.ex. lunch varje dag) som veckoregel i stället för en `time_off`-rad per dag, eller lunch som delade öppettider | planner (WP-01) | F3 nämner lunch. En rad per dag skalar dåligt för ägaren. | 1 (WP-10/WP-15) |
| 2026-09-27 | Unika `project_id` och portar per worktree (t.ex. via env) så att flera lokala Supabase-stackar kan köras parallellt | planner (WP-01) | Tar bort flaskhalsen R1 i parallellt arbete | 1 |
| 2026-09-27 | Rate limit/captcha på `create_business()` | planner (WP-01) | Hindrar massregistrering av företag | 1 (WP-27) |
| 2026-09-27 | Trigger som håller `visits_count`/`no_show_count` i synk med bokningsstatus | planner (WP-01) | Räknarna kan inte glida (R7) | 1 (WP-21) |
| 2026-09-27 | `supabase db lint` och säkerhetsråd (splinter) i CI | planner (WP-01) | Fångar RLS-/indexmissar automatiskt | 1 |
| 2026-09-27 | Visuell jämförelse i CI med fastlåst Playwright-Docker-image och referensbilder som renderats i samma image | planner (WP-02) | Stoppar visuella regressioner automatiskt, utan skillnader mellan macOS och Linux | 2 |
| 2026-09-27 | Snapshot-regression av `/design-lab/components` (`toHaveScreenshot`) när WP-11–14 är klara | planner (WP-02) | Fångar oavsiktliga ändringar i baskomponenter som används av alla skärmar | 2 |
| 2026-09-27 | `TextLink`-komponent ("Ver agenda", hover `pending-fg` som i referensen) | planner (WP-02) | Används i Main och troligen i fler vyer. Byggs i WP-11 om den behövs där | 1 (WP-11) |
| 2026-09-27 | UserPill med dropdown-meny (konto, logga ut) | planner (WP-02) | PageHeader har knappen men ingen meny | 1 (WP-15) |
| 2026-09-27 | Beteende för Reserva-pills vid 360 px (horisontell scroll-behållare) | planner (WP-02) | Referensen blir 4 px för bred redan vid 390 (R8) | 1 (WP-13) |
| 2026-09-27 | ESLint-regeln `react/jsx-no-literals` i `src/app/` och `src/components/` (utom design lab) | planner (WP-03) | Gör hård regel 6 (bara copywriterns strängar) maskinellt kontrollerbar | 1 (WP-02) |
| 2026-09-27 | WhatsApp-mall `codigo_acceso` (kategori AUTHENTICATION) för ägarens inloggning | planner (WP-03) | F1 nämner inloggning med WhatsApp-kod, men mallen saknas i INTEGRATIONS | 1 (WP-15/16) |
| 2026-09-27 | Mall/påminnelse "abono pendiente" när handpenningen inte är betald inom 15 min | planner (WP-03) | Färre tappade bokningar med handpenning (F11) | 1 (WP-25) |
| 2026-09-27 | "Agregar a mi calendario" (.ics) på bekräftelsesidan och i `r/[token]` | planner (WP-03) | Färre no-shows utan extra WhatsApp-kostnad | 2 |
| 2026-09-27 | Läsa igenom texterna med 3–5 riktiga ägare och kunder i Providencia/Ñuñoa före piloten | planner (WP-03) | Fångar ord som inte fungerar lokalt innan de når skarpa kunder | 1 (före WP-27) |
| 2026-09-27 | Migrera tidslogiken till Temporal när Node LTS och målwebbläsarna har det utan flagga | planner (WP-04) | Inbyggd disambiguering, färre egna algoritmer | 3 |
| 2026-09-27 | Tillåtna tidszoner för `businesses.timezone` (`America/Santiago`, `America/Punta_Arenas`, `America/Coyhaique`, `Pacific/Easter`) med val i onboarding | planner (WP-04) | Aysén (tzdata 2025b), Magallanes och Rapa Nui får rätt tider | 2 (WP-01/WP-15) |
| 2026-09-27 | Hälsoendpoint eller Sentry-tagg med `process.versions.tz` i runtime | planner (WP-04) | Upptäcker gammal tzdata på Vercel innan kunder märker det | 1 (WP-05) |
| 2026-09-27 | Hjälpfunktioner för `tstzrange` (parse/serialize) i DB-lagret | planner (WP-04) | En gemensam väg för `period`/`blocked` | 1 (WP-10) |
| 2026-09-27 | Gemensam `percentOfClp` med beslutad avrundning (hel peso eller $10, jfr Ley 20.956) för handpenning i % och flash-rabatt | planner (WP-04) | Samma pris i WP-25 och WP-30 | 1–2 (WP-25/WP-30) |
| 2026-09-27 | Visa tider i aprils dubbla timme med markering, t.ex. "23:30 (hora de invierno)" | planner (WP-04) | Undviker förvirring hos företag med sena öppettider | 2 |
| 2026-09-27 | Gemensam `Result`-typ i `src/lib/` för server och lib | planner (WP-04) | En felmodell i hela kodbasen | 1 (WP-10) |
| 2026-09-27 | Utländska telefonnummer (turister) med per-land-validering | planner (WP-04) | Kunder utan chilenskt nummer kan boka | 3 |
| 2026-09-27 | `zod/mini` för scheman som används på kundsidan | planner (WP-04) | Mindre bundle på billiga Android-telefoner | 2 |
| 2026-09-27 | Step-up (engångskod via WhatsApp) före export/radering via `r/[token]` | security-reviewer (WP-03) | Länken per bokning vidarebefordras lätt; export/radering får inte gå med bara länken | 1 (WP-26) |
| 2026-09-27 | Mallvariant utan tjänstenamn för vårdnära branscher | security-reviewer (WP-03) | Tjänstenamn kan vara känsliga uppgifter (Ley 21.719) | 2 |
| 2026-09-27 | Paritetstestet i i18n jämför rad för rad i stället för mot en sammanslagen sträng | qa-reviewer (WP-03) | Korta texter kan annars räknas som täckta av längre | 2 |
| 2026-09-27 | Kontrollera i WP-11–14 att interaktiva komponenter med `transition-colors` också har `focus-visible:transition-none` | ui-engineer (WP-02) | Tailwind 4:s `transition-colors` tonar annars in fokusringen | 1 (WP-11–14) |
| 2026-09-27 | Behandla 55P03 (lock_timeout på advisory lock) som `slot_taken` i stället för infrastrukturfel | security-reviewer (WP-10) | Hård konkurrens om samma profesional ska ge rätt meddelande | 1 (WP-20) |
| 2026-09-27 | Rate limiting per telefon och IP på kundens bokningsväg | security-reviewer (WP-10) | Skyddar poolen och mot trakasserier via annans nummer | 1 (WP-20) |
| 2026-09-27 | Räkna inte no-show för bokningar med overifierat nummer | security-reviewer (WP-10) | Annars kan någon sänka en annan kunds rykte | 2 |
| 2026-09-27 | Egen databasroll i stället för `postgres` i `DATABASE_URL` | security-reviewer (WP-10) | Minsta möjliga behörighet på servern | 1 (WP-05b/WP-27) |
| 2026-09-27 | WP-26: nolla `phone_e164` vid anonymisering | scheduling-engineer (WP-10) | Annars blockerar unique-constrainten numret för nya bokningar | 1 (WP-26) |
| 2026-09-27 | `r/[token]` utan slug: uppslag på bara `manage_token_hash` som uttryckligt undantag i gränstestet | security-reviewer (WP-10) | WP-20 behöver `businessId` innan motorn anropas | 1 (WP-20) |
| 2026-09-27 | **Krav före WP-21:** samtyckestriggern (`private.customers_guard_consent`) ska förbjuda `consent_marketing_at` med kanal `manual` och inte skriva över samtycke från `web`/`whatsapp` | security-reviewer (WP-03b) | Ägaren kan annars skapa marknadsföringssamtycke åt kunder och radera beviset för webbsamtycket | 1 (WP-21, db-engineer) |
| 2026-09-27 | Append-only-logg för samtycken (en rad per typ och version) i stället för en kolumn per kund | security-reviewer (WP-03b) | Tre samtyckesversioner skriver annars över varandras bevis | 1 (WP-26) |
| 2026-09-27 | Synktest mellan "vencen en 15 minutos" i `email.acceso` och `otp_expiry` i SUPABASE_CONFIG | security-reviewer (WP-03b) | Lokal `otp_expiry` är 3600 | 1 (WP-15) |
| 2026-09-27 | Card-tonerna lilac/peach/lime sätter `data-surface="light"` så att `on-dark:` inte läcker in i pastellkort | qa-reviewer (WP-11) | Roten till fokusringsfelet i Inicio | 2 |
| 2026-09-28 | Reserva: bakåt från bekräftelsen ska inte öppna valen med den bokade tiden | qa-reviewer (WP-13) | Undviker dubbelbokning av misstag | 1 (WP-20) |
| 2026-09-28 | Reserva: behåll namn/telefon/e-post efter `slot_taken` och "Volver"; formulärgränser som WP-10 (namn 120, e-post 254, uuid) | qa-reviewer (WP-13) | Mindre omskrivning på mobil, samma regler som servern | 1 (WP-20) |
| 2026-09-28 | Reserva: fler e2e-varianter (isolering via action, LA-tidszon, 360 px i alla lägen, pekskärm) | qa-reviewer (WP-13) | Täckning | 2 |
| 2026-09-28 | Rate limit/captcha på `/login` (alla anrop går från Vercels IP mot Supabase) | security-reviewer (WP-15) | Skyddar mot mejlbombning och att e-postkvoten töms | 1 (före pilot) |
| 2026-09-28 | Bekräftelsesida med POST i `/auth/confirm` så att länkskannrar (Outlook Safe Links) inte förbrukar länken | security-reviewer (WP-15) | Annars får ägaren `otp_expired` | 1 |
| 2026-09-28 | Stoppa andra företag per ägare i `submitOnboarding`; `getOwnerBusiness` filtrera på roll owner/admin | security-reviewer (WP-15) | Slug-squatting, staff hamnar i ägarvyn | 1 (WP-15b) |
| 2026-09-28 | Synka `email.acceso` i i18n med mallarna (utan kod, "link" i stället för "código") | orkestrerare (WP-15) | Mallarna förenklades i WP-15 | 1 (copywriter) |
| 2026-09-28 | Egen SMTP (Resend) för Supabase Auth i staging/prod | orkestrerare (WP-15) | Inbyggd e-post har låg kvot | 1 (före pilot) |
