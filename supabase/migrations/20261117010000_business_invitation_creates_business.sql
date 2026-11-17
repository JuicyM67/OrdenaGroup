-- WP-93 (D-078): inbjudan skapar företaget direkt, och accepteras utan cookie.
--
-- Förut skapades företaget först när den inbjudna accepterade
-- (`accept_business_invitation`), och accepten hängde på en cookie som satts i
-- SAMMA webbläsare som inloggningslänken öppnades i. Två problem:
--   * admin kunde inte öppna eller förbereda företaget innan kunden loggat in;
--   * öppnades länken i en annan webbläsare/enhet (t.ex. mejlappens) hamnade
--     den inbjudna på /app/beta ("bara på inbjudan").
--
-- Nu:
--   1. `private.create_invitation_business(invitation)` skapar utkastet
--      (comuna/category tomma, plan/billing från inbjudan) och kopplar det till
--      inbjudan. /admin anropar den direkt när inbjudan skickas (service_role).
--   2. `private.accept_invitation_for(invitation, user)` gör kontot till ägare
--      (skapar utkastet först för gamla inbjudningar som saknar företag).
--   3. `public.accept_business_invitation(token)` — samma kontroller som förut,
--      använder (2).
--   4. `public.accept_pending_business_invitation()` — accepterar den senaste
--      giltiga inbjudan till den inloggades VERIFIERADE e-post, utan token.
--      /app anropar den för ett konto utan företag.
--   5. FK `business_invitations.business_id` → `on delete cascade`. Med
--      `on delete set null` gick ett företag från en accepterad inbjudan inte
--      att radera (`business_invitations_accepted_has_business`), och ett
--      raderat utkast ska inte kunna återuppstå via sin gamla inbjudan.

-- ===========================================================================
-- 5. FK on delete cascade
-- ===========================================================================
alter table private.business_invitations
  drop constraint business_invitations_business_id_fkey,
  add constraint business_invitations_business_id_fkey
    foreign key (business_id) references public.businesses (id) on delete cascade;

-- ===========================================================================
-- 1. Skapa utkastet för en inbjudan
-- ===========================================================================
create function private.create_invitation_business(p_invitation uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv private.business_invitations%rowtype;
  v_business_id uuid;
  v_slug text;
  v_attempt int := 0;
begin
  select * into v_inv
    from private.business_invitations
   where id = p_invitation
   for update;
  if not found then
    raise exception 'Invitación no encontrada' using errcode = 'P0002';
  end if;
  if v_inv.business_id is not null then
    return v_inv.business_id;
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
      -- Samma hantering som i accept_business_invitation (20261020010100).
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

  update private.business_invitations
     set business_id = v_business_id
   where id = v_inv.id;

  return v_business_id;
end;
$$;

comment on function private.create_invitation_business(uuid) is
  'WP-93: crea el negocio en borrador (comuna/category en blanco) de una '
  'invitación y lo enlaza. Idempotente: devuelve el negocio ya enlazado.';

revoke all on function private.create_invitation_business(uuid) from public;
revoke all on function private.create_invitation_business(uuid) from anon, authenticated;
grant execute on function private.create_invitation_business(uuid) to service_role;

-- ===========================================================================
-- 2. Gör kontot till ägare (inbjudan redan låst och kontrollerad av anroparen)
-- ===========================================================================
create function private.accept_invitation_for(p_invitation uuid, p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid;
begin
  v_business_id := private.create_invitation_business(p_invitation);

  -- En plattformsadmin som bjudit in sin egen adress kan redan ha en
  -- supportrad i utkastet: den blir en vanlig ägarrad.
  insert into public.memberships (business_id, user_id, role)
  values (v_business_id, p_user, 'owner')
  on conflict (business_id, user_id) do update
    set role = 'owner', staff_id = null, support_until = null;

  update private.business_invitations
     set accepted_at = now()
   where id = p_invitation;

  return v_business_id;
end;
$$;

revoke all on function private.accept_invitation_for(uuid, uuid) from public;
revoke all on function private.accept_invitation_for(uuid, uuid) from anon, authenticated;

-- ===========================================================================
-- 3. Acceptera med token (samma kontroller som förut)
-- ===========================================================================
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
  v_inv private.business_invitations%rowtype;
begin
  if v_user is null then
    raise exception 'Se requiere autenticación' using errcode = '42501';
  end if;
  if token is null or length(token) = 0 then
    raise exception 'Token inválido' using errcode = '22023';
  end if;

  select *
    into v_inv
    from private.business_invitations
   where token_hash = extensions.digest(token, 'sha256')
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

  return private.accept_invitation_for(v_inv.id, v_user);
end;
$$;

comment on function public.accept_business_invitation(text) is
  'Acepta una business_invitations pendiente: hace owner a auth.uid() del '
  'negocio de la invitación (lo crea en borrador si es una invitación antigua '
  'sin negocio). Exige que el email de auth.users (auth.uid()) = email de la '
  'invitación. SECURITY DEFINER (mismo motivo que create_business()).';

-- ===========================================================================
-- 4. Acceptera den väntande inbjudan till den verifierade e-posten (utan token)
-- ===========================================================================
create function public.accept_pending_business_invitation()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_email text;
  v_inv_id uuid;
begin
  if v_user is null then
    raise exception 'Se requiere autenticación' using errcode = '42501';
  end if;

  -- Bara en bekräftad adress (magisk länk/kod sätter email_confirmed_at).
  select lower(u.email) into v_email
    from auth.users u
   where u.id = v_user and u.email_confirmed_at is not null;
  if v_email is null or v_email = '' then
    return null;
  end if;

  select i.id into v_inv_id
    from private.business_invitations i
   where lower(i.email) = v_email
     and i.accepted_at is null
     and i.expires_at > now()
   order by i.created_at desc
   limit 1
   for update;
  if v_inv_id is null then
    return null;
  end if;

  return private.accept_invitation_for(v_inv_id, v_user);
end;
$$;

comment on function public.accept_pending_business_invitation() is
  'WP-93: acepta la invitación vigente más reciente para el email confirmado de '
  'auth.uid(), sin token (el link de inicio de sesión puede abrirse en otro '
  'navegador). Devuelve el negocio, o null si no hay invitación.';

revoke all on function public.accept_pending_business_invitation() from public;
grant execute on function public.accept_pending_business_invitation() to authenticated;
