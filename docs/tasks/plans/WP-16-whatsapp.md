# WP-16 (rest) · WhatsApp som kanal: klient, utkorg, webhook, knappsvar, samtycke

Fortsättning på `WP-16.md` (outbox + e-post är klart). Omfattar också WhatsApp-delarna av WP-20
(samtycke och bekräftelse i Reserva), WP-22 (knappsvaren *Confirmo / Necesito cambiar*) och WP-23
(väntelistans *Sí, la quiero / No, gracias*). Beslut: **D-063** (överst i `DECISIONS.md`).

## 1. Mål och "klart när" (MVP_SPEC)
- **F7** — "varje bokning ger bekräftelse inom 1 minut, och påminnelsen går ut 24 h innan (±5 min)".
  WhatsApp blir kanalen för kundens bokningsmeddelanden när det går; **e-post är reserven** när
  WhatsApp inte får/kan användas eller misslyckas ("E-post som reserv om WhatsApp misslyckas").
  Knapparna *Confirmo / Necesito cambiar* i påminnelsen fungerar.
- **F8** — "en avbokning fylls automatiskt utan att ägaren gör något": "först att trycka *Sí* får
  tiden; de andra får 'ya fue tomada'" — nu också direkt i WhatsApp.
- **F12** — samtycket till WhatsApp är aktivt, separat, aldrig förkryssat, loggat och kan återkallas
  (Ley 21.719, regel 7).

## 2. Utanför scope
Skarpa anrop mot Meta (inga nycklar finns) · inskick av mallar till Meta · sessionsmeddelanden
(`whatsappSesion`, fritext inom 24 h-fönstret) — knappsvaren ger effekt men inget automatiskt
textsvar i v1 · marknadsföringsmallar (`hora_flash`, `te_echamos_de_menos`) · BAJA/STOPP via
WhatsApp-text (avregistrering sker via kundlänken) · kvoter mot `usage_monthly` (WP-34) · mall för
"solicitud recibida" (förfrågningar går fortfarande via e-post) · eget nummer per företag (D-007).

## 3. Design

### 3.1 Klient (`src/server/messaging/whatsapp/`)
- `config.ts`: env (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`,
  `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_GRAPH_VERSION`, **`WHATSAPP_TEMPLATES_APPROVED`**,
  `WHATSAPP_FAKE`). `whatsappSendMode()` = `live` (token + nummer-id) / `fake` (`WHATSAPP_FAKE=1`,
  aldrig i Vercel production) / `off`.
- **En konfigurationspunkt för mallarna:** `WHATSAPP_TEMPLATES_APPROVED` = kommaseparerade
  Meta-namn (`recordatorio_24h,lista_espera_oferta,…`). Tom = WhatsApp används inte alls. Ägaren
  lägger till ett namn när Meta godkänt mallen. URL-mallarna (`reserva_confirmada`,
  `reserva_cancelada`, `reserva_movida`) är byggda men står inte i listan förrän domänen är
  bestämd och Meta godkänt dem (`dominioPendiente` i `es-CL.panel.ts`); tills dess går de som
  e-post.
- `templates.ts`: intern mall → Meta-namn + parametrar i exakt kontraktsordning
  (`docs/content/whatsapp-templates.md`, `plantillasWhatsapp`), språk `es`, knappar (URL-suffix =
  token/slug; quick reply med payload).
- `client.ts`: `POST https://graph.facebook.com/{ver}/{phone_number_id}/messages`. Fake-läget
  sparar i minnet (som e-postens fake), ingen persondata i loggar.
- `errors.ts`: **permanent** (ogiltigt nummer 131026/131009/100, mallen saknas/pausad/avstängd
  132000–132016, mottagaren inte på WhatsApp, behörighet/token 190/10/200, 4xx i övrigt) vs
  **tillfälligt** (rate limit 4/80007/130429/131048/131056, 131000/131016/133004, 5xx, nätverk).
- `signature.ts`: `X-Hub-Signature-256` = `sha256=` + HMAC-SHA256(rå body, app secret),
  konstant-tidsjämförelse.

### 3.2 Kanalval och reserv (utkorgen)
- Kundmeddelanden som kan gå på WhatsApp: `reservaConfirmada`, `recordatorio`, `reservaCancelada`,
  `reservaMovida`, `listaEsperaCupo`, `listaEsperaTomada`. Allt annat (förfrågningar, ägaren,
  inbjudan, kampanjer, recensioner) är oförändrat e-post.
- `chooseCustomerChannel` (ren funktion): **WhatsApp** om (1) kunden har ett aktivt
  WhatsApp-samtycke (senaste `consent_events` med `kind='whatsapp'` är `granted`), (2) chilenskt
  mobilnummer (`+569` + 8 siffror), (3) `whatsappSendMode() !== 'off'`, (4) mallen står i
  `WHATSAPP_TEMPLATES_APPROVED`. Annars **e-post** om kunden har e-post, annars inget.
- Beslutet tas **vid sändningen** (workern), inte bara vid köningen: samtycket sparas efter att
  bokningen committats (`saveBookingConsent`), och en påminnelse köas 24 h+ i förväg. Köningen
  väljer kanal med det den vet; workern kan byta rad `email → whatsapp` (samtycke finns nu) eller
  `whatsapp → email` (samtycke återkallat, mall avstängd, nummer ogiltigt).
- **Reserv:** permanent fel vid sändning → samma rad byter till e-post direkt i samma pass
  (`fallback_reason = wa_<kod>`, försöken nollas). Tillfälligt fel → backoff som idag; efter 5
  försök → e-post i stället för `dead`. Statuswebhook `failed` → samma reserv (permanent) eller nytt
  WhatsApp-försök (tillfälligt). Har kunden ingen e-post blir raden `dead`.
- **Token (D-029):** en rad som skickats via WhatsApp behåller `payload` (token behövs för
  e-postreserven) tills `delivered`/`read`/`failed` eller högst 24 h efter `sent_at`; sedan töms den.

### 3.3 Webhook `src/app/api/webhooks/whatsapp/route.ts`
- `GET`: `hub.mode=subscribe` + `hub.verify_token` (timing-safe mot `WHATSAPP_VERIFY_TOKEN`) →
  `hub.challenge` som text; annars 403.
- `POST`: 503 utan `WHATSAPP_APP_SECRET`; 401 vid saknad/fel signatur (före JSON-parsning).
  Varje status/meddelande blir en händelse i `inbound_events` (`provider='whatsapp'`,
  `event_id = status:<wamid>:<status>` / `msg:<wamid>`, payload utan telefon/text). Redan
  hanterad → hoppas över (idempotens). Fel → 500 så att Meta skickar igen.
- **Statusar** (`sent/delivered/read/failed`) uppdaterar raden via `message_outbox.wa_message_id`.
- **Knappsvar** binds till vårt eget meddelande via `context.id` (= `wa_message_id`), och
  avsändaren (`from`) måste vara kundens nummer på den raden. Quick reply-payload är bara åtgärden
  (`confirmo`/`cambiar`/`si:<start>`/`no`); vem och vilken bokning/post kommer från raden, aldrig
  från payloaden. Ingen kan bekräfta/ta en tid åt någon annan.
  - `recordatorio` *Confirmo* → `bookings.confirmed_by_customer_at` (om bokningen är `confirmed`
    och inte passerat). *Necesito cambiar* → ägaren får e-post `clienteQuiereCambiar` (utkorgen,
    befintlig notismekanism), inget automatiskt svar till kunden.
  - `listaEsperaCupo` *Sí, la quiero* → `claimWaitlistOfferForEntry` (samma motor som `/v/[token]`:
    först till kvarn, `no_overlap` avgör, servern räknar om tiden och kräver samma start som
    erbjöds). Redan tagen → `lista_espera_tomada` (via utkorgen). *No, gracias* → posten släpps
    (`expired`) och sekventiellt läge erbjuder nästa i kön.
- Fritext/annat: bara `inbound_events` (typ, inget innehåll, ingen telefon) och en loggrad utan
  persondata.

### 3.4 Samtycke (F12)
- Idag: den **obligatoriska** villkorsrutan innehåller "y recibir por WhatsApp la confirmación y los
  recordatorios" (FRÅGA 6 i WP-03) och väntelistans obligatoriska ruta nämner WhatsApp. Det går
  inte att tacka nej till WhatsApp eller återkalla det utan att avboka — och e-post är redan
  obligatorisk (D-030), så WhatsApp är inte nödvändigt för tjänsten.
- Nytt: en **separat, valfri, okryssad** ruta "Quiero recibir por WhatsApp…" i Reserva och i
  väntelistans formulär. WhatsApp-meningen tas bort ur villkoren och väntelistans ruta.
  `consentimientos.version` → `2026-10-v3`, `waitlist.consentimientoVersion` →
  `lista-espera-2026-10-v2` (hashar registrerade). Texterna är `TODO_COPY`.
- Lagring: `consent_events` med nytt `kind = 'whatsapp'` (`granted` true/false, append-only).
  Ingen ny kolumn på `customers`: senaste händelsen avgör, och anonymisering kopplar redan loss
  `consent_events` (samtycket försvinner med kunden). Export tar redan med `consent_events`.
- Återkallelse: kundlänken `/r/[token]` visar "Dejar de recibir avisos por WhatsApp" när samtycket
  är aktivt → `kind='whatsapp', granted=false`. Ett okryssat val vid en ny bokning återkallar
  inget (Reserva verifierar inte numret — IDEAS rad 99).
- Ägarens manuella samtycke (`clientes.consentimientoManual`) ger **inte** WhatsApp-samtycke i v1.

### 3.5 Databas (nya migrationer, regel 11)
- `20261021010000_whatsapp_enum_values.sql`: `message_channel += 'whatsapp'`,
  `consent_kind += 'whatsapp'` (egen fil: ett nytt enum-värde kan inte användas i samma
  transaktion).
- `20261021010100_whatsapp_channel.sql`: `message_outbox` + `wa_message_id text` (unikt partiellt
  index), `delivered_at`, `read_at`, `fallback_reason text`, `waitlist_entry_id uuid` (sammansatt
  FK → `waitlist_entries`, `on delete set null`), index; `consent_events_subject_kind_check` tar med
  `whatsapp`. Inga nya tabeller (inbound_events finns, RLS utan policy). pgTAP
  `145_whatsapp_channel.test.sql`. Typer genereras.

## 4. Filer
`src/server/messaging/whatsapp/*` (ny) · `src/server/messaging/outbox/{enqueue,enqueue-waitlist,
worker,types}.ts` · `src/server/messaging/email/` (mall `clienteQuiereCambiar`) ·
`src/app/api/webhooks/whatsapp/route.ts` (ny) · `src/server/waitlist/claim.ts` (+ entry-baserad
claim/decline) · `src/server/bookings/customer-confirm.ts` (ny) · `src/server/privacy/whatsapp-consent.ts`
(ny) · `src/server/bookings/submit.ts`, `src/server/waitlist/join.ts` (samtycket) ·
`src/components/booking/{customer-form,form-schema,manage-screen}.tsx` · `src/app/[slug]/actions.ts`,
`src/app/r/[token]/page.tsx` · `src/i18n/es-CL.ts`, `es-CL.panel.ts`, tester · `supabase/` ·
`src/types/database.ts` · `.env.example` · `docs/tech/INTEGRATIONS.md`, `DATA_MODEL.md`,
`DECISIONS.md`, `BACKLOG.md`.

## 5. Tester
- **Enhet:** signatur (giltig/ogiltig/saknad/fel längd), GET-verifiering, kanalval
  (samtycke/nummer/konfig/mall/e-post saknas), parameterordning per mall mot `plantillasWhatsapp`
  (antal `{{n}}` = antal parametrar, knapptyp), permanenta vs tillfälliga fel, fake-läget utan
  persondata, `WHATSAPP_TEMPLATES_APPROVED`-parsning, workerns reserv (permanent → e-post samma
  pass, tillfälligt → backoff, max → e-post), route-tester för webhooken (401/503/200, idempotens).
- **Integration (`*.db.test.ts`, lokal DB):** samma händelse två gånger hanteras en gång; status
  `delivered` tömmer payload; `failed` → e-postrad; *Confirmo* sätter `confirmed_by_customer_at`
  bara för rätt avsändare; *Necesito cambiar* köar ägarmejl; **väntelistans race**: två *Sí* på
  samma tid (broadcast) → exakt en bokning, den andra får `listaEsperaTomada`; *No, gracias* →
  nästa i kön erbjuds; fel avsändare/okänt `context.id` gör ingenting.
- **pgTAP:** nya kolumner/FK (tenant: kan inte peka på B:s väntelistepost), `consent_events` tar
  `whatsapp`, `inbound_events` oläsbar för `authenticated`/`anon`.
- **E2E:** befintliga sviter gröna (nya rutan okryssad, bokning utan WhatsApp fungerar som förut).

## 6. Frågor till ägaren
1. **E-post obligatorisk?** D-030 sa "tills WhatsApp finns". Förslag: behåll obligatorisk e-post
   tills (a) alla sex mallar är godkända och (b) WhatsApp-samtycket är frivilligt — kunder som inte
   kryssar i WhatsApp måste fortfarande få bekräftelsen skriftligt (Ley 19.496). Ändras inte i
   den här WP:n.
2. **Domänen** för URL-mallarna (`reserva_confirmada`, `reserva_cancelada`, `reserva_movida`).
   `NEXT_PUBLIC_APP_URL` måste vara samma bas som registreras i Meta.
3. **Separat WhatsApp-ruta** i stället för meningen i villkoren (ändrar svaret på FRÅGA 6 i WP-03).
   Juristen bör granska `2026-10-v3`/`lista-espera-2026-10-v2` före piloten.
4. Ska ägaren kunna registrera WhatsApp-samtycke manuellt (kund på plats/telefon)? Inte i v1.
5. Sessionssvar ("¡Gracias por confirmar…!") efter knappsvar — vill du ha dem? (kräver en
   sessionskanal i utkorgen; inte i v1).

## 7. Klart när
- [x] Klient + fake + felklassning + signatur med tester
- [x] Kanalval och e-postreserv i utkorgen, sändningstidsbeslut, payload-regeln (D-029/D-063)
- [x] Webhook: GET-verifiering, signatur, idempotens, statusar, knappsvar, väntelistans race
- [x] Samtycke: separat ruta, logg, återkallelse i `/r/[token]`, versioner + hashar
- [x] Migrationer + pgTAP + typer, `.env.example`, INTEGRATIONS, DATA_MODEL, D-063, BACKLOG
- [x] `typecheck`, `lint`, `format:check`, `test`, `build`, `test:db`, `test:integration`, `test:e2e` gröna lokalt (2026-10-21, egen stack på 583xx; CI kördes inte)
- [ ] Skarpt: Meta-uppgifter i Vercel, webhook registrerad i Meta, godkända mallar i `WHATSAPP_TEMPLATES_APPROVED`, copywriter/jurist för TODO_COPY
