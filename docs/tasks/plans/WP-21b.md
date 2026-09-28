# WP-21b · Manuell bokning och flytt i agendan

## Mål

En inloggad ägare kan i `/app/agenda` lägga in en telefonbokning ("Nueva reserva") och
flytta en befintlig bokning ("Mover" i popovern), och det sparas mot databasen.

## DB (krav från säkerhetsgranskningen, före koden)

Ny migration `20260928090000_customers_guard_consent_owner_limits.sql` (ändrar inte gamla
migrationer) skärper `private.customers_guard_consent`: `authenticated` (ägaren) får aldrig
sätta `consent_marketing_at` (varken vid INSERT eller UPDATE, oavsett kanal — bara kunden
själv ger marknadsföringssamtycke), och får inte skriva över ett samtycke som redan kommer
från `web`/`whatsapp` genom att sätta `consent_channel = 'manual'` (anonymisering, WP-26, är
fortfarande undantagen — allt samtycke nollas samtidigt). 7 nya pgTAP-tester i
`supabase/tests/030_customers.test.sql` (plan 38 → 45): INSERT/UPDATE med `manual` +
marketing nekas, overwrite av `web`/`whatsapp` nekas (båda kanalerna), anonymisering
fungerar fortfarande.

## Servern

- `src/server/owner/manual-booking.ts` (ny): `loadOwnerBookableCatalog` (tjänster + vilka
  profesionales som utför dem, för dialogens `<select>`), `createManualBooking` (validerar
  indata, anropar motorns `createBooking` med `ctx.actor = { kind: "owner", userId }` —
  samma väg som redan testas med en lös minut, "16:07", i
  `src/server/bookings/create.db.test.ts`), `saveManualConsent` (separat steg, samma
  two-step-mönster som `src/server/bookings/submit.ts`/`src/app/[slug]/actions.ts`: ett fel
  där äter inte upp en redan skapad bokning) och `moveOwnerBooking` (anropar motorns
  `moveBooking`). `now` injiceras från `page.tsx` (samma mönster som `agenda.ts`/`hoy.ts` i
  samma mapp) — ingen egen `systemClock()`-anropare här.
- `src/server/onboarding/owner-business.ts`: `OwnerBusiness` har nu även `name` (behövs för
  samtyckesrutans hjälptext, `clientes.consentimientoManual.ayuda`).
- `/app/agenda/page.tsx`: tre nya server action-closures (`onCreateManualBooking`,
  `onMoveBooking`, plus katalogen laddas parallellt med agendan). Ett fel vid
  samtyckessparandet loggas här (utanför `src/server`, där `console.*` är tillåtet) — svaret
  blir ändå `ok` (bokningen finns redan).

## UI

- **Dag/tid är fria inmatningsfält** (`<input type="date">`/`<input type="time" step="60">`),
  inte en tidslista från motorn: SCHEDULING.md policy 5 säger att ägaren kan boka utanför
  rutnätet (bekräftat av det redan existerande "16:07"-testet, och `fromLocalStrict` fanns
  redan odokumenterat i `dates.ts` men användes ingenstans) — en tidslista hade bara visat
  gridade kandidater. Servern (`createBooking`/`moveBooking`) är den enda sanningskällan;
  dialogen validerar bara att fälten inte är tomma. `fromLocal` (standard "compatible")
  används för att slå ihop dag+tid till en instant — samma disambiguering som resten av
  systemet, inga särskilda sommartidsfält i UI:t.
- `src/components/ui/select.tsx` (ny, liten primitiv): nativ `<select>` med samma
  label/hint/error-form som `TextField`, mönstret hämtat från `business-section.tsx`
  (WP-15b). Ingen `*.dc.html`-referens för dialogerna (utanför WP-21b:s visuella scope, se
  "Kört grönt" nedan).
- `src/components/agenda/manual-booking-dialog.tsx` (ny): "Nueva reserva". Radix Dialog (ny
  dependency, `@radix-ui/react-dialog@1.1.23`, samma familj som redan använda
  `@radix-ui/react-popover`). Fält: servicio, profesional ("Cualquiera" eller filtrerat på
  katalogens `staffIds`), día, hora, cliente (namn/telefon/e-post — återanvänder
  `client-validation.ts`/`ConsentCheckbox` från `src/components/booking/`, ingen nära kopia),
  notas (`agenda.manual.notasAyuda`), och samtyckesrutan (`clientes.consentimientoManual.*`,
  aldrig förkryssad).
- `src/components/agenda/move-dialog.tsx` (ny): "Mover reserva", två steg — välj dag/tid
  (`agenda.mover.*`) och bekräfta (`agenda.confirmarAviso.mover.*`, redan i `es-CL.ts`).
  Ändrar inte profesional (utanför scope).
- `src/components/agenda/errors.ts` (ny): `BookingError` → `errores.agenda.*`. Fältfel för
  namn/telefon/e-post SAKNAS i `errores.agenda` — återanvänder `errores.reserva.nombreVacio`/
  `emailInvalido`/`telefono.*` (samma texter, rapporterat här som instruerat).
- `agenda-screen.tsx`: `showMover` är nu `true` på `/app/agenda` (Mover finns). Nya props
  `catalog`, `businessName`, `onCreateManualBooking`, `onMoveBooking` — alla valfria, så
  design lab (som inte skickar dem) är oförändrat. "Toast" för `agenda.toast.movida` är en
  sr-only `role="status"`-annonsering, samma mönster som `HoyScreen`s Llegó/No vino — det
  finns ingen synlig toast-komponent i kodbasen.
- **Hoy**: oförändrad (item 4 i uppdraget, "annars lämna"). De tre `QuickActionTile` är redan
  Hora flash/Lista de espera/Cobrar (DESIGN.md §7) — det finns ingen fjärde platshållare för
  en ny bokning, och att lägga till en skulle ändra en redan byggd, testad design utanför
  detta uppdrags scope.

## Tester

- `supabase/tests/030_customers.test.sql`: 7 nya pgTAP-tester (se ovan).
- `src/server/owner/manual-booking.db.test.ts` (ny, 13 tester): katalogen + tenant-isolering,
  bokning utanför rutnätet, samtycke (med/utan, aldrig marketing), krock → `slot_taken`,
  `invalid_input`, tenant-isolering för create/move/`saveManualConsent`.
- `src/components/agenda/errors.test.ts` (ny): uttömmande `BookingError`/telefonkoder →
  `errores.agenda`/`errores.reserva`.
- `e2e/owner-live.spec.ts` (utökad, samma inloggade session — ingen ny magic-link):
  `dueno@example.com` skapar en manuell bokning ("Nueva reserva", 18:11) och flyttar den
  (18:20), verifierat mot databasen (lokal tid i `America/Santiago`).

## Kända begränsningar

- Dialogernas utseende är inte pixeltestat mot en referens (ingen `*.dc.html` finns för dem,
  och uppdraget avgränsar bort `npm run visual`) — bara tokens från `tokens.css`.
- Mover-dialogens tidsförslag beräknas inte från motorns `getAvailableSlots` (fria fält i
  stället, se "UI" ovan) — inga kollisioner med bokningens EGEN nuvarande tid filtreras bort
  i UI:t; servern (`moveBooking`, `excludeBookingId`) är korrekt även om UI:t skulle föreslå
  en tid som råkar vara bokningens egen.
- Ingen WhatsApp-avisering skickas faktiskt vid flytt (texten i `agenda.confirmarAviso.mover`
  nämner det, men `message_outbox` är integrations-engineers område, utanför scope).

## Kört grönt

`typecheck`, `lint`, `format:check`, `test` (1559), `test:integration` (133, inkl. 13 nya),
`db:reset && test:db` (411 pgTAP, 7 nya), `build`, `PORT=3123 BASE_URL=http://127.0.0.1:3123
npx playwright test` (201 passed, 64 skipped, 0 failed — desktop + mobile). `.env.local`
skapad lokalt i worktreen (gitignorad) för att `npm run build && npm run start` (Playwrights
webServer) ska hitta Supabase-nycklarna; `supabase/config.toml` fick porten 3123 i
`additional_redirect_urls`.
