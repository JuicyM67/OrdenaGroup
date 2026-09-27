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
| WP-11 | Skärm Inicio (desktop) enligt `Main.dc.html` med fixtures | ui-engineer | WP-02 | F6 | ◐ |
| WP-12 | Skärm Agenda veckovy enligt `Agenda.dc.html` + dagvy per profesional (ny, samma språk) | ui-engineer | WP-02 | F6 | ◐ |
| WP-13 | Skärm Reserva (kund) enligt `Reserva.dc.html` med fixtures, alla tillstånd | ui-engineer | WP-02, WP-03 | F5, F8 | ◐ |
| WP-14 | Skärm Hoy (mobil ägare) enligt `Hoy.dc.html` | ui-engineer | WP-02 | F6 | ☑ |
| WP-15 | Auth + onboarding i 4 steg (tjänster, personal, öppettider, länk) + Ajustes | ui-engineer | WP-01, WP-02, WP-03b | F1–F3 | ☐ |
| WP-16 | Outbox + cron-infrastruktur + e-post (Resend) + WhatsApp-klient och webhook | integrations-engineer | WP-01 | F7 | ☐ |

## Våg C — koppla ihop

| ID | Titel | Agent | Beror på | F# | Status |
|---|---|---|---|---|---|
| WP-20 | Koppla Reserva mot schemamotorn, samtycken, bekräftelse, kundens `r/[token]`-sida (se, flytta, avboka) | ui-engineer + scheduling-engineer | WP-10, WP-13, WP-16 | F5, F7 | ☐ |
| WP-21 | Koppla Agenda/Hoy/Inicio mot riktig data, manuell bokning, Llegó/No vino | ui-engineer | WP-10, WP-11, WP-12, WP-14 | F6, F9 | ☐ |
| WP-22 | Påminnelser 24 h + knappsvar Confirmo/Necesito cambiar | integrations-engineer | WP-16, WP-20 | F7 | ☐ |
| WP-23 | Väntelista end-to-end (sequential + broadcast) | scheduling-engineer + integrations-engineer | WP-10, WP-16 | F8 | ☐ |
| WP-24 | Kassa: markera betald, summeringar | ui-engineer + db-engineer | WP-21 | F10 | ☐ |
| WP-25 | Handpenning via Mercado Pago (OAuth, preferens, webhook, utgång) | integrations-engineer | WP-20 | F11 | ☐ |
| WP-26 | Dataskydd: samtyckeslogg, export/anonymisering, lagringsjobb, policysidor (text från jurist) | db-engineer + security-reviewer | WP-20 | F12 | ☐ |
| WP-27 | **Säkerhetsgranskning före pilot** | security-reviewer | WP-20 till WP-26 | – | ☐ |

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

## Parallellisering — förslag
- **Dag 1:** WP-00 (en agent). Samtidigt: WP-03 (copywriter).
- **Därefter parallellt i 3–4 worktrees:** WP-01 (db) · WP-02 → WP-11/12/13/14 (ui) · WP-04 → WP-10 (scheduling) · WP-16 (integrations, efter WP-01).
- `qa-reviewer` granskar varje PR; `security-reviewer` granskar alla PR:er som rör `supabase/`, `src/app/api/` eller `src/server/payments/`.
