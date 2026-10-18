-- WP-80 · "Faktureras manuellt" / "Facturación manual" (D-061).
--
-- Ett företag kan markeras som fakturerat utanför programmet (avtal, faktura
-- från Ordena). Då styr plattformsadmin planen (samma tanke som en aktiv
-- `plan_override_until`, men utan slutdatum) och ägaren erbjuds ingen
-- självbetjäning för planköp/uppgradering i appen.
--
-- 1. `businesses.billing_mode` ('app' | 'manual'). Läsbar för medlemmar via
--    den befintliga `grant select on public.businesses to authenticated`
--    (RLS: bara egna företag), men INGEN update-grant till authenticated —
--    kolumnlistorna i `grant update (...)` (B2 m.fl.) nämner den aldrig, så
--    ägaren får 42501. Bara service_role (/admin) och
--    `accept_business_invitation` (security definer) sätter den.
-- 2. `private.business_billing_notes`: adminens interna anteckning (≤ 500
--    tecken). Egen privat tabell i stället för en kolumn på businesses,
--    eftersom tabell-grantet `select` till authenticated annars skulle göra
--    anteckningen läsbar för företagets medlemmar via Data API.
-- 3. `private.business_invitations.billing_mode/billing_note` följer med
--    inbjudan till `accept_business_invitation`.

-- ===========================================================================
-- 1. businesses.billing_mode -------------------------------------------------
-- ===========================================================================
alter table public.businesses
  add column billing_mode text not null default 'app'
    constraint businesses_billing_mode_check check (billing_mode in ('app', 'manual'));

comment on column public.businesses.billing_mode is
  'WP-80 (D-061): ''app'' = planen köps/ändras i appen (när det finns), '
  '''manual'' = faktureras utanför programmet, planen styrs av plattformsadmin. '
  'Ingen update-grant till authenticated — bara service_role (/admin).';

-- ===========================================================================
-- 2. private.business_billing_notes ------------------------------------------
-- ===========================================================================
create table private.business_billing_notes (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  note text not null check (length(note) between 1 and 500),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table private.business_billing_notes is
  'WP-80 (D-061): plattformsadminens interna faktureringsanteckning per '
  'företag. RLS påslaget utan policy, bara service_role (/admin).';

alter table private.business_billing_notes enable row level security;

grant select, insert, update, delete on private.business_billing_notes to service_role;

-- ===========================================================================
-- 3. business_invitations ----------------------------------------------------
-- ===========================================================================
alter table private.business_invitations
  add column billing_mode text not null default 'app'
    constraint business_invitations_billing_mode_check check (billing_mode in ('app', 'manual')),
  add column billing_note text
    constraint business_invitations_billing_note_check
      check (billing_note is null or length(billing_note) between 1 and 500);

-- ===========================================================================
-- 4. accept_business_invitation: för över billing_mode/billing_note ----------
-- ===========================================================================
-- Samma funktion som 20260930180000_platform_admin.sql, plus de två fälten.
create or replace function public.accept_business_invitation(token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  -- Läses via auth.uid() mot auth.users (security definer): serverns withOwnerTx
  -- sätter bara sub/role i JWT-claims, så auth.email() vore alltid tom.
  v_email text := lower(coalesce((select u.email from auth.users u where u.id = auth.uid()), ''));
  v_hash bytea;
  v_inv private.business_invitations%rowtype;
  v_business_id uuid;
  v_slug text;
  v_attempt int := 0;
begin
  if v_user is null then
    raise exception 'Se requiere autenticación' using errcode = '42501';
  end if;
  if token is null or length(token) = 0 then
    raise exception 'Token inválido' using errcode = '22023';
  end if;

  v_hash := extensions.digest(token, 'sha256');

  select *
    into v_inv
    from private.business_invitations
   where token_hash = v_hash
   for update;

  if not found then
    raise exception 'Invitación no encontrada' using errcode = 'P0002';
  end if;

  if v_inv.accepted_at is not null then
    raise exception 'Invitación ya utilizada' using errcode = '22023';
  end if;

  if v_inv.expires_at < now() then
    raise exception 'Invitación vencida' using errcode = '22023';
  end if;

  if v_email = '' or v_email <> lower(v_inv.email) then
    raise exception 'La cuenta conectada no coincide con la invitación' using errcode = '42501';
  end if;

  v_slug := private.slugify_business_name(v_inv.business_name);
  if length(v_slug) < 3 then
    v_slug := 'negocio';
  end if;

  loop
    v_attempt := v_attempt + 1;
    begin
      insert into public.businesses (
        name, slug, comuna, category, plan, plan_override_until, billing_mode
      )
      values (
        v_inv.business_name, v_slug, '', '', v_inv.plan, v_inv.plan_override_until,
        v_inv.billing_mode
      )
      returning id into v_business_id;
      exit;
    exception
      -- unique_violation: slug ya tomado. check_violation: coincide con la
      -- lista de palabras reservadas (businesses_slug_not_reserved) — en
      -- ambos casos, un sufijo aleatorio resuelve el choque.
      when unique_violation or check_violation then
        if v_attempt >= 20 then
          raise exception 'No se pudo generar un identificador único para el negocio';
        end if;
        v_slug := left(private.slugify_business_name(v_inv.business_name), 3)
          || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
    end;
  end loop;

  if v_inv.billing_note is not null then
    insert into private.business_billing_notes (business_id, note, updated_by)
    values (v_business_id, v_inv.billing_note, v_inv.created_by);
  end if;

  insert into public.memberships (business_id, user_id, role)
  values (v_business_id, v_user, 'owner');

  update private.business_invitations
     set accepted_at = now(),
         business_id = v_business_id
   where id = v_inv.id;

  return v_business_id;
end;
$$;

comment on function public.accept_business_invitation(text) is
  'Acepta una business_invitations pendiente: crea el negocio (plan y '
  'billing_mode de la invitación, comuna/category en blanco como placeholder) '
  'y hace owner a auth.uid(). Exige que el email de auth.users (auth.uid()) = '
  'email de la invitación. SECURITY DEFINER (mismo motivo que create_business()).';

revoke all on function public.accept_business_invitation(text) from public;
grant execute on function public.accept_business_invitation(text) to authenticated;
