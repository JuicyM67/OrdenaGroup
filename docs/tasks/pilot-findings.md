# Pilotfynd (WP-60)

Fynd från det grundliga pilottestet (2026-10-01/02, worktree `wp/WP-60-pilottest`,
lokal Supabase + två `next dev`-instanser CL/SE) som **kräver ett produktbeslut**
innan någon bygger på dem. Tydliga buggar rättades direkt i samma PR (se
slutrapporten/commit-historiken) och listas inte här.

## 1. Bekräftelseskärmen visar aldrig länken till kundens egen bokning

**Var:** `src/components/booking/confirmation.tsx` (CL och SE, delad komponent).

Två i18n-strängar finns och används ingenstans:
`reserva.confirmacion.verMiReserva` ("Ver mi reserva") och
`reserva.confirmacionSolicitud.verMiSolicitud` ("Ver mi solicitud"). En
kommentar i filen säger uttryckligen "Ingen BookingBar (planens R 'Ver mi
reserva' visas inte förrän WP-20 har en token)" — men WP-20 (riktig bokning,
riktig databas) är klart sedan länge, och `createBooking`
(`src/server/bookings/create.ts`) returnerar faktiskt ett `manageToken` i sitt
interna resultat. Det skickas dock **aldrig** vidare till klienten:
`BookingActionOk` (`src/components/booking/types.ts`) har inget
`manageToken`-fält, och `src/app/[slug]/actions.ts`s `createBooking`-wrapper
strippar resultatet till den typen innan det når webbläsaren.

**Konsekvens:** en kund som precis bokat/skickat en förfrågan har ingen väg
tillbaka till `/r/[token]` förutom det mejl/SMS som (eventuellt) skickas
asynkront via `message_outbox`. Om det mejlet dröjer, hamnar i skräppost,
eller om kunden bara vill avboka direkt efter att ha bokat, finns ingen
"Visa/hantera min bokning"-knapp på skärmen de redan tittar på.

**Vad som krävs för en lösning (inte gjort här):** en medveten avvägning —
att skicka tillbaka klartexttoken till klienten i ett `fetch`-svar är en annan
säkerhetsyta än att bara skicka den i ett mejl (token blir en del av
webbläsarhistorik/URL-bar om den länkas direkt, även om kunden själv redan
"äger" den token). Om svaret blir ja: lägg till `manageToken` i
`BookingActionOk`/`CreateBookingActionResult`, koppla loss den från
`[slug]/actions.ts`, och rendera en riktig länk/knapp i `Confirmation` med de
redan existerande (men oanvända) i18n-strängarna.

## 2. `/admin`-ytan är helt på svenska, oavsett marknad

**Var:** alla sidor under `src/app/(admin)/admin/**` (t.ex. "Företag", "Logg",
"Tvåstegsverifiering") — ingen av dem använder `src/i18n/`.

Det här bröt **inte** mot CLAUDE.md regel 6 i praktiken så vitt jag kunde
verifiera (`/admin` är plattformsägarens egen yta, aldrig synlig för en
chilensk/svensk salongsägare eller deras kunder), men regeln själv gör inget
uttryckligt undantag för `/admin`, och mönstret är konsekvent genomfört i
alla undersidor jag besökte (`/admin`, `/admin/negocios/[id]`,
`/admin/actividad`, `/admin/mfa`) — så det verkar vara ett medvetet val, inte
ett misstag.

**Vad som krävs:** en uttrycklig bekräftelse (och gärna en rad i
`docs/decisions/DECISIONS.md`) att `/admin` är internt och alltid på svenska,
oavsett `NEXT_PUBLIC_MARKET` — annars behöver hela ytan en i18n-genomgång.

**Redan rättat i den här PR:** två `<title>`-strängar skrev `"llena admin"`
rakt av (`src/app/(admin)/admin/layout.tsx`,
`src/app/(admin)/admin/mfa/page.tsx`) — det bryter mot hård regel 10 oavsett
vad beslutet ovan blir. Bytte till `${brand.name} admin` (installationens
riktiga namn, "Ordena Calendar"/"Booking Buddy").

## 3. Litet layoutöverspill (8 px) på Inicio/Start vid 390 px

**Var:** `/app/inicio` (CL) och `/app/start` (SE) — samma delade komponent
(`src/components/dashboard/inicio-screen.tsx`).

Vid 390 px bredd är `document.documentElement.scrollWidth` 398 (8 px
horisontell scroll). Elementen som mättes överspilla är hero-kortet
(`NextClientCard`, den svarta "Nästa kund"-sektionen) och kortet direkt under
— båda barn till griden på rad ~214–220
(`<div className={cn("grid gap-4", showPending ? "lg:grid-cols-3" : …)}>`).
Jag hittade INTE den exakta roten (troligen en grid-"blowout" från någon
underkomponents min-content-bredd, inte padding/marginal i sig — se
`PendingRequestsCard`/`StatTile`-kedjan), och ville inte gissa mig till en
patch utan devtools. Reproducerat identiskt i båda marknaderna, så det är
definitivt samma kod, inte marknadsspecifikt.

**Vad som krävs:** en ui-engineer med devtools öppna på `/app/inicio` vid
exakt 390 px, helst med "Layout shift regions"/"overflow" i Chrome DevTools
på för att hitta exakt vilket barn som blåser upp griden. Jag rättade det
**närliggande** men orelaterade `/app/caja`-överspillet (se PR-rättningar) —
samma heuristik (grid/flex-blowout) men annan, mer uppenbar orsak (fast
knappbredd × 4 > 390 px).

## 4. Ingen länkad e-post på seedens kunder → kampanjer till dem visar "0 mottagare"

**Var:** `supabase/seed.sql` — kundraderna sätter bara `phone_e164`, aldrig
`email`. Kampanjens destinatärräkning (`src/server/campaigns/audience.ts`)
filtrerar på `channel = 'email'` (CL:s enda kanal) `and email is not null`,
så **alla** seedade kunder räknas bort ur varje kampanj tills de själva anger
en e-post (t.ex. genom att boka en tid).

Det här är korrekt beteende (ingen bugg i appen), men gör det förvirrande att
demoa/pilotköra "Campañas" direkt mot seeden utan att först boka en tid med
e-post för någon kund, eller lägga till en manuellt. Nämns här bara som en
möjlig förbättring av seeden om fler agenter ska pilotköra kampanjflödet.

---

*Fynd som jag rättade direkt (inga produktbeslut inblandade) finns i commit-
historiken på den här branchen: en race i fyra ställen som körde flera
databasfrågor samtidigt på samma anslutning (`Promise.all` på samma `q`,
`src/server/owner/inicio.ts`/`ajustes.ts`/`clientes.ts`,
`src/server/admin/businesses.ts`), en krasch i "Nytt utskick" så fort
"Agregar un descuento" slogs på (`DateField` fick en tom sträng,
`src/components/campaigns/new-campaign-screen.tsx`), horisontell scroll på
`/app/caja` vid 390 px (fyra `w-24`-knappar i en `SegmentedControl` fick inte
plats), och de två `"llena"`-titlarna i `/admin` ovan.*
