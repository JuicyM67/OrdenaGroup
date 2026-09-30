-- WP-46 · Uppföljning 2 (db-engineer) · RLS-luckor hittade av serversteget
-- F#: F1/F3/F6. Plan: docs/tasks/plans/WP-46.md, steg 2 (kompletterar
-- 20260930150100_permissions_rls.sql). Tre fynd, samma has_perm/is_member-
-- mönster som tidigare:
--
--   1. staff_services/staff_hours/time_off saknade SELECT för alla
--      medlemmar — ägarens uttryckliga krav (hela kalendern, inklusive
--      scheman/blockeringar/frånvaro) och motorn/servern behöver kunna
--      visa dem för en profesional utan can_manage_team.
--   2. customers INSERT/UPDATE krävde can_manage_all_bookings — för snävt:
--      kundregistret är delat (Ägarens svar punkt 3), och en profesional
--      med bara egna bokningar måste kunna skapa en manuell bokning på sig
--      själv (ny kund) och markera Llegó/No vino (visits_count/
--      no_show_count på customers). can_manage_own_bookings räcker nu
--      också. Consent-guard-triggern (`private.customers_guard_consent`,
--      20260927100300) är OFÖRÄNDRAD — den bryr sig bara om `current_user`,
--      inte om VILKEN authenticated-roll, så den gäller lika för alla.
--   3. Kvarvarande `owner, admin`-policyer bytta till owner/rätt flagga
--      (D-034): businesses (UPDATE), business_images, storage.objects
--      (business-media SELECT/UPDATE/DELETE) → can_edit_settings.
--      booking_questions, booking_question_targets → can_edit_catalog.
--      customer_answers → samma nivå som bookings-skrivning (can_manage_
--      own/all_bookings) — tabellen saknar en staff_id-kolumn att jämföra
--      "eget" mot (till skillnad från bookings), så "där bokningen
--      tillåter" blir i praktiken samma bredd som customers ovan; owner
--      täcks redan av has_perm-kortslutningen ("annars owner").

-- 1. staff_services / staff_hours / time_off: SELECT för owner+staff -------
create policy "read staff_services" on public.staff_services
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

create policy "read staff_hours" on public.staff_hours
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

create policy "read time_off" on public.time_off
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

-- 2. customers: can_manage_own_bookings räcker också för INSERT/UPDATE -----
drop policy "manage customers insert" on public.customers;
create policy "manage customers insert" on public.customers
  for insert
  to authenticated
  with check (
    private.has_perm(business_id, 'can_manage_all_bookings')
    or private.has_perm(business_id, 'can_manage_own_bookings')
  );

drop policy "manage customers update" on public.customers;
create policy "manage customers update" on public.customers
  for update
  to authenticated
  using (
    private.has_perm(business_id, 'can_manage_all_bookings')
    or private.has_perm(business_id, 'can_manage_own_bookings')
  )
  with check (
    private.has_perm(business_id, 'can_manage_all_bookings')
    or private.has_perm(business_id, 'can_manage_own_bookings')
  );

-- 3a. businesses (UPDATE) ---------------------------------------------------
drop policy "owners update" on public.businesses;
create policy "owners update" on public.businesses
  for update
  to authenticated
  using (private.has_perm(id, 'can_edit_settings'))
  with check (private.has_perm(id, 'can_edit_settings'));
-- Kolumngrant (B2/qa4, oförändrad): `authenticated` får bara ändra de
-- redan uppräknade affärsfälten. `plan`, `status`, `deletion_requested_at`,
-- `status_before_deletion_request`, `trial_ends_at`, `id`, `timezone` har
-- ALDRIG haft en grant till `authenticated` (bara service_role) — RLS-
-- predikatets byte här ändrar ingenting för dem, det är kolumngranten som
-- skyddar, inte bara RLS (försvar på djupet).

-- 3b. business_images --------------------------------------------------
drop policy "owners full access" on public.business_images;
create policy "write business_images" on public.business_images
  for all
  to authenticated
  using (private.has_perm(business_id, 'can_edit_settings'))
  with check (private.has_perm(business_id, 'can_edit_settings'));

-- 3c. storage.objects (business-media): SELECT/UPDATE/DELETE ---------------
-- INSERT byts separat i 20260930170100 (bredare: alla medlemmar, så att
-- personal kan ladda upp sitt eget foto — se den filens kommentar).
drop policy "business-media owners select" on storage.objects;
create policy "business-media select" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and private.has_perm(((storage.foldername(name))[1])::uuid, 'can_edit_settings')
  );

drop policy "business-media owners update" on storage.objects;
create policy "business-media update" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and private.has_perm(((storage.foldername(name))[1])::uuid, 'can_edit_settings')
  )
  with check (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and private.has_perm(((storage.foldername(name))[1])::uuid, 'can_edit_settings')
  );

drop policy "business-media owners delete" on storage.objects;
create policy "business-media delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and private.has_perm(((storage.foldername(name))[1])::uuid, 'can_edit_settings')
  );

-- 3d. booking_questions / booking_question_targets --------------------------
drop policy "owners full access" on public.booking_questions;
create policy "write booking_questions" on public.booking_questions
  for all
  to authenticated
  using (private.has_perm(business_id, 'can_edit_catalog'))
  with check (private.has_perm(business_id, 'can_edit_catalog'));

drop policy "owners full access" on public.booking_question_targets;
create policy "write booking_question_targets" on public.booking_question_targets
  for all
  to authenticated
  using (private.has_perm(business_id, 'can_edit_catalog'))
  with check (private.has_perm(business_id, 'can_edit_catalog'));

-- 3e. customer_answers --------------------------------------------------
drop policy "owners full access" on public.customer_answers;
create policy "manage customer_answers" on public.customer_answers
  for all
  to authenticated
  using (
    private.has_perm(business_id, 'can_manage_all_bookings')
    or private.has_perm(business_id, 'can_manage_own_bookings')
  )
  with check (
    private.has_perm(business_id, 'can_manage_all_bookings')
    or private.has_perm(business_id, 'can_manage_own_bookings')
  );
