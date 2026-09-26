# Prompter till Claude Code — i ordning

Klistra in en i taget. Vänta tills varje steg är klart och visuellt godkänt innan nästa.

---

### 0. Grund
> Sätt upp ett Next.js-projekt (App Router, TypeScript strict) med Tailwind CSS v4, `lucide-react` och `next/font`. Använd `src/`-katalog. Importera `src/styles/tokens.css` i `src/app/globals.css` och ladda Bricolage Grotesque och Plus Jakarta Sans enligt DESIGN.md §3. Installera Playwright, pixelmatch och pngjs och lägg till skriptet `"visual": "node scripts/visual-diff.mjs"`. Läs CLAUDE.md och DESIGN.md först. Planera innan du bygger.

### 1. Design lab
> Skapa routen `/design-lab/[screen]` (bara i utvecklingsläge) som renderar en tom yta i exakt artboard-storlek per skärm enligt CLAUDE.md. Lägg exempeldata från `renderVals()` i varje referensfil i `src/design-lab/fixtures.ts`.

### 2. Baskomponenter
> Bygg komponenterna i DESIGN.md §7 som används i `Main.dc.html`: AppShell, NavRail, PageHeader, HeroSummary, FeatureCard, StatTile, AgendaRow, StatusChip, MiniCalendar (ljus variant), FlashCard. Läs `docs/design/reference/Main.dc.html` rad för rad och kopiera måtten. Bara tokens.

### 3. Skärm: Inicio
> Sätt ihop `/design-lab/main` av komponenterna. Kör `npm run visual -- main`, öppna diff-bilden och rätta tills avvikelsen är under 2 %. Visa mig skärmdumpen och siffran.

### 4. Skärm: Agenda
> Bygg WeekGrid, DayPill, EventBlock, EventPopover (Radix Popover), SegmentedControl, mörk MiniCalendar och SidePanelCard enligt `Agenda.dc.html`. Positionering av block: top = (start − 10) × 94 + 20, höjd = minuter / 60 × 94 − 4. Sätt ihop `/design-lab/agenda` och verifiera visuellt.

### 5. Skärm: Reserva (kund, mobil)
> Bygg ServiceCard, Pill, DayPicker, TimeSlot, WaitlistCard och BookingBar enligt `Reserva.dc.html`, inklusive tillstånden (vald tjänst, dag, tid, hora flash −20 %, full dag → väntelista). Verifiera visuellt i standardtillståndet (Corte + barba, Mar 6, 11:30).

### 6. Skärm: Hoy (ägare, mobil) och Hora flash-bilden
> Bygg NextClientCard, QuickActionTile och MobileTabBar enligt `Hoy.dc.html`. Bygg FlashStory som en bildroute med `@vercel/og` i 1080×1920 som ser ut som `HoraFlash.dc.html` i 3x. Verifiera båda.

### 7. Koppla på riktig data
> Nu när alla skärmar matchar designen: koppla dem mot Supabase (datamodellen i projektplanen). Designen får inte ändras — kör `npm run visual` efter varje steg för att se att inget har rört sig.

---

**Om något inte blir rätt:** ge Claude Code skärmdumpen och säg exakt vad som skiljer ("rubriken är 36 px i stället för 40", "korten har skugga"). Be den läsa om referensfilen för just den delen i stället för att gissa.
