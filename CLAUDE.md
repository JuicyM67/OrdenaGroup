# llena — bokningssystem för pymes i Chile

> Arbetsnamn "llena". Löfte: **"Tu agenda se llena sola."** Enkelt, premium, prisvärt bokningssystem för barberare, frisörer, skönhet, kinesiologer m.fl. Startmarknad: Santiago (Providencia + Ñuñoa).

## Läs detta först (i ordning)
1. `docs/product/VISION.md` — tankesättet. Styr alla avvägningar.
2. `docs/product/MVP_SPEC.md` — vad som ska byggas (funktioner F1–F19 med "klart när").
3. `docs/decisions/DECISIONS.md` — fattade beslut. Bryt inte mot dem utan att skriva ett nytt beslut.
4. `docs/tasks/BACKLOG.md` — arbetspaket, ägare (agent) och beroenden.
5. Relevant specialdokument: `docs/tech/*`, `docs/design/*`, `docs/legal/COMPLIANCE.md`.

Bakgrund (läs vid behov): `docs/research/MARKET_RESEARCH.md`, `docs/gtm/GO_TO_MARKET.md`, `docs/product/ROADMAP.md`.

## Stack (beslutad, se D-003)
Next.js App Router + TypeScript strict (`src/`) · Tailwind v4 med tokens · Radix/shadcn omstylat · Supabase (`sa-east-1`) med RLS · Zod · tid via `src/lib/format/dates.ts` (Intl, D-018) · Vitest · Playwright · Vercel `gru1` · Meta WhatsApp Cloud API · Mercado Pago · Flow · Resend.

## Hårda regler
1. **Designen återskapas exakt.** Källa: `docs/design/reference/*.dc.html` + `docs/design/DESIGN.md`. Bara tokens från `src/styles/tokens.css`, inga hex-värden eller godtyckliga Tailwind-värden i komponenter. En skärm är klar först när `npm run visual` visar < 2 % avvikelse.
2. **Servern bestämmer tillgänglighet och priser.** Dubbelbokning förhindras av databasen (exclusion constraint).
3. **RLS på varje tabell, inga `anon`-policies.** Varje ny tabell får en pgTAP-test för tenant-isolering.
4. **Allt utgående via `message_outbox`.** Webhooks verifierar signatur och är idempotenta.
5. **Pengar = heltal CLP. Tid = timestamptz i UTC, logik i `America/Santiago`. Telefon = E.164.**
6. **UI-text på chilensk spanska (tú).** Använd strängarna från `copywriter-es-cl`, inte egna formuleringar.
7. **Dataskydd:** samtycken aldrig förkryssade, ingen persondata i loggar, export och radering ska fungera (Ley 21.719).
8. **Aldrig mot produktion.** Inga migrationer, deploys eller skarpa meddelanden mot prod från en agent.
9. **Scope:** bygg bara det som står i arbetspaketet. Ny idé → skriv den i `docs/tasks/IDEAS.md`, bygg den inte.
10. **Namnet "llena"** finns bara i `src/config/brand.ts` (och i docs).

## Arbetssätt
- **Plan först:** varje arbetspaket börjar i plan mode. Planen refererar till funktions-ID (F#) och "klart när"-kriterierna.
- **Små PR:er**, en per arbetspaket eller delsteg. Branch: `wp/<id>-<kort-namn>`.
- **Parallellt arbete** sker i separata git worktrees (se README). Två agenter rör aldrig samma filer samtidigt. Ägarskap per mapp står i BACKLOG.
- **Klart = testat:** `npm run typecheck && npm run lint && npm run test` gröna, plus `npm run visual` för UI och `npm run test:db` för databas.
- Uppdatera `docs/tasks/BACKLOG.md` (status) och vid behov `DECISIONS.md` i samma PR.

## Agenter (`.claude/agents/`)
| Agent | Ansvar | Äger |
|---|---|---|
| `planner` | Bryter ner funktioner till planer och arbetspaket, håller BACKLOG uppdaterad. Skriver ingen produktionskod. | `docs/tasks/` |
| `db-engineer` | Schema, migrationer, RLS, pgTAP, seed, typer, serverns DB-åtkomst | `supabase/`, `src/types/database.ts`, `src/server/db/` |
| `scheduling-engineer` | Tillgänglighet, bokning, väntelista, sommartid, format-lib | `src/server/scheduling/`, `src/server/waitlist/`, `src/server/bookings/`, `src/lib/format/` |
| `ui-engineer` | Komponenter och skärmar med exakt design, design lab | `src/components/`, `src/app/**/page.tsx`, `src/app/design-lab/` |
| `integrations-engineer` | WhatsApp, outbox, cron, Mercado Pago, Flow, e-post | `src/server/messaging/`, `src/server/payments/`, `src/server/billing/`, `src/app/api/` |
| `copywriter-es-cl` | All UI-text och alla meddelandemallar på chilensk spanska | `src/i18n/`, `docs/content/` |
| `qa-reviewer` | Granskar PR:er mot spec, design och tester. Rättar inte själv. | – |
| `security-reviewer` | RLS, auth, webhooks, hemligheter, Ley 21.719 | – |

**Delade mappar:** `src/lib/supabase/` (auth-klienter) skapas av WP-15 (ui-engineer). `src/lib/validation/<område>.ts` skapas av den agent vars arbetspaket behöver schemat. **Lokal Supabase:** bara en stack åt gången (samma `project_id` och portar), under Våg A bara i WP-01:s worktree. **E2E i worktrees:** egen `PORT` per worktree.

## Kommandon
`npm run dev` · `npm run typecheck` · `npm run lint` · `npm run test` · `npm run test:db` (pgTAP) · `npm run test:e2e` · `npm run visual [skärm]` · `npm run db:start` · `npm run db:reset` · `npm run db:types`

Slash-kommandon: `/start-wp <id>`, `/build-screen <skärm>`, `/visual-check [skärm]`, `/review`, `/status`.
