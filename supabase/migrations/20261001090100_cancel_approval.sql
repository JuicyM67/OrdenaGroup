-- WP-56 · Steg 1 forts. (db-engineer) · Avbokning med godkännande
-- F#: avbokning med godkännande + SMS till företaget.
-- Plan: docs/tasks/plans/WP-56-avbokning.md. INV: INV-1 (`no_overlap`
-- omfattar `cancel_requested`), INV-3. Kräver 'cancel_requested' i
-- `booking_status` (20261001090000, egen transaktion, se den filens
-- kommentar).
--
-- Statusövergångar (kontrollerade mot befintliga CHECK-constraints, samma
-- resonemang som 20260930140100_booking_confirmation.sql: de befintliga
-- CHECK-constraintsen på `bookings` är formulerade som "status X <=>
-- kolumn Y satt", inte som en övergångstabell, så de begränsar inte VILKEN
-- status en rad kom ifrån eller går till):
--   confirmed/pending_payment -> cancel_requested  (kundens avbokning när
--                                 `businesses.cancel_approval` kräver det,
--                                 `status_before_cancel_request` sparar
--                                 varifrån, se nedan)
--   cancel_requested -> cancelled    (ägaren godkänner; `bookings_cancelled_
--                                     at_check` kräver redan `cancelled_at`
--                                     satt — opåverkad, `cancel_requested`
--                                     nämns inte i den checken)
--   cancel_requested -> confirmed/   (ägaren nekar; `src/server/bookings`,
--     pending_payment                ej denna migration, sätter `status =
--                                     status_before_cancel_request` och
--                                     nollar kolumnen i samma sats)
-- Inget av ovanstående kräver ändringar i `bookings_pending_expires_at_check`
-- eller `bookings_cancelled_at_check` — båda bryr sig bara om sin egen
-- status/kolumn-koppling, inte om föregående status.

-- 1. `no_overlap` återskapas så att `cancel_requested` blockerar tiden precis
--    som `requested`/`pending_payment`/`confirmed`/`completed` (INV-1,
--    planens krav: en avbokningsförfrågan som väntar på svar får inte
--    frigöra tiden förrän den är godkänd).
alter table public.bookings
  drop constraint no_overlap;
alter table public.bookings
  add constraint no_overlap
  exclude using gist (staff_id with =, blocked with &&)
  where (status in ('requested', 'pending_payment', 'confirmed', 'completed', 'cancel_requested'));

-- 2. `bookings.status_before_cancel_request` --------------------------------
-- Sparar statusen bokningen hade innan avbokningsförfrågan, så att ett
-- nekande kan återställa den exakt (`confirmed` eller `pending_payment` i
-- praktiken — de enda statusarna en kund kan begära avbokning från — men
-- databasen tvingar inte fram den uppräkningen, bara att kolumnen är satt
-- precis när statusen är `cancel_requested`, samma mönster som
-- `pending_expires_at`/`cancelled_at` ovan).
alter table public.bookings
  add column status_before_cancel_request public.booking_status null,
  add constraint bookings_status_before_cancel_request_check check (
    (status = 'cancel_requested') = (status_before_cancel_request is not null)
  ),
  add constraint bookings_status_before_cancel_request_not_itself_check check (
    status_before_cancel_request is null
    or status_before_cancel_request not in ('cancel_requested', 'cancelled')
  );

-- 3. `businesses.cancel_approval` -------------------------------------------
-- none = kunden kan alltid avboka själv direkt (nuvarande beteende).
-- late = avbokning senare än `cancel_window_hours` före start kräver
--        ägarens godkännande (`cancel_requested`).
-- all  = varje avbokning från kunden kräver godkännande, oavsett tidpunkt.
alter table public.businesses
  add column cancel_approval text not null default 'none'
  constraint businesses_cancel_approval_check check (cancel_approval in ('none', 'late', 'all'));

-- Kolumngrant (B2/qa4-mönstret, samma som `auto_confirm_bookings` i
-- 20260930140100 och `member_discount_pct`/`member_benefit_text` i
-- 20260930210200): additiv `grant update (...)`, RLS-policyn "owners
-- update" (20260930170000) styr redan VILKEN medlem som får uppdatera raden
-- (ägare eller `can_edit_settings`, via `private.has_perm`) — den här
-- granten bara öppnar den nya kolumnen för `authenticated` överhuvudtaget.
grant update (cancel_approval) on public.businesses to authenticated;
