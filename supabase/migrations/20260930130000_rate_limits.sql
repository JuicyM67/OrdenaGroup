-- WP-27 · Pilotblockerare (säkerhetskontroll) · Rate limiting utan extern tjänst
-- F#: F1 (inloggning), F5 (publik bokning), F8-liknande (kundens egen länk,
-- `/r/[token]`). Ingen ny extern tjänst (D-030-andan: så lite infrastruktur
-- som möjligt) — bara en tabell + en funktion, körd i samma Postgres som
-- allt annat.
--
-- `private.rate_limits`: räknare i fasta tidsfönster ("fixed window
-- counter"), en rad per (nyckel, fönsterstart). Nyckeln är ALDRIG klartext
-- (regel 8/Ley 21.719, ingen persondata i databasen i onödan): anroparen
-- (src/server/db/rate-limit.ts) SHA-256-hashar IP/telefon/e-post innan den
-- skickas hit, och lägger på ett flödesspecifikt prefix ("booking:ip:…",
-- "login:email:…") — den här migrationen litar bara på att anroparen gör
-- det, samma ansvarsfördelning som `bookings.manage_token_hash`
-- (klartexten finns bara i länken, aldrig i databasen).
--
-- UNLOGGED: en rate-limiträknare är engångsdata utan krav på hållbarhet —
-- en omstart av databasen som nollställer räknarna öppnar bara fönstren på
-- nytt (ofarligt, i värsta fall tillåter den några extra försök), och
-- UNLOGGED slipper WAL-skrivningar för en tabell som uppdateras på varje
-- bokningsförsök/inloggning/avbokning.
create unlogged table private.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 1,
  constraint rate_limits_count_check check (count > 0),
  primary key (key, window_start)
);

comment on table private.rate_limits is
  'Fasta tidsfönster för private.hit_rate_limit(). Nyckeln (key) är en hash '
  '(sha256, med ett flödesprefix), aldrig klartext-IP/telefon/e-post. Ingen '
  'RLS-policy skapas (default deny för alla roller utom ägaren postgres) — '
  'ingen roll, inte ens service_role, får en direkt grant på tabellen; bara '
  'den SECURITY DEFINER-ägda private.hit_rate_limit() når den.';

-- INV-3-andan (RLS på varje tabell): ingen policy skapas nedan, så
-- `enable row level security` gör tabellen otillgänglig för alla roller
-- utom ägaren (postgres) — vilket redan är fallet via grants (ingen roll
-- har fått någon tabellrättighet), men den här raden är ett uttryckligt
-- försvar på djupet, konsekvent med resten av schemat.
alter table private.rate_limits enable row level security;

-- private.hit_rate_limit ---------------------------------------------------
-- Atomisk: `insert … on conflict … do update` tar ett radlås på
-- (key, window_start) i samma sats som räknar upp, så två samtidiga anrop
-- med samma nyckel i samma fönster räknas korrekt utan race. `p_window`
-- avgör både fönstrets bredd och dess position (fasta fönster, justerade
-- mot unix-epok 1970-01-01 00:00 UTC, INTE mot anropstillfället) — så att
-- alla anrop inom samma vägg-tidsfönster delar rad, oavsett när det första
-- anropet i fönstret skedde.
--
-- `true` = tillåten (räknaren är på eller under `p_max` EFTER den här
-- ökningen), `false` = blockerad.
create function private.hit_rate_limit(p_key text, p_window interval, p_max int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seconds double precision;
  v_window_start timestamptz;
  v_count integer;
begin
  if p_key is null or length(p_key) = 0 then
    raise exception 'private.hit_rate_limit: p_key krävs';
  end if;
  if p_max is null or p_max <= 0 then
    raise exception 'private.hit_rate_limit: p_max måste vara positivt';
  end if;
  v_seconds := extract(epoch from p_window);
  if p_window is null or v_seconds <= 0 then
    raise exception 'private.hit_rate_limit: p_window måste vara ett positivt intervall';
  end if;

  v_window_start :=
    to_timestamp(floor(extract(epoch from now()) / v_seconds) * v_seconds);

  insert into private.rate_limits as rl (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start)
  do update set count = rl.count + 1
  returning rl.count into v_count;

  -- Städning: bara rader för SAMMA nyckel och äldre än det aktuella
  -- fönstret (billigt — primärnyckeln indexerar redan `key`, ingen svep
  -- över hela tabellen). En nyckel som aldrig träffar funktionen igen
  -- lämnar kvar högst en rad för alltid, vilket är försumbart (en rad per
  -- unik hashad IP/telefon/e-post som någonsin träffat gränsen, inte en
  -- rad per försök) — inget separat cron-jobb behövs.
  delete from private.rate_limits
   where key = p_key
     and window_start < v_window_start;

  return v_count <= p_max;
end;
$$;

comment on function private.hit_rate_limit(text, interval, int) is
  'Atomisk räknare i fasta tidsfönster. Anropas av src/server/db/rate-limit.ts '
  '(service_role). true = tillåten, false = blockerad.';

revoke all on function private.hit_rate_limit(text, interval, int) from public;
grant execute on function private.hit_rate_limit(text, interval, int) to service_role;
