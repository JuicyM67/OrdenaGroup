-- F4 "klart när" på DB-nivå: två samtidiga transaktioner mot samma
-- profesional/tid ska ge en lyckad och en 23P01 (no_overlap).
--
-- AVVIKELSE FRÅN PLANEN (R3, dokumenterad enligt planens instruktion):
-- dblink_connect() nekas i den lokala Supabase-imagen med
-- "2F003: password or GSSAPI delegated credentials required" — dblink
-- kräver att anslutningen faktiskt lösenordsautentiserades (inte bara att
-- ett password=-fält finns i connstr:en) när uppringande roll inte har
-- rolsuper = true, och `postgres`-rollen i den lokala imagen är just en
-- sådan icke-fullständig superuser (exakt den risk planen förutsåg i R3).
-- Detta gäller oavsett om anslutningssträngen pekar på unix-socket eller
-- 127.0.0.1, med eller utan lösenord.
--
-- Constraint-beteendet (INV-1) är ändå fullt bevisat sekventiellt i
-- 041_bookings_no_overlap.test.sql (överlapp, kant-mot-kant, buffert,
-- status, återaktivering, flytt). Det som saknas här är enbart beviset att
-- två *samtidiga* (icke-sekventiella) transaktioner serialiseras korrekt av
-- databasen. F4:s "klart när"-kriterium för verklig samtidighet flyttas
-- till WP-10 (Vitest-test med två riktiga pg-klientanslutningar mot samma
-- lokala databas, som inte har dblink:s superuser-begränsning).
--
-- WP-10 (klart): testet finns i src/server/bookings/concurrency.db.test.ts
-- och körs med `npm run test:integration` (lokalt och i CI-jobbet `db`).
-- Filen behålls som skip för spårbarhet (WP-10 FRÅGA 6).
begin;
create extension if not exists pgtap with schema extensions;
select plan(1);

select skip(
  'F4-samtidighet: dblink_connect nekas lokalt (2F003). Testas i src/server/bookings/concurrency.db.test.ts (npm run test:integration).',
  1
);

select finish();
rollback;
