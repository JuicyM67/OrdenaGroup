-- WP-46 · Steg 5 (db-engineer) · `public.accept_invitation(token)`
-- F#: F1/F6. Plan: docs/tasks/plans/WP-46.md, steg 5.
--
-- Anropas direkt av klienten (`/app/invitacion/[token]`, ui-engineer, WP-46
-- steg 6 — utanför den här migrationen), precis som `public.create_business()`
-- (20260927100100): medvetet i schemat `public`, `security definer`, så att
-- ingen service role behövs i klientflödet. Token hashas HÄR (inte i
-- klienten) med samma algoritm som `bookings.manage_token_hash`
-- (`extensions.digest(token, 'sha256')`, se 20260930150300:s kommentar om
-- `member_invitations.token_hash`) — klartexten går bara i URL:en/mejlet.
--
-- `for update` på inbjudningsraden: lås den innan kontrollerna läses, så att
-- två samtidiga `accept_invitation(token)`-anrop med SAMMA token inte båda
-- kan se `accepted_at is null` och båda lyckas skapa ett membership (den
-- andra transaktionen väntar på låset, läser sedan om raden och ser
-- `accepted_at` redan satt av den första → "ya fue utilizada").
create function public.accept_invitation(token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_user_email text;
  v_hash bytea;
  v_inv public.member_invitations%rowtype;
  v_plan public.business_plan;
  v_limit integer;
begin
  if v_user is null then
    raise exception 'Se requiere autenticación' using errcode = '42501';
  end if;

  if token is null or btrim(token) = '' then
    raise exception 'Invitación inválida' using errcode = 'P0002';
  end if;

  v_hash := extensions.digest(token, 'sha256');

  select *
    into v_inv
    from public.member_invitations
   where token_hash = v_hash
   for update;

  if not found then
    raise exception 'Invitación inválida' using errcode = 'P0002';
  end if;

  if v_inv.revoked_at is not null then
    raise exception 'Esta invitación fue revocada' using errcode = 'P0001';
  end if;

  if v_inv.accepted_at is not null then
    raise exception 'Esta invitación ya fue utilizada' using errcode = 'P0001';
  end if;

  if v_inv.expires_at <= now() then
    raise exception 'Esta invitación expiró' using errcode = 'P0001';
  end if;

  select u.email into v_user_email from auth.users u where u.id = v_user;

  -- Skiftlägesokänslig jämförelse (planen, steg 5): "auth.email() matchar
  -- inbjudans adress (skiftlägesokänsligt)".
  if v_user_email is null or lower(v_user_email) <> lower(v_inv.email) then
    raise exception 'Esta invitación es para otro correo electrónico' using errcode = '42501';
  end if;

  -- Gräns-hooken (private.plan_staff_limit, 20260930150300): kontrolleras
  -- IGEN vid accept, inte bara vid inbjudan — planen kan ha ändrats, eller
  -- flera inbjudningar kan ha skickats innan någon accepterades. `for update`
  -- på businessraden ger samma kapplöpningsskydd som
  -- `member_invitations_guard_limit`/`protect_last_owner`.
  select plan into v_plan from public.businesses where id = v_inv.business_id for update;
  v_limit := private.plan_staff_limit(v_plan);
  if v_limit is not null and private.staff_seat_count(v_inv.business_id) >= v_limit then
    raise exception 'El plan actual no permite más cuentas de personal' using errcode = '42501';
  end if;

  insert into public.memberships (
    business_id, user_id, role, staff_id,
    can_manage_own_bookings, can_manage_all_bookings, can_cancel_bookings,
    can_edit_catalog, can_manage_team, can_view_reports, can_edit_settings
  ) values (
    v_inv.business_id, v_user, 'staff', v_inv.staff_id,
    v_inv.can_manage_own_bookings, v_inv.can_manage_all_bookings, v_inv.can_cancel_bookings,
    v_inv.can_edit_catalog, v_inv.can_manage_team, v_inv.can_view_reports, v_inv.can_edit_settings
  );

  update public.member_invitations set accepted_at = now() where id = v_inv.id;

  return v_inv.business_id;
end;
$$;

revoke all on function public.accept_invitation(text) from public;
grant execute on function public.accept_invitation(text) to authenticated;
