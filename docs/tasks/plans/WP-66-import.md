# WP-66 · Flytta hit från ditt nuvarande bokningssystem (F1, båda marknaderna)

1. **Server `src/server/import/`:** `platforms.ts` (allowlist + Zod-URL-validering), `extraction-schema.ts` (structured output), `claude.ts` (`AI_IMPORT_MODEL`, standard `claude-haiku-5-5` med `web_fetch_20250910`; Opus/Sonnet får `web_fetch_20260209`; `allowed_domains` = allowlist, `max_uses: 3`, `max_content_tokens`, effort `medium`, ingen refusal-fallback, `pause_turn`-loop, refusal/max_tokens, typade SDK-fel), `fixtures.ts` (`AI_IMPORT_FAKE=1`), `runs.ts` (logg + 3/dygn + månadstak `AI_IMPORT_MONTHLY_BUDGET_USD`), `preview.ts` (extraktion → förhandsgranskning, ren/testad), `apply.ts` (import i EN `withOwnerTx` via befintliga scheman + `…In`-hjälpare i `owner/ajustes.ts`).
2. **Route `POST /api/import/extract`** (`maxDuration` 120 s, avbrytbar via `request.signal`). Döljs (404/`unavailable`) utan `ANTHROPIC_API_KEY` och utan fejkläge (D-035).
3. **UI `src/components/import/import-panel.tsx`:** länk eller inklistrad text → lugn progress → förhandsgranskning per grupp (Profil, Öppettider, Kategorier & tjänster, Personal) med kryssrutor, inline-pris/längd, "finns redan", varningar.
   - Onboarding (första steget): fyller wizardens data (företag, tjänster m. beskrivning/kategori, personal m. titel, tider) + "Tu página"-texterna; sparas av befintliga `completeOnboarding`/`updateBusinessProfile`.
   - Ajustes → Negocio (bara ägaren): `applyImportAction` → `apply.ts`.
4. **DB:** `public.ai_import_runs` (RLS: läs egna/ägarens, inga skrivgrants för `authenticated`, inga anon), pgTAP `113_ai_import_runs.test.sql`.
5. **Copy:** `importar` i `es-CL.ts` + `sv-SE.app.ts`. Bilder importeras inte (IDEAS.md). D-046.

Klart när: fejkläget ger förhandsgranskning + import end-to-end lokalt i båda flödena; typecheck/lint gröna; pgTAP + enhetstester (allowlist, mappning) gröna.
