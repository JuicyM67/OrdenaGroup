-- WP-24 · Caja (db-engineer) · payments: bredda RLS till "får hantera bokningen"
-- F#: F10. Plan: docs/tasks/plans/WP-24-clientes-caja.md, "Caja e informes":
-- "RLS på payments: select/insert/update för medlemmar med can_view_reports
-- ELLER som får hantera bokningen (egen/alla, samma regel som bookings),
-- aldrig delete (behåll WP-26 revoke)."
--
-- Före den här migrationen (20260930150100_permissions_rls.sql) krävde
-- payments bara `can_view_reports` — för snävt för "Markera betald" (Caja,
-- agendans popover, Hoy): en profesional som bara har
-- `can_manage_own_bookings` (standard för alla, se 20260930150000) måste
-- kunna markera sin EGEN bokning som betald och ångra den samma dag, utan
-- att ägaren också ger henne tillgång till hela kassan/informes.
--
-- Samma "ELLER"-form som bookings-policyn (20260930150100): `can_view_reports`
-- (kassan/informes), ELLER `can_manage_all_bookings` (vem som helsts
-- bokning), ELLER (`can_manage_own_bookings` OCH bokningen som betalningen
-- hör till är den egna personalradens). `payments` saknar en egen `staff_id`
-- -kolumn (till skillnad från `bookings`) — "egen bokning" avgörs därför med
-- en `exists`-subquery mot `bookings`, som redan är läsbar för alla
-- owner/staff-medlemmar ("hela kalendern") men det är `staff_id`-jämförelsen
-- mot `private.member_staff_id` som gör urvalet snävt här, inte SELECT-
-- policyn på bookings.
--
-- B1 (mercadopago-spärren) är OFÖRÄNDRAD: bara cash/card_terminal/transfer/
-- swish, `provider_ref is null`, för `authenticated`. Ingen delete-policy
-- (oförändrat — kassahistorik försvinner aldrig, se DATA_MODEL.md/WP-26).
drop policy "reports select" on public.payments;
drop policy "reports insert" on public.payments;
drop policy "reports update" on public.payments;

create policy "manage payments select" on public.payments
  for select
  to authenticated
  using (
    private.has_perm(business_id, 'can_view_reports')
    or private.has_perm(business_id, 'can_manage_all_bookings')
    or (
      private.has_perm(business_id, 'can_manage_own_bookings')
      and exists (
        select 1 from public.bookings bk
         where bk.business_id = payments.business_id
           and bk.id = payments.booking_id
           and bk.staff_id = private.member_staff_id(payments.business_id)
      )
    )
  );

create policy "manage payments insert" on public.payments
  for insert
  to authenticated
  with check (
    (
      private.has_perm(business_id, 'can_view_reports')
      or private.has_perm(business_id, 'can_manage_all_bookings')
      or (
        private.has_perm(business_id, 'can_manage_own_bookings')
        and exists (
          select 1 from public.bookings bk
           where bk.business_id = payments.business_id
             and bk.id = payments.booking_id
             and bk.staff_id = private.member_staff_id(payments.business_id)
        )
      )
    )
    and method in ('cash', 'card_terminal', 'transfer', 'swish')
    and provider_ref is null
  );

create policy "manage payments update" on public.payments
  for update
  to authenticated
  using (
    (
      private.has_perm(business_id, 'can_view_reports')
      or private.has_perm(business_id, 'can_manage_all_bookings')
      or (
        private.has_perm(business_id, 'can_manage_own_bookings')
        and exists (
          select 1 from public.bookings bk
           where bk.business_id = payments.business_id
             and bk.id = payments.booking_id
             and bk.staff_id = private.member_staff_id(payments.business_id)
        )
      )
    )
    and method <> 'mercadopago'
  )
  with check (
    (
      private.has_perm(business_id, 'can_view_reports')
      or private.has_perm(business_id, 'can_manage_all_bookings')
      or (
        private.has_perm(business_id, 'can_manage_own_bookings')
        and exists (
          select 1 from public.bookings bk
           where bk.business_id = payments.business_id
             and bk.id = payments.booking_id
             and bk.staff_id = private.member_staff_id(payments.business_id)
        )
      )
    )
    and method in ('cash', 'card_terminal', 'transfer', 'swish')
    and provider_ref is null
  );
