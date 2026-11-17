-- WP-96 (D-080): skylteditorn i Ajustes → QR sparar designen på företaget, så att
-- samma skylt finns på alla enheter och för hela teamet.
--
-- `businesses.sign_designs` = { "v": 1, "reservas"?: {...}, "cuenta"?: {...} }.
-- Innehållet valideras strikt av servern (Zod, whitelists och längdgränser,
-- src/lib/validation/carteles.ts) och läses tolerant (okända värden ger
-- standardvärdet). Databasen garanterar bara formen (ett objekt) och en övre
-- storleksgräns. Skrivs av medlemmar med can_edit_settings via befintlig RLS
-- "owners update" och en kolumngrant, samma mönster som record_fields
-- (20261108030000).

alter table public.businesses
  add column sign_designs jsonb not null default '{}'::jsonb,
  add constraint businesses_sign_designs_check check (
    jsonb_typeof(sign_designs) = 'object'
    and octet_length(sign_designs::text) <= 8000
  );

comment on column public.businesses.sign_designs is
  'WP-96: diseño de los carteles con QR (Ajustes → QR) por tipo de cartel. '
  'Validado por el servidor; acá solo forma (objeto) y tamaño máximo.';

grant update (sign_designs) on public.businesses to authenticated;
