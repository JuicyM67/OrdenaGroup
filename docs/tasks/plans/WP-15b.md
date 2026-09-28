# WP-15b slim · Ajustes

## Mål

En inloggad ägare kan efter onboarding ändra sitt företag i `/app/ajustes`: företaget,
tjänster, personal och öppettider. Samma valideringsregler och slug-regler som
onboarding (F1/F2/F3).

## Vad byggdes

- `src/server/owner/ajustes-schemas.ts` (ny): Zod-scheman för Ajustes. Återanvänder
  `businessNameSchema`/`slugSchema`/`comunaSchema`/`serviceInputSchema`/
  `staffNameSchema`/`hoursInputSchema` som nu exporteras från
  `src/server/onboarding/schemas.ts` (samma regler, ingen duplicering) och lägger till
  fälten som bara finns i Ajustes (adress, reglerna, buffert, `serviceIds` för
  personal).
- `src/server/owner/ajustes.ts` (ny): `loadAjustesData` (läser företag + tjänster +
  personal + öppettider i en transaktion, `withOwnerTx`) och en mutation per
  formulär: `updateBusinessSettings`, `createService`/`updateService`/
  `setServiceActive`, `createStaff`/`updateStaff`/`setStaffActive`,
  `replaceBusinessHours` (delete+insert, samma mönster som onboarding). Alla tar
  `businessId` explicit OCH litar på RLS (D-014/D-019): ett `UPDATE`/`DELETE` som RLS
  filtrerar bort ger 0 rader → `{ok:false, code:"unauthorized"}` (`assertUpdated`); ett
  `INSERT` som bryter mot `with check` kastar 42501 → samma kod (`mapDbError`).
- `src/app/(app)/app/ajustes/actions.ts` (ny): "use server"-wrappers. Varje anrop
  läser `userId` (`getUser()`) och `businessId` (`getOwnerBusiness`) själv — aldrig
  från klienten (samma regel som `/app/onboarding/actions.ts`).
- `src/app/(app)/app/ajustes/page.tsx` (ny): laddar data, redirectar ägare utan
  företag till `/app/onboarding` (samma mönster som `/app/inicio`), `noindex`.
- `src/components/settings/` (ny mapp): `AjustesScreen` (AppShell/PageHeader/MainNav,
  samma ram som Inicio) + fyra sektioner. `BusinessSection`: ett formulär, två kort
  ("Tu negocio"/"Reglas de reserva" — samma `businesses`-rad), slug-varningen
  (`ajustes.slugAviso`) visas när fältet skiljer sig från det sparade värdet.
  `ServicesSection`/`StaffSection`: lista, lägg till, ändra (ett formulär öppet åt
  gången), aktivera/inaktivera — **ingen radering** (spec, motsvarar att DB blockerar
  borttagning av en tjänst med bokningar). `HoursSection`: samma form som
  onboardingens `hours-step.tsx` (ett intervall/dag), egen "Guardar cambios".
  Klientvalidering återanvänder `src/components/onboarding/client-validation.ts`
  (ingen Zod i klienten); `ajustesErrorText` mappar servervarianten av alfabetet.

## Kända begränsningar / avsteg (medvetna, dokumenterade i koden)

- **Utanför scope** (enligt uppdraget): handpenning/Mercado Pago, logotyp/accentfärg,
  väntelisteläge, radering av konto, inbjudan av personal, personalfärg,
  tjänstekategori och "visa på sidan"-flaggan (kolumner finns i DB men fälten stod
  inte i uppdragets fältlista).
- **Ingen `npm run visual`**: ingen `*.dc.html`-referens finns för Ajustes ännu (inte
  byggd i design lab). Skärmen återanvänder befintliga tokens/komponenter
  (Card/TextField/Button/Pill/AppShell/PageHeader/MainNav) rakt av.
- **TODO_COPY**: `src/components/settings/shared-copy.ts` — saknar en generisk kort
  "Editar"-etikett i `es-CL.ts` (bara varianter med resursens namn finns, t.ex.
  `clientes.editar.tituloEditar` = "Editar cliente", som inte passar bredvid ett
  tjänste-/personalnamn). Placeholder `"TODO_COPY: Editar"` tills copywriter-es-cl
  lägger till t.ex. `comun.editar`.
- Fyra numeriska regelfält (anticipación mínima, plazo de cancelación, días de
  anticipación, intervalo de horas) saknar egen felcopy i `validacion.*` → mappas till
  `comun.algoSalioMal` (närmaste befintliga nyckel) i `ajustesErrorText`.
- `supabase/config.toml`: la till `http://127.0.0.1:3122/auth/confirm` i
  `additional_redirect_urls` (samma mönster som WP-15:s 3115) — krävs för magic-link
  i den här worktreens e2e-port.

## Tester

- `src/server/owner/ajustes.db.test.ts` (ny, integrationstest mot lokal Supabase):
  företaget sparas, ogiltig indata skriver inget; tjänster/personal/öppettider
  skapas/ändras/av- och aktiveras; **en annan ägare kan inte ändra** något av
  ovanstående (tenant-isolering, RLS) — vare sig via UPDATE (0 rader) eller INSERT
  (42501 → `unauthorized`).
- `e2e/ajustes.spec.ts` (ny): loggar in som den seedade ägaren
  (`dueno@example.com` → Barbería Norte), ändrar priset på "Corte clásico" i
  `/app/ajustes`, ser ändringen i listan och sedan på `/barberia-norte`. Desktop
  bara (Ajustes har ingen egen mobil-layout i WP-15b — testad manuellt vid 360 px,
  ingen horisontell scroll, men ingen egen e2e-assertion för det).

## Kört grönt

`typecheck`, `lint`, `format:check`, `test` (1539), `test:integration` (127, inkl. 16
nya), `db:reset && test:db` (404 pgTAP, oförändrat — ingen ny tabell), `build`,
`PORT=3122 npx playwright test` (201 passed, 64 skipped, 0 failed — desktop + mobile).
