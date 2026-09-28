-- WP-21b · granskningsfynd (krav före WP-21, se docs/tasks/IDEAS.md 2026-09-27) ·
-- Skärper `private.customers_guard_consent`
--
-- Två hål i triggern från 20260927100300_customers.sql:
-- 1. `authenticated` (ägaren) kunde sätta `consent_marketing_at` så länge
--    `consent_channel = 'manual'` — ägaren kan inte ge marknadsföringssamtycke
--    å kundens vägnar (bara kunden själv, via web/whatsapp). Den manuella
--    rutan i Agenda (WP-21b) gäller bara bekräftelser/påminnelser.
-- 2. `authenticated` kunde skriva över ett samtycke som redan kom från
--    `web`/`whatsapp` genom att sätta `consent_channel = 'manual'` i en
--    UPDATE — då försvinner beviset för kundens eget webbsamtycke.
--    Anonymisering (WP-26, allt samtycke nollas samtidigt) är fortfarande
--    tillåten, oavsett tidigare kanal.
--
-- `create or replace function`: samma funktionsnamn och trigger som innan,
-- ingen ny trigger behövs.
create or replace function private.customers_guard_consent()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.consent_channel is not null and new.consent_channel <> 'manual' then
      raise exception 'authenticated kan bara sätta consent_channel = manual' using errcode = '42501';
    end if;
    -- Ägaren kan aldrig ge marknadsföringssamtycke å kundens vägnar.
    if new.consent_marketing_at is not null then
      raise exception 'authenticated kan inte sätta consent_marketing_at' using errcode = '42501';
    end if;
    return new;
  end if;

  -- UPDATE: ägaren kan aldrig SÄTTA (ändra till ett nytt värde) marknadsföringssamtycket,
  -- oavsett kanal. Kontrolleras separat från de andra samtyckesfälten nedan, eftersom den
  -- gäller även när bara consent_marketing_at ändras (inte terms/version/channel).
  if (new.consent_marketing_at is distinct from old.consent_marketing_at)
     and new.consent_marketing_at is not null then
    raise exception 'authenticated kan inte sätta consent_marketing_at' using errcode = '42501';
  end if;

  -- Bara bry sig om raden faktiskt försöker ändra ett samtyckesfält. Det vanliga fallet
  -- (ändra notes/namn/telefon utan att röra samtycket) ska aldrig nå längre än hit.
  if (new.consent_terms_at is distinct from old.consent_terms_at)
     or (new.consent_marketing_at is distinct from old.consent_marketing_at)
     or (new.consent_version is distinct from old.consent_version)
     or (new.consent_channel is distinct from old.consent_channel) then

    -- Tillåtet: anonymisering (WP-26) nollar allt samtycke, oavsett tidigare kanal.
    if new.anonymized_at is not null
       and new.consent_terms_at is null
       and new.consent_marketing_at is null
       and new.consent_version is null
       and new.consent_channel is null then
      return new;
    end if;

    -- Ägaren får aldrig skriva över ett samtycke som redan kommer från kunden själv
    -- (web/whatsapp) — det skulle radera beviset för det riktiga samtycket.
    if old.consent_channel in ('web', 'whatsapp') then
      raise exception 'authenticated kan inte skriva över samtycke från web eller whatsapp' using errcode = '42501';
    end if;

    -- Tillåtet: ägaren sätter/ändrar samtycke via 'manual' (hon la in det själv,
    -- eller kunden gav det muntligt/via telefon) på en rad utan web/whatsapp-samtycke.
    if new.consent_channel = 'manual' then
      return new;
    end if;

    raise exception 'authenticated kan bara ändra consent_* via consent_channel = manual eller vid anonymisering' using errcode = '42501';
  end if;

  return new;
end;
$$;
