-- WP-45 · Steg 1 (db-engineer) · Bekräftelse av bokningsförfrågningar
-- F#: F4/F5/F6/F7. INV: INV-1 (`no_overlap` omfattar `requested`), INV-3.
-- Plan: docs/tasks/plans/WP-45.md, steg 1. Kräver 'requested' i
-- `booking_status` (20260930140000, egen transaktion, se den filens kommentar).
--
-- D-033 (förslag i planen): bokningar från bokningssidan skapas som
-- `requested` och blockerar tiden tills företaget bekräftar/nekar eller de
-- går ut. "Bekräfta automatiskt" (av som standard, Ägarens svar punkt 4 —
-- gäller även BEFINTLIGA företag, ingen backfill till `true`) ger `confirmed`
-- direkt.
--
-- Statusövergångar (kontrollerade mot befintliga CHECK-constraints, ingen
-- ny övergångstabell i databasen — `src/server/bookings/confirm.ts`,
-- WP-45 steg 2, styr övergångarna med villkorade UPDATE:ar):
--   requested -> confirmed             (`confirmBooking`, ägaren bekräftar)
--   requested -> cancelled             (`declineBooking` / utgång, cancel_reason
--                                        'declined'/'expired'; `bookings_cancelled_at_check`
--                                        kräver redan `cancelled_at` satt)
--   requested -> pending_payment       (handpenning, Ägarens svar punkt 3: företaget
--                                        bekräftar FÖRST, betalningslänken skickas EFTER —
--                                        alltså requested -> confirmed -> pending_payment
--                                        i det handpenningsflödet, inte requested ->
--                                        pending_payment direkt. Ingen CHECK i databasen
--                                        hindrar ett direkt requested -> pending_payment-hopp
--                                        heller, om ett framtida flöde skulle behöva det:
--                                        `bookings_pending_expires_at_check` bryr sig bara om
--                                        att `pending_expires_at` följer `status`, oavsett
--                                        föregående status.)
-- Inget av ovanstående kräver nya CHECK-constraints: de befintliga
-- (`bookings_pending_expires_at_check`, `bookings_cancelled_at_check`) är
-- redan formulerade som "status X <=> kolumn Y satt", inte som en
-- övergångstabell, så de begränsar inte VILKEN status en rad kom ifrån.

-- 1. `no_overlap` återskapas så att `requested` blockerar tiden precis som
--    `pending_payment`/`confirmed`/`completed` (INV-1, F4: dubbelbokning
--    omöjlig även för väntande förfrågningar).
alter table public.bookings
  drop constraint no_overlap;
alter table public.bookings
  add constraint no_overlap
  exclude using gist (staff_id with =, blocked with &&)
  where (status in ('requested', 'pending_payment', 'confirmed', 'completed'));

-- 2. `businesses.auto_confirm_bookings` ------------------------------------
alter table public.businesses
  add column auto_confirm_bookings boolean not null default false;

-- Kolumngrant, samma mönster som B2/qa4 (20260927100100) och WP-41 steg 1
-- (20260929140000): `authenticated` (ägare/admin via den befintliga
-- "owners update"-RLS-policyn på `businesses`) får ändra den här kolumnen,
-- men bara den — en additiv grant, den lägger inte till några andra
-- kolumner utöver dem som redan är beviljade.
grant update (auto_confirm_bookings) on public.businesses to authenticated;

-- 3. Index för väntande förfrågningar (klockan/Inicio, WP-45 steg 5:
--    `listPendingRequests(businessId)` = status = 'requested' and
--    lower(period) > now(), sorterad på start) -------------------------------
create index bookings_business_id_lower_period_requested_idx
  on public.bookings (business_id, (lower(period)))
  where status = 'requested';

-- 4. Index för utgångssvepet (Ägarens svar punkt 1: en förfrågan går ut
--    24 h efter att den skickades, dock senast 2 h före start — det som
--    kommer först). `expireRequests(now)` (WP-45 steg 6, integrations-/
--    scheduling-engineer) behöver hitta båda varianterna billigt:
--      created_at <= now() - 24h   (24 h-regeln, alla företag/personal)
--      lower(period) <= now() + 2h (2h-före-start-regeln)
--    Den andra täcks redan av indexet i punkt 3 (samma partiella `where
--    status = 'requested'`, Postgres kan bitmap-or:a de två). Den här
--    lägger till den delen som saknas: ett index på `created_at`, begränsat
--    till väntande förfrågningar (litet antal rader jämfört med hela
--    `bookings`, svepet körs var 5:e minut från `/api/cron/outbox`, D-030).
--    `created_at` finns redan (`bookings.created_at`, satt av alla
--    inserts), ingen ny kolumn behövs.
create index bookings_created_at_requested_idx
  on public.bookings (created_at)
  where status = 'requested';
