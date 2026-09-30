-- WP-46 · Steg 2 (db-engineer) · RLS per behörighetsflagga + hela kalendern
-- F#: F1/F3/F6. INV: INV-1 (no_overlap opåverkad), INV-3, INV-4.
-- Plan: docs/tasks/plans/WP-46.md, steg 2. Kräver
-- 20260930150000_membership_permission_flags.sql (`private.has_perm`,
-- `private.member_staff_id`).
--
-- Två slags ändring per tabell:
--   1. SELECT för alla medlemmar med rollen owner ELLER staff (planens "hela
--      kalendern"): `staff`, `services`, `service_categories`, `bookings`,
--      `customers`, `booking_answers`, `business_hours`. `vendor` (WP-35) och
--      `admin` (F19) får INGEN ny åtkomst här — oförändrat fas-1-beteende för
--      dem (se 20260927100200_catalog_and_hours.sql).
--   2. Skrivning (insert/update/delete) styrd av respektive flagga i stället
--      för "owner, admin". `private.has_perm` kortsluter redan till `true`
--      för `role = 'owner'`, så en enda `has_perm(...)`-klausul räcker (ingen
--      separat "eller owner"-disjunktion behövs i policyerna nedan).
--
-- Flaggmappning (se kommentaren i steg 1-migrationen för den fullständiga
-- listan): `can_edit_catalog` → tjänster/kategorier. `can_manage_team` →
-- personalrader, vilka tjänster de utför (`staff_services`), scheman
-- (`staff_hours`) och frånvaro (`time_off`). `can_edit_settings` →
-- öppettider (`business_hours`, "profil" ligger i `businesses`, utanför den
-- här migrationen). `can_view_reports` → kassan (`payments`).
-- `booking_answers` skrivning är MEDVETET kvar som bara `owner` (ingen flagga
-- i planens lista täcker just svaren) — WP-46 steg 2 nämner bara att SELECT
-- ska breddas dit, inte skrivning.

-- staff -----------------------------------------------------------------
drop policy "owners full access" on public.staff;

create policy "read staff" on public.staff
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

create policy "write staff" on public.staff
  for all
  to authenticated
  using (private.has_perm(business_id, 'can_manage_team'))
  with check (private.has_perm(business_id, 'can_manage_team'));

-- services ----------------------------------------------------------------
drop policy "owners full access" on public.services;

create policy "read services" on public.services
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

create policy "write services" on public.services
  for all
  to authenticated
  using (private.has_perm(business_id, 'can_edit_catalog'))
  with check (private.has_perm(business_id, 'can_edit_catalog'));

-- service_categories --------------------------------------------------------
drop policy "owners full access" on public.service_categories;

create policy "read service_categories" on public.service_categories
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

create policy "write service_categories" on public.service_categories
  for all
  to authenticated
  using (private.has_perm(business_id, 'can_edit_catalog'))
  with check (private.has_perm(business_id, 'can_edit_catalog'));

-- staff_services --------------------------------------------------------
-- Ingen bred SELECT-policy här (inte listad i planens uppräkning) — bara
-- den som redan får redigera personal (can_manage_team) ser/ändrar vilka
-- tjänster var och en utför.
drop policy "owners full access" on public.staff_services;

create policy "manage staff_services" on public.staff_services
  for all
  to authenticated
  using (private.has_perm(business_id, 'can_manage_team'))
  with check (private.has_perm(business_id, 'can_manage_team'));

-- business_hours --------------------------------------------------------
drop policy "owners full access" on public.business_hours;

create policy "read business_hours" on public.business_hours
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

create policy "write business_hours" on public.business_hours
  for all
  to authenticated
  using (private.has_perm(business_id, 'can_edit_settings'))
  with check (private.has_perm(business_id, 'can_edit_settings'));

-- staff_hours -----------------------------------------------------------
-- Ingen bred SELECT (samma resonemang som staff_services).
drop policy "owners full access" on public.staff_hours;

create policy "manage staff_hours" on public.staff_hours
  for all
  to authenticated
  using (private.has_perm(business_id, 'can_manage_team'))
  with check (private.has_perm(business_id, 'can_manage_team'));

-- time_off ----------------------------------------------------------------
drop policy "owners full access" on public.time_off;

create policy "manage time_off" on public.time_off
  for all
  to authenticated
  using (private.has_perm(business_id, 'can_manage_team'))
  with check (private.has_perm(business_id, 'can_manage_team'));

-- bookings ------------------------------------------------------------------
-- "Hela kalendern": vem som helst med rollen owner/staff FÅR LÄSA alla
-- bokningar i företaget, oavsett flaggor (WP-46 steg 6: filtret "Mis
-- reservas" i UI:t är en klientsidesfilter ovanpå den här bredare
-- SELECT-policyn, inte en egen serverbegränsning).
drop policy "owners full access" on public.bookings;

create policy "read calendar" on public.bookings
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

-- Skrivning (F44/planens steg 2, ordagrant): owner, ELLER
-- can_manage_all_bookings, ELLER (can_manage_own_bookings OCH
-- staff_id = den egna personalraden) — i BÅDE `using` och `with check`, så
-- att en `can_manage_own_bookings`-profesional aldrig kan flytta en bokning
-- till en kollega (NEW.staff_id måste också vara hens egen).
create policy "write bookings" on public.bookings
  for all
  to authenticated
  using (
    private.has_perm(business_id, 'can_manage_all_bookings')
    or (
      private.has_perm(business_id, 'can_manage_own_bookings')
      and staff_id = private.member_staff_id(business_id)
    )
  )
  with check (
    private.has_perm(business_id, 'can_manage_all_bookings')
    or (
      private.has_perm(business_id, 'can_manage_own_bookings')
      and staff_id = private.member_staff_id(business_id)
    )
  );

-- Status → 'cancelled' (avboka ELLER neka en förfrågan): RLS ovan avgör bara
-- om raden får RÖRAS alls, inte VILKEN övergång. En UPDATE-policys `using`/
-- `with check` ser OLD respektive NEW, men aldrig båda tillsammans, så den
-- kan inte uttrycka "detta är specifikt en övergång FRÅN requested" — det
-- kräver en trigger, som customers_guard_consent redan visar mönstret för.
--
-- Regeln (WP-46-uppdraget, "en tydlig regel"): en övergång till 'cancelled'
-- kräver
--   can_cancel_bookings (räcker ALLTID, oavsett tidigare status), ELLER
--   (can_manage_own_bookings/can_manage_all_bookings OCH den gamla statusen
--    var 'requested') — att NEKA en förfrågan väger lika lätt som att
--    BEKRÄFTA den (båda är del av den vanliga förfrågningshanteringen,
--    ingen betalning är inblandad än), medan att AVBOKA en redan
--    confirmed/pending_payment-bokning är en tyngre handling som kräver den
--    egna can_cancel_bookings-flaggan specifikt.
-- `old.staff_id` (inte `new.staff_id`) används för own-jämförelsen: vem som
-- "äger" förfrågan avgörs av vem den redan var bokad på, inte av ett
-- samtidigt försök att också flytta den.
--
-- Bara `authenticated`: service_role (kundens egen avbokning via länk-token,
-- WP-16/scheduling-flödena) gör sin egen auktorisering i TypeScript och ska
-- inte träffas av en regel som bara gäller personalens behörigheter.
create function private.bookings_guard_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.status = 'cancelled' and old.status <> 'cancelled' then
    if old.status = 'requested' then
      if not (
        private.has_perm(new.business_id, 'can_cancel_bookings')
        or private.has_perm(new.business_id, 'can_manage_all_bookings')
        or (
          private.has_perm(new.business_id, 'can_manage_own_bookings')
          and old.staff_id = private.member_staff_id(new.business_id)
        )
      ) then
        raise exception 'No tienes permiso para rechazar esta solicitud' using errcode = '42501';
      end if;
    else
      if not private.has_perm(new.business_id, 'can_cancel_bookings') then
        raise exception 'No tienes permiso para anular esta reserva' using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger bookings_guard_status
  before update on public.bookings
  for each row execute function private.bookings_guard_status();

-- customers -------------------------------------------------------------
-- Förenkling av Ägarens svar punkt 3 (planen): svaret nämner "kunder för
-- bokningar de får se", men eftersom SELECT redan är "hela kalendern" ovan
-- (bookings) förenklas customers-läsningen till samma bredd — en egen
-- per-rad-koppling "har den här medlemmen en bokning med den här kunden"
-- skulle kräva ett join i policyn för varje rad utan att ge någon verklig
-- extra sekretess (namn+telefon är redan synligt via vilken bokning som
-- helst i kalendern).
drop policy "owners select" on public.customers;
drop policy "owners insert" on public.customers;
drop policy "owners update" on public.customers;
drop policy "owners delete" on public.customers;

create policy "members select" on public.customers
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

-- Skapa/ändra en kund är i praktiken en del av att hantera BOKNINGAR i stort
-- (kundkortet nås från en bokning), inte av en enskild profesionals egen
-- agenda — kräver därför `can_manage_all_bookings` (inte bara
-- `can_manage_own_bookings`), plus `owner` (kortsluten av `has_perm`).
-- `customers` saknar en `staff_id`-kolumn att jämföra mot, så
-- `can_manage_own_bookings` kan inte uttryckas här som på `bookings`.
create policy "manage customers insert" on public.customers
  for insert
  to authenticated
  with check (private.has_perm(business_id, 'can_manage_all_bookings'));

create policy "manage customers update" on public.customers
  for update
  to authenticated
  using (private.has_perm(business_id, 'can_manage_all_bookings'))
  with check (private.has_perm(business_id, 'can_manage_all_bookings'));

-- Radering (Ägarens svar punkt 3, "export/anonymisering bara ägaren") är
-- bara ägarens sak, oavsett flaggor.
create policy "owners delete" on public.customers
  for delete
  to authenticated
  using (private.is_member(business_id, array['owner']::public.member_role[]));

-- booking_answers -----------------------------------------------------------
-- SELECT breddas (planens uppräkning), skrivning förblir bara ägaren (ingen
-- flagga i planen täcker just svaren — se filens inledande kommentar).
drop policy "owners full access" on public.booking_answers;

create policy "read booking_answers" on public.booking_answers
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

create policy "owners write booking_answers" on public.booking_answers
  for all
  to authenticated
  using (private.is_member(business_id, array['owner']::public.member_role[]))
  with check (private.is_member(business_id, array['owner']::public.member_role[]));

-- payments (kassan) ----------------------------------------------------------
-- `can_view_reports` (planens flaggtext: "statistik, kassa"). B1
-- (mercadopago-spärren från 20260927100400_bookings_payments.sql) är
-- oförändrad, bara owner/admin-villkoret byts mot has_perm.
drop policy "owners select" on public.payments;
drop policy "owners insert" on public.payments;
drop policy "owners update" on public.payments;

create policy "reports select" on public.payments
  for select
  to authenticated
  using (private.has_perm(business_id, 'can_view_reports'));

create policy "reports insert" on public.payments
  for insert
  to authenticated
  with check (
    private.has_perm(business_id, 'can_view_reports')
    and method in ('cash', 'card_terminal', 'transfer')
    and provider_ref is null
  );

create policy "reports update" on public.payments
  for update
  to authenticated
  using (
    private.has_perm(business_id, 'can_view_reports')
    and method <> 'mercadopago'
  )
  with check (
    private.has_perm(business_id, 'can_view_reports')
    and method in ('cash', 'card_terminal', 'transfer')
    and provider_ref is null
  );
