# WP-40 · Tjänstekategorier och frågor vid bokning

Design: `.visual-diff/ref/falt-A-bokningsformular.html` (Inställningar → Bokningsformulär), `falt-B-per-tjanst.html` (tjänst → flik "Frågor vid bokning"), `falt-kategorier.html` (kategorier + fråga på flera tjänster). Beslut godkända av ägaren 2026-09-29.

## 1. Mål
Ägaren grupperar tjänster i kategorier och ställer egna/föreslagna frågor i bokningsformuläret per tjänst eller kategori; svaren valideras av servern och syns i agenda/Hoy, ägarens mejl och kundkortet. Bygger ut F1 (tjänster), F5 (bokningssidan) och F6 (agenda); F1/F5/F6:s befintliga "klart när" får inte försämras.

## 2. Utanför scope (uppskjutet → `docs/tasks/IDEAS.md`)
Bilduppladdning som svarstyp · frågor som påverkar pris eller längd · villkorade frågor (visa B om A = ja) · frågor i manuell bokning från agendan (visar bara befintliga svar) · export/radering av svar (WP-26, men datamodellen förbereds) · statistik över svar · kategorier för personal.

## 3. Ägare och mappar
| Agent | Mappar |
|---|---|
| db-engineer | `supabase/migrations/`, `supabase/tests/`, `supabase/seed.sql`, `src/types/database.ts`, `src/server/db/` |
| scheduling-engineer | `src/server/bookings/`, `src/server/booking-questions/` (ny), `src/lib/validation/booking-questions.ts` (ny) |
| copywriter-es-cl | `src/i18n/` (es-CL + sv-SE), `src/i18n/booking-question-presets.ts` (ny) |
| integrations-engineer | `src/server/messaging/` (bara ägarmejlet "ny bokning") |
| ui-engineer | `src/components/settings/`, `src/components/booking/`, `src/components/agenda/`, `src/components/hoy/`, `src/components/customers/`, berörda `src/app/**/page.tsx` |

Inga överlapp: steg 1 före 2–4; steg 3 och 4 parallellt; UI-stegen 5–8 sekventiellt i samma worktree.

## 4. Steg
1. **Schema (db-engineer)** — migration `…_booking_questions.sql`:
   - `service_categories (id, business_id, name, sort, unique (business_id, id))`; seed-förslag Dam/Herr/Övrigt skapas inte automatiskt utan via UI.
   - `services.category_id uuid null` + sammansatt FK `(business_id, category_id)`, `on delete set null`. Befintlig fri text `services.category` migreras till rader och kolumnen tas bort (se D-031).
   - enum `question_kind ('short_text','long_text','single_choice','multi_choice','number','yes_no','date')`.
   - `booking_questions (id, business_id, label, help null, kind, options jsonb null (check: krävs för *_choice, annars null), required bool, save_to_customer bool, preset_key null, applies_to enum('all','targets'), active, sort)`.
   - `booking_question_targets (business_id, question_id, service_id null, category_id null, check exakt en satt)`, sammansatta FK. Kategori-mål ger automatiskt nya tjänster i kategorin (upplöses vid läsning, ingen kopiering).
   - `booking_answers (business_id, booking_id, question_id null on delete set null, label_snapshot, kind_snapshot, value jsonb, primary key (booking_id, question_id))` — snapshot så att svaret går att läsa även om frågan ändras/tas bort.
   - `customer_answers (business_id, customer_id, question_id, value jsonb, updated_at, primary key (customer_id, question_id))` — bara frågor med `save_to_customer`.
   - RLS: owner/admin full på katalogtabellerna; staff select. Svar: select för medlemmar, skrivs bara av service role (bokningsflödet) och ägaren (kundkort). Inga `anon`-policies.
   - Uppdatera `DATA_MODEL.md`, `db:types`, läsfunktioner i `src/server/db/booking-questions.ts`.
2. **Presets och texter (copywriter)** — `booking-question-presets.ts`: 3–5 förslag per bransch för 8 branscher (se FRÅGA 1), `preset_key` + typ + alternativ, es-CL och sv-SE. UI-strängar för A, B, kategorier, formulärfälten, felmeddelanden, varningstexten om känsliga uppgifter och etiketter i agenda/Hoy/kundkort/mejl.
3. **Server (scheduling-engineer)** —
   - `getQuestionsForService(businessId, serviceId)`: `all` + tjänstmål + kategorimål, aktiva, sorterade, max 5 (överskott klipps deterministiskt efter `sort` och loggas utan persondata).
   - `src/lib/validation/booking-questions.ts`: Zod-schema byggt från frågelistan (typ, obligatorisk, tillåtna alternativ, längdgräns 500/2000 tecken, siffra som heltal inom rimligt intervall, datum `YYYY-MM-DD`).
   - `createBooking` tar emot `answers`, validerar mot serverns frågelista (klientens lista litas aldrig på) och skriver `booking_answers` + upsert `customer_answers` i samma transaktion som bokningen. Okänd/inaktiv fråga → avvisas.
   - Ägarens CRUD-åtgärder (server actions) för kategorier, frågor, mål, sortering; spärr: max 5 frågor som gäller en och samma tjänst (fel `too_many_questions`).
4. **Mejl (integrations-engineer)** — ägarens "ny bokning"-mall visar svaren (etikett: värde). Svaren läggs inte i `message_outbox.payload`; workern läser dem vid utskick (D-029-mönstret). Inga svar i loggar.
5. **Kategorier (ui-engineer)** — `falt-kategorier.html`: skapa/byta namn/sortera/ta bort kategori, välja kategori per tjänst; flikar per kategori på bokningssidan (dolda om < 2 kategorier med aktiva tjänster).
6. **A: Inställningar → Bokningsformulär** — `falt-A`: lista med räknare "N av 5", branschförslag på/av, ny egen fråga (typväljare 7 typer), "gäller för" alla/tjänster/kategorier, obligatorisk/valfri, sparas på kundkortet, dra för ordning, förhandsvisning per vald tjänst. Varningsruta mot känsliga uppgifter.
7. **B: Tjänstens redigering, flik "Frågor vid bokning"** — `falt-B`: samma data som A, filtrerad på tjänsten ("används även i …"), redigera/ta bort, "Egen fråga"-formulär. Delar komponenter med A.
8. **Bokningsformulär + visning** — dynamiska fält i `customer-form.tsx` efter tjänstval (förifyllda från `customer_answers` bara när kunden är identifierad server-side, annars tomma); svar i agendans bokningsdetalj, Hoy-kortet och kundkortet (senaste värden + historik per bokning).

## 5. Tester
- **pgTAP** (en fil per ny tabell, punkterna 1–8 inkl. tvärtenant-FK): företag A ser/ändrar aldrig B:s kategorier, frågor, mål, svar; target-check (exakt en av service/category); options-check per typ; `on delete set null` för kategori och fråga behåller svar med snapshot; staff kan läsa men inte ändra frågor.
- **Enhet (Vitest)**: upplösning all/tjänst/kategori, ny tjänst i kategori ärver frågan, dubbel träff (tjänst + kategori) ger frågan en gång, max 5-klippning; Zod per typ — obligatorisk tom, alternativ utanför listan, flera val tomt/dubbletter, siffra med decimal/negativ, ogiltigt datum (2026-02-30), datum kring sommartidsskiftet (första lördagen i april/september) tolkas som kalenderdatum, inte tidpunkt; manipulerad klient skickar fråga från annat företag → avvisas.
- **Integration**: bokning + svar i samma transaktion — om svaren fallerar skapas ingen bokning, och vid 23P01 (samtidig bokning) skrivs inga svar.
- **E2E (Playwright)**: ägaren slår på ett förslag i A → syns i B och på bokningssidan för rätt tjänst men inte för annan; kund bokar med obligatorisk fråga → svaret syns i agenda, Hoy och kundkort; flikar per kategori.
- **Visuell**: `npm run visual` < 2 % för falt-A, falt-B, falt-kategorier (ljust tema, desktop) och bokningsformuläret med frågor (mobil).

## 6. Risker och öppna frågor
- **Känsliga uppgifter (Ley 21.719):** hälsa (allergier, skador, graviditet) är känsliga personuppgifter. Förslag: inga hälsofrågor sparas på kundkortet som standard, varningsruta i A/B, security-reviewer granskar steg 1, 3 och 8. Svaren kopplas till kund så att WP-26 kan exportera/radera dem.
- **Befintlig `services.category` (fri text):** migreras till kategorirader; tomt värde → ingen kategori. **D-031 (förslag):** "Tjänstekategorier är egna rader (`service_categories`), fritextkolumnen `services.category` tas bort; bokningsfrågor lagras normaliserat med snapshot av etikett/typ i `booking_answers`, presets finns i kod, inte i databasen."
- **Max 5:** hårdspärr vid sparande (server) + klippning vid läsning som skydd; ingen DB-trigger (enkelhet).
- **Beslutat 2026-09-29:** 8 branscher: `barberias`, `peluquerias`, `estetica`, `kinesiologia`, `unas`, `pestanas_cejas`, `masajes`, `tatuajes`.
- **Beslutat 2026-09-29:** "Allergier" får finnas som förslag bara där det berör (färgning/frisör, fransar/bryn, hudvård, naglar, tatuering), valfri och avstängd som standard. Inga andra hälsofrågor (skador, diagnoser, mediciner) i förslagen; egna frågor får varningen.

## 7. Klart när
- [ ] Ägaren kan skapa, sortera och ta bort kategorier och ge tjänster en kategori; bokningssidan visar flikar per kategori.
- [ ] Ägaren kan slå på/av branschförslag och skapa egna frågor av alla 7 typer, obligatorisk/valfri, med ordning, "gäller för" alla/tjänster/kategorier och "sparas på kundkortet" — i A och B med samma data.
- [ ] Ny tjänst i en kategori får automatiskt kategorins frågor; aldrig fler än 5 frågor per tjänst.
- [ ] Kunden ser bara frågorna för vald tjänst; servern validerar och sparar svaren i samma transaktion som bokningen.
- [ ] Svaren syns i agenda, Hoy, kundkortet och ägarens mejl; inga svar i loggar eller i outbox-payload.
- [ ] RLS + pgTAP för alla nya tabeller gröna (`npm run test:db`); `typecheck`, `lint`, `test`, `test:e2e` gröna; `visual` < 2 % på de tre referenserna.
- [ ] Texter i es-CL och sv-SE; varningen om känsliga uppgifter visas; `DATA_MODEL.md`, D-031 och BACKLOG uppdaterade; uppskjutna idéer i `IDEAS.md`.
