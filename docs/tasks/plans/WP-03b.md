# WP-03b · Texter v2

Branch: `wp/WP-03b-texter-v2` · Status: **klar 2026-09-27** · Beror på: WP-03 (☑), WP-04 (☑, felkoderna), WP-01 (☑, kolumner och enum-värden) · Körs samtidigt som: WP-10 (scheduling, `src/server/scheduling/` m.fl.), WP-11–14 (ui, `src/components/`, `src/app/**`), utan överlappande filer (se §3 om `es-CL.ts`).

---

## 1. Mål

Leverera all text som ägarens egna ytor och handpenningen behöver, på chilensk spanska (tú), i `src/i18n/es-CL.ts` enligt D-016. Det gäller inloggning, kontoskapande och onboarding i fyra steg, formulären för tjänster, personal, öppettider och blockeringar, Clientes, Caja, Ajustes, handpenning via Mercado Pago, plus felkoderna från `src/lib/format/` (företagets telefon inklusive `invalid_prefix`, clp, rut, date och time). Paketet ger inga funktioner själv, men det är en förutsättning för att följande "klart när"-kriterier ska kunna uppfyllas:
- **F1:** ett nytt företag har en fungerande bokningslänk på under 10 minuter.
- **F2:** tjänsterna visas på bokningssidan i vald ordning.
- **F3:** tillgängligheten respekterar alla lager (företag ∩ personal − frånvaro − bokningar − buffertar). För texten betyder det att ägaren förstår vad varje lager gör när hen fyller i det.
- **F9:** ägaren ser allt om en kund från bokningskortet.
- **F10:** summorna stämmer med bokningarna.
- **F11:** pengarna hamnar på företagets konto och bokningen syns som "Abono pagado".

**Klart när** varje synligt tillstånd på de ytorna har en sträng (normalfall, tomt läge, fel, bekräftelse och laddning), varje felkod som WP-04:s scheman kan ge för de fält ägaren fyller i har en text med samma nyckel som koden, och varje enum-värde i DB som visas för ägaren (`payment_method`, `payment_status`, `payment_kind`, `deposit_kind`, `time_off_kind`, `waitlist_mode`, `consent_channel`) har en etikett. Det finns ingen `.dc.html`-referens för dessa skärmar, så design-paritet ersätts av kontrakt mot koder och enum-värden (se §5 och R1).

BACKLOG anger F1–F3, F10 och F11 för WP-03b. Clientes (F9) ingår enligt uppdraget. Planner rättar F#-kolumnen efter godkännande (FRÅGA 1).

## 2. Utanför scope

- **Komponenter och skärmar.** WP-03b rör ingen `.tsx`. WP-15, WP-21, WP-24 och WP-25 skickar in strängarna.
- **Inloggning med WhatsApp-kod** och mallen `codigo_acceso` (kategori AUTHENTICATION). `SUPABASE_CONFIG` säger "WhatsApp-kod kommer senare", mallnamnen i INTEGRATIONS §1 är fasta och `whatsapp.test.ts` kräver exakt sex mallar. Idén ligger kvar i IDEAS (WP-15/16). Se FRÅGA 2.
- **Nya WhatsApp-mallar**, även en variant av `reserva_confirmada` med handpenning. Se FRÅGA 5.
- **Export och radering** av kunddata från Clientes och `r/[token]` (F12, WP-26, text från jurist). Clientes får bara en platshållarrad om att funktionen kommer, om WP-21 vill ha den (se steg 5).
- **Abonnemang, planer, provperiod, frysning och kvoter** (F17, WP-34). Texten för ett fryst företag på bokningssidan finns redan (`reserva.vacios.negocioNoDisponible`).
- **Logotyp och accentfärg** (`businesses.logo_url`, `accent_color`). Inget F# i fas 1 kräver dem.
- **Byte av e-postadress och lösenord** för ägarkontot. Magisk länk kräver inget lösenord, och e-postbyte är inte med i F1.
- **Profesionalens egen inloggning och säljarvyn** (F18). Onboardingtexten är neutral ("tu negocio"), så att en förmedlare kan fylla i den åt ägaren utan särskilda strängar.
- **Informes** utöver summorna i F10 (grafer, jämförelser, export till Excel).
- **Förinställda tjänster per bransch** (t.ex. "Corte de pelo 30 min $10.000"). Det är en produktfunktion och läggs i IDEAS. Här skrivs bara platshållare.
- **Kommunlistan.** Den är data, inte copy (FRÅGA 8).
- **Tidszonsval.** D-011 tillåter bara `America/Santiago`, så `tz.*`-koderna och `instant.*` visas aldrig för ägaren. UI faller tillbaka på `comun.algoSalioMal`.
- **Ändringar i `src/config/**`, `docs/tech/**`, `docs/legal/**`, `supabase/**`, BACKLOG, IDEAS, DECISIONS och CLAUDE.md.** Supabase Auth-mallarna i `supabase/templates/` ägs av WP-15 (FRÅGA 3).

## 3. Ägare

| Agent | Steg | Får röra |
|---|---|---|
| `copywriter-es-cl` (huvudägare) | 1–8 | `src/i18n/es-CL.ts` (nya exporter, se nedan), `src/i18n/es-CL.v2.test.ts` (ny), `src/i18n/test-helpers.ts` (ny), `src/i18n/es-CL.test.ts` (bara import av hjälpfunktionerna och, om FRÅGA 4 godkänns, en ny rad i `HASHES`), `docs/content/` (`GUIA_DE_ESTILO.md`, `README.md`, `email-templates.md`) |
| `planner` | 9 | `docs/tasks/` (efter godkännande, inte i den här körningen) |
| `qa-reviewer` | granskning | – |
| `security-reviewer` | granskning av samtyckestexterna (manuellt samtycke, handpenningens villkor), hjälptexten om neutrala tjänstenamn och anteckningsfälten (Ley 21.719) | – |

**Inga överlapp.** WP-10 äger `src/server/scheduling/`, `src/server/bookings/` och `src/server/waitlist/`. WP-11–14 äger `src/components/` och `src/app/**`. Ingen av dem skriver i `src/i18n/`.

**Enda delade filen är `es-CL.ts`.** Under WP-11–14 kan ui-engineer be copywriter rätta en befintlig sträng. För att undvika konflikter gäller:
- WP-03b lägger **bara till nya exporter i slutet** av filen: `validacion`, `acceso`, `onboarding`, `negocio`, `servicios`, `profesionales`, `horarios`, `clientes`, `caja`, `ajustes` och `abono`.
- Befintliga exporter ändras bara på tre ställen: filhuvudets kommentar om scope, en ny nyckel sist i `estados` (`pendientePago`) och, om FRÅGA 4 godkänns, `reserva.consentimientos.version`.
- Rättelser åt WP-11–14 görs i egna små PR:er från `main`, inte på den här branchen.

**Befintliga filer som inte får ändras:** `src/config/**`, `src/lib/**`, `src/types/**`, `src/app/**`, `src/components/**`, `src/styles/**`, `supabase/**`, `docs/design/**`, `docs/tech/**`, `docs/legal/**`, `docs/tasks/BACKLOG.md`, `docs/tasks/IDEAS.md`, `docs/decisions/DECISIONS.md`, `CLAUDE.md`, `package.json`, `src/i18n/whatsapp.test.ts`, `docs/content/whatsapp-templates.md`. Inga nya paket.

## 4. Steg

PR-förslag, i den ordning som låser upp flest WP:
- **PR A** = steg 1–3. Validering, inloggning, onboarding och katalogformulären. Låser upp WP-15.
- **PR B** = steg 4–5. Ajustes (utom Mercado Pago), Clientes och Caja. Låser upp WP-21 och WP-24.
- **PR C** = steg 6–8. Handpenningen (Ajustes-sektionen för Mercado Pago, Reserva, `r/[token]`, e-post), eventuellt ny samtyckesversion, stilguiden och README. Låser upp WP-25.

### Principer (gäller alla steg)

- **Samma mönster som WP-03 och D-016.** Namngivna exporter per område, `as const satisfies Trad`, ASCII-nycklar på spanska i camelCase, funktioner med ett namngivet parameterobjekt, belopp, datum, tider och telefon som färdigformaterade `string` från WP-04, och tal som `number` som böjs i funktionen.
- **Koder och enum-värden är nycklar.** Där texten motsvarar en felkod eller ett DB-enum är nyckeln exakt koden i snake_case (`invalid_prefix`, `card_terminal`, `lunch`), som i `errores.reserva`. Då kan WP-15/21/24/25 skriva `satisfies Record<Kod, string>` utan att översätta namn.
- **Bundeln för kundsidan.** Ägarens texter och valideringen läggs i egna exporter, aldrig i `errores` eller `reserva`, så att `/[slug]` inte får med dem. Handpenningens kundtexter ligger i `abono.reserva` och `abono.gestion`, som bara laddas när tjänsten har handpenning.
- **Två perspektiv på telefon.** `errores.reserva.telefono` (WP-03) talar till kunden ("Escribe tu número"). När ägaren skriver in en kunds nummer (Clientes, manuell bokning) eller företagets eget nummer behövs andra formuleringar. Därför finns `validacion.telefonoCliente` och `validacion.telefonoNegocio`.
- **Inga fixture-namn.** Platshållare använder generiska exempel som inte står i `NOMBRES_FIXTURE` (t.ex. inte "Corte clásico" eller "Barbería Norte").
- **Varumärket** interpoleras via `brand.name` där produkten måste nämnas (t.ex. i inloggningsmejlet). Ordet "llena" skrivs aldrig.

### Steg 1: Testinfrastruktur och `validacion` (felkoder från WP-04)
- Skapa `src/i18n/test-helpers.ts` med de hjälpfunktioner som i dag ligger i `es-CL.test.ts`: `paraCadaHoja`, tonreglerna, varumärkesmönstret, `PATRON_RESTO_ROTO` och `NOMBRES_FIXTURE`. `es-CL.test.ts` importerar dem i stället. Det är en ren refaktorering, och antalet tester och deras utfall är desamma före och efter.
- Skapa `src/i18n/es-CL.v2.test.ts` med samma testfamiljer som WP-03 för de nya exporterna (§5).
- `validacion` i `es-CL.ts`. Nycklarna är koderna efter prefixet i `schemas.ts` (`clp.out_of_range` → `validacion.clp.out_of_range`):
  - `clp`: `empty`, `invalid_format` ("usa solo números, sin decimales"), `out_of_range` och `invalid_type`.
  - `rut`: `empty`, `invalid_format`, `invalid_check_digit` ("revisa el dígito verificador") och `out_of_range`. Inget fält använder RUT i fas 1. Texterna skrivs ändå, eftersom schemat finns och de fyra strängarna är billiga. Etiketten för fältet väntar till F17.
  - `date`: `invalid_format`, `invalid_date` och `invalid_type`.
  - `time`: `invalid_format`, `out_of_range` och `invalid_type`. `out_of_range` ska fungera både för "25:00" och för "24:00" i ett fält som inte godkänner slut på dygnet.
  - `horaLocal`: `nonexistent_local_time` ("esa hora no existe ese día por el cambio de hora") och `ambiguous_local_time` ("esa hora se repite ese día"). Används av `fromLocalStrict` när ägaren blockerar tid på ett sommartidsdygn.
  - `telefonoNegocio`: alla sex `PhoneError` plus `invalid_type` och `invalid_format` (från `e164Schema`). Mobil eller fast nummer godtas. `invalid_prefix` förklarar att numret ska börja med 9 (celular) eller ett riktnummer (fijo). `not_mobile` kan inte uppstå i läget `mobile_or_fixed`, men nyckeln finns ändå så att `Record<PhoneError, string>` håller.
  - `telefonoCliente`: samma sex koder, formulerade för ägaren som skriver in en kunds celular ("Escribe el celular del cliente").
  - `email`: `invalid` (ägarens e-post vid inloggning och kundens valfria e-post i Clientes). Samma regel som `customers_email_format`.
  - `requerido` (generiskt "Completa este campo.") och `numeroEntero({ min, max })`, för heltalsfält som minuter och dagar.

### Steg 2: `acceso` (inloggning och konto, F1)
Rekommenderad metod i v1: magisk länk plus en sexsiffrig kod i samma mejl (Supabase OTP), men ingen WhatsApp-kod (FRÅGA 2).
- **Inloggningssidan:** rubrik, e-postfält, CTA ("Enviarme el link"), en rad om att det inte finns något lösenord, och en rad om att kontot skapas om e-posten är ny. Det finns ett gemensamt flöde för registrering och inloggning.
- **Skickat:** "Revisa tu correo" med `enviadoA({ email })`, kodinmatning ("o escribe el código de 6 dígitos"), `reenviarEn({ segundos })`, "Reenviar" och "Usar otro correo".
- **Fel** (nycklar = Supabase Auth-koder när sådana finns, WP-15 bekräftar listan): ogiltig e-post, `otp_expired` (länken eller koden gick ut), fel kod, `over_email_send_rate_limit` ("espera un minuto"), länk öppnad i en annan webbläsare (PKCE, vanligt när länken öppnas i WhatsApps inbyggda webbläsare: "abre el link en el mismo navegador o usa el código"), captcha misslyckades (Turnstile, SUPABASE_CONFIG), sessionen gick ut och nätverksfel.
- **Utloggning:** "Cerrar sesión" finns redan i `nav`. Här läggs bara bekräftelsen efter utloggning till.
- **Mejlet (Supabase Auth):** ämne och brödtext för `magic_link` och `confirmation` (registrering när `enable_confirmations` är på i prod). Texten finns både i `email.acceso` (nytt, se nedan) och i `docs/content/email-templates.md`, med Supabase-variablerna ordagrant (`{{ .ConfirmationURL }}`, `{{ .Token }}`). WP-15 kopierar texten till `supabase/templates/` och lägger till ett synktest (FRÅGA 3). Mejlet nämner `brand.name` som avsändare. Det innehåller giltighetstiden ("vence en 15 minutos", `otp_expiry = 900`) och en rad om att ignorera mejlet om man inte bett om det.
  - `email.acceso` läggs som en ny nyckel i den befintliga exporten `email`. Det är ett undantag från regeln om nya exporter, eftersom all e-post ska ligga på ett ställe. Ändringen görs sist i objektet.

### Steg 3: Onboarding och katalogformulär (F1, F2, F3)
- `negocio` (företagsprofil, används i onboardingens första skärm och i Ajustes):
  - Etiketter, platshållare och hjälptexter för `name`, `comuna`, `category`, `phone` ("teléfono del negocio, celular o fijo", med förklaring att kunderna ser det när de inte kan ändra sin hora) och `address` (valfri).
  - `rubros`: etiketter per bransch. Nycklarna är de värden som sparas i `businesses.category` (FRÅGA 8).
  - Slug: `slug` genereras från namnet vid `create_business()` och kan ändras i steg 4 och i Ajustes. Texterna är fältetikett, förhandsvisning `link({ url })` och felen `slug_taken`, `slug_reserved` och `slug_invalid` (3–40 tecken, a–z, 0–9 och bindestreck, enligt `businesses_slug_format` och `businesses_slug_not_reserved`). Nycklarna är förslag som WP-15 inför som koder.
- `onboarding`:
  - Välkomst ("Configura tu agenda en 4 pasos, toma menos de 10 minutos"), `paso({ n, total })` ("Paso 2 de 4") och stegnamnen "Servicios", "Equipo", "Horario" och "Tu link".
  - Navigering: "Continuar", "Volver", "Saltar este paso" och "Lo hago después". Varje steg går att hoppa över (F1), och den som hoppar över får se var steget finns i Ajustes.
  - En introduktionsmening per steg, max 120 tecken (§5).
  - Steg 4: "Tu link está listo", `link({ url })`, "Copiar link", "Copiado", "Compartir por WhatsApp", "Ver mi página" och "Ir a mi agenda". Delningstexten `mensajeCompartir({ negocio, url })` skickas via telefonens delningsfunktion (`wa.me`/Web Share) från ägarens egen telefon. Det är inte ett utgående meddelande från plattformen, så hård regel 4 (`message_outbox`) gäller inte.
  - Checklista i Inicio för ett nytt företag: "Completa tu configuración", `pasosPendientes({ n })` och en rad per steg som inte är gjort.
  - Tomt läge: företaget har hoppat över tjänster, så bokningssidan visar `reserva.vacios.sinServicios`. Ägaren får en varning: "Tu página no recibe reservas hasta que agregues un servicio."
- `servicios` (formuläret i onboardingens steg 1 och i Ajustes, samma nycklar):
  - Fält: `name`, `duration_min`, `price_clp`, `buffer_after_min` ("Tiempo extra después", med hjälptext "para limpiar o preparar, el cliente no lo ve"), `category` (valfri), profesionales som utför tjänsten, synlighet ("Mostrar en la página de reservas") och sortering (`aria-label` "Subir"/"Bajar", F2).
  - **Neutrala tjänstenamn (GUIA §9):** hjälptext under namnfältet som alltid syns ("El nombre llega al cliente por WhatsApp y correo. Usa un nombre general, sin datos de salud."). För branscherna kinesiología och estética visas en utökad text. Samma nyckel används i onboarding och Ajustes. Det finns ingen automatisk ordfiltrering i v1 (FRÅGA 11).
  - Handpenningsfälten (`deposit_kind`, `deposit_value`) skrivs i steg 6 men visas i samma formulär.
  - Fel: tomt namn, `duration_min` ≤ 0, pris (`validacion.clp`), buffert < 0, och `service_in_use` när en tjänst med bokningar ska raderas ("desactívala en vez de borrarla"). Bokningar pekar på tjänsten utan kaskad, så raderingen stoppas av databasen.
  - Tomt läge och `n` tjänster (`servicios.contador({ n })`).
- `profesionales`:
  - Fält: `name`, färg, tjänster, schema ("Igual que el negocio" / "Horario propio") och aktiv/inaktiv.
  - `colores`: namn på de sex färgerna för `aria-label` och skärmläsare. Nycklarna är `staff-1` … `staff-6`, som i `staff.color` och tokens (lavanda, celeste, lila, durazno, menta, lima). Copywriter bekräftar nyanserna mot `tokens.css`.
  - Hjälptext: ett eget schema kan bara göra tiderna snävare än företagets, aldrig bredare (F3, `staff_hours`). Varningstext när ägaren anger tider utanför företagets. Databasen stoppar inte det (R6 i WP-01), men motorn ignorerar det.
  - Fel: tomt namn, och `staff_has_future_bookings` vid inaktivering eller radering ("tiene {n} reservas próximas, muévelas o cancélalas primero").
  - Tomt läge ("Agrega a las personas que atienden. Si trabajas solo, agrégate a ti.").
- `horarios`:
  - Öppettider per veckodag. Dagnamnen kommer från WP-04 (`calendar-es-CL.ts`). Texterna är "Abierto"/"Cerrado", "Agregar horario" (flera intervall per dag), "Quitar horario", "Copiar a todos los días" och `intervalos({ rangos })` ("10:00–14:00 y 15:00–19:00", med spansk listkonjunktion för 1, 2 och 3 intervall).
  - Fel: start ≥ slut (`business_hours_start_before_end`), överlappande intervall samma dag (`business_hours_no_overlap`, 23P01) och `validacion.time`. "24:00" är tillåtet som slut, eftersom `localEndTimeSchema` godkänner det.
  - **Blockeringar och frånvaro (`time_off`):** etiketter för `time_off_kind` (`block`, `lunch`, `vacation`, `holiday`), hela företaget eller en profesional, från–till, anteckning och `validacion.horaLocal` för sommartidsdygn. Anteckningsfältet har en hjälptext om att inte skriva skälet till frånvaron ("no anotes datos de salud"). En sjukskrivning är en hälsouppgift (Ley 21.719, minimering).
  - Konflikt: en blockering som krockar med befintliga bokningar ger `time_off_overlaps_bookings({ n })`, med ett förslag om att flytta dem.
- **PR A öppnas.** Meddela ui-engineer att WP-15 kan börja, när WP-01 och WP-02 också är klara.

### Steg 4: `ajustes` (utom Mercado Pago)
- Sektionsrubriker: "Tu negocio", "Tu link de reservas", "Reglas de reserva", "Servicios", "Equipo", "Horario", "Mercado Pago" (text i steg 6) och "Cuenta". Titeln på skärmen är `nav.ajustes` och återanvänds, den kopieras inte (§5).
- **Reglas de reserva**, en etikett och en hjälptext per kolumn:
  - `min_notice_minutes` ("Anticipación mínima").
  - `max_days_ahead` ("Reservas con hasta {n} días de anticipación", 1–365).
  - `cancel_window_hours` ("Plazo para cancelar o cambiar"). Hjälptexten förklarar att siffran visas för kunden före bekräftelsen och i WhatsApp-bekräftelsen (COMPLIANCE, SERNAC).
  - `slot_interval_minutes` ("Cada cuánto se ofrecen horas", värdena 5/10/15/20/30/60 formateras av WP-04).
- `waitlist_mode`: `sequential` ("Uno por uno, en orden") och `broadcast` ("A todos a la vez"), med en mening var om vad kunden får.
- Slug-byte: en varning om att den gamla länken slutar fungera och att redan skickade WhatsApp-mallar med knappen "Reservar de nuevo" pekar på den gamla adressen.
- Allmänt: "Guardar cambios", "Cambios guardados", "Tienes cambios sin guardar" (lämna sidan / "Seguir editando") och ett fel vid samtidig ändring ("alguien más cambió esto, recarga para ver la última versión").
- "Cuenta": inloggad som `sesionComo({ email })` och "Cerrar sesión" (återanvänds från `nav`).

### Steg 5: `clientes` (F9) och `caja` (F10)
- `clientes`:
  - **Lista:** titel `nav.clientes`, sökning ("Buscar por nombre o celular"), kolumnerna "Última visita", "Visitas" och "Inasistencias", tomt läge (inga kunder än) och inga träffar (`sinResultados({ busqueda })`).
  - **Kundkort** (öppnas från bokningskortet, F9 "klart när"): "Cliente desde {fecha}", `visitas({ n })`, `inasistencias({ n })` (n = 0, 1, 2), historik (statusarna återanvänds från `estados`), kommande bokningar, "Nueva reserva", "Llamar" och "Escribir por WhatsApp" (en `wa.me`-länk från ägarens telefon), samt "Ver ficha" från popovern i Agenda.
  - **Anteckningar:** hjälptext "Solo tu equipo las ve. No anotes datos de salud ni información sensible." (COMPLIANCE, minimering).
  - **Redigera och skapa kund:** `name`, `phone_e164` (`validacion.telefonoCliente`), `email` (valfri) och `customer_phone_taken` ("ya tienes un cliente con ese celular"). Texten gäller bara det egna företaget och avslöjar aldrig att numret finns hos ett annat företag.
  - **Samtycken, visning:** en rad per samtycke med datum och kanal. `consent_channel` får etiketter för `web` ("en tu página de reservas"), `whatsapp` och `manual` ("registrado por ti"). Visas också när kunden svarat BAJA och när samtycke saknas.
  - **Samtycken, manuellt (FRÅGA 10):** en ruta som aldrig är förkryssad, i manuell bokning och i ny kund: "El cliente aceptó recibir por WhatsApp la confirmación y los recordatorios de sus horas." Ägaren kan också registrera att kunden tackat nej till marknadsföring. Ägaren kan inte själv ge marknadsföringssamtycke i v1. Texterna är utkast och granskas av security-reviewer och juristen.
  - Anonymiserad kund: "Cliente anonimizado". Export och radering görs i WP-26.
- `caja`:
  - Titel `nav.caja`, perioder "Hoy", "Semana" och "Mes" (SegmentedControl ≤ 7 tecken), `periodo({ desde, hasta })` för veckan (samma mönster som `agenda.semana`).
  - Summor: "Cobrado", "Por cobrar", "Abonos por Mercado Pago" och `reservasCount({ n })`. En förklarande rad om vad som räknas: betalningar med status `approved` och `paid_at` inom perioden i `America/Santiago`, minus `refunded`. Så kan ägaren själv se att summorna stämmer (F10).
  - Fördelning per metod: `payment_method` får etiketterna `cash` "Efectivo", `card_terminal` "Débito o crédito", `transfer` "Transferencia" och `mercadopago` "Mercado Pago" (FRÅGA 7).
  - `payment_kind`: `deposit` "Abono", `balance` "Saldo" och `full` "Pago completo". `payment_status`: `pending`, `approved`, `rejected` och `refunded`.
  - **Markera som betald:** titel, belopp som föreslås (`aPagar({ precio, descuento, abono })`, där WP-24 räknar ut beloppet), val av metod, "Marcar como pagada" och bekräftelsen `pagadaCon({ metodo })`.
  - **Rättelse** (ingen radering, enligt payments RLS): "Anular pago" med en bekräftelsedialog som använder "Volver" och aldrig "Cancelar" (GUIA §5).
  - Handpenning via Mercado Pago är skrivskyddad: "Pagado por Mercado Pago, no se puede editar acá."
  - **Samtidighet:** `already_paid` ("esta reserva ya se marcó como pagada, recarga") när två enheter markerar samtidigt.
  - Tomma lägen: inga betalningar i perioden, och en dag utan bokningar.
  - "Cobrar" i Hoy (WP-03) öppnar samma dialog. Strängen finns redan.
- **PR B öppnas.**

### Steg 6: `abono` (F11, handpenning via Mercado Pago)
Texterna bygger på den regel som föreslås i **D-019 (förslag)** nedan. Blir svaret ett annat skrivs villkorstexterna om innan PR C.
- **`abono.ajustes` (koppla Mercado Pago):**
  - Förklaring: "El abono llega directo a tu cuenta de Mercado Pago. Nunca pasa por nosotros." (D-008).
  - "Conectar Mercado Pago", det kopplade läget `conectadaComo({ cuenta })`, och "Desconectar" med bekräftelse ("los servicios con abono dejarán de pedirlo hasta que vuelvas a conectar").
  - Fel: OAuth avbrutet, OAuth nekat, token utgånget ("vuelve a conectar"), och Mercado Pago svarar inte.
- **`abono.servicio`** (fält i tjänsteformuläret): `deposit_kind` med `none` "Sin abono", `fixed` "Monto fijo" och `percent` "Porcentaje del precio", `deposit_value` och en förhandsvisning `vistaPrevia({ monto })`, där WP-25 räknar ut beloppet (avrundningen enligt IDEAS `percentOfClp`). Fel: procent utanför 1–100, fast belopp > pris (`services_deposit_kind_value_check`) och `mp_not_connected` ("conecta Mercado Pago para pedir abono").
- **`abono.reserva`** (kundens flöde, `/[slug]`):
  - Etikett på tjänsten `requiereAbono({ monto })`.
  - Före bekräftelse: `explicacion({ monto, saldo })` ("paga {monto} ahora con Mercado Pago, el resto en el local") och villkoren `condiciones({ horas })` (se FRÅGA 4).
  - CTA "Pagar abono" (≤ 12 tecken, samma plats som BookingBar-CTA:n) och "Te llevamos a Mercado Pago…".
  - Tidsgräns: `tiempoParaPagar({ minutos })` ("tienes 15 min para pagar, después liberamos la hora").
  - **Retur från Mercado Pago:** godkänd ("Abono pagado, tu hora quedó confirmada"), väntar på webhook ("Estamos confirmando tu pago…" med automatisk uppdatering), avvisad ("el pago no se completó, puedes intentar de nuevo") och utgången ("se acabó el tiempo y la hora quedó libre").
  - **Sen betalning** (betalningen godkänd efter att bokningen gått ut, eftersom webhooken kom för sent): "Recibimos tu pago, pero la hora ya se había liberado. {negocio} te devolverá el abono."
- **`abono.gestion`** (`r/[token]`): raden "Abono pagado: {monto}", och vid avbokning inom eller utanför fönstret vad som händer med handpenningen enligt D-019.
- **`abono.dueno`:** statusen `estados.pendientePago` ("Esperando abono") läggs sist i `estados`. För Caja och Agenda finns "Abono por devolver" och `devolverEnMercadoPago` ("devuélvelo desde tu cuenta de Mercado Pago"), både vid sen betalning och vid avbokning inom fönstret.
- **E-post:** en ny valfri parameter i `email.reservaConfirmada.cuerpo` är inte tillåten utan att bryta typen. Därför läggs `email.abono.lineaConfirmacion({ monto, saldo, condiciones })` till, och WP-16/25 lägger raden i mejlet. Bekräftelsen med villkor uppfyller kravet på skriftlig bekräftelse (SERNAC). WhatsApp-mallen `reserva_confirmada` ändras inte (FRÅGA 5).

**D-019 (förslag) · Handpenning i v1: en fast regel, återbetalning görs av företaget.**
*Beslut:* handpenningen dras av från priset. Avbokar kunden inom avbokningsfönstret betalar företaget tillbaka handpenningen. Avbokar kunden utanför fönstret, eller kommer inte, behåller företaget den. En obetald bokning släpps efter 15 minuter. I v1 gör företaget återbetalningen själv i sitt Mercado Pago-konto, och systemet visar vad som ska betalas tillbaka ("Abono por devolver").
*Varför:* det ger en regel som kunden kan läsa före bekräftelsen (Ley 19.496), inga nya kolumner i `businesses` och inga pengar som plattformen rör (D-008).
*Konsekvens:* villkorstexten ingår i samtyckesversionen (FRÅGA 4), WP-25 bygger ingen automatisk återbetalning (den läggs i IDEAS), och juristen granskar texten (JURIST_FRAGOR 5). Numret justeras vid merge om ett annat WP hinner lägga in D-019 först.

### Steg 7: Samtyckesversion (om FRÅGA 4 godkänns)
- `abono.reserva.condiciones` och, om FRÅGA 10 godkänns, texten för manuellt samtycke påverkar vad kunden godkänner. Förslag:
  - `reserva.consentimientos.version` → `"2026-10-v2"`.
  - `textoConsentimiento()` i `es-CL.test.ts` utökas med `abono.reserva.condiciones({ horas: "{horas}" })`, och den nya hashen läggs i `HASHES`. Hashen för `2026-10-v1` ligger kvar, eftersom arkivet ska vara oföränderligt (GUIA §7).
  - Den manuella samtyckestexten får en egen konstant `clientes.consentimientoManual.version` med en egen hash i `es-CL.v2.test.ts`, eftersom den sparas med `consent_channel = 'manual'`.
- Inga riktiga kunder har godkänt v1 (piloten, WP-27, är inte startad), så en höjning kostar ingenting. security-reviewer granskar.

### Steg 8: Stilguide, README och slutkontroll
- `GUIA_DE_ESTILO.md`:
  - Nya ord i ordlistan: *abono* / *saldo*, *cobrar*/*cobrado*, *anular pago* (inte "cancelar pago"), *equipo* (stegnamnet) mot *profesional* (en person), *link de reservas*, *rubro*.
  - §8 utökas med `validacion` och de två perspektiven på telefon.
  - §9 hänvisar till nyckeln för hjälptexten om tjänstenamn.
  - En ny punkt om anteckningsfält (inga hälsouppgifter).
- `README.md`: de nya områdena i tabellen och listan i "Cómo se agrega un texto nuevo". Filhuvudet i `es-CL.ts` uppdateras.
- `email-templates.md`: avsnitten "Acceso" (Supabase) och "Abono".
- Samla nya frågor till juristen i PR-beskrivningen (se R8). Planner för in dem i `JURIST_FRAGOR.md` efter godkännande.

### Steg 9: Status (planner)
- BACKLOG: WP-03b ◐ när planen är godkänd och ☑ när PR C är mergad. F#-kolumnen blir F1–F3, F9–F11. **Görs inte i den här körningen.**
- DECISIONS: D-019 om det godkänns. IDEAS: idéerna nedan.

## 5. Tester

**Enhet (Vitest, `src/i18n/es-CL.v2.test.ts`, samma familjer som WP-03)**
- **Struktur:** varje löv i `validacion`, `acceso`, `onboarding`, `negocio`, `servicios`, `profesionales`, `horarios`, `clientes`, `caja`, `ajustes` och `abono` är en icke-tom sträng eller en funktion. Varje funktion anropas med en utökad `MUESTRA_GENERICA` (nya parametrar som `email`, `segundos`, `url`, `saldo`, `cuenta`, `rangos`, `busqueda`, `metodo` och `total`) och ger ingen `undefined`, `NaN`, `null`, `[object` eller kvarglömd `{`/`{{`.
- **Typsäkerhet (`npm run typecheck`):** `@ts-expect-error` på en nyckel som inte finns (`caja.noExiste`) och på ett anrop där en parameter saknas (`abono.reserva.explicacion({ monto })`).
- **Kontrakt mot felkoderna (typnivå):** testet importerar typerna med `import type` från `@/lib/format/*` (bara typer, `es-CL.ts` importerar fortfarande inget därifrån) och kräver:
  - `validacion.telefonoNegocio` och `validacion.telefonoCliente` `satisfies Record<PhoneError | "invalid_type" | "invalid_format", string>`.
  - `validacion.clp` `satisfies Record<ClpError | "invalid_type", string>` och `validacion.rut` `satisfies Record<RutError, string>`.
  - `validacion.date` och `validacion.time` mot felunionen från `parseLocalDate` och `parseLocalTime`, plus `invalid_type`.
  - `validacion.horaLocal` mot felunionen från `fromLocalStrict`.
  - Om WP-04 lägger till en kod misslyckas typecheck.
- **Kontrakt mot felkoderna (körtid):** för en tabell med felaktiga indata körs de riktiga schemana, bland annat `chileanPhoneInputSchema.safeParse("+56 1 2345 6789")` → `phone.invalid_prefix` och `"+56 60 123 4567"` → `phone.invalid_prefix`, `clpInputSchema` med "18.000,50", `rutInputSchema` med fel kontrollsiffra, `localEndTimeSchema` med "24:30" och `localTimeSchema` med "24:00". Testet kontrollerar att `message` delat på `.` ger en nyckel som finns i `validacion`. Importen av `src/lib/format/` görs bara i testet.
- **Kontrakt mot DB-enum:** `Constants.public.Enums` från `src/types/database.ts` (import i testet). Varje värde i `payment_method`, `payment_status`, `payment_kind`, `deposit_kind`, `time_off_kind`, `waitlist_mode` och `consent_channel` har en etikett, och det finns inga extra nycklar. `profesionales.colores` har exakt `staff-1` … `staff-6`.
- **Böjning:** `n = 0, 1, 2, 21` för `visitas`, `inasistencias`, `reservasCount`, `servicios.contador`, `pasosPendientes`, `staff_has_future_bookings` och `time_off_overlaps_bookings`. `intervalos` med 1, 2 och 3 rangos ("A", "A y B", "A, B y C").
- **Ton och varumärke:** samma svarta lista och samma varumärkeskontroll som WP-03 via `test-helpers.ts`, över alla nya strängar och funktionsresultat. `email.acceso` innehåller `brand.name` exakt en gång.
- **GUIA §5:** inget löv i de nya områdena är exakt "Cancelar". Dialoger i Caja använder "Volver".
- **Samma ordförråd:** `ajustes`, `clientes` och `caja` använder `nav.ajustes`, `nav.clientes` och `nav.caja` som titel (samma referens, ingen kopia). Stegnamnen i onboarding är lika med sektionsrubrikerna i Ajustes där de betyder samma sak.
- **Längder** (det finns ingen referens, så gränserna härleds ur WP-02-komponenterna och dokumenteras i testet): SegmentedControl ≤ 7 ("Hoy", "Semana", "Mes"), BookingBar-CTA ≤ 12 ("Pagar abono"), chip ≤ 22 (`estados.pendientePago`, etiketterna för metoderna), introduktionsmeningarna i onboarding ≤ 120 och knappar i mobilens bottenfält ≤ 16.
- **Fixture-namn:** testet för `NOMBRES_FIXTURE` gäller hela `es-CL.ts`, även de nya platshållarna.
- **Dataskydd:** hjälptexterna för tjänstens namn, kundens anteckningar och blockeringens anteckning nämner hälsouppgifter (`/salud/`). Den manuella samtyckestexten nämner WhatsApp och formuleras som något kunden har gjort (inte förkryssat, security-reviewer).
- **Samtyckesversion:** om FRÅGA 4 godkänns är hashen för `2026-10-v2` registrerad, och `2026-10-v1` ligger kvar i `HASHES`.

**Enhet (befintliga filer)**
- `es-CL.test.ts` är grönt och har lika många tester efter refaktoreringen i steg 1.
- `whatsapp.test.ts` ändras inte och är grönt (exakt sex mallar, FRÅGA 5).

**DB (pgTAP)**
- Inget. WP-03b skapar inga tabeller. Koderna `slug_taken`, `service_in_use`, `staff_has_future_bookings`, `customer_phone_taken`, `already_paid`, `time_off_overlaps_bookings` och `mp_not_connected` är förslag. Det WP som inför koden (WP-15, 21, 24 eller 25) testar den och lägger till `satisfies Record<Kod, string>` på sin sida.

**E2E och visuellt**
- Inget i WP-03b. Texterna syns först i WP-15, WP-21, WP-24 och WP-25. Manuell granskning i PR A: copywriter går igenom onboardingen högt, med klocka, som en barberare på mobilen. Varje skärm ska gå att förstå utan hjälp (F1 < 10 min).

**Kantfall som texterna måste klara**
- **Sommartid:**
  - `validacion.horaLocal` för blockeringar på september- och aprildygnet.
  - Caja-perioderna tar emot färdiga datum från WP-04 och räknar aldrig själva. En vecka eller en dag med 23 eller 25 timmar ger bara andra siffror, inte andra texter.
  - "24:00" som slut på öppettider godtas, men inte som start.
  - `abono.reserva.tiempoParaPagar` tar emot minuter från servern.
- **Samtidighet:**
  - `slug_taken` när två företag väljer samma slug samtidigt (unique-krock).
  - `already_paid` när två enheter markerar en bokning som betald.
  - Samtidig ändring i Ajustes.
  - Sen betalning från Mercado Pago efter att bokningen gått ut.
  - `slot_taken` under betalningen finns redan (en `pending_payment`-bokning håller tiden).
- **Tenant-isolering:**
  - `customer_phone_taken` säger bara "tus clientes".
  - Inga texter hårdkodar ett företag (fixture-testet).
  - Delningstexten och mejlen interpolerar bara det aktuella företaget.

## 6. Risker och öppna frågor

**Risker**
- **R1. Det finns ingen design för de här skärmarna.** Det finns bara referenser för Reserva, Main, Agenda, Hoy och HoraFlash. Hård regel 1 kan inte tillämpas, och det finns inget paritetstest. Längdgränserna i §5 är uppskattningar. Om designer senare ritar skärmarna (onboarding, Clientes, Caja, Ajustes) och använder andra ord gäller designen, och strängarna justeras i en liten följd-PR. Åtgärd: planner frågar om design ska tas fram före WP-15 (utanför det här paketet).
- **R2. Koder som inte finns än.** Många fel (`slug_taken`, `service_in_use`, `already_paid`, OAuth-fel, Supabase Auth-koder) definieras först i WP-15, 21, 24 och 25. Nycklarna här är förslag. Om ett WP väljer andra namn läggs nyckeln till eller byter namn i en liten PR. Åtgärd: listan över kodförslag står i PR-beskrivningen och skickas till respektive agent.
- **R3. Överlapp med WP-10:s felkoder.** WP-10 planeras parallellt och kan införa nya `BookingError` (t.ex. för `pending_payment` eller en inaktiv tjänst). De hör till `errores.reserva` och `errores.agenda` (WP-03-områden) och skrivs i en följd-PR när WP-10:s lista är klar, inte här.
- **R4. Mercado Pago i Caja strider mot RLS B1.** F10 nämner Mercado Pago som ett sätt att markera en bokning som betald manuellt, men `payments` förbjuder `authenticated` att skriva `method = 'mercadopago'`. Etiketten finns, men WP-24 måste välja lösning (FRÅGA 7).
- **R5. Handpenning och samtycke.** Villkoren för handpenningen är en del av det kunden godkänner. Om de ligger utanför hashen kan en ändring glida förbi utan ny version. Åtgärd: FRÅGA 4 (v2 med handpenningens villkor i hashen).
- **R6. Manuellt samtycke är juridiskt osäkert.** Metas opt-in och Ley 21.719 kräver att samtycket kan visas. Om ägaren kryssar i "aceptó" för en walk-in bygger samtycket på ägarens ord. Åtgärd: bara utility-opt-in manuellt, ingen marknadsföring (FRÅGA 10), och en fråga till juristen.
- **R7. Konflikter i `es-CL.ts`.** Filen är redan ungefär 950 rader och WP-11–14 kan begära rättelser samtidigt. Åtgärd: bara nya exporter i slutet (§3), och små separata PR:er för rättelser. Blir filen svår att hantera kan den delas i en senare PR med ett eget beslut. Det görs inte här, eftersom D-016 och CLAUDE.md anger `es-CL.ts`.
- **R8. Nya frågor till juristen.** De ska läggas till i `JURIST_FRAGOR.md` av människan eller planner:
  - Regeln för handpenningen (D-019) och texten "sin costo" när handpenning finns.
  - Manuellt samtycke från ägaren.
  - Hjälptexten om hälsouppgifter i anteckningar räcker som minimering, eller om fältet ska begränsas.
- **R9. Supabase Auth-mejl utanför `src/i18n/`.** Texten måste kopieras till `supabase/templates/` (WP-15). Utan ett synktest kan de glida isär. Åtgärd: FRÅGA 3.
- **R10. Scope creep i onboarding.** Förinställda tjänster, import av kunder från en annan app och QR-kod för länken ligger nära till hands men byggs inte. De läggs i IDEAS.

**Frågor till människan (med rekommendation)**
- **FRÅGA 1:** Scope för WP-03b: validering (clp, rut, date, time, företagets och kundens telefon, sommartid), inloggning med magisk länk och kod via e-post, konto och onboarding i fyra steg, formulären för tjänster, personal, öppettider och blockeringar, Ajustes, Clientes (F9), Caja (F10) och handpenning (F11). Utanför: WhatsApp-kod, nya mallar, export och radering (WP-26), abonnemang (F17). *Rekommendation:* ja. Planner lägger till F9 i BACKLOG-raden.
- **FRÅGA 2:** Inloggning i v1. *Rekommendation:* magisk länk plus en sexsiffrig kod i samma mejl, eftersom koden räddar fallet där länken öppnas i WhatsApps inbyggda webbläsare. WhatsApp-kod (`codigo_acceso`, AUTHENTICATION) väntar. Den kräver en Supabase-hook, en ändring i INTEGRATIONS och att Meta godkänner en mall vars text Meta själv bestämmer. F1 säger "magisk länk **eller** WhatsApp-kod", så en av dem räcker.
- **FRÅGA 3:** Supabase Auth-mejlen. *Rekommendation:* copywriter skriver texten i `email.acceso` och `email-templates.md`. WP-15 (db-engineer eller ui-engineer) kopierar den till `supabase/templates/*.html` och lägger till ett synktest av samma slag som `whatsapp.test.ts`.
- **FRÅGA 4:** Ska handpenningens villkor ingå i samtyckeshashen, med en höjning till `2026-10-v2`? *Rekommendation:* ja. Inga riktiga kunder har godkänt v1, och det kunden ser före bekräftelsen ska vara versionerat. v1 ligger kvar i arkivet.
- **FRÅGA 5:** Behövs en egen WhatsApp-mall för bekräftelse med handpenning (`reserva_confirmada_abono`)? *Rekommendation:* nej, inte i v1. Handpenningen och villkoren står i mejlet och i `r/[token]` (knappen "Ver mi reserva"), och mallnamnen och "exakt sex" behålls. Juristen avgör om det räcker för SERNAC (JURIST_FRAGOR 5). Blir svaret nej skrivs mallen i en följd-PR tillsammans med INTEGRATIONS.
- **FRÅGA 6:** Godkänner du **D-019 (förslag)** i steg 6: handpenningen dras av från priset och betalas tillbaka av företaget vid avbokning inom fönstret, men inte vid avbokning utanför fönstret eller när kunden inte kommer, med manuell återbetalning i v1? *Rekommendation:* ja. Automatisk återbetalning via Mercado Pagos API läggs i IDEAS (WP-25 eller fas 2).
- **FRÅGA 7:** Mercado Pago som manuell betalningsmetod i Caja, som krockar med RLS B1. *Rekommendation:* WP-24 (db-engineer) inför ett eget enum-värde för Mercado Pago som ägaren registrerar själv (QR eller länk i disken), utan `provider_ref`. Då skyddar B1 fortfarande webhookraderna. Copywriter lägger till etiketten när värdet finns. Alternativet är att dölja valet i v1.
- **FRÅGA 8:** Bransch- och kommunlistor. *Rekommendation:* en fast branschlista med nycklar som sparas i `businesses.category`: `barberia`, `peluqueria`, `estetica`, `unas`, `cejas_pestanas`, `masajes`, `kinesiologia`, `otro`. Etiketterna ligger i `negocio.rubros`. Kommunerna är data (Región Metropolitanas 52 kommuner, med rätt stavning som "Ñuñoa" och "Peñalolén") och ligger i `src/config/` eller `src/lib/` hos ui-engineer i WP-15, inte i i18n. Copywriter granskar stavningen i den PR:en.
- **FRÅGA 9:** Inget WP i BACKLOG bygger Ajustes-skärmen (profil, bokningsregler, väntelisteläge, konto). WP-15 bygger onboarding och WP-25 bara Mercado Pago-kopplingen. *Rekommendation:* lägg Ajustes i WP-15, eftersom formulären för tjänster, personal och öppettider är desamma, eller skapa ett WP-15b. Texterna skrivs i WP-03b oavsett.
- **FRÅGA 10:** Samtycke för kunder som ägaren lägger in själv (walk-in, telefonbokning). De ska få WhatsApp-bekräftelse, men har aldrig sett villkorsrutan. *Rekommendation:* en ruta som inte är förkryssad i manuell bokning och ny kund ("El cliente aceptó recibir por WhatsApp la confirmación y los recordatorios"), sparad med `consent_channel = 'manual'` och en egen version. Ägaren kan registrera avregistrering men inte ge marknadsföringssamtycke. Utan ikryssad ruta skickas ingen WhatsApp, bara e-post om kunden har en adress (WP-21/16). Frågan går till juristen.
- **FRÅGA 11:** Neutrala tjänstenamn (GUIA §9, JURIST_FRAGOR 4). *Rekommendation:* en hjälptext som alltid syns, plus en utökad text för kinesiología och estética. Inget automatiskt ordfilter i v1, eftersom det ger falska träffar och en känsla av övervakning. Filtret och en inställning för att dölja tjänsten i meddelanden finns redan i IDEAS eller läggs dit.

## 7. Klart när

- [ ] De nya exporterna `validacion`, `acceso`, `onboarding`, `negocio`, `servicios`, `profesionales`, `horarios`, `clientes`, `caja`, `ajustes` och `abono` finns sist i `es-CL.ts`, med typade nycklar och parametrar. `@ts-expect-error`-kontrollerna fungerar.
- [ ] Varje synligt tillstånd har en sträng (normalfall, tomt läge, fel, bekräftelse och laddning) i inloggningen, onboardingens fyra steg och checklistan, formulären för tjänster, personal, öppettider och blockeringar, Ajustes, Clientes (lista och kundkort), Caja (summor, markera betald, anullering) och handpenningen (Ajustes, tjänst, Reserva, retur från Mercado Pago, `r/[token]`, ägarens vy).
- [ ] Kontraktstesterna är gröna. Varje felkod från `phone` (båda lägena, inklusive `invalid_prefix`), `clp`, `rut`, `date`, `time` och `fromLocalStrict` har en text, både på typnivå och vid körning mot de riktiga schemana.
- [ ] Varje DB-enum som visas för ägaren har en etikett (testet mot `Constants`), och `profesionales.colores` täcker `staff-1` … `staff-6`.
- [ ] Hjälptexten om neutrala tjänstenamn finns under en nyckel och används i både onboarding och Ajustes. Anteckningsfälten för kund och blockering har en hjälptext om hälsouppgifter.
- [ ] `email.acceso` och avsnitten "Acceso" och "Abono" i `email-templates.md` finns, med Supabase-variablerna ordagrant och `brand.name` interpolerat.
- [ ] Om FRÅGA 4 och 10 godkänns: `consentimientos.version` är `2026-10-v2` med registrerad hash, v1-hashen ligger kvar, den manuella samtyckestexten har en egen version och hash, och security-reviewer har granskat.
- [ ] `es-CL.test.ts` och `whatsapp.test.ts` är gröna utan ändrat innehåll (utom `HASHES` och importen av hjälpfunktionerna).
- [ ] `GUIA_DE_ESTILO.md` (ordlista, §8, §9 och anteckningsfält) och `README.md` är uppdaterade.
- [ ] "llena" förekommer inte i `src/i18n/`, och `brand.test.ts` är grönt utan ändringar.
- [ ] `npm run typecheck && npm run lint && npm run format:check && npm run test` är gröna.
- [ ] `qa-reviewer` har godkänt mot F1–F3 och F9–F11. Listan över kodförslag (R2) och frågorna till juristen (R8) är överlämnade.
- [ ] BACKLOG: WP-03b ☑ efter merge av PR C. DECISIONS: D-019 om det godkänts. IDEAS: idéerna nedan förda.

## Idéer till IDEAS.md

| Datum | Idé | Från | Varför intressant | Förslag på fas |
|---|---|---|---|---|
| 2026-09-27 | Förinställda tjänster per bransch i onboarding (namn, tid, pris att justera) | planner (WP-03b) | Kortar F1 mot < 10 min | 1 (WP-15) eller 2 |
| 2026-09-27 | Automatisk återbetalning av handpenning via Mercado Pagos API med företagets token | planner (WP-03b) | Ägaren slipper göra det manuellt (D-019) | 2 (WP-25+) |
| 2026-09-27 | QR-kod för bokningslänken att skriva ut i lokalen | planner (WP-03b) | Fler bokningar från kunder som redan är på plats | 2 |
| 2026-09-27 | Ordfilter eller varning för kliniska termer i tjänstenamn | planner (WP-03b) | Stöder GUIA §9 utan att lita enbart på hjälptext | 2 |
| 2026-09-27 | Import av kundlista (CSV eller kontakter) vid onboarding | planner (WP-03b) | Ägare som byter från papper eller en annan app | 2 |
| 2026-09-27 | Synktest mellan `email.acceso` och `supabase/templates/*.html` | planner (WP-03b) | Mejlen för inloggning glider annars isär från copy | 1 (WP-15) |


## Svar (godkänt av ägaren 2026-09-27)

Ja till alla rekommendationer. Besluten har nya nummer på main: D-019 = pg i `src/server/db/` (WP-10), D-020 = fixture-routes stängda i produktion via `isDesignLabEnabled()` (öppna i staging med `DESIGN_LAB=1`), D-021 = `style` bara för geometri (WP-12), D-022 = handpenningsregel (WP-03b). Hänvisa till dessa nummer. Tillägg: en tidig PR med de nycklar som skärmarna saknar: `nav.notificacionesNuevas`, `calendario.diaConReservas`, `inicio.flashCard.vacio` (WP-11); `agenda.bloque.meta`, `agenda.bloque.aria`, `agenda.panel.minimoUnProfesional` (WP-12); `reserva.header.ubicacion`, dold text för full dag och flash-dag, `reserva.horaAria`, `reserva.vacios.eligeServicio`, `reserva.terminosListaEspera` (WP-13); samt WP-10:s felkoder `too_far`, `service_not_offered`, `not_found`, `invalid_status`, `outside_cancel_window`, `invalid_input`. Mercado Pago som manuell metod i Caja visas inte i v1 (D-022). Ajustes byggs i WP-15.

## Justeringar under genomförandet (2026-09-27)
- Tidig leverans (PR #15) med nycklar för WP-10–13; resten i den här PR:en.
- Samtycken: `2026-10-v2` (bokning inkl. handpenningsvillkor), `lista-espera-2026-10-v1` (väntelista, inkl. ansvarig och integritetslänk), `manual-2026-10-v1` (ägaren registrerar kund; bara transaktionella meddelanden). Literal-hashar i testerna.
- Handpenning: företaget, aldrig plattformen, betalar tillbaka (D-022); ombokning och företagets avbokning (D-023).
- `business_unavailable`, `too_soon`, `network` i `errores`; `reserva.terminosListaEspera` är `@deprecated` alias tills WP-13 bytt.
- För WP-11: `inicio.hero.destacado`, `calendario.diaConReservas({fecha})`.
- Utöver planens §3 har `es-CL.test.ts` fått nya tester (hashar, felkoder, e-postmallar) och `test-helpers.ts` bryter ut delade hjälpare.
