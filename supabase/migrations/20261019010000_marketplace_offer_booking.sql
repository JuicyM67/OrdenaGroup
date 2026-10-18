-- D-060 · `bookings.marketplace_offer_id`: bokning till erbjudandepris i CL.
--
-- I CL finns ingen onlinebetalning (Mercado Pago senare), så marknadsplatsens
-- erbjudanden säljs inte som värdebevis (D-057, bara SE). I stället bokar
-- kunden via erbjudandet (`/{slug}?oferta=<id>`) och betalar erbjudandepriset
-- i salongen. Servern (`src/server/bookings/create.ts`) validerar erbjudandet i
-- bokningens transaktion (publicerat, rätt företag och tjänst, inom
-- försäljningsfönstret, planen har `offers`) och sätter kolumnen samt
-- `discount_clp` = ordinarie pris − erbjudandepris. Kolumnen är bara en länk
-- för rapportering och för att kunna härleda rabattorsaken.
--
-- Sammansatt FK (D-014) mot `offers (business_id, id)`. Kolumn-listform på
-- `on delete set null` så att bara `marketplace_offer_id` nollas, aldrig
-- `business_id` (samma gotcha som flash_slot_id i 20261001150300).
alter table public.bookings
  add column marketplace_offer_id uuid,
  add constraint bookings_marketplace_offer_id_fkey
    foreign key (business_id, marketplace_offer_id)
    references public.offers (business_id, id)
    on delete set null (marketplace_offer_id);

create index bookings_marketplace_offer_id_idx
  on public.bookings (marketplace_offer_id)
  where marketplace_offer_id is not null;

-- Ingen ny kolumngrant krävs: `bookings` har en obegränsad tabellgrant till
-- `authenticated` (20260927100400), inte kolumnbegränsad (se 20261001150300).
