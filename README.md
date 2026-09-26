# llena — bokningssystem för pymes i Chile

_Arbetsnamn. "Tu agenda se llena sola."_

Den här mappen innehåller allt Claude Code behöver för att bygga produkten: tankesätt, analys, specifikation, design, teknisk arkitektur, beslut, backlog och färdiga agenter. Projektgrunden (WP-00) är byggd; resten byggs av agenterna i tur och ordning.

## Innehåll

```
CLAUDE.md                      Läses automatiskt av Claude Code i varje session: regler, stack, agenter
claude-config/  → kopieras till .claude/ av setup-claude.sh
  agents/                      8 specialiserade agenter (planner, db, scheduling, ui, integrations, copy, qa, security)
  commands/                    /start-wp, /build-screen, /visual-check, /review, /status
  settings.json                tillåtna och förbjudna kommandon (inget mot produktion)
docs/
  product/VISION.md            tankesättet — läs först
  product/MVP_SPEC.md          funktioner F1–F19 med "klart när"
  product/ROADMAP.md           faser + det du behöver göra utanför koden
  research/MARKET_RESEARCH.md  marknad, konkurrenter, betalningar, WhatsApp-kostnader, open source
  gtm/GO_TO_MARKET.md          Santiago, priser, förmedlarmodell
  legal/COMPLIANCE.md          SII, SERNAC, Ley 21.719 som produktkrav
  decisions/DECISIONS.md       beslutslogg D-001–D-012
  tech/                        ARCHITECTURE, DATA_MODEL, SCHEDULING, INTEGRATIONS
  design/DESIGN.md             designriktlinjer och komponentspecar
  design/reference/*.dc.html   designen från designytan — källan till sanning
  design/screens/              lägg exporterade PNG:er här (se README där)
  design/PROMPTS.md            alternativ: skärm-för-skärm-prompter utan agenter
  tasks/BACKLOG.md             arbetspaket WP-00…WP-36 med ägare och beroenden
src/styles/tokens.css          design tokens (Tailwind v4)
scripts/visual-diff.mjs        pixeljämförelse mot designen
```

## Kom igång

1. **Exportera designbilderna.** Exportera de fem skärmarna från designytan som PNG och spara dem i `docs/design/screens/` (namnen står i README där).
2. **Installera agenterna:** kör `bash setup-claude.sh` i mappen. Det kopierar `claude-config/` till `.claude/`, där Claude Code letar.
3. **Initiera git** i den här mappen: `git init && git add . && git commit -m "Projektgrund: docs, design, agenter"`.
4. **Installera verktyg:** Node 24 (se `.nvmrc`). Supabase CLI installeras via `npm install` (dev-beroende, `npm run db:*`) — Docker behövs först från WP-01, när lokal Supabase används.
5. **Öppna Claude Code i mappen** och kör:
   ```
   /status
   /start-wp WP-00
   ```
   Planen visas först och du godkänner den. Därefter bygger agenten projektgrunden.

## npm-skript

| Skript                                            | Kommando                                                                                                                  | Beskrivning                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev`                                             | `next dev`                                                                                                                | Utvecklingsserver                                                                                                                                                                                                                                                                                                                                                 |
| `build`                                           | `next build`                                                                                                              | Produktionsbygge                                                                                                                                                                                                                                                                                                                                                  |
| `start`                                           | `next start`                                                                                                              | Kör produktionsbygget                                                                                                                                                                                                                                                                                                                                             |
| `typecheck`                                       | `next typegen && tsc --noEmit`                                                                                            | Ruttypning + TypeScript strict                                                                                                                                                                                                                                                                                                                                    |
| `lint`                                            | `eslint . --max-warnings=0`                                                                                               | Lint (ESLint flat config)                                                                                                                                                                                                                                                                                                                                         |
| `format` / `format:check`                         | `prettier --write .` / `prettier --check .`                                                                               | Formatering                                                                                                                                                                                                                                                                                                                                                       |
| `test` / `test:watch`                             | `vitest run` / `vitest`                                                                                                   | Enhetstester                                                                                                                                                                                                                                                                                                                                                      |
| `test:e2e`                                        | `playwright test`                                                                                                         | E2E (kräver `npx playwright install chromium`). Port från `PORT` (standard 3000, se portkonvention nedan). Bygger och startar sin egen server (`npm run build && npm run start -p <PORT>`); en redan körande server återanvänds bara med `PW_REUSE_SERVER=1`.                                                                                                     |
| `visual`                                          | `node scripts/visual-diff.mjs`                                                                                            | Pixeljämförelse mot `docs/design/screens/`. Kräver en körande server (`npm run build && npm run start`, se "Design lab" nedan — inte `next dev`) på `BASE_URL` (standard `http://localhost:3000`). `npm run visual -- components` (utsnitten, WP-02) är grönt; hela skärmarna (WP-11–14) svarar "– pendiente" tills de finns, `VISUAL_STRICT=1` gör det till fel. |
| `test:db`                                         | `supabase test db`                                                                                                        | pgTAP (från WP-01, kräver `db:start`)                                                                                                                                                                                                                                                                                                                             |
| `db:start` / `db:stop` / `db:status` / `db:reset` | `supabase start` / `stop` / `status` / `db reset`                                                                         | Lokal Supabase (från WP-01, kräver Docker)                                                                                                                                                                                                                                                                                                                        |
| `db:types`                                        | `supabase gen types typescript --local > src/types/database.ts.tmp && mv src/types/database.ts.tmp src/types/database.ts` | Genererar databastyper (från WP-01)                                                                                                                                                                                                                                                                                                                               |

## Köra flera agenter parallellt

När WP-00 är klart kan flera arbetspaket köras samtidigt, var och ett i en egen **git worktree** med en egen Claude Code-session:

```bash
git worktree add ../llena-db     -b wp/WP-01-schema
git worktree add ../llena-ui     -b wp/WP-02-design-lab
git worktree add ../llena-sched  -b wp/WP-04-format
```

Öppna Claude Code i varje mapp och kör `/start-wp WP-01`, `/start-wp WP-02`, `/start-wp WP-04`. Agenterna äger olika mappar, se tabellen i `CLAUDE.md`, så de krockar inte. Merga via PR efter `/review`.

### Portkonvention för worktrees

Flera worktrees kan ha en egen `next dev`/`next start` igång samtidigt. För att undvika att en
körning av `npm run test:e2e` eller `npm run visual` i en worktree av misstag träffar servern i en
annan, använd en egen port per arbetspaket: **`PORT=30NN`**, där `NN` är arbetspaketets nummer
(t.ex. `PORT=3002` för WP-02, `PORT=3011` för WP-11).

```bash
PORT=3002 npm run dev
PORT=3002 npm run test:e2e
BASE_URL=http://localhost:3002 npm run visual
```

`playwright.config.ts` läser `PORT` (standard 3000) och startar sin egen `next build && next start`
på den porten; `reuseExistingServer` används bara om `PW_REUSE_SERVER=1` sätts uttryckligen.
`scripts/visual-diff.mjs` läser `BASE_URL` (standard `http://localhost:3000`) och förutsätter att en
server redan kör där (`npm run build && npm run start` på samma port, inte `next dev`, se nedan).

## Design lab

`/design-lab` (och undersidorna `/design-lab/components`, `/design-lab/crops/*` samt en route per
skärm som `/design-lab/main`) visar alla generella komponenter (`src/components/ui/`) i sina
varianter, tillstånd och de utsnitt som jämförs mot referensbilderna. Labbet är bara till för
utveckling: `notFound()` när `VERCEL_ENV === "production"`, och sidorna har `robots: { index: false }`.

- **Katalog:** `npm run dev` och öppna `/design-lab/components` för att bläddra manuellt.
- **Visuell jämförelse:** `npm run visual -- components` kör alla registrerade utsnitt i
  `src/app/design-lab/crops/crops.json` mot `docs/design/screens/*.png`. `npm run visual` (utan
  argument) kör även hela skärmarna; en skärm som ännu inte finns (404) skrivs ut som
  "– pendiente" och räknas inte som fel, om inte `VISUAL_STRICT=1` sätts.
- Kör **alltid** mot `npm run build && npm run start` (inte `next dev`): dev-servern har HMR och
  första-anrops-kompilering som gör skärmdumparna långsamma och instabila, och `devIndicators`
  ritas annars in i bilden.
- Kör lokalt på macOS. Font-rendering skiljer sig mellan macOS och Linux, så `< 2 %`-tröskeln är
  kalibrerad mot macOS (samma plattform som referensbilderna).

**Förslag på första veckan:** WP-00 → sedan parallellt WP-01 (db), WP-02 → WP-11–14 (ui), WP-04 → WP-10 (scheduling), WP-03 (copy). Se "Parallellisering" i BACKLOG.

## Det du måste göra själv (agenterna kan inte)

Se `docs/product/ROADMAP.md` → "Parallellt arbete utanför koden": SpA och SII, bankkonto, Meta-verifiering och WhatsApp-mallar, Mercado Pago- och Flow-konton, contador, jurist, domän och slutligt namn. **Starta Meta-verifieringen tidigt**, eftersom den brukar ta längst tid.
