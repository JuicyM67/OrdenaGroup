-- D-061 rättelse · `platform_admins_keep_one` slog till på VARJE delete-sats mot
-- `private.platform_admins`, även när den raderade noll rader. En statement-trigger
-- körs alltid, och FK-kaskaden från `auth.users` ger en sådan sats vid varje
-- kontoradering. När tabellen redan var tom (ny miljö, staging före första admin)
-- gick det därför inte att radera något konto alls (pgTAP 011/135 på staging-se).
--
-- Nu: spärren slår bara till när satsen faktiskt raderade minst en admin OCH ingen
-- admin finns kvar. Övergångstabellen `deleted_rows` visar vad satsen tog bort.
set search_path = public, extensions;

drop trigger platform_admins_keep_one on private.platform_admins;

create or replace function private.platform_admins_keep_one()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from deleted_rows)
     and not exists (select 1 from private.platform_admins) then
    raise exception 'last_platform_admin' using errcode = '23514';
  end if;
  return null;
end;
$$;

revoke all on function private.platform_admins_keep_one() from public;

create trigger platform_admins_keep_one
  after delete on private.platform_admins
  referencing old table as deleted_rows
  for each statement
  execute function private.platform_admins_keep_one();
