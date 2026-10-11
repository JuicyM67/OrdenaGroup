-- WP-67 · Säkerhetsgranskning PR #109 (D-054)
--
-- B1: kundrader matchas på (business_id, telefon) och behåller sin FÖRSTA
-- e-post. Att koppla konton via `customers.email` lät därför en angripare som
-- bokat med offrets telefon + egen e-post se/avboka/recensera offrets senare
-- bokningar. Från och med nu avgörs synligheten per BOKNING:
--   * `bookings.contact_email` = e-posten som angavs just vid den bokningen
--     (sätts i create-flödet), eller
--   * `bookings.account_user_id` = bokningen gjordes inloggad av kontot.
-- Kontot ser bara bokningar där `lower(contact_email)` = kontots BEKRÄFTADE
-- e-post, eller som det själv gjort. Äldre bokningar utan contact_email tas
-- inte med (hellre för lite än för mycket).
--
-- Dessutom: radering behåller auth-användaren när den har spår som inte får
-- kaskadraderas (FK utan on delete) eller är plattformsadmin; kopplingar tas
-- bort när kundraden anonymiseras; kontoradering nollar även kommentaren.

alter table public.bookings
  add column contact_email text,
  add column account_user_id uuid references auth.users (id) on delete set null,
  add constraint bookings_contact_email_len check (
    contact_email is null or char_length(contact_email) <= 254
  );

create index bookings_business_account_user_idx
  on public.bookings (business_id, account_user_id)
  where account_user_id is not null;

-- Kontots bekräftade e-post (null om obekräftad). Beroende: i staging/prod
-- MÅSTE Supabase Auth "Confirm email" vara på (D-054) — annars autobekräftas
-- en direkt `signup` med lösenord mot Auth-API:t utan bevis på ägarskap.
-- (Lösenord kan inte användas som signal: GoTrue sätter ett slumpat lösenord
-- även för användare som skapas via magisk länk.)
create function private.my_confirmed_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(u.email)
    from auth.users u
   where u.id = (select auth.uid())
     and u.email is not null
     and u.email_confirmed_at is not null;
$$;

revoke all on function private.my_confirmed_email() from public;

-- Bokningar kontot får se: bokningsnivå (B1). `customer_account_links` är kvar
-- som index över vilka kundrader som berörs, men räcker inte ensamt.
create function private.my_visible_bookings()
returns table (business_id uuid, booking_id uuid, customer_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select bk.business_id, bk.id, bk.customer_id
    from public.bookings bk
    join public.customers c
      on c.business_id = bk.business_id and c.id = bk.customer_id
   where c.anonymized_at is null
     and (
       bk.account_user_id = (select auth.uid())
       or (
         bk.contact_email is not null
         and lower(bk.contact_email) = (select private.my_confirmed_email())
         and exists (
           select 1 from public.customer_account_links l
            where l.user_id = (select auth.uid())
              and l.business_id = bk.business_id
              and l.customer_id = bk.customer_id
         )
       )
     );
$$;

revoke all on function private.my_visible_bookings() from public;

create or replace function private.my_bookings()
returns table (
  business_id uuid,
  booking_id uuid,
  business_name text,
  slug text,
  timezone text,
  address text,
  comuna text,
  service_name text,
  staff_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text,
  price_clp integer,
  cancel_window_hours integer,
  cancel_approval text,
  payment text,
  review_rating smallint,
  review_created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select bk.business_id, bk.id, b.name, b.slug, b.timezone, b.address, b.comuna,
         sv.name, st.name, lower(bk.period), upper(bk.period),
         bk.status::text, bk.price_clp, b.cancel_window_hours, b.cancel_approval,
         (
           select sc.status
             from public.stripe_checkouts sc
            where sc.business_id = bk.business_id and sc.booking_id = bk.id
              and sc.status in ('authorized', 'captured', 'voided', 'refunded')
            order by sc.created_at desc
            limit 1
         ),
         rv.rating, rv.created_at
    from private.my_visible_bookings() v
    join public.bookings bk on bk.business_id = v.business_id and bk.id = v.booking_id
    join public.businesses b on b.id = bk.business_id
    join public.services sv on sv.business_id = bk.business_id and sv.id = bk.service_id
    join public.staff st on st.business_id = bk.business_id and st.id = bk.staff_id
    left join public.reviews rv on rv.business_id = bk.business_id and rv.booking_id = bk.id
   order by lower(bk.period) desc
   limit 500;
$$;

create or replace function private.my_booking_ref(p_booking_id uuid)
returns table (business_id uuid, customer_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select v.business_id, v.customer_id
    from private.my_visible_bookings() v
   where v.booking_id = p_booking_id
   limit 1;
$$;

-- Efter en bokning gjord inloggad på `/[slug]`: markera den som kontots och
-- koppla kundraden. Bara en bokning som skapats nyss och inte redan tillhör
-- ett annat konto. Anropas av servern i kundens egen session.
create function private.claim_booking(p_business_id uuid, p_booking_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_customer uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from public.customer_accounts a where a.user_id = v_uid) then
    return false;
  end if;
  update public.bookings
     set account_user_id = v_uid
   where business_id = p_business_id
     and id = p_booking_id
     and account_user_id is null
     and created_at > now() - interval '10 minutes'
  returning customer_id into v_customer;
  if v_customer is null then
    return false;
  end if;
  insert into public.customer_account_links (user_id, business_id, customer_id, linked_via)
  values (v_uid, p_business_id, v_customer, 'booking')
  on conflict do nothing;
  return true;
end;
$$;

revoke all on function private.claim_booking(uuid, uuid) from public;
grant execute on function private.claim_booking(uuid, uuid) to authenticated;

-- Export: bara synliga bokningar och deras recensioner (via my_bookings).
create or replace function private.export_my_account()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'account', (
      select jsonb_build_object(
        'email', u.email,
        'display_name', a.display_name,
        'marketing_consent_at', a.marketing_consent_at,
        'marketing_consent_version', a.marketing_consent_version,
        'created_at', a.created_at
      )
        from public.customer_accounts a
        join auth.users u on u.id = a.user_id
       where a.user_id = (select auth.uid())
    ),
    'consent_events', coalesce((
      select jsonb_agg(jsonb_build_object(
               'kind', e.kind, 'granted', e.granted,
               'version', e.version, 'at', e.created_at
             ) order by e.created_at)
        from public.account_consent_events e
       where e.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'bookings', coalesce((
      select jsonb_agg(jsonb_build_object(
               'business', m.business_name, 'service', m.service_name,
               'staff', m.staff_name, 'starts_at', m.starts_at,
               'ends_at', m.ends_at, 'status', m.status, 'price', m.price_clp
             ) order by m.starts_at)
        from private.my_bookings() m
    ), '[]'::jsonb),
    'favorites', coalesce((
      select jsonb_agg(jsonb_build_object('business', b.name, 'slug', b.slug, 'saved_at', f.created_at)
               order by f.created_at)
        from public.favorites f
        join public.businesses b on b.id = f.business_id
       where f.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'reviews', coalesce((
      select jsonb_agg(jsonb_build_object(
               'business', b.name, 'rating', r.rating, 'comment', r.comment,
               'display_name', r.display_name, 'created_at', r.created_at
             ) order by r.created_at)
        from private.my_visible_bookings() v
        join public.reviews r
          on r.business_id = v.business_id and r.booking_id = v.booking_id
        join public.businesses b on b.id = r.business_id
    ), '[]'::jsonb)
  );
$$;

-- Radering: bara kontots EGNA recensioner (synliga bokningar) anonymiseras —
-- namn och kommentar nollas, betyget behålls (D-045). Auth-användaren raderas
-- bara när inget spår finns som inte får kaskadraderas: medlemskap,
-- plattformsadmin eller annan FK utan on delete (inbjudningar, utskick,
-- blixttider, adminlogg …) — det sista fångas generellt via 23503.
create or replace function private.delete_my_account()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  update public.reviews r
     set display_name = null, comment = null
    from private.my_visible_bookings() v
   where r.business_id = v.business_id
     and r.booking_id = v.booking_id;

  update public.account_consent_events set user_id = null where user_id = v_uid;

  if exists (select 1 from public.memberships m where m.user_id = v_uid)
     or exists (select 1 from private.platform_admins p where p.user_id = v_uid) then
    delete from public.customer_accounts where user_id = v_uid;
    return false;
  end if;

  begin
    delete from auth.users where id = v_uid;
    return true;
  exception when foreign_key_violation then
    delete from public.customer_accounts where user_id = v_uid;
    return false;
  end;
end;
$$;

-- Anonymiserad kundrad (WP-26) → kopplingarna till konton försvinner.
create function private.unlink_anonymized_customer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.customer_account_links
   where business_id = new.business_id and customer_id = new.id;
  return new;
end;
$$;

revoke all on function private.unlink_anonymized_customer() from public;

create trigger customers_unlink_accounts_on_anonymize
  after update of anonymized_at on public.customers
  for each row
  when (old.anonymized_at is null and new.anonymized_at is not null)
  execute function private.unlink_anonymized_customer();

-- Koppling: kundrader där kundradens e-post ELLER e-posten på någon av dess
-- bokningar är kontots bekräftade e-post. (Synligheten avgörs ändå per bokning
-- ovan; kopplingen är bara indexet.) Visningsnamnet tas bara från en kundrad
-- vars egen e-post är kontots.
create or replace function private.link_customer_rows()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text := (select private.my_confirmed_email());
  v_count integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if v_email is null
     or not exists (select 1 from public.customer_accounts a where a.user_id = v_uid) then
    return 0;
  end if;
  insert into public.customer_account_links (user_id, business_id, customer_id, linked_via)
  select v_uid, c.business_id, c.id, 'email'
    from public.customers c
   where c.anonymized_at is null
     and (
       (c.email is not null and lower(c.email) = v_email)
       or exists (
         select 1 from public.bookings bk
          where bk.business_id = c.business_id
            and bk.customer_id = c.id
            and bk.contact_email is not null
            and lower(bk.contact_email) = v_email
       )
     )
  on conflict do nothing;
  get diagnostics v_count = row_count;
  update public.customer_accounts a
     set display_name = left(x.name, 80)
    from (
      select c.name
        from public.customer_account_links l
        join public.customers c
          on c.business_id = l.business_id and c.id = l.customer_id
       where l.user_id = v_uid and c.name is not null and c.anonymized_at is null
         and c.email is not null and lower(c.email) = v_email
       order by c.updated_at desc
       limit 1
    ) x
   where a.user_id = v_uid and a.display_name is null;
  return v_count;
end;
$$;
