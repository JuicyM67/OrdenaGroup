-- WP-20 · granskningsfynd (blockerande) · Idempotens för kundens bokning
--
-- `idempotencyKey` valideras redan i formuläret/motorns schema men användes
-- aldrig: ett omförsök efter ett tappat svar (t.ex. nätverksfel efter att
-- servern redan committat) kunde skapa en andra bekräftad bokning — med
-- "Cualquiera" hos en annan profesional än den kunden faktiskt fick första
-- gången. Kolumnen är nullable (ägarens manuella bokningar och äldre/andra
-- källor har ingen nyckel) och det partiella unika indexet gäller bara när
-- den är satt, precis som `payments_method_provider_ref_uidx`
-- (20260927100400_bookings_payments.sql).
alter table public.bookings
  add column idempotency_key uuid;

create unique index bookings_business_id_idempotency_key_uidx
  on public.bookings (business_id, idempotency_key)
  where idempotency_key is not null;
