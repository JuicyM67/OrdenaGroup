---
description: Bygg en skärm exakt enligt designreferensen och verifiera visuellt
argument-hint: <main | agenda | reserva | hoy | hora-flash>
---

Bygg skärmen **$ARGUMENTS** med agenten `ui-engineer`.

1. Läs `docs/design/DESIGN.md` och referensfilen för skärmen i `docs/design/reference/` (main → Main.dc.html, agenda → Agenda.dc.html, reserva → Reserva.dc.html, hoy → Hoy.dc.html, hora-flash → HoraFlash.dc.html).
2. Lista komponenterna skärmen behöver (DESIGN.md §7) och vilka som redan finns i `src/components/`. Bygg de som saknas först.
3. Lägg exempeldata från referensfilens `renderVals()` i `src/app/design-lab/$ARGUMENTS/fixtures.ts` (en fil och route-mapp per skärm, så att parallella skärmar inte krockar) och rendera skärmen på `/design-lab/$ARGUMENTS` i exakt artboard-storlek.
4. Kör `npm run visual $ARGUMENTS`, öppna `.visual-diff/$ARGUMENTS.diff.png` och jämför. Rätta och kör igen tills avvikelsen är under 2 %.
5. Kontrollera att inga hex-värden eller godtyckliga Tailwind-värden har smugit in.
6. Rapportera avvikelsen i procent, vilka tokens som eventuellt lagts till, och vad som återstår.
