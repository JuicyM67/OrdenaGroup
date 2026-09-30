-- WP-26 · Steg 3 · Företagets livscykel: begär/ångra/radera
-- F#: F12. Ägarens svar 2026-09-30: kontoradering har 30 dagars ångerfrist —
-- kontot stängs DIREKT (bokningssidan offline), och raderas av lagringsjobbet
-- (WP-26 steg 4) efter 30 dagar om ägaren inte ångrar sig.
--
-- `deletion_requested_at`: satt av `requestBusinessDeletion`
-- (src/server/privacy/business.ts), nollad av `cancelBusinessDeletion` inom
-- fristen. `status = 'frozen'` återanvänds för att stänga bokningssidan
-- direkt (src/components/booking/booking-screen.tsx läser redan
-- `business.status === 'frozen'`, se DATA_MODEL/B2) — ingen ny kolumn eller
-- routeändring behövs för "offline"-delen.
alter table public.businesses
  add column deletion_requested_at timestamptz;

-- `purgeBusiness` (samma fil) körs bara av lagringsjobbet (service_role) när
-- fristen gått ut — ingen egen kolumn-check här (kontrolleras i servern), men
-- vi dokumenterar sambandet: deletion_requested_at null ⇒ ingen radering
-- planerad.

-- Kolumnen är servern/service_role-styrd, precis som status/plan/
-- trial_ends_at (B2) — `authenticated` (ägarens app) ändrar den ALDRIG
-- direkt; requestBusinessDeletion/cancelBusinessDeletion kör som
-- service_role efter en egen medlemskapskontroll (src/server/privacy/
-- business.ts), inte via RLS-kolumngrant. Ingen ny grant behövs: `authenticated`
-- saknar redan grant på `status`/`deletion_requested_at` (bara den uttryckliga
-- kolumnlistan i B2-grantet), och service_role har redan
-- `grant select, update, delete on public.businesses to service_role` (S2).

-- ---------------------------------------------------------------------------
-- FK-ordningsfix: `purgeBusiness` raderar `bookings` explicit INNAN
-- `businesses`-raden (för att staff/services/customers ska kunna kaskad-
-- raderas utan att blockeras av bookings.staff_id/service_id/customer_id, som
-- medvetet INTE kaskaderar — en vanlig radering av en enskild profesional/
-- tjänst ska fortfarande blockeras om den har bokningar). `payments`/
-- `message_outbox` ska INTE raderas med en egen explicit DELETE (payments är
-- medvetet tänkt att aldrig kunna försvinna via en vanlig DML-sats —
-- kassahistorik), utan bara försvinna som en KASKAD när deras bokning
-- raderas. Utan `on delete cascade` här skulle `delete from bookings`
-- blockeras (23503) av kvarvarande payments/message_outbox-rader.
alter table public.payments
  drop constraint payments_business_id_booking_id_fkey,
  add constraint payments_business_id_booking_id_fkey
    foreign key (business_id, booking_id) references public.bookings (business_id, id) on delete cascade;

alter table public.message_outbox
  drop constraint message_outbox_business_id_booking_id_fkey,
  add constraint message_outbox_business_id_booking_id_fkey
    foreign key (business_id, booking_id) references public.bookings (business_id, id) on delete cascade;

-- ---------------------------------------------------------------------------
-- Ägarens auth-konto: `service_role` saknar (till skillnad från `public`-
-- scheman) grant på `auth.users` av plattformens standard — direkt
-- `delete from auth.users` som `service_role` ger "permission denied for
-- table users". Samma lösning som `private.owner_emails()`
-- (20260929110000_message_outbox.sql): en `security definer`-funktion körs
-- med ÄGARENS (postgres, migrationens roll) rättigheter, oavsett anroparens
-- roll. `purgeBusiness` anropar den bara EFTER att ha kontrollerat att
-- personen inte längre är medlem i något annat företag.
create function private.delete_owner_account(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = p_user_id;
$$;

revoke all on function private.delete_owner_account(uuid) from public;
grant execute on function private.delete_owner_account(uuid) to service_role;
