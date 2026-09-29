-- WP-41 · Steg 1 · Bokningssidan som företagsprofil
-- F#: bygger ut F1 (tjänster), F5 (bokningssidan/profilen).
-- INV: INV-3 (RLS på varje tabell, inga anon-policies), INV-4 (sammansatta FK/tenant-isolering, D-014).
-- Plan: docs/tasks/plans/WP-41-profil.md, steg 1.
--
-- Innehåll:
--   1. Nya textfält: services.description, businesses.about/cover_url/instagram, staff.title.
--   2. Tabellen business_images (galleriets metadata, business_images.path pekar på ett
--      objekt i Storage-bucketen business-media).
--   3. Storage-bucket business-media (publik läsning via bucket.public, skrivning bara
--      för ägare/admin i sitt eget prefix, mime/storlek begränsat på bucket-nivå).

-- 1. Nya textfält -----------------------------------------------------------
alter table public.services
  add column description text,
  add constraint services_description_length check (char_length(description) <= 500);

alter table public.businesses
  add column about text,
  add column cover_url text,
  add column instagram text,
  add constraint businesses_about_length check (char_length(about) <= 1500),
  -- K5 (samma resonemang som logo_url): bara https:-länkar, aldrig http://
  -- eller data:-URI:er.
  add constraint businesses_cover_url_format check (cover_url is null or cover_url ~ '^https://'),
  -- Handtag utan `@` (UI:t lägger på `@` vid visning, se ProfilDesktop.dc.html
  -- "@salongnova"). Samma teckenregler som Instagrams egna användarnamn
  -- (bokstäver, siffror, punkt, understreck, 1–30 tecken).
  add constraint businesses_instagram_format check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$');

alter table public.staff
  add column title text,
  add constraint staff_title_length check (char_length(title) <= 100);

-- 2. business_images ---------------------------------------------------------
-- Galleriets metadata (sortering, vilket företag). Själva bilddatan ligger i
-- Storage-bucketen business-media, under prefixet `<business_id>/...` (se §3).
-- `path` är den fullständiga objektsökvägen i bucketen (inklusive
-- business_id-prefixet), inte bara filnamnet, så att en rad entydigt pekar på
-- ett Storage-objekt utan att UI:t behöver sätta ihop sökvägen själv.
create table public.business_images (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  path text not null,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  unique (business_id, path),
  constraint business_images_path_not_blank check (char_length(btrim(path)) > 0),
  -- Försvar på djupet: metadataraden måste peka på ett objekt under sitt eget
  -- företags prefix, samma regel som Storage-policyerna i §3 tvingar fram på
  -- objektnivå.
  constraint business_images_path_prefix check (path like business_id::text || '/%')
);

create index business_images_business_id_idx on public.business_images (business_id);

alter table public.business_images enable row level security;
create policy "owners full access" on public.business_images
  for all
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]))
  with check (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));
grant select, insert, update, delete on public.business_images to authenticated;
-- Säkerhet S2/ARCHITECTURE princip 3: den publika bokningssidan läser
-- galleriet via servern (service_role, explicit business_id från slug),
-- aldrig via en anon-policy här.
grant select, insert, update, delete on public.business_images to service_role;

-- 3. Storage-bucket business-media -------------------------------------------
-- Bucket-nivåns mime/storleksgräns gäller likadant lokalt och i molnet
-- (till skillnad från config.toml:s [storage.buckets], som bara styr den
-- lokala CLI-stacken) — därför sätts den här, i en migration.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-media',
  'business-media',
  true, -- publik läsning: den publika bokningssidan (utan inloggning) måste
        -- kunna visa omslag/logga/galleri. `public = true` gör att Storage-
        -- tjänstens publika objekt-URL (/storage/v1/object/public/...)
        -- serverar filen direkt, UTAN att gå via RLS-policyer på
        -- storage.objects — så "publik läsning" kräver ingen anon-policy
        -- nedan (INV-3: inga anon-policies, även om storage.objects formellt
        -- ligger utanför `public`-schemat och 000_schema_guard.test.sql).
  2097152, -- 2 MiB (2 * 1024 * 1024 bytes)
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- storage.objects-policies ---------------------------------------------------
-- Sökvägsmönster: `<business_id>/<filnamn>`. `storage.foldername(name)` ger
-- sökvägens mapp-delar som en text[]; första elementet är business_id.
-- Regex-vakten (giltig UUID-form) körs FÖRE `::uuid`-castningen i varje
-- policy, så ett objektnamn utan (giltigt) business_id-prefix gör att
-- policyvillkoret blir `false` (nekad, 42501) i stället för ett runtime-
-- castfel.
--
-- Ingen select-policy för `anon`/`public` här (se kommentaren vid
-- `insert into storage.buckets` ovan för varför det inte behövs för publik
-- läsning). `authenticated` får bara select/insert/update/delete i sitt EGET
-- företags prefix, som ägare/admin — samma nivå som business_images-tabellen.
-- `service_role` förbigår RLS helt (t.ex. när servern listar/tar bort filer
-- åt ägaren, eller när WP-26 raderar ett företags bilder).
create policy "business-media owners select" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and private.is_member(((storage.foldername(name))[1])::uuid, array['owner', 'admin']::public.member_role[])
  );

create policy "business-media owners insert" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and private.is_member(((storage.foldername(name))[1])::uuid, array['owner', 'admin']::public.member_role[])
  );

create policy "business-media owners update" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and private.is_member(((storage.foldername(name))[1])::uuid, array['owner', 'admin']::public.member_role[])
  )
  with check (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and private.is_member(((storage.foldername(name))[1])::uuid, array['owner', 'admin']::public.member_role[])
  );

create policy "business-media owners delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and private.is_member(((storage.foldername(name))[1])::uuid, array['owner', 'admin']::public.member_role[])
  );
