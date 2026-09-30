# WP-24 · Clientes + Caja och statistik — F6, F10

Ägaren 2026-09-30: viktiga funktioner, byggs av specialister men utan tester per delsteg (CI en gång, en säkerhetsgranskning). Återinför ikonerna Clientes och Caja e informes i navigeringen (D-035).

## Clientes (`/app/clientes`)
- Lista: sök (namn/telefon/e-post), sortera (senaste besök, flest besök, namn), filter (stamkunder ≥ 3 besök, inaktiva > 90 dagar, med uteblivna). Visar antal besök, senaste besök, uteblivna.
- Kundkort (`/app/clientes/[id]`): kontakt, samtycken (visning), statistik (besök, uteblivna, total omsättning, snittkostnad), bokningshistorik (kommande + tidigare, status), svar på bokningsfrågor (sparade per kund), anteckningar om kunden (ny kolumn `customers.notes`, ≤ 1000, samma varning om känsliga uppgifter som bokningsanteckningar), knappar: ny bokning för kunden, ring/SMS/mejl-länkar, exportera/anonymisera (bara ägaren, WP-26).
- Behörighet (D-034): alla medlemmar ser kundregistret; anteckningar kräver `can_manage_all_bookings` eller ägare för att ändra; export/anonymisera bara ägaren.

## Caja e informes (`/app/caja`)
- **Markera betald** från bokningen (agendans popover, Hoy, kassan): metod (SE: kontant, kort, Swish, faktura/övrigt — mappas på befintlig enum: cash, card_terminal, transfer; lägg till `swish` i enumet för SE), belopp förifyllt med tjänstens pris (heltal i minsta enhet, D-003/market.ts), dricks valfritt (ingår inte). Skapar `payments` (kind `full`, status `approved`, paid_at). Ångra betalning inom samma dag (status `refunded`).
- **Kassan**: idag / denna vecka / denna månad / valfritt intervall — omsättning (betalt), förväntat (bokat ej betalt), antal bokningar, uteblivna, snittpris; fördelning per betalmetod, per medarbetare, per tjänst; lista över dagens betalningar och obetalda avslutade bokningar ("att ta betalt för").
- **Statistik** (samma sida, flik "Informes"): omsättning per vecka (12 veckor), beläggning per medarbetare, nya vs återkommande kunder, uteblivna-trend. Enkla staplar med tokens (ingen ny tung dependency).
- Behörighet: kräver `can_view_reports` (eller ägare). Markera betald kräver att man får hantera bokningen (egen/alla).
- Tid i `APP_TZ`, pengar heltal, summor beräknas i SQL (inte i klienten).

## Ägare
db-engineer: `customers.notes`, `swish` i `payment_method`, index/SQL-funktioner för summeringar (RLS via `has_perm`), en pgTAP för ev. ny policy · scheduling-engineer: `src/server/payments/` markera betald/ångra + `src/server/reports/` summeringar · copywriter-es-cl: texter · ui-engineer: sidorna, markera betald i popover/Hoy, nav-ikonerna tillbaka · security-reviewer: EN granskning.

## Klart när
Summorna i kassan stämmer med betalda bokningar; ägaren kan hitta en kund, se historiken och skriva en anteckning; ikonerna Clientes och Caja leder till fungerande sidor.
