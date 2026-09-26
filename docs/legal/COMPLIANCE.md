# Juridik, skatt och dataskydd — krav på produkten

> Översikt för att styra bygget, inte juridisk rådgivning. Villkor och policy ska granskas av chilensk jurist innan lansering.

## Bolag och skatt
- **SpA** via *Tu Empresa en un Día*, *inicio de actividades* hos SII (giro: programvara/plattformstjänster).
- **IVA 19 %** på abonnemang. Vi utfärdar **factura electrónica** till företagen (via DTE-leverantör, t.ex. OpenFactura/Haulmer).
- **Vi säljer programvaran, inte tjänsten.** Det är salongen som ska ge boleta till slutkunden. Automatisk boleta åt kunderna är en senare funktion.

## Konsumentlagen (Ley 19.496, SERNAC)
- **Ångerrätt:** för tjänster köpta online, 10 dagar från köpet och innan tjänsten utförts, om inte leverantören tydligt angett annat innan köpet.
- **Skriftlig bekräftelse krävs**, annars förlängs ångerfristen till 90 dagar. → Varje bokning ger en bekräftelse (WhatsApp och/eller e-post) med villkor.
- **Avbokningspolicy** ställs in per företag och visas **före** bekräftelse och betalning, samt i bekräftelsen.
- Bokningssidan visar tydligt vem som säljer: *"Reserva gestionada por llena para Barbería Norte."*

## Dataskydd (Ley 21.719, gäller från 1 december 2026)
Gäller alla oavsett storlek. Pymes får varning i stället för böter vid första överträdelsen fram till 1 december 2027, men skyldigheterna gäller från dag ett. Maxböter 20 000 UTM.

**Produktkrav:**
- [ ] **Roller:** vi är *personuppgiftsbiträde* för företagens kunddata och *personuppgiftsansvariga* för ägarnas och förmedlarnas konton. Biträdesavtal i villkoren.
- [ ] **Minimering:** kund = namn + telefon (e-post valfri). Inga känsliga uppgifter i v1, alltså inga journaler eller hälsouppgifter.
- [ ] **Samtycke:** separata, aldrig förkryssade rutor. Villkor (obligatoriskt), marknadsföring (valfritt, krävs för horas flash och te echamos de menos). Lagra tidpunkt, text/version och kanal.
- [ ] **Rättigheter:** tillgång, rättelse, radering, invändning och portabilitet. Export (JSON) och anonymisering per kund, både från ägarens vy och via kundens personliga länk.
- [ ] **RAT:** register över behandlingar i `docs/legal/RAT.md` (skapas vid lansering).
- [ ] **Incidenter:** rutin för brott, med 72 h som riktmärke för anmälan. Logga åtkomst.
- [ ] **Överföring:** hosting i São Paulo (Supabase `sa-east-1`) och Metas servrar anges i integritetspolicyn.
- [ ] **Lagringstid:** kunder utan bokning på 24 månader anonymiseras automatiskt (konfigurerbart).
- [ ] **Säkerhet:** RLS på varje tabell, kryptering av tredjepartsnycklar, ingen persondata i loggar.

## WhatsApp
- Följ Metas Business- och Commerce-policyer. Marknadsföringsmallar kräver opt-in; kunden ska kunna avregistrera sig ("Responde BAJA para no recibir más ofertas").
