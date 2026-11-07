-- WP-85 (D-070) · Descubre som företagskatalog — datadelen. Port av SE:s
-- 20261030010000_upptack_foretag.sql (WP-88, D-073), samma tidsstämpel och samma
-- interna kategori-id:n; namnen och URL-slugsen är chilenska (src/config/marketplace.ts,
-- src/i18n/es-CL.descubre.ts).
-- Bara tillägg: inga befintliga kolumner, rader eller policies ändras utom
-- `offers_category_check`, som breddas till de 16 kategorierna.
--
-- INV-3: den nya tabellen `business_service_areas` har RLS och inga anon-grants.
-- INV-4 (D-014): `business_id` först i primärnyckeln (index), cascade från
-- `businesses`. De publika Descubre-sidorna läser fortfarande via servern som
-- service_role med explicita filter (`src/server/marketplace/`), aldrig via anon.
set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- De 16 kategorierna (samma id:n som `ALL_MARKETPLACE_CATEGORY_IDS` i
-- src/config/marketplace.ts — hålls i synk manuellt, testat i pgTAP 144).
-- ---------------------------------------------------------------------------
create function private.marketplace_category_ids()
returns text[]
language sql
immutable
parallel safe
set search_path = ''
as $$
  select array[
    'har', 'barberare', 'naglar', 'fransar', 'hudvard', 'skonhet', 'massage',
    'spa', 'halsa', 'holistiskt', 'traning', 'tatuering', 'djur', 'stad',
    'fordon', 'ovrigt'
  ]::text[]
$$;

revoke all on function private.marketplace_category_ids() from public;
grant execute on function private.marketplace_category_ids() to authenticated, service_role;

alter table public.offers drop constraint offers_category_check;
alter table public.offers add constraint offers_category_check
  check (category = any (private.marketplace_category_ids()));

-- Extra kategorier: delmängd av de 16, högst 6, inga dubbletter/null.
create function private.marketplace_extra_categories_ok(cats text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(cardinality(cats), 0) <= 6
     and coalesce(cats, array[]::text[]) <@ private.marketplace_category_ids()
     and not exists (select 1 from unnest(coalesce(cats, array[]::text[])) x where x is null)
     and cardinality(coalesce(cats, array[]::text[]))
         = (select count(distinct x) from unnest(coalesce(cats, array[]::text[])) x)
$$;

revoke all on function private.marketplace_extra_categories_ok(text[]) from public;
grant execute on function private.marketplace_extra_categories_ok(text[]) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- businesses: synlighet och kategorier i Descubre (D-070).
-- ---------------------------------------------------------------------------
alter table public.businesses
  -- "Mostrar mi negocio en Descubre" — på som standard (som SE, D-073).
  -- Listas ändå bara när profilen är komplett (bild, adress/comunas, tjänst).
  add column marketplace_listed boolean not null default true,
  -- Bekräftade extra kategorier utöver huvudkategorin (= rubron).
  add column marketplace_extra_categories text[] not null default array[]::text[],
  -- När ägaren senast sparade kategorierna. null = aldrig granskat, då visas
  -- förslagen förbockade (och gäller inte förrän de sparats).
  add column marketplace_categories_reviewed_at timestamptz,
  -- "No tenemos local: atendemos a domicilio": listas efter comunas i
  -- `business_service_areas` i stället för efter avstånd.
  add column serves_at_customer boolean not null default false,
  -- Plattformens döljning (testkonton m.m.). Bara servern/service_role —
  -- ingen grant till authenticated, så ägaren kan inte slå av den.
  add column marketplace_hidden boolean not null default false;

alter table public.businesses
  add constraint businesses_marketplace_extra_categories_ok
    check (private.marketplace_extra_categories_ok(marketplace_extra_categories));

grant update (
  marketplace_listed,
  marketplace_extra_categories,
  marketplace_categories_reviewed_at,
  serves_at_customer
) on public.businesses to authenticated;

-- ---------------------------------------------------------------------------
-- business_service_areas: comunas som ett företag som atiende a domicilio täcker.
-- ---------------------------------------------------------------------------
create table public.business_service_areas (
  business_id uuid not null references public.businesses (id) on delete cascade,
  -- Samma format som `businesses.area_slug` ("nunoa", "las-condes").
  area_slug text not null
    check (area_slug ~ '^[a-z0-9]([a-z0-9-]{0,58}[a-z0-9])?$'),
  area_name text not null
    check (char_length(btrim(area_name)) between 1 and 80),
  sort smallint not null default 0,
  created_at timestamptz not null default now(),
  primary key (business_id, area_slug)
);

create index business_service_areas_area_slug_idx
  on public.business_service_areas (area_slug);

-- Högst 30 comunas per företag (samma gräns som `SERVICE_AREAS_MAX`).
create function private.business_service_areas_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.business_service_areas
       where business_id = new.business_id) >= 30 then
    raise exception 'service_areas_limit' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger business_service_areas_limit
  before insert on public.business_service_areas
  for each row execute function private.business_service_areas_limit();

alter table public.business_service_areas enable row level security;

create policy "read business_service_areas" on public.business_service_areas
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

create policy "write business_service_areas" on public.business_service_areas
  for all
  to authenticated
  using (private.has_perm(business_id, 'can_edit_settings'))
  with check (private.has_perm(business_id, 'can_edit_settings'));

grant select, insert, update, delete on public.business_service_areas to authenticated;
grant select, insert, update, delete on public.business_service_areas to service_role;
