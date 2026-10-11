-- WP-70 · Erbjudanden: redigerare + prisvakt (D-056).
--  1. Planfunktionen `offers` (Team och uppåt, samma nivå som kampanjer, D-048).
--  2. `offers.last_unpublished_at` — när ett erbjudande senast slutade vara publicerat.
--  3. `service_price_history` — tjänstens prishistorik (trigger på `services`).
--  4. Prisvakten (prisinformationslagen 7 a § / Omnibus-direktivet: "lägsta pris
--     senaste 30 dagarna"):
--     a) tjänstens pris får inte höjas medan tjänsten har ett publicerat
--        erbjudande, eller inom 30 dagar efter att ett erbjudande på tjänsten
--        slutat vara publicerat (23514, constraint `service_price_offer_lock`);
--     b) ett erbjudande får inte publiceras om tjänstens pris i dag är högre än
--        det lägsta priset senaste 30 dagarna (23514, constraint
--        `offer_regular_price_raised`) — rabatten räknas alltså alltid mot det
--        lägsta priset.
--  5. Planspärr i databasen: `authenticated` skapar/publicerar bara erbjudanden
--     när planen har `offers` (42501). Service role (servern efter egen kontroll,
--     seed, admin) spärras inte av planen — men prisvakten gäller alla roller.
--  6. Storage-bucket `offer-images` (publik läsning, ≤ 5 MiB, jpeg/png/webp) med
--     skrivning bara för medlemmar med `can_edit_catalog` i sitt eget
--     `<business_id>/`-prefix.
--
-- `private.offers_guard` (WP-68) rörs inte: de nya kontrollerna ligger i egna
-- triggrar så att WP-69 kan ändra vakten parallellt.
set search_path = public, extensions;

-- 1. Planfunktionen `offers` ---------------------------------------------------
-- Speglar `src/config/plans.ts` (ändra BÅDA, pgTAP 117/126 + vitest plans.test.ts).
create or replace function private.plan_has_feature(p_plan text, p_feature text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_feature in ('unbranded', 'online_payment', 'waitlist')
      then p_plan in ('emprende', 'equipo', 'local', 'custom')
    when p_feature in ('flash', 'campaigns', 'full_reports', 'staff_accounts', 'offers')
      then p_plan in ('equipo', 'local', 'custom')
    when p_feature = 'priority_support'
      then p_plan in ('local', 'custom')
    else false
  end;
$$;

-- 2. När ett erbjudande senast slutade vara publicerat --------------------------
alter table public.offers add column last_unpublished_at timestamptz;

create function private.offers_track_unpublish()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'published' and new.status is distinct from 'published' then
    new.last_unpublished_at := now();
  end if;
  return new;
end;
$$;

revoke all on function private.offers_track_unpublish() from public;

create trigger offers_track_unpublish
  before update of status on public.offers
  for each row execute function private.offers_track_unpublish();

-- 3. Prishistorik ------------------------------------------------------------
create table public.service_price_history (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  service_id uuid not null,
  price_minor integer not null check (price_minor >= 0),
  valid_from timestamptz not null default now(),
  foreign key (business_id, service_id)
    references public.services (business_id, id) on delete cascade
);

create index service_price_history_service_idx
  on public.service_price_history (business_id, service_id, valid_from desc);

alter table public.service_price_history enable row level security;

create policy "read service_price_history" on public.service_price_history
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

-- Bara triggern skriver (security definer). Historiken är append-only även
-- för klienten: inga skrivgrants.
revoke all on public.service_price_history from anon, authenticated;
grant select on public.service_price_history to authenticated;
grant select, insert, delete on public.service_price_history to service_role;

-- Befintliga tjänster: nuvarande pris sedan tjänsten skapades.
insert into public.service_price_history (business_id, service_id, price_minor, valid_from)
select s.business_id, s.id, s.price_clp, s.created_at
  from public.services s;

create function private.services_record_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.price_clp is distinct from old.price_clp then
    insert into public.service_price_history (business_id, service_id, price_minor)
    values (new.business_id, new.id, new.price_clp);
  end if;
  return null;
end;
$$;

revoke all on function private.services_record_price() from public;

create trigger services_record_price
  after insert or update of price_clp on public.services
  for each row execute function private.services_record_price();

-- Lägsta pris under de senaste 30 dagarna: alla priser som börjat gälla inom
-- fönstret plus det pris som gällde när fönstret började. Security invoker:
-- `authenticated` ser bara sina egna företags historik (RLS).
create function private.service_lowest_price_30d(p_business uuid, p_service uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select min(x.price_minor) from (
    select h.price_minor
      from public.service_price_history h
     where h.business_id = p_business and h.service_id = p_service
       and h.valid_from > now() - interval '30 days'
    union all
    (select h.price_minor
       from public.service_price_history h
      where h.business_id = p_business and h.service_id = p_service
        and h.valid_from <= now() - interval '30 days'
      order by h.valid_from desc, h.id desc
      limit 1)
  ) x;
$$;

revoke all on function private.service_lowest_price_30d(uuid, uuid) from public;
grant execute on function private.service_lowest_price_30d(uuid, uuid) to authenticated, service_role;

-- 4a. Prisvakten på tjänsten ---------------------------------------------------
create function private.services_price_offer_lock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.price_clp > old.price_clp and exists (
    select 1 from public.offers o
     where o.business_id = new.business_id and o.service_id = new.id
       and (o.status = 'published'
            or o.last_unpublished_at > now() - interval '30 days')
  ) then
    raise exception 'services: priset kan inte höjas under eller 30 dagar efter ett erbjudande'
      using errcode = '23514', constraint = 'service_price_offer_lock';
  end if;
  return new;
end;
$$;

revoke all on function private.services_price_offer_lock() from public;

create trigger services_price_offer_lock
  before update of price_clp on public.services
  for each row execute function private.services_price_offer_lock();

-- 4b + 5. Publicering och planspärr på erbjudandet ------------------------------
-- Namnet sorterar efter `offers_guard` (triggrar körs i namnordning), så
-- ägarkontrollen där kommer först.
create function private.offers_guard_plan_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lowest integer;
begin
  if (select auth.role()) = 'authenticated'
     and (tg_op = 'INSERT' or (new.status = 'published' and old.status is distinct from 'published'))
     and not private.business_has_feature(new.business_id, 'offers') then
    raise exception 'offers: planen saknar erbjudanden' using errcode = '42501';
  end if;

  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    v_lowest := private.service_lowest_price_30d(new.business_id, new.service_id);
    if v_lowest is not null and new.regular_price_minor > v_lowest then
      raise exception 'offers: tjänstens pris har höjts senaste 30 dagarna'
        using errcode = '23514', constraint = 'offer_regular_price_raised';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.offers_guard_plan_price() from public;

create trigger offers_guard_plan_price
  before insert or update on public.offers
  for each row execute function private.offers_guard_plan_price();

-- 6. Storage-bucket offer-images -----------------------------------------------
-- Samma mönster som `business-media` (20260929130000): publik läsning via
-- bucket.public (ingen anon-policy), gränserna på bucket-nivå.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'offer-images',
  'offer-images',
  true,
  5242880, -- 5 MiB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "offer-images select" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'offer-images'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and private.has_perm(((storage.foldername(name))[1])::uuid, 'can_edit_catalog')
  );

create policy "offer-images insert" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'offer-images'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and private.has_perm(((storage.foldername(name))[1])::uuid, 'can_edit_catalog')
  );

create policy "offer-images update" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'offer-images'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and private.has_perm(((storage.foldername(name))[1])::uuid, 'can_edit_catalog')
  )
  with check (
    bucket_id = 'offer-images'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and private.has_perm(((storage.foldername(name))[1])::uuid, 'can_edit_catalog')
  );

create policy "offer-images delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'offer-images'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and private.has_perm(((storage.foldername(name))[1])::uuid, 'can_edit_catalog')
  );

comment on table public.service_price_history is
  'WP-70 (D-056): tjänsternas prishistorik för prisvakten (lägsta pris senaste 30 dagarna). Skrivs bara av trigger.';
