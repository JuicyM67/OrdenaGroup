-- WP-73 · Planspärrar (D-048) · steg 1: nytt planvärde `custom` ("Skräddarsytt"/
-- "A medida", offert). Egen migration: ett nytt enum-värde får inte användas i
-- samma transaktion som det läggs till.
alter type public.business_plan add value if not exists 'custom';
