# Backlog — arbetspaket

Status: ☐ ej påbörjad · ◐ pågår · ☑ klar · ⛔ blockerad
Ett arbetspaket (WP) = en branch `wp/<id>-…` = en eller några små PR:er. **Beroenden måste vara ☑ innan start.**

## Våg A — grund (kan köras parallellt efter WP-00)

| ID | Titel | Agent | Beror på | F# | Status |
|---|---|---|---|---|---|
| WP-00 | Projektgrund: Next.js (`src/`), Tailwind v4 + tokens, typsnitt, ESLint/Prettier, Vitest, Playwright, Supabase CLI, `brand.ts`, `.env.example`, CI (typecheck, lint, test) | ui-engineer | – | – | ☑ |
| WP-01 | Kärnschema: businesses, memberships, staff, services, staff_services, hours, time_off, customers, bookings (+ exclusion constraint), payments. RLS + pgTAP + seed "Barbería Norte" | db-engineer | WP-00 | F1–F4, F9 | ☑ |
| WP-02 | Design lab + baskomponenter (Button, IconButton, Chip, Pill, Card, SegmentedControl, NavRail, PageHeader, MiniCalendar ljus/mörk) | ui-engineer | WP-00 | – | ☑ |
| WP-03 | Texter v1: UI-strängar för alla MVP-skärmar + WhatsApp-mallar (för Meta-ansökan) | copywriter-es-cl | – | F5–F8 | ☑ |
| WP-04 | Format-lib: clp, datum/tid i America/Santiago, telefon E.164 (+56), RUT | scheduling-engineer | WP-00 | – | ☑ |
| WP-03b | Texter v2: onboarding, Clientes, Caja, Ajustes, handpenning | copywriter-es-cl | WP-03 | F1–F3, F9, F10, F11 | ☑ |
| WP-05 | Staging: Supabase-projekt (sa-east-1) med migrationer via GitHub Actions (Environment `staging`, bara `main`), Vercel `gru1`, design lab via `DESIGN_LAB` | integrations-engineer | WP-00 | – | ☑ |
| WP-05b | Observabilitet och previews: Sentry, PostHog utan persondata, preview-miljöer (Supabase-branch per PR) | integrations-engineer | WP-05 | – | ☐ |

## Våg B — kärnflöden

| ID | Titel | Agent | Beror på | F# | Status |
|---|---|---|---|---|---|
| WP-10 | Schemamotor: getAvailableDays/Slots, createBooking/move/cancel, "Cualquiera", sommartidstester, samtidighetstest (två riktiga pg-anslutningar → 23P01, ersätter skippade `042`; krav för F4) | scheduling-engineer | WP-01, WP-04 | F4 | ☑ |
| WP-11 | Skärm Inicio (desktop) enligt `Main.dc.html` med fixtures | ui-engineer | WP-02 | F6 | ☑ |
| WP-12 | Skärm Agenda veckovy enligt `Agenda.dc.html` + dagvy per profesional (ny, samma språk) | ui-engineer | WP-02 | F6 | ☑ |
| WP-13 | Skärm Reserva (kund) enligt `Reserva.dc.html` med fixtures, alla tillstånd | ui-engineer | WP-02, WP-03 | F5, F8 | ☑ |
| WP-14 | Skärm Hoy (mobil ägare) enligt `Hoy.dc.html` | ui-engineer | WP-02 | F6 | ☑ |
| WP-15 | Auth + onboarding i 4 steg (tjänster, personal, öppettider, länk) + Ajustes | ui-engineer | WP-01, WP-02, WP-03b | F1–F3 | ◐ (slim: auth + onboarding klart, se docs/tasks/plans/WP-15.md; Ajustes klar, se docs/tasks/plans/WP-15b.md — Mercado Pago/logo/accentfärg/väntelisteläge/radering av konto/inbjudan av personal kvar) |
| WP-16 | Outbox + cron-infrastruktur + e-post (Resend) + WhatsApp-klient och webhook | integrations-engineer | WP-01 | F7 | ◐ (plan klar, slim: outbox + pg_cron + e-post/SMS (SE) + minimal `r/[token]`, se docs/tasks/plans/WP-16.md; WhatsApp-klient och webhook kvar) |

## Våg C — koppla ihop

| ID | Titel | Agent | Beror på | F# | Status |
|---|---|---|---|---|---|
| WP-20 | Koppla Reserva mot schemamotorn, samtycken, bekräftelse, kundens `r/[token]`-sida (se, flytta, avboka) | ui-engineer + scheduling-engineer | WP-10, WP-13, WP-16 | F5, F7 | ◐ (slim: `/{slug}` mot riktig data + samtycke klart, se docs/tasks/plans/WP-20.md; väntelistan, `r/[token]`, e-post/WhatsApp, handpenning kvar) |
| WP-21 | Koppla Agenda/Hoy/Inicio mot riktig data, manuell bokning, Llegó/No vino | ui-engineer | WP-10, WP-11, WP-12, WP-14 | F6, F9 | ◐ (slim: riktig data + Llegó/No vino klart, se docs/tasks/plans/WP-21.md; manuell bokning + flytt klart, se docs/tasks/plans/WP-21b.md; Caja och väntelista kvar) |
| WP-22 | Påminnelser 24 h + knappsvar Confirmo/Necesito cambiar | integrations-engineer | WP-16, WP-20 | F7 | ☐ |
| WP-23 | Väntelista end-to-end (sequential + broadcast) | scheduling-engineer + integrations-engineer | WP-10, WP-16 | F8 | ☑ |
| WP-24 | Kassa: markera betald, summeringar | ui-engineer + db-engineer | WP-21 | F10 | ☑ |
| WP-25 | Handpenning via Mercado Pago (OAuth, preferens, webhook, utgång) | integrations-engineer | WP-20 | F11 | ◐ |
| WP-26 | Dataskydd: samtyckeslogg, export/anonymisering, lagringsjobb, policysidor (text från jurist) | db-engineer + security-reviewer | WP-20 | F12 | ☑ |
| WP-27 | **Säkerhetsgranskning före pilot** | security-reviewer | WP-20 till WP-26 | – | ☑ (slimmad pilotkontroll: rate limiting + headers; ops-punkter hos ägaren) |

## Våg D — fas 2

| ID | Titel | Agent | Beror på | F# |
|---|---|---|---|---|
| WP-30 | Horas flash + story-bild (`@vercel/og`, `HoraFlash.dc.html`) | ui + scheduling + integrations | WP-23 | F13 |
| WP-31 | Te echamos de menos | integrations-engineer | WP-22 | F14 |
| WP-32 | Stämpelkort | db-engineer + ui-engineer | WP-21 | F15 |
| WP-33 | Veckorapport "recuperaste" (hero i Inicio + WhatsApp) | db-engineer + ui-engineer | WP-23, WP-30 | F16 |
| WP-34 | Abonnemang via Flow, planer, kvoter, provperiod, frysning | integrations-engineer | WP-16 | F17 |
| WP-35 | Säljarvy för förmedlare | ui-engineer + db-engineer | WP-01 | F18 |
| WP-36 | Intern admin | ui-engineer | WP-34 | F19 |

## Utökningar

| ID | Titel | Agent | Beror på | F# | Status |
|---|---|---|---|---|---|
| WP-40 | Tjänstekategorier + frågor vid bokning (branschförslag, 7 typer, per tjänst/kategori, max 5, svar i agenda/Hoy/mejl/kundkort) | db-engineer + scheduling-engineer + copywriter-es-cl + integrations-engineer + ui-engineer | WP-15, WP-20, WP-21 | F1, F5, F6 | ☑ |
| WP-41 | Bokningssidan som företagsprofil (omslag, logga, om oss, galleri, beskrivningar) | db-engineer + ui-engineer | WP-40 | F1 | ☑ |
| WP-42 | Mobilanpassad ägarapp (flikrad, dagvy i agenda, ajustes) | ui-engineer | – | – | ☑ |
| WP-43 | Marknadssajtens toppmeny enligt Nav A | ui-engineer | – | – | ☑ |
| WP-44 | Personalens profilbild (alla planer) | db-engineer + ui-engineer | WP-41 | F1 | ☑ |
| WP-47 | Döda knappar i ägarappen: utloggning, kontomeny, rail, radmeny, statistik, 24 h-tid, bottenark, favicon, tooltips; obyggt dolt (D-035) | ui-engineer | – | – | ☑ |
| WP-49 | Mejl läsbara i mörkt läge | integrations-engineer | WP-16 | F7 | ☑ |
| WP-50 | Månadsvy i Agenda + datumväljare i marknadens format | ui-engineer | WP-47 | F6 | ☑ |
| WP-53 | Rendera profilvyn på /[slug] som serverkomponent (JS-budget tillbaka under 180 kB, D-039) | ui-engineer | – | F4 | ☐ |
| WP-54 | Medlemmar: flagga på kund, medlemsrabatt vid bokning, välkomstmejl | db + scheduling + ui | WP-24 | F6 | ☑ |
| WP-55 | Inställningar i flikar, Team-flik, meddelandefönster på kundkortet | ui + integrations | WP-24 | – | ☑ |
| WP-56 | Avbokning med godkännande (val i Inställningar) + SMS till företaget med svarslänk | db + scheduling + ui | WP-45 | F7 | ☑ |
| WP-57 | UX-översyn: gemensamt sidhuvud, meny med etiketter, mobil Mer-flik, ny Inicio/Hoy, Clientes-tabell, kundkort, Caja, månadsvy med fyllnad, Team-rader, Blixt-luckor | ui-engineer ×3 | – | – | ☑ |
| WP-45 | Bekräftelse av bokningar + notiser (status `requested`, bekräfta automatiskt i Ajustes, klocka/Inicio/Agenda med Confirmar/Rechazar, mejl "solicitud recibida"/"rechazada", utgång) | db-engineer + scheduling-engineer + integrations-engineer + copywriter-es-cl + ui-engineer | WP-16, WP-21 | F4–F7 | ☑ |
| WP-46 | Personalkonton och behörigheter (inbjudan via e-post, 7 fasta flaggor på memberships, RLS + serverkontroll, "Mis reservas") | db-engineer + scheduling-engineer + integrations-engineer + copywriter-es-cl + ui-engineer | WP-45 | F1, F3, F6 | ◐ (plan: docs/tasks/plans/WP-46.md) |
| WP-65 | Verifierade recensioner (CL + SE): förfrågan 2 h efter genomförd bokning (outbox, e-post + SMS i SE), `/resena/[token]` (1–5 + text, redigerbar 7 dagar), snitt + sektion på `/[slug]`, Reseñas under Clientes (filter, svar, anmälan), moderering i `/admin`, av/på i Ajustes → Reglas, anonymisering + export (D-045) | db + integrations + copywriter + ui | WP-16, WP-26, WP-36 | F4, F7 | ◐ (plan: docs/tasks/plans/WP-65-recensioner.md) |
| WP-63 | Demoföretag per marknad (`brand.demoSlug`: CL `estudio-brisa`, SE `salong-norrsken`) med full profil, rullande bokningar och horas flash via `private.seed_demo` (D-043) | db-engineer + ui-engineer | WP-41, WP-30 | F5, F13 | ☑ |
| WP-64 | Stripe Connect: kunder betalar behandlingen online till företaget (bara SE, D-044) — Express-konto, Checkout, avgift, webhook, återbetalning | integrations + db + ui | WP-45, WP-56 | – | ◐ (kod klar, väntar på sk_test-nycklar och webhook i Stripe, se docs/tasks/plans/WP-64-stripe-connect.md) |
| WP-66 | Flytta hit från ditt nuvarande bokningssystem: AI-import (Claude + web fetch med allowlist, eller inklistrad text) → förhandsgranskning → import i onboarding och Ajustes → Negocio; kostnadslogg `ai_import_runs`, 3/dygn, månadstak (D-046) | integrations-engineer + ui-engineer + db-engineer | WP-41, WP-55 | F1 | ☑ |

## Parallellisering — förslag
- **Dag 1:** WP-00 (en agent). Samtidigt: WP-03 (copywriter).
- **Därefter parallellt i 3–4 worktrees:** WP-01 (db) · WP-02 → WP-11/12/13/14 (ui) · WP-04 → WP-10 (scheduling) · WP-16 (integrations, efter WP-01).
- `qa-reviewer` granskar varje PR; `security-reviewer` granskar alla PR:er som rör `supabase/`, `src/app/api/` eller `src/server/payments/`.

## Sverige (D-025–D-028)

| ID | Titel | Agent | Beror på | Status |
|---|---|---|---|---|
| M1 | Marknad i koden: `MARKET` (CL/SE), marknadskonfig (språk, valuta, tidszon, telefonland, id-nummer, varumärke, leverantörer), `businesses.country/currency/locale`, belopp i minsta enhet med valuta, telefon +46, organisationsnummer, varumärke per marknad i `brand.ts` | scheduling-engineer + db-engineer | – | ☐ (pausad: hemsidan först) |
| M2 | Svenska: språkstruktur för flera språk (samma typade nycklar), `sv-SE` för alla skärmar, landning och e-post | copywriter (sv) + ui-engineer | M1 | ☐ |
| M3 | Svensk installation: Supabase `eu-north-1`, Vercel `arn1`, domän `.se`, staging-workflow per marknad | integrations-engineer | M1 | ☐ |
| M4 | Stripe-abonnemang (SE), ClickSend SMS (SE), svenska villkor och integritetspolicy (GDPR), moms 25 % | integrations-engineer | M2, M3 | ☐ |
