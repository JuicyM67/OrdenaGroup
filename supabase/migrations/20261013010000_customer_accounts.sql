-- WP-67 · Kundkonton för privatpersoner (D-054)
--
-- En konsument = en rad i `customer_accounts` (user_id = auth.uid()). Samma
-- `auth.users` kan också vara medlem i ett företag; tenant-tabellernas
-- policies (`private.is_member`) ändras INTE, så en konsument utan
-- `memberships`-rad ser ingenting av företagsdata direkt. Konsumenten når
-- sina bokningar/recensioner bara via security definer-funktionerna nedan,
-- som går via `customer_account_links` och bara returnerar kolumner kunden
-- får se (aldrig `notes`, svar på bokningsfrågor eller andra kunders data).
--
-- Funktionerna ligger i `private` (inte `public`): de exponeras inte via
-- PostgREST och anropas bara av servern (`withUserTx`, `authenticated` +
-- JWT-claims, D-019). INV-3: RLS på varje tabell, inga anon-grants.

-- ---------------------------------------------------------------------------
-- Tabeller
-- ---------------------------------------------------------------------------

create table public.customer_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  -- SE, senare: verifierad telefon (OTP). Inte i v1 (ägarens beslut 2026-10-10).
  phone_e164 text,
  phone_verified_at timestamptz,
  -- Aldrig förkryssat: null tills kunden själv kryssar i rutan (regel 7).
  marketing_consent_at timestamptz,
  marketing_consent_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_accounts_display_name_len check (
    display_name is null or char_length(display_name) between 1 and 80
  ),
  constraint customer_accounts_phone_format check (
    phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
  ),
  constraint customer_accounts_consent_version check (
    marketing_consent_at is null or marketing_consent_version is not null
  )
);

create table public.customer_account_links (
  user_id uuid not null references public.customer_accounts (user_id) on delete cascade,
  business_id uuid not null,
  customer_id uuid not null,
  linked_via text not null,
  linked_at timestamptz not null default now(),
  primary key (user_id, business_id, customer_id),
  constraint customer_account_links_customer_fkey
    foreign key (business_id, customer_id)
    references public.customers (business_id, id) on delete cascade,
  constraint customer_account_links_via_check check (linked_via in ('email', 'phone', 'booking'))
);

create index customer_account_links_business_customer_idx
  on public.customer_account_links (business_id, customer_id);

create table public.favorites (
  user_id uuid not null references public.customer_accounts (user_id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, business_id)
);

create index favorites_business_idx on public.favorites (business_id);

-- Oföränderlig samtyckeslogg för kontot (samma mönster som `consent_events`).
-- Vid radering av kontot nollas `user_id` (loggen anonymiseras, raden blir kvar
-- som statistik utan persondata).
create table public.account_consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  kind text not null,
  granted boolean not null,
  version text not null,
  created_at timestamptz not null default now(),
  constraint account_consent_events_kind_check check (kind in ('marketing')),
  constraint account_consent_events_version_len check (char_length(version) between 1 and 40)
);

create index account_consent_events_user_idx
  on public.account_consent_events (user_id, created_at desc);

-- Loggen får bara ändras på ett sätt: `user_id` → null (radering av kontot).
create function private.account_consent_events_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'account_consent_events är append-only' using errcode = '42501';
  end if;
  if new.user_id is not null
     or new.id is distinct from old.id
     or new.kind is distinct from old.kind
     or new.granted is distinct from old.granted
     or new.version is distinct from old.version
     or new.created_at is distinct from old.created_at then
    raise exception 'account_consent_events är append-only' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger account_consent_events_immutable
  before update or delete on public.account_consent_events
  for each row execute function private.account_consent_events_immutable();

create trigger set_updated_at
  before update on public.customer_accounts
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------

alter table public.customer_accounts enable row level security;
alter table public.customer_account_links enable row level security;
alter table public.favorites enable row level security;
alter table public.account_consent_events enable row level security;

create policy "own account" on public.customer_accounts
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "own account update" on public.customer_accounts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own links" on public.customer_account_links
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "own favorites" on public.favorites
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "own favorites insert" on public.favorites
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "own favorites delete" on public.favorites
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "own consent events" on public.account_consent_events
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.customer_accounts from anon, authenticated, service_role;
revoke all on public.customer_account_links from anon, authenticated, service_role;
revoke all on public.favorites from anon, authenticated, service_role;
revoke all on public.account_consent_events from anon, authenticated, service_role;

grant select on public.customer_accounts to authenticated;
-- Bara visningsnamnet får ändras direkt; samtycket går via funktionen nedan
-- (som också loggar), insert via `ensure_customer_account()`.
grant update (display_name) on public.customer_accounts to authenticated;
grant select on public.customer_account_links to authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select on public.account_consent_events to authenticated;

-- Servern (service_role) läser för kundkontots koppling vid bokning och för
-- statistik; skriver aldrig direkt (allt går via funktionerna).
grant select on public.customer_accounts, public.customer_account_links,
  public.favorites, public.account_consent_events to service_role;

-- ---------------------------------------------------------------------------
-- Funktioner (security definer, search_path = '', anropas som authenticated)
-- ---------------------------------------------------------------------------

-- Skapar kontot för den inloggade användaren om det saknas. Idempotent.
create function private.ensure_customer_account(p_display_name text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text := nullif(left(btrim(coalesce(p_display_name, '')), 80), '');
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  insert into public.customer_accounts (user_id, display_name)
  values (v_uid, v_name)
  on conflict (user_id) do update
    set display_name = coalesce(public.customer_accounts.display_name, excluded.display_name);
end;
$$;

-- Kopplar alla icke-anonymiserade kundrader (i alla företag) vars e-post är
-- kontots BEKRÄFTADE e-post (skiftlägesokänsligt). Idempotent. Returnerar
-- antalet nya kopplingar.
create function private.link_customer_rows()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_count integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from public.customer_accounts a where a.user_id = v_uid) then
    return 0;
  end if;
  insert into public.customer_account_links (user_id, business_id, customer_id, linked_via)
  select v_uid, c.business_id, c.id, 'email'
    from auth.users u
    join public.customers c
      on c.email is not null
     and lower(c.email) = lower(u.email)
   where u.id = v_uid
     and u.email is not null
     and u.email_confirmed_at is not null
     and c.anonymized_at is null
  on conflict do nothing;
  get diagnostics v_count = row_count;
  -- Saknar kontot visningsnamn (magisk länk ger inget) tas namnet kunden själv
  -- angav vid sin senaste bokning hos ett kopplat företag.
  update public.customer_accounts a
     set display_name = left(x.name, 80)
    from (
      select c.name
        from public.customer_account_links l
        join public.customers c
          on c.business_id = l.business_id and c.id = l.customer_id
       where l.user_id = v_uid and c.name is not null and c.anonymized_at is null
       order by c.updated_at desc
       limit 1
    ) x
   where a.user_id = v_uid and a.display_name is null;
  return v_count;
end;
$$;

-- Kontots bokningar hos alla kopplade företag (alla tider; anroparen delar
-- upp i kommande/tidigare). Bara kolumner kunden får se.
create function private.my_bookings()
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
    from public.customer_account_links l
    join public.customers c
      on c.business_id = l.business_id and c.id = l.customer_id
    join public.bookings bk
      on bk.business_id = l.business_id and bk.customer_id = l.customer_id
    join public.businesses b on b.id = bk.business_id
    join public.services sv on sv.business_id = bk.business_id and sv.id = bk.service_id
    join public.staff st on st.business_id = bk.business_id and st.id = bk.staff_id
    left join public.reviews rv on rv.business_id = bk.business_id and rv.booking_id = bk.id
   where l.user_id = (select auth.uid())
     and c.anonymized_at is null
   order by lower(bk.period) desc
   limit 500;
$$;

-- En kopplad boknings (business_id, customer_id), eller ingen rad. Servern
-- använder den som auktorisering före avbokning/recension från kontot.
create function private.my_booking_ref(p_booking_id uuid)
returns table (business_id uuid, customer_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select bk.business_id, bk.customer_id
    from public.customer_account_links l
    join public.customers c
      on c.business_id = l.business_id and c.id = l.customer_id
    join public.bookings bk
      on bk.business_id = l.business_id and bk.customer_id = l.customer_id
   where l.user_id = (select auth.uid())
     and bk.id = p_booking_id
     and c.anonymized_at is null
   limit 1;
$$;

-- Favoriterna med det kunden behöver för att visa dem (publika uppgifter).
create function private.my_favorites()
returns table (
  business_id uuid,
  name text,
  slug text,
  comuna text,
  cover_url text,
  logo_url text,
  rating numeric,
  review_count integer,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.name, b.slug, b.comuna, b.cover_url, b.logo_url,
         (select round(avg(r.rating)::numeric, 1) from public.reviews r
           where r.business_id = b.id and r.hidden_at is null),
         (select count(*)::int from public.reviews r
           where r.business_id = b.id and r.hidden_at is null),
         f.created_at
    from public.favorites f
    join public.businesses b on b.id = f.business_id
   where f.user_id = (select auth.uid())
     and b.status = 'active'
   order by f.created_at desc;
$$;

-- Erbjudande-samtycket: sätter cachen på kontot och loggar händelsen (även ett
-- nej loggas, som bevis).
create function private.set_account_marketing_consent(p_granted boolean, p_version text)
returns void
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
  if p_granted is null or p_version is null or char_length(p_version) not between 1 and 40 then
    raise exception 'invalid consent' using errcode = '22023';
  end if;
  update public.customer_accounts
     set marketing_consent_at = case when p_granted then now() else null end,
         marketing_consent_version = case when p_granted then p_version else null end
   where user_id = v_uid;
  if not found then
    raise exception 'no account' using errcode = 'P0002';
  end if;
  insert into public.account_consent_events (user_id, kind, granted, version)
  values (v_uid, 'marketing', p_granted, p_version);
end;
$$;

-- Dataportabilitet (Ley 21.719 / GDPR art. 20): allt kontot har, som JSON.
create function private.export_my_account()
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
        from public.customer_account_links l
        join public.reviews r
          on r.business_id = l.business_id and r.customer_id = l.customer_id
        join public.businesses b on b.id = r.business_id
       where l.user_id = (select auth.uid())
    ), '[]'::jsonb)
  );
$$;

-- Radering av kontot (Ley 21.719 / GDPR art. 17). Tar bort konto, kopplingar
-- och favoriter, anonymiserar samtyckesloggen och nollar visningsnamnet på
-- kontots recensioner (betyget behålls, D-045). Rör INTE företagens
-- `customers`-rader (företaget är ansvarigt för dem, WP-26).
-- Är personen också medlem i ett företag raderas bara konsumentdelen
-- (auth-användaren behövs för företaget); annars raderas auth-användaren
-- också (sessioner försvinner med den). Returnerar true om auth-användaren
-- raderades.
create function private.delete_my_account()
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
     set display_name = null
    from public.customer_account_links l
   where l.user_id = v_uid
     and r.business_id = l.business_id
     and r.customer_id = l.customer_id;

  if exists (select 1 from public.memberships m where m.user_id = v_uid) then
    update public.account_consent_events set user_id = null where user_id = v_uid;
    delete from public.customer_accounts where user_id = v_uid;
    return false;
  end if;

  delete from auth.users where id = v_uid;
  return true;
end;
$$;

revoke all on function private.ensure_customer_account(text) from public;
revoke all on function private.link_customer_rows() from public;
revoke all on function private.my_bookings() from public;
revoke all on function private.my_booking_ref(uuid) from public;
revoke all on function private.my_favorites() from public;
revoke all on function private.set_account_marketing_consent(boolean, text) from public;
revoke all on function private.export_my_account() from public;
revoke all on function private.delete_my_account() from public;
revoke all on function private.account_consent_events_immutable() from public;

grant execute on function private.ensure_customer_account(text) to authenticated;
grant execute on function private.link_customer_rows() to authenticated;
grant execute on function private.my_bookings() to authenticated;
grant execute on function private.my_booking_ref(uuid) to authenticated;
grant execute on function private.my_favorites() to authenticated;
grant execute on function private.set_account_marketing_consent(boolean, text) to authenticated;
grant execute on function private.export_my_account() to authenticated;
grant execute on function private.delete_my_account() to authenticated;
