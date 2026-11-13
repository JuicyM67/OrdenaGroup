-- WP-91 (D-077), steg 2: anteckningar i fichan kan inte längre tas bort av
-- appens användare, bara annulleras (20261113030000). Koden i samma PR
-- använder bara annulleringen.
--
-- Anteckningar försvinner fortfarande när företaget själv anonymiserar
-- kunden (triggern `customers_purge_records`, security definer) och när
-- företaget raderas (kaskad). Båda är företagets egna beslut.

drop policy "delete customer_record_entries" on public.customer_record_entries;

revoke delete on public.customer_record_entries from authenticated;
