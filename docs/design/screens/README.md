# Referensbilder

Exportera varje artboard från designytan som PNG (Share › Export, gärna i 2x) och spara här med exakt dessa namn:

- `Main.png` — 1440×900
- `Agenda.png` — 1440×900
- `Reserva.png` — 390×1060
- `Hoy.png` — 390×844
- `HoraFlash.png` — 360×640

`scripts/visual-diff.mjs` jämför design lab mot dessa. Uppdatera bilderna här varje gång designen ändras.

**Utsnitt (`src/app/design-lab/crops/crops.json`, WP-02 steg 7):** varje post har ett `clip`
(x/y/bredd/höjd i CSS-px, i respektive artboards fulla storlek ovan) som pekar in i just den
här bilden. Om en bild exporteras på nytt med en annan layout måste `clip`-värdena räknas om
(mät ur `docs/design/reference/*.dc.html`s inline-stilar, inte ur bilden i pixlar) och
`npm run visual -- components` köras igen för att bekräfta att utsnitten fortfarande stämmer.
