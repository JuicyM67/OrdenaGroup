# llena — designriktlinjer

> **Källa till sanning:** filerna i `docs/design/reference/` (exporterade från designytan) och bilderna i `docs/design/screens/`.
> Allt här är utläst ur dem. Vid konflikt: referensfilen vinner, och detta dokument uppdateras.
> Tokens finns i `src/styles/tokens.css`. **Inga färger, radier, skuggor eller typsnittsstorlekar får skrivas utanför tokens.**

---

## 1. Känsla i en mening

Premium men varm: en mörk ram runt en ljus arbetsyta, stora rundade hörn, platta vita kort, pastellkort för "det som fyller agendan" och en limegrön accent för det som är aktivt eller gör pengar. Aldrig skuggor på kort, aldrig ramar runt kort, aldrig emoji.

## 2. Principer

1. **Mörkt = viktigt nu.** Mörka kort (`dark`) används för det ägaren ska agera på: veckans resultat, nästa kund, aktiv hora flash, bokningsfältet.
2. **Pastell = funktionerna som fyller agendan.** Lista de espera = `lilac`, Horas flash = `lime` (eller `peach` i översikten), Te echamos de menos = `lime`/`peach`. Samma funktion ska alltid ha samma färg i hela produkten.
3. **Lime = aktivt/primärt val.** Vald dag, aktiv navpunkt, CTA på mörk yta, flash-rabatt. Max en limegrön primärhandling per vy.
4. **Platta ytor.** Kort = vit yta utan border och utan skugga. Skugga används bara på popovers och dialoger (`shadow-popover`).
5. **Stora siffror i display-typsnitt.** Tider, belopp och nyckeltal sätts i Bricolage Grotesque.
6. **Mobil först för kunden och ägaren**, desktop för agendan.

## 3. Typografi

Ladda med `next/font/google` i `src/app/fonts.ts`:

```ts
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
// Variabel vikt med opsz-axeln (WP-02 steg 0-spiken): referenserna laddar Bricolage med
// opsz,wght@12..96. Utan opsz-axeln avviker display-texten 7–29 % i utsnitt som
// "Octubre 2026" (30px) och "−20%" (118px), långt över 0,5 %-tröskeln (FRÅGA 4).
export const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
  variable: "--font-bricolage",
});
export const sans = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-jakarta" });
```

`next/font` genererar ett hashat familjenamn, så variabelnamnen är `--font-bricolage`/`--font-jakarta` (inte `--font-display`/`--font-sans`, som är Tailwind-tokens i `@theme`). `tokens.css` pekar `--font-display`/`--font-sans` mot dessa variabler. Klasserna (`display.variable`, `sans.variable`) sätts på `<html>` i `src/app/layout.tsx`, så variablerna är definierade där `:root` räknar ut tokens.

**Radavstånd (line-height):** referenserna (`docs/design/reference/*.dc.html`) sätter aldrig
`line-height` i sina inline-stilar, utom på de roller som anger ett värde i tabellen nedan
(hero, event …) — texten litar annars på webbläsarens naturliga radavstånd för respektive
typsnitt/storlek. Tailwinds preflight sätter `line-height: 1.5` globalt på `html`/`body`, vilket
gör varje rubrik och etikett omätbart högre än referensen (upptäckt via `hoy-header`-utsnittet i
WP-02, se §7). `src/app/globals.css` motverkar det med `html { line-height: normal; }` i
`@layer base`. Sätt en explicit `leading-*`-klass (se §12) bara där rollen nedan anger ett värde
— annars ska elementet vila på det globala `normal`.

| Roll | Typsnitt | Storlek / radavstånd | Vikt | Övrigt | Exempel |
|---|---|---|---|---|---|
| hero | display | 40 / 1.08 | 600 | spacing −0.02em | "Tu agenda se llenó sola esta semana" |
| page-title | display | 32 desktop · 30 mobil | 700 / 600 | −0.02em | "Inicio", "Hoy", "Octubre 2026" |
| stat | display | 38 (belopp 32) | 600 | −0.02em | "14", "$486.000" |
| time-xl | display | 44 / 1 | 600 | −0.02em | "15:00" på nästa kund |
| day-number | display | 30 desktop · 22 mobil | 700 | −0.02em | dag-pills |
| step-title | sans | 16 / 1.25 | 700 | | "1 · Elige el servicio" (Reserva), "Resto del día" (Hoy) |
| card-title | sans | 18 | 700 | | "Agenda de hoy" |
| feature-title | sans | 19 / 1.2 | 700 | | pastellkortens rubrik |
| body-strong | sans | 15 | 600–700 | | klientnamn, tjänst |
| body | sans | 14 | 500–600 | | |
| meta | sans | 13 | 400–500 | färg `muted` | "Corte + barba · con Diego" |
| caption | sans | 12 | 600 | | chips, datumrubriker |
| label-caps | sans | 13 | 700 | spacing 0.04em, VERSALER | "VER DETALLE" |
| event | sans | 12.5 titel / 11.5 tid | 700 / 400 | ellipsis | kalenderblock |

Belopp skrivs alltid `$` + punkt som tusentalsavgränsare: `$18.000` (es-CL, inga decimaler).

### Roll → klasser

Tailwinds standardtema är nollställt (§12), så storlekarna heter efter px (`text-13`, `text-40`
…) i stället för `text-sm`/`text-lg`. Rollerna ovan är kombinationer av dessa tokens:

| Roll | Klasser |
|---|---|
| hero | `font-display text-40 leading-hero font-semibold tracking-display` |
| page-title (desktop) | `font-display text-32 font-bold tracking-display` |
| page-title (mobil) | `font-display text-30 font-semibold tracking-display` |
| stat | `font-display text-38 font-semibold tracking-display` |
| stat (belopp) | `font-display text-32 font-semibold tracking-display` |
| sms-saldo (WP-76, Plan) | `font-display text-36 font-bold` (mobil `text-28`) |
| section-title (WP-76, Plan) | `font-display text-20 font-bold` |
| time-xl | `font-display text-44 leading-none font-semibold tracking-display` |
| day-number (desktop) | `font-display text-30 font-bold tracking-display` |
| day-number (mobil) | `font-display text-22 font-bold` |
| step-title | `font-sans text-16 font-bold leading-event` |
| card-title | `font-sans text-18 font-bold` |
| feature-title | `font-sans text-19 leading-snug font-bold` |
| body-strong | `font-sans text-15 font-semibold` (ibland `font-bold`) |
| body | `font-sans text-14 font-medium` (ibland `font-semibold`) |
| meta | `font-sans text-13 text-muted` |
| caption | `font-sans text-12 font-semibold` |
| label-caps | `font-sans text-13 font-bold tracking-caps uppercase` |
| event-title | `font-sans text-event-title leading-event font-bold` |
| event-meta | `font-sans text-event-meta text-ink-soft` |

## 4. Färg

Se `tokens.css`. Regler:

- Text på pasteller är alltid `ink`. Sekundärtext på pastell: mörk ton av samma färg (t.ex. `#2E2A3D` på lilac, `#3D3020` på peach, `#2F3310` på lime).
- `muted` (#5E5E66) är lägsta tillåtna gråton för läsbar text på vitt eller canvas. `subtle` bara för inaktivt.
- På mörk yta: `on-dark` för rubriker, `on-dark-soft` för brödtext, `on-dark-muted` för meta.
- Statuschips: Confirmada = success, Abono pagado = deposit, Sin confirmar = pending. Källa: lista de espera = peach-tagg, Flash = lime-tagg.
- Agenda-headerns gradient (`--gradient-agenda`, klass `bg-agenda`) används **endast** i agendans huvudpanel.

### Nya tokens (WP-02, alla fem referenser)

| Token | Värde | Källa |
|---|---|---|
| `--color-ink-soft` | `#3E3E46` | Agenda: veckodag, tid i block, "GMT−3" |
| `--color-on-dark-faint` | `#6B6B74` | Agenda: dagar utanför månaden i mörk kalender |
| `--color-on-lilac-soft` / `-on-peach-soft` / `-on-lime-soft` | `#2E2A3D` / `#3D3020` / `#2F3310` | Sekundärtext på Main-korten, Reserva, HoraFlash |
| `--color-lilac-100` | `#E9E1FB` | Main: avatartint "JR" (skiljer sig från `lilac-50`) |
| `--color-blocked` | `#8E8E97` | Agenda: prick "Bloqueos y almuerzo" |
| `--color-stripe` | `#FAFAF7` | Agenda: randning stängd dag (`bg-closed-stripes`) |
| `--color-flash-dot` / `--color-full-dot` | `#9DB017` / `#C77A1E` | Reserva: dagprickar |
| `--color-staff-1` … `--color-staff-6` | `var(--staff-1)` … | Tailwind-färger för personalfärgerna (`bg-staff-1` …) |
| `--radius-panel` | `20px` | Popover, dag-knapp i Reserva |
| `--radius-bar` | `26px` | BookingBar, MobileTabBar |
| `--radius-badge` | `8px` | Taggar i Hoy, flash-bricka |
| `--radius-tag` | `6px` | Tagg i kalenderblock |

### Nya tokens (WP-hemsida v2, retro 2026-09-28: nytt hero + glas-nav)

Ingen `.dc.html`-referens (hemsidan, inte produkt-UI) — mappat från `.visual-diff/ref/hero-mix-ac.html`
(hex → tokens, se filhuvudet) och `.visual-diff/ref/nav-ref.png`. D-015 nollställer `--blur-*`; det
här är första gången hemsidan behöver det (flytande nav i "liquid glass").

| Token | Värde | Källa |
|---|---|---|
| `--blur-glass` | `20px` | Navets `backdrop-blur-glass`, megamenyns panel |
| `--shadow-glass` | mjuk skugga + ljus inre highlight (se tokens.css) | Nav, megameny — glaskänsla i stället för `--shadow-popover` |

`Button` fick en `glass`-variant (border + halvtransparent yta + `backdrop-blur-glass`) för
"Entrar" i det nya navet, se §7.

### Nya tokens (WP-hemsida, startsidan efter heron + footer)

Ingen `.dc.html`-referens (samma skäl som ovan). Mappat från `.visual-diff/ref/sida-v1-bento.html`,
`.visual-diff/ref/sida-v2-morka-band.html` och `.visual-diff/ref/footer.html`. Fyra nya
animationer utan tidigare motsvarighet: `--animate-grow-bar` (bentots agenda-staplar, växer
in med `delay-*`-stagger), `--animate-toggle-knob` (bentots inasistencias-toggle),
`--animate-count-roll` (bentots pris-siffra, samma teknik som `--animate-hero-comision` men
tre rader i stället för fyra) och `--animate-shadow-pulse` (footerns 3D-kalender, synkad med
`--animate-float`). Ingen ny radie- eller färgtoken: footerns mörka kort återanvänder
`rounded-shell` (närmast referensens 48 px) och kalenderns gradienter förenklades till platta
tonfyllningar (`fill-lime`/`fill-surface`/…) eftersom SVG:ns `stop-color` inte går att uttrycka
som en Tailwind-klass — se `calendar-3d.tsx`.

### Nya tokens (WP-hemsida, sitio-v3: /funcionalidades och /precios)

Ingen `.dc.html`-referens (samma skäl som ovan) — ingen designyta byggde de här sidorna om,
så mönstret återanvänder rörelsespråket från hero-bento/por-que-bento men med egna, mindre
mockuper per funktionssektion. Nya animationer: `--animate-func-pop-1/-2/-3` (Agenda/Reservas
manuales/Fichas-mockuperna, tre element poppar in efter varandra och tonar bort ihop, samma
stagger-teknik som `--animate-step-fade-*`), `--animate-func-toggle-llego`/`-novino` (Hoy-
mockupens Llegó/No vino-knappar turas om att lysa), `--animate-func-tab-1/-2/-3` (Ajustes-
mockupens tre flikar) och `--animate-func-notif-slide` (Recordatorios/Lista de espera-
mockupernas notis som glider in). Ingen ny färg- eller radietoken. Räknaren på /precios
använder `accent-lime` (redan en Tailwind-genererad klass ur `--color-lime`, samma mönster som
`accent-ink`/`accent-lime` i kryssrutorna) på en vanlig `<input type="range">` i stället för en
ny komponent — ingen referens kräver en anpassad slider-skin.

### Nya tokens (WP-57, ägarens UX-genomgång: Hoy "40 min de atraso syns knappt")

Ingen `.dc.html`-referens (UX-genomgång av den byggda appen, inte en designyta). `--color-alert`
(notisprick, nu-linje) saknade en pastellbakgrund till skillnad från `success`/`deposit`/
`pending` ovan — `Chip tone="alert"` (NextClientCards förseningstext, Hoy) behövde en, i samma
ljushet/mättnad som de tre andra.

| Token | Värde | Källa |
|---|---|---|
| `--color-alert-bg` | `#FBE2D6` | `Chip tone="alert"` — försenad nästa kund (Hoy/Inicio) |

CI-fynd (axe, `color-contrast`): `Chip tone="alert"` återanvände `--color-alert` som text, bara
3:1 mot `--color-alert-bg` (fet 12px, kräver 4,5:1). Egen `-fg`-ton tillagd, samma mönster som
`success`/`deposit`/`pending` ovan.

| Token | Värde | Källa |
|---|---|---|
| `--color-alert-fg` | `#A33814` | `Chip tone="alert"` — text (~5,4:1 mot `--color-alert-bg`) |

## 5. Form och luft

- Radier: se tokens (`shell` 32 → `chip` 10). Tumregel: ju större yta, desto större radie. Cirkelformade knappar för ikonknappar (48×48) och avatarer.
- Mellanrum: 4-bas. Standardgap: 8, 10, 12, 16, 20, 24. Panelpadding desktop 28/32, kortpadding 20/22, mobilpadding 20.
- Klickytor ≥ 44 px (ikonknappar 48, primärknappar 48–52 höga).
- **Safe-area (WP-42):** `pt-safe-t` (padding) och `bottom-safe-b` (`bottom: 1rem + inset`, ersätter `bottom-4`) i `src/styles/tokens.css` (`@utility`) lägger `env(safe-area-inset-top/bottom)` ovanpå ägarskalets kompakta mobila topprad respektive `MobileTabBar`, så notch/hemindikator aldrig täcker innehåll eller tryckytor.

## 6. Ikoner

`lucide-react`, stroke 1.8 (nav) / 2 (i kort) / 2.2–2.4 (små pilar). Storlek 20–22 i nav, 24–30 i pastellkort.

| Betydelse | Lucide |
|---|---|
| Inicio | `LayoutGrid` |
| Agenda | `Calendar` |
| Clientes | `Users` |
| Horas flash | `Zap` |
| Caja / informes | `BarChart3` |
| Ajustes | `SlidersHorizontal` |
| Lista de espera | `List` |
| Te echamos de menos | `MessageSquare` |
| Pago / abono | `CreditCard` |
| Tid | `Clock` |
| Öppna / gå vidare | `ArrowUpRight` |
| Tjänst | `Scissors` |

Logotyp (arbetsnamn): cirkel med fylld nederhalva, i en lime ruta 56×56, radie 18.

## 7. Komponenter

Kolumnen "Referens" anger vilken fil i `docs/design/reference/` (och bild i `docs/design/screens/`) som visar komponenten. Läs den exakta markupen där: alla mått och färger står som inline-stilar. Bygg komponenterna i `src/components/ui/` (generella) och `src/components/<område>/` (agenda, booking, dashboard).

| Komponent | Spec | Referens |
|---|---|---|
| **AppShell (desktop)** | Yttre ram `ink`, padding 16, gap 16. NavRail 80 bred. Innehållspanel `canvas`, radie 32, padding 28/32. | Main |
| **NavRail** | Logo-ruta 56 lime. Navpunkter 52×52, radie 16. Aktiv: bg `dark-2`, ikon lime. Inaktiv: ikon `on-dark-subtle`. Logga ut längst ned. | Main |
| **PageHeader** | Titel (page-title) + meta-rad. Höger: ikonknappar 48 runda vita, användar-pill 48 hög med avatar 36. Notisprick 8 px `alert`. | Main |
| **HeroSummary** | `dark`, radie 28, höjd 272, padding 32. Vänster: hälsning (15, on-dark-muted), hero-text, sammanfattning med lime-markerat belopp, vit pill-knapp 44 (label-caps + ArrowUpRight). Höger: tre FeatureCards. | Main |
| **FeatureCard** | 196 bred, radie 22, padding 20. Nummer "01" (13/600), ikon 30, titel (feature-title), meta 12, progress 4 px (spår ink 18 % opacitet, fyllning ink). Variant med rund mörk 34-knapp. | Main |
| **StatTile** | Vit, radie 24, höjd 116, padding 20/22. Siffra (stat) + meta. Varianter: med sparkline (violet linje, lilac-50 fyllning), med trend-chip. | Main |
| **AgendaRow** | Höjd 60, border-top `line-strong`. Tid (15/700, 52 bred), avatar-ruta 40 radie 14 i pasteltint med initialer, namn + meta, StatusChip, mer-knapp. | Main |
| **StatusChip** | 12/700, padding 6×12, radie 12 (10 i små varianter). | Main, Agenda |
| **MiniCalendar** | Ljus (Main) och mörk (Agenda) variant. Veckan börjar måndag. Celler 30 breda. Valt datum: ljus = ink-cirkel vit text; mörk = lime-cirkel ink text. Mörk variant markerar aktuell vecka med `dark-2`-band. Prick 4 px violet = dag med bokningar. | Main, Agenda |
| **FlashCard** | `dark`, radie 24. Lime ikonruta 56, text, vit rund pil-knapp 44. | Main |
| **SegmentedControl** | Container vit 45 % opacitet, padding 4, radie 16. Knappar 96×36, radie 12. Vald = vit. `disabled` per alternativ (WP-12: "Mes"), `disabled:opacity-40`, hoppas över av piltangenterna. | Agenda |
| **DayPill (desktop)** | Höjd 72, radie 16, bg vit 38 %. Idag = vit, dag + siffra i `violet`. Stängd dag = vit 20 %. | Agenda |
| **WeekGrid** | Vit panel radie 22. Timme = 94 px, tidskolumn 64. Linjer `line`. Dagkolumner flex-1 med border-left `line`. Nu-linje 2 px `alert` med prick 10 px. Stängd dag: randigt mönster + "Cerrado". | Agenda |
| **EventBlock** | Absolut positionerad, inset 5 px, radie 12, padding 7/9. Bakgrund = personalens färg. Flash = lime + svart tagg "Flash −20%". Från väntelista = peach + tagg "Lista de espera". Blockering = `#F1F1EE`, text muted. Vald = 2 px ink-kant. Tid visas om höjd ≥ 44, avatar om ≥ 96. Överlappande profesionales i samma kolumn (veckovyn, D-021): `left`/`width` i procent i stället för det fasta insetet. | Agenda |
| **EventPopover** | 290 bred, vit, radie 20, padding 18/20, `shadow-popover`. Namn + telefon maskerad, chips, tid och betalning med ikoner, tre knappar (Llegó = primär ink, No vino / Mover = sekundära med border). Radix Popover. | Agenda |
| **SidePanelCard (mörk)** | `dark`, radie 24, padding 20. Rubrik 17/600. Kryssrutor med `accent-color: lime`. | Agenda |
| **ServiceCard** | Vit, min-höjd 72, radie 22, padding 12/16/12/12. Ikonruta 44 radie 14 i tint. Vald = 2 px ink-kant (osynlig 2 px kant annars, så inget hoppar). | Reserva |
| **Pill** | Höjd 44, radie full, padding 0 16. Vald = ink/vit text, annars vit. | Reserva |
| **DayPicker (mobil)** | Flex-1 knappar 80 höga, radie 20. Vald = lime. Prick 6 px: flash = `#9DB017`, fullt = `#C77A1E`. | Reserva |
| **TimeSlot** | Rutnät 3 kolumner gap 10. Knapp 52 hög radie 16. Vald = ink. Flash-slot har lime-bricka "−20%". | Reserva |
| **WaitlistCard** | Peach, radie 22, padding 18. Visas i stället för tider när dagen är full. | Reserva |
| **BookingBar** | Fast i botten, inset 12, `dark`, radie 26. Sammanfattning 12 on-dark-muted, pris display 22 (+ överstruket ordinarie pris vid flash), lime CTA 52 hög radie 18. | Reserva |
| **NextClientCard** | `dark`, radie 28, padding 22. Tid (time-xl), namn 18/700, meta, två knappar 48 (Llegó = lime, No vino = kant `dark-border`). | Hoy |
| **QuickActionTile** | Rutnät 3 kolumner, höjd 96, radie 22, pastell. Ikon överst, etikett 14/700 nederst. | Hoy |
| **MobileTabBar** | Fast i botten, inset 16, höjd 72, `dark`, radie 26. 4 flikar, aktiv = lime. | Hoy |
| **FlashStory** | 1080×1920 (renderas 360×640 ×3). Lime bakgrund, lilac cirkel, "−20%" display 800 i 118 px, vitt infokort, svart CTA. Genereras som bild (t.ex. `@vercel/og`). | HoraFlash |

### Byggt i WP-02 (fil och API)

Generella basdelar. Skärmspecifika komponenter i tabellen ovan (HeroSummary, FeatureCard,
WeekGrid, EventBlock …) byggs i WP-11–14/WP-30 och listas där när de är klara.

| Komponent | Fil | API |
|---|---|---|
| Button | `src/components/ui/button.tsx` | `variant` (primary/secondary/accent/outline-dark/inverse/glass, WP-hemsida v2), `size` (xs…2xl), `asChild` (Radix Slot) |
| IconButton | `src/components/ui/icon-button.tsx` | `label` (obligatorisk, blir aria-label), `tone`, `size`, `shape`, `badge?`, `asChild?` (Radix Slot, WP-11; stöds inte tillsammans med `badge`) |
| Chip | `src/components/ui/chip.tsx` | `tone` (…/peach-50, WP-11), `size` (md/sm/xs/tag/trend/badge, WP-11), `weight` (default/bold, WP-11, läggs efter `size` så `cn()` låter `font-bold` vinna), inget eget utsnitt (se steg 7) |
| Pill | `src/components/ui/pill.tsx` | `selected`, `aria-pressed` |
| Card | `src/components/ui/card.tsx` | `as`, `tone`, `radius`, `padding`; mörka toner sätter `data-surface="dark"` |
| Avatar | `src/components/ui/avatar.tsx` | `initials`, `shape`, `size`, `tone`, `photoUrl?` (WP-44: foto i stället för initialer, redan filtrerat server-side), `alt?` |
| LogoMark | `src/components/ui/logo-mark.tsx` | `label`, `size`, `decorative?` (för när en omgivande länk redan har namnet) |
| SegmentedControl | `src/components/ui/segmented-control.tsx` | Radix ToggleGroup `type="single"`, `value`/`onValueChange` (kan aldrig bli tomt); R10: `role="radio"`/`aria-checked`, inte `aria-pressed` |
| NavRail (+Logo/Link/Action/Divider/Spacer) | `src/components/ui/nav-rail.tsx` | `variant` (bare/panel) via Context, `data-surface="dark"` på `<nav>` |
| PageHeader (+UserPill) | `src/components/ui/page-header.tsx`, `user-pill.tsx` | `variant` (desktop/mobile, meta före titeln i DOM på mobil) |
| MiniCalendar | `src/components/ui/mini-calendar/` (`grid.ts` ren funktion, `mini-calendar.tsx`) | `month`, `selected`, `today`, `markedDates`, `highlightWeekOf` (bara mörk), `variant`, roving tabindex + pil/Home/End |
| `cn()` | `src/components/ui/cn.ts` | `clsx` + `extendTailwindMerge` (egna klassgrupper, se DESIGN.md §12) |
| TextLink | `src/components/ui/text-link.tsx` (WP-11) | tunn wrapper runt `next/link`, `text-13 font-semibold text-ink underline`, `hover:text-pending-fg` |

### Byggt i WP-11

Skärmen Inicio (Main.dc.html, desktop, F6). Vy-modell och rena funktioner:
`src/components/dashboard/types.ts` (`InicioData`, `TodayBooking`), `inicio-view.ts`
(`todayLabel`, `upcomingToday`, `statusChip`, `heroVariant`, `splitHighlight`,
`noShowTrendLabel`, `notificationsLabel`, `mustParseInstant`). Fixtures:
`src/app/design-lab/main/fixtures.ts` (`getInicioFixtures`, tillstånd `referencia`/`vacio`/
`lleno`/`sin-flash`). Skärmen: `src/components/dashboard/inicio-screen.tsx`, design lab
`src/app/design-lab/main/page.tsx` (`?estado=`), riktig route
`src/app/(app)/app/inicio/page.tsx` (grind D-020, noindex).

Initialer (`initialsOf`, WP-10) och procent (`formatPercent`, WP-10) räknas alltid ur
`owner.name`/`clientName`/`stats.noShowPct` vid renderingen — datan bär inga färdig­formaterade
strängar för dem. `owner.firstName` (hero-hälsningen) kommer redan klar från datan — ingen
egen namnformatering i UI:t (QA, ersätter tidigare `firstName()`). Veckodagarna i
CalendarCard kommer från `WEEKDAY_MIN` (`src/lib/format/calendar-es-CL.ts`, WP-10), och
`dayLabel` lägger till `calendario.diaConReservas` för dagar med prick (WP-03b) — pricken är
annars ensam bärare av informationen. Notisknappen: `nav.notificaciones` utan aviseringar,
annars `nav.notificacionesNuevas({ n })` (`notificationsLabel`, `data.notifications.count`).
`upcomingToday` filtrerar också bort `cancelled`/`no_show` (QA) — de hände inte, oavsett tid.

| Komponent | Fil | API |
|---|---|---|
| AppShell | `src/components/dashboard/app-shell.tsx` | `rail`, `children`, `className` (overridar `h-dvh`, t.ex. `h-225` i design lab) |
| MainNav | `src/components/dashboard/main-nav.tsx` | `active` (`MainNavKey`), `hrefs?` (standard `DEFAULT_MAIN_NAV_HREFS`); alla länkar `prefetch={false}` (sidorna finns inte än, annars blockerar Next.js prefetch-loop `npm run visual`, se R-anteckning i koden) |
| HeroSummary | `src/components/dashboard/hero-summary.tsx` | `ownerFirstName`, `week`, `features`, `detailHref`, `onEnviarRecordatorio?`; `as="section"` med `aria-label={inicio.resumenSemanaAria}`; "Enviar recordatorio"-knappen har `on-dark:focus-visible:outline-ink` (QA: annars lime fokusring på lime FeatureCard, osynlig) |
| FeatureCard | `src/components/dashboard/feature-card.tsx` | `index`, `tone` (lilac/peach/lime), `icon`, `title`, `meta`, `progress?`, `action?` (rund 34-knapp i stället för progress) |
| ProgressBar | `src/components/dashboard/progress-bar.tsx` | `value` (0–1); SVG, `aria-hidden`, ingen `style` |
| StatTile | `src/components/dashboard/stat-tile.tsx` | variant `number`/`amount`/`percent`; `meta`/`trendLabel` alltid från anroparen |
| Sparkline | `src/components/dashboard/sparkline.tsx` | `values` (`revenueSeries`); Catmull-Rom → kubiska Bézier-segment, se R3 |
| AgendaToday | `src/components/dashboard/agenda-today.tsx` | `bookings`, `href`; `min-h-0` + `overflow-y-auto` internt, sidan klipper aldrig bort bokningar |
| AgendaRow | `src/components/dashboard/agenda-row.tsx` | `booking` (`TodayBooking`), `onMoreOptions?`; `<li>`, tid alltid i `SANTIAGO` |
| CalendarCard | `src/components/dashboard/calendar-card.tsx` | `month`, `today`, `markedDates`; klientkomponent, `"use client"` |
| FlashCard | `src/components/dashboard/flash-card.tsx` | `activeFlash` (`InicioData["activeFlash"]`), `href`; `null` → `inicio.flashCard.vacio` + länk för att skapa en (`?estado=sin-flash`, testat) |

**Tillägg i delade `ui/`-filer (WP-11, PR C):** `IconButton` fick storleken `36` (AgendaRow
"Más opciones"); `NavRailLink` fick ett valfritt `prefetch`-prop (standard följer Next.js;
`false` för länkar till sidor som inte finns än).

### Byggt i WP-12

Agenda (desktop): veckovy exakt enligt `docs/design/reference/Agenda.dc.html`, och en
dagvy i samma formspråk (härledd, ingen ritad referens — verifierad med stilparitet mot
veckovyn och delregioner mot `Agenda.png`, se `e2e/agenda.spec.ts` och
`scripts/visual-diff.mjs` `agenda-dia`). D-021: `style` i `src/components/agenda/**`
används bara för `top`/`height`/`left`/`width` som räknas ur data (block, lanes,
nu-linje) — allt annat är tokens/klasser.

| Komponent | Fil | API |
|---|---|---|
| AgendaShell | `src/components/agenda/agenda-shell.tsx` | `rail`, `aside`, `children`; ram `bg-night p-4 gap-4`, `h-dvh` (design lab: `className="h-full"` i en `h-225 w-360`-artboard) |
| AgendaRail | `src/components/agenda/agenda-rail.tsx` | `staff`, `highlightedStaffId` (FRÅGA 5: senast visade profesional i dagvyn), `onSelectStaff` |
| StaffRailButton | `src/components/agenda/staff-rail-button.tsx` | `staff`, `selected` (`ring-2 ring-lime`, fokusring utanför via `outline-offset-2`), `onSelect` |
| MonthCard | `src/components/agenda/month-card.tsx` | `month`, `selected`, `today`, `highlightWeekOf`, `onSelect`/`onPrevMonth`/`onNextMonth`; wrapper runt `MiniCalendar variant="dark"` |
| StaffFilter | `src/components/agenda/staff-filter.tsx` | `staff`, `visibleStaffIds`, `counts`, `onToggle`; sista ikryssade `aria-disabled` + `aria-describedby` (kan inte kryssas ur) |
| LegendCard | `src/components/agenda/legend-card.tsx` | statisk, tre prickar (lime/peach/blocked) |
| WaitlistSummary | `src/components/agenda/waitlist-summary.tsx` | `waitlist` (`null` → renderar inget) |
| AgendaToolbar | `src/components/agenda/agenda-toolbar.tsx` | `title`, `onToday`/`onPrevWeek`/`onNextWeek`/`onNewBooking` |
| DayPillRow | `src/components/agenda/day-pill-row.tsx` | `days`, `today`, `closedDates`, `gmtLabel`, `vista` (`semana`\|`dia`, styr om vald dag får vit bakgrund), `selectedDate`, `onSelectDay` |
| TimeGrid | `src/components/agenda/time-grid.tsx` | `startHour`/`endHour`/`headerHeight` (0 vecka, 44 dag), `columns` (`key`, `header?`, `closed`, redan positionerade `items`), `allColumnsClosed?` (dagvyn: en enda `ClosedDay` över alla kolumner i stället för en per kolumn, under kolumnhuvudet), `initialScrollHour`; gemensam för vecko- **och** dagvyn |
| ClosedDay | `src/components/agenda/closed-day.tsx` | bara konstanter/klasser, inget `style` |
| EventBlock | `src/components/agenda/event-block.tsx` | `variant` (staff/flash/waitlist), `staffColor`, `selected`, `title`, `meta`, `showAvatar`, `top`/`height` (alltid `style`), `lane?` (`left`/`width` i `style` när `lanes > 1`) |
| BlockItem | `src/components/agenda/block-item.tsx` | `kind` (time_off_kind), `top`/`height`, `lane?` (samma mönster som EventBlock — ett block som bara gäller några av de synliga profesionales delar lane med en krockande bokning i stället för att ritas i full bredd ovanpå den); blockering/lunch, `<div>`, inte klickbar |
| NowLine | `src/components/agenda/now-line.tsx` | `top` (enda geometrin i `style`); vänster/höger/prick är klasser |
| EventPopover | `src/components/agenda/event-popover.tsx` | `booking`, `staffName`, `tz`, `open`/`onOpenChange`, `onLlego`/`onNoVino`/`onMover`, `trigger`; Radix Popover icke-modal, `side="left" align="start" sideOffset={16} alignOffset={-49}` |
| DayGrid | `src/components/agenda/day-grid.tsx` | *(härledd, ingen ritad referens, WP-12 FRÅGA 2)* `date`, `gridRange`, `visibleStaff` (ordnad med `highlightedStaffId` först), `selectedBookingId`, `renderTrigger`, `onSelectBooking`. Bygger `TimeGrid` med en kolumn per profesional: kolumnhuvud 44 px (prick 10 i personalfärg, namn 13/700, `reservasCount` 12 `muted`, `border-b border-line`). Ingen avatar i blocken (kolumnen säger redan vem) och inga lanes mellan olika profesionales (en kolumn per person). Stängd dag: en enda `ClosedDay` över alla kolumner (`allColumnsClosed`). |
| agenda-view.ts, geometry.ts, layout-events.ts | `src/components/agenda/` | Rena funktioner: `weekDates`/`focusDate`/`weekTitle`/`offsetLabel`/`sectionAria`/`popoverModel`/`statusChip`/`weekdayMinLabels`/`localDateOf` (lokal dag för en ISO-sträng med valfri offset, aldrig `startsWith`), `eventBox`/`showTime`/`showAvatar`/`nowTop`/`gridHours`/`initialScrollHour` (avrundad nedåt till hel timme)/`formatHourLabel`, `layoutLanes`/`mergeCommonBlocks` |
| AgendaScreen | `src/components/agenda/agenda-screen.tsx` | `data` (`AgendaData`), `initialVista`/`initialFecha`; håller `vista`, fokusdag, synliga profesionales, vald bokning och de lokala Llegó/No vino-överskrivningarna (FRÅGA 7); `?vista=&fecha=` via `router.replace` |

Textkällor: `agenda.bloque.meta`/`agenda.bloque.aria` (blockets tidsrad/aria-label) och
`agenda.panel.minimoUnProfesional` (WP-03b, FRÅGA 6) i `src/i18n/es-CL.ts`.
`weekdayMinLabels` (`agenda-view.ts`) använder `formatLocalDate(date, "weekdayMin")`
(WP-10, `src/lib/format/dates.ts`).

### Byggt i WP-13

Reserva (`/{slug}`, mobil). Steg 1–4 (val) har referens (`Reserva.dc.html`).
Datasteget och bekräftelsen (steg 5–6) är härledda — ingen referens finns, formen är
godkänd via skärmdumpar i PR E (FRÅGA 2 i planen).

| Komponent | Fil | API |
|---|---|---|
| BusinessHeader | `src/components/booking/business-header.tsx` | `business` (`BookingBusiness`) |
| ServiceCard | `src/components/booking/service-card.tsx` | `service`, `selected`, `onSelect` |
| StaffPicker | `src/components/booking/staff-picker.tsx` | `staff`, `selectedId`, `onSelect` (raden scrollar horisontellt, `-mx-5 px-5 overflow-x-auto snap-x`) |
| DayPicker / DayButton | `src/components/booking/day-picker.tsx`, `day-button.tsx` | `DayPicker`: `headingId`, `days`, `selectedDate`, `onSelect` (sidor om 6, `snap-mandatory`). `DayButton`: `date`, `selected`, `full`, `flash`, `onSelect` |
| TimeSlot(Grid) | `src/components/booking/time-slot.tsx`, `time-slot-grid.tsx` | `TimeSlotGrid`: `slots`, `selectedSlotId`, `onSelect`. `TimeSlot`: `slot`, `selected`, `onSelect` (flash → `Chip size="badge" tone="lime"`) |
| WaitlistCard | `src/components/booking/waitlist-card.tsx` | `date`, `joined`, `duplicate?` |
| BookingBar | `src/components/booking/booking-bar.tsx` | `summary`, `price` (`BarPrice \| null`), `ctaLabel`, `ctaDisabled?`, `onCta?` **eller** `formId` (submit via `form=`) |
| TextField (generell) | `src/components/ui/text-field.tsx` | `label`, `hint?`, `error?`, `required?`, resten av native `<input>`-props; `scroll-mb-28`, `aria-describedby` pekar på både hint och fel |
| ConsentCheckbox | `src/components/booking/consent-checkbox.tsx` | `checked`, `onChange`, `required?`, `error?`, `children` (aldrig `defaultChecked`) |
| CustomerForm | `src/components/booking/customer-form.tsx` | `formId`, `data`, `selection`, `day`, `submitting`, `serverErrorCode`, `onBack`, `onSubmitBooking`, `onSubmitWaitlist`, `initialErrors?` (design lab) — **härledd, ingen referens** |
| Confirmation | `src/components/booking/confirmation.tsx` | `data`, `selection`, `day` — **härledd, ingen referens** |
| BookingScreen (orkestrerare) | `src/components/booking/booking-screen.tsx` | `data`, `submitBooking`, `joinWaitlist`, `initialState?`/`loadingHorarios?`/`initialFormErrors?`/`forceOffline?` (design lab) |
| Vy-modell, flöde, text | `src/components/booking/types.ts`, `flow-state.ts`, `summary.ts`, `errors.ts`, `form-schema.ts` | Se filkommentarerna; `bookingFlowReducer`/`canContinue` är en ren reducer utan data-import |

BusinessHeader använder `formatWeekdayRange`/`initialsOf` från `src/lib/format/`
(WP-10 PR 0), inte en egen kopia.

**Visuell felsökning (steg-rubriker, 16/700):** utan en explicit `leading-*`-klass
föll `<h2>`-rubrikerna ("1 · Elige el servicio" m.fl.) tillbaka på webbläsarens
naturliga radavstånd för Plus Jakarta Sans 700 vid 16 px, vilket gav en rad 1 px
högre än referensbilden — och det ackumulerades nedåt hela sidan till 2,03 %
avvikelse (`npm run visual reserva`). `leading-event` (redan `1.25`, se §12) ger
exakt samma höjd som referensen; ny roll **step-title** (§3) dokumenterar det.
Ingen ny token behövdes. Efter fixen: 0,55 %. Samma rubrikmönster
(`text-16 font-bold`, utan `leading-event`) finns i `rest-of-day.tsx` (Hoy,
WP-14) — se om step-title-rollen ska tillämpas där också.

### Byggt i WP-14

Hoy (mobil, ägare), `src/components/mobile/`. Vy-modell och rena funktioner i `types.ts`/
`hoy-view.ts` (formatering via `src/lib/format/`, text via `@/i18n`, ingen dold klocka — `now`
injiceras). Fixtures i `src/app/design-lab/hoy/fixtures.ts` (`buildFixture(estado)`), samma
komponent på `/design-lab/hoy` och `/app/hoy` (D-020).

| Komponent | Fil | API |
|---|---|---|
| HoyScreen | `hoy-screen.tsx` | `data: HoyData` (inkl. `unreadNotifications`, styr notispricken och `nav.notificaciones`/`notificacionesNuevas`). Klientkomponent: håller Llegó/No vino-statusen lokalt (FRÅGA 1), optimistisk låsning ~400 ms (timer-id i en ref, rensas vid unmount), dold `role="status"` läser upp `agenda.toast.llego`/`noVino` (en ny nod per annonsering, så samma text i rad läses upp igen), fokus flyttas till nästa korts sektion |
| NextClientCard | `next-client-card.tsx` | `booking?`, `now`, `onArrived`, `onNoShow`, `disabled?`, `emptyMessage?`, `ref?`. `booking` saknas → tömt tillstånd (standard `hoy.sinProximaReserva`, `closedToday` → `hoy.restoDia.diaCerrado` via `emptyMessage`), inga knappar. Fokusring: `-outline-offset-2` (innanför det mörka kortet — med positiv offset hamnade lime-ringen på den ljusa canvas-ytan bakom kortet, ~1,1:1 kontrast i stället för 13,97:1) |
| QuickActions / QuickActionTile | `quick-actions.tsx`, `quick-action-tile.tsx` | `links: HoyLinks`, `waitlistCount`; `href`, `label`, `icon`, `tone` (lime/lilac/peach) |
| RestOfDay | `rest-of-day.tsx` | `bookings`, `dayCount`, `dayTotalClp`, `closedToday` — `resumen` använder alltid `dayCount`/`dayTotalClp` ur datan, aldrig radernas summa |
| MobileTabBar | `mobile-tab-bar.tsx` | `items: MobileTabItem[]`, `active`. Generell för ägarens mobilvyer (Agenda/Clientes/Caja återanvänder den) |

**R3 (lime-undantag):** Hoy visar tre lime-ytor samtidigt (Llegó, "Crear hora flash", aktiv
flik i MobileTabBar), vilket bryter mot principen "max en lime primärhandling per vy" (§2.3).
Referensen (`Hoy.dc.html`) vinner (D-012): Llegó är sidans primärhandling, "Crear hora flash"
är en pastellruta bland tre likvärdiga snabbåtgärder och den aktiva fliken är
navigationstillstånd, inte en handling — men färgen är densamma. Undantaget gäller bara Hoy.

**Medveten avvikelse (WP-57, ägarens UX-genomgång):** `QuickActionTile` är inte längre 96 px
hög med ikon överst/etikett nederst (ovanstående spec) — snabbknapparna väger lika tungt som
`NextClientCard` annars. Nu en kompakt rad, 52 px hög, ikon + etikett sida vid sida
(`quick-action-tile.tsx`). Samma pasteller/radie (`rounded-tile`), bara höjden och den interna
layouten ändrad.

### Byggt i WP-16

Kundens länk `/r/[token]` (mobil, F7). Härledd — ingen ritad referens (samma läge som
datasteget/bekräftelsen i WP-13): rubrik + `Card radius="tile"` för bokningen, samma
typografiskalor och komponenter som Reserva (Button, Card, TextLink). Ingen egen
`.dc.html`, kortet jämförs mot Reserva-bekräftelsens formspråk (qa-granskning).

| Komponent | Fil | API |
|---|---|---|
| ManageScreen | `src/components/booking/manage-screen.tsx` | `booking` (`ManagedBooking`), `now` (instant, injicerad), `onCancel` — **härledd, ingen referens** |
| CancelDialog | `src/components/booking/cancel-dialog.tsx` | `open`, `onOpenChange`, `onConfirm`; Radix Dialog, samma mönster som `agenda/move-dialog.tsx`s bekräfta-steg (`rounded-panel bg-surface p-6 shadow-popover`) |
| Vy-modell | `src/components/booking/manage-view.ts` | `manageState` (cancelled/past/locked/cancellable), `manageFields`, `mustParseInstant`; re-exporterar `ManagedBooking` (typ) åt `manage-screen.tsx` — filen saknar `"use client"`, så den är den godkända indirektionspunkten förbi `boundaries.test.ts` (samma mönster som `booking/types.ts`, WP-13 item 11) |

**D-030 (samma PR):** e-postfältet i `CustomerForm` (`clienteForm.emailLabel`) är
obligatoriskt i CL (`required` + `aria-required`, `validateEmailFor` i
`client-validation.ts`), frivilligt i SE — `manual-booking-dialog.tsx` (ägarens
manuella bokning) är oförändrad. **Känd brist:** `es-CL.ts`s `clienteForm.emailLabel`
("Correo (opcional)") och `emailAyuda` är inte uppdaterade för CL:s nya obligatoriska
fält (copywriter-es-cl äger `src/i18n/`) — flaggat i PR:en, inte löst här.

### Byggt i WP-40 (Ajustes: kategorier och bokningsformulär, D-031)

Referenser: `.visual-diff/ref/falt-A-bokningsformular.html` (Ajustes → "Formulario de
reserva"), `falt-B-per-tjanst.html` (tjänstens redigering, flik "Frågor vid bokning"),
`falt-kategorier.html` (kategorier + "Gäller för"-panelen). Byggt i `src/components/settings/`
och kompletterar den befintliga, oritade Ajustes-skärmen (WP-15b): sektionerna staplas som kort
i stället för referensens skrivbordsflikar (samma avvikelse som redan fanns för Företaget/
Tjänster/Personal/Öppettider), mobil först.

**Medvetna avvikelser mot referenserna** (ingen `npm run visual` finns för Ajustes, se ovan):
- **Ordning** av kategorier och frågor sker med upp/ner-knappar (`servicios.campos.subirAria`/
  `bajarAria`, redan förberedda text­nycklar) i stället för drag — tillgängligt med tangentbord,
  inget nytt drag-bibliotek.
- **Frågetypen** väljs i en `Select` (samma fält som `falt-B` redan ritar) i stället för
  `falt-A`:s svävande panel med sju knappar — en `<select>` räcker för sju alternativ och är mer
  tillgänglig.
- **Förhandsvisningen** (`question-preview.tsx`) är en egen, enkel telefonmockup — återanvänder
  inte kundens bokningsformulär (byggs parallellt av en annan ui-engineer i `src/components/
  booking/`). Fälten där är medvetet egna, kompakta `<input>`/`<textarea>` i stället för
  `TextField`/`Textarea`/`Select` (de är minst 52 px höga, för stora för en 300 px telefonram).
- **"Quitar" i vy B** tar bara bort tjänsten direkt när frågan redan har ett uttryckligt mål på
  just den tjänsten (`applies_to = 'targets'`); gäller frågan via "alla tjänster" eller via
  kategorin får ägaren ändra "Gäller för" i vy A i stället (`service-questions-tab.tsx`).
- Två `TODO_COPY`-platshållare (inga nya risker, bara text): rubriken på kategorisektionen och
  fliketiketten "Tiempo y precio" i tjänstens redigerare — ingen befintlig nyckel i
  `formulario`/`servicios`/`ajustes` täcker dem, se koden.

| Komponent | Fil | API |
|---|---|---|
| Switch | `src/components/ui/switch.tsx` | `checked`, `onChange`, `label` (blir aria-label), `disabled?`; 40×24, `role="switch"` |
| Chip (ny ton) | `src/components/ui/chip.tsx` | `tone="lavender"` (`bg-lavender text-on-lilac-soft`) — "gäller för"-chippen på en fråga |
| CategorySection | `src/components/settings/category-section.tsx` | skapa/döpa om/ta bort (Radix Dialog-bekräftelse)/ordna kategorier, gruppera tjänster, kategori-`select` per tjänst |
| BookingFormSection | `src/components/settings/booking-form-section.tsx` | vy A: låst rad, förslagsbanner, hela frågekatalogen, förhandsvisning per vald tjänst |
| ServiceQuestionsTab | `src/components/settings/service-questions-tab.tsx` | vy B: frågorna för en tjänst, "+ Från förslag"/"+ Egen fråga", "Quitar" |
| AppliesToPanel | `src/components/settings/applies-to-panel.tsx` | delad "Gäller för"-panel (alla/valda, kategori- och tjänstval, sökfält, `too_many_questions`-fel) |
| QuestionEditor | `src/components/settings/question-editor.tsx` | delat formulär för ny/redigera fråga (alla 7 typer), `footer?` (vy B:s "använd även i andra tjänster") |
| QuestionRow, QuestionPreview, BookingSuggestionsBanner | samma mapp | frågerad, egen förhandsvisning, branschförslagsbanner |
| `booking-form-resolve.ts`, `booking-form-industry.ts`, `booking-form-error-text.ts`, `booking-form-types.ts` | samma mapp | rena klientfunktioner/typer, dubblerade mot `src/server/booking-questions/resolve.ts` respektive `src/server/owner/booking-questions*` (server-only-filer importeras aldrig från klientkod) |

### Byggt i WP-40 (kundsidan och visning av svar)

Kategoriflikar på Reserva (`falt-kategorier.html`, telefonmockupen) och de dynamiska
bokningsfrågorna i `CustomerForm` (`falt-A-bokningsformular.html`, telefonmockupen),
plus visningen av svaren i agenda, Hoy och kundkortet. Ingen skalenlig
mobilreferens finns för de här bitarna (mockuparna är små förhandsvisningar inuti
ägarens inställningsskärmar) — formspråket återanvänder i stället redan godkända
komponenter (Pill, TextField) i full storlek, se filkommentarerna i
`category-tabs.tsx`/`question-field.tsx` för avvägningen mot mockupens mindre chips
och `role="tablist"`.

| Komponent | Fil | API |
|---|---|---|
| CategoryTabs | `src/components/booking/category-tabs.tsx` | `tabs` (`CategoryTab[]`, se `categories.ts`), `selectedId`, `onSelect`; samma Pill/scroll-mönster som `StaffPicker` |
| `categories.ts` | `src/components/booking/categories.ts` | Rena funktioner: `categoryTabs` (döljer flikarna om färre än två grupper har aktiva tjänster), `servicesForCategory` |
| QuestionField | `src/components/booking/question-field.tsx` | `question` (`BookingQuestionDef`), `value`, `onChange`, `error?`, `registerRef` — en renderare per `question_kind` (TextField/Textarea/Pill-grupper) |
| Textarea | `src/components/ui/textarea.tsx` | Samma formspråk som TextField (`label`, `hint?`, `error?`); första användningen är `long_text`-frågor |
| AnswersList | `src/components/booking/answers-list.tsx` | `answers` (`DisplayAnswer[]`), `tone?` (`light`/`dark`); rubrik `formulario.visualizacion.titulo` + en rad per `formulario.visualizacion.par`; delas av `EventPopover` (agenda), `NextClientCard` (Hoy) och `CustomerAnswersCard` |
| `answer-format.ts` | `src/components/booking/answer-format.ts` | `formatAnswerValue`: ja/nej, listor (`multi_choice`) och datum (kalenderdatum utan tidszon) till text |
| CustomerAnswersCard | `src/components/customers/customer-answers-card.tsx` | `data` (`CustomerAnswersView`): senaste värden + historik per bokning. **Förberedd, inte kopplad till någon rutt** — ingen "Clientes"-skärm finns än i kodbasen (varken i BACKLOG eller som en byggd sida); ingen referens att stämma av mot. |

**Data:** `BookingPageData.categories`/`questionsByService` (frivilliga fält,
`src/server/bookings/page-data.ts`), `AgendaBooking.answers`/`HoyBooking.answers`
(frivilliga, batch-hämtade med `listBookingAnswersIn` i `src/server/owner/agenda.ts`/
`hoy.ts`). Ägarens mejl "Tienes una reserva nueva" (`nuevaReservaDueno`) visar
svaren i samma bokningskort (`DuenoReservaData.answers`, `dueno.ts`) — workern
(`src/server/messaging/outbox/worker.ts`) läser dem vid sändning (D-029), aldrig i
`message_outbox.payload` eller i loggar.

## 8. Rörelse

- Övergångar 150–200 ms `ease-out` på färg och bakgrund. **Animera aldrig storlek eller position på klickytor** (hover gör att tryck missar).
- Popover: fade + 4 px förflyttning, 150 ms.
- Respektera `prefers-reduced-motion`.

## 9. Tillgänglighet

- Riktiga `<button>`, `<a>`, `<input>` + `<label>`. `aria-label` på alla ikonknappar. `aria-pressed` på valbara pills. `aria-current="page"` i navigation.
- Text 4.5:1. Färg får aldrig vara enda bäraren av information (chips har text, flash har tagg).
- Fokusring: 2 px `ink` (på mörk yta 2 px `lime`), offset 2.
- SegmentedControl (Radix ToggleGroup `type="single"`) exponerar knapparna som `role="radio"`/
  `aria-checked` i stället för `aria-pressed` som referensens `aria-pressed="true"` antyder.
  Semantiken är likvärdig (ett val av flera) och godkänd av axe (R10, WP-02).

## 10. Språk och format

- UI-text på chilensk spanska (tú-form): "Reservar", "Avísame", "Llegó", "No vino", "Te echamos de menos".
- Datum: "Vie 2 oct", "Viernes 2 de octubre". Vecka börjar måndag. 24-timmarsklocka.
- Tidszon `America/Santiago`. Belopp i CLP utan decimaler.

## 11. Gör / gör inte

| Gör | Gör inte |
|---|---|
| Vita kort utan kant och skugga | Grå kanter runt kort, drop shadows |
| En lime primärhandling per vy | Flera lime knappar bredvid varandra |
| Samma färg för samma funktion överallt | Nya pasteller "för variation" |
| Stora siffror i display-typsnittet | Inter, Roboto, systemtypsnitt i rubriker |
| Radier ur tokens | Egna radievärden (t.ex. `rounded-[13px]`) |
| Lucide-ikoner med rätt stroke | Emoji, fyllda ikoner, blandade ikonset |

## 12. Tokens → klasser (D-015)

**Tailwinds standardtema är nollställt.** `src/styles/tokens.css` sätter
`--color-*: initial; --radius-*: initial; --shadow-*: initial; --text-*: initial;
--tracking-*: initial; --leading-*: initial;` samt `--drop-shadow-*`, `--inset-shadow-*`,
`--text-shadow-*` och `--blur-*` överst i `@theme`, innan projektets egna tokens
definieras. Det gör hård regel 1 ("bara tokens") till något verktygen kontrollerar:

- `bg-white`, `text-sm`, `rounded-lg`, `tracking-tight` genererar **ingen CSS längre** — bara
  namnen i `tokens.css` finns (`bg-surface`, `text-14`, `rounded-card`, `tracking-display` …).
- Spacing (4-bas) och `font-weight` kommer fortfarande från Tailwinds standardtema — de är inte
  nollställda.
- `transparent`, `current` och `rounded-full`/`leading-none` är inte del av de nollställda
  namnrymderna och fungerar som vanligt.
- `npm run lint` fångar hex, `rgb()`/`hsl()`/`oklch()`, godtyckliga `[…]`-värden och
  `(--variabel)`-genvägen i `src/components/` och `src/app/` (`no-restricted-syntax` +
  `better-tailwindcss/no-unknown-classes`). `src/styles/no-raw-values.test.ts` gör samma sak för
  CSS, som ESLint inte läser.

**Opacitet skrivs med Tailwinds modifierare, inte med egna tokens:** `bg-surface/45`, `/38`,
`/35`, `/20`, `bg-ink/18`. Det är inte ett godtyckligt värde (`[...]`-syntax) och triggar inte
lint-regeln ovan.

**Textstorlekar heter efter px** (`text-13`, `text-40` …), med rollnamn bara för de två
bråkstorlekarna (`text-event-title` 12.5px, `text-event-meta` 11.5px). Radavstånd följer inte
automatiskt med storleken — sätt `leading-*` explicit. Rollerna i §3 är fasta klasskombinationer,
inte egna tokens.

**`cn()`** (`src/components/ui/cn.ts`) använder `extendTailwindMerge` för att hålla isär egna
klassgrupper som `text-13` (font-size) och `text-ink` (text-color), annars skulle
`tailwind-merge` tro att de tillhör samma grupp och ta bort den ena (se WP-02 R3). Nya tokens i
`tokens.css` som ska kunna kombineras (nya textstorlekar, färger, radier, tracking, leading)
måste läggas till i motsvarande lista i `cn.ts` i samma PR.

> WP-47: `@custom-variant sheet-closed` (tokens.css) styr bottenarkets utglidning; `use-sheet-drag.ts` ger dra-ner-för-att-stänga. Nya baskomponenter: `Menu`, `Tooltip`, `Time24Input`.

## 13. Startsidan "Foto-berättelse" (WP-71)

Referenser: `docs/design/reference/startsida/` (Konv1 = hero, Flytt = smärtfri flytt, SidaP3 + genpages.py = övriga sektioner). Komponenter i `src/components/marketing/home/`.
Nya tokens i `tokens.css` (finns bara för startsidan): textstorlekar 20/34/52/54/56/60/68, `tracking-hero|headline|label`, `leading-display`, radier `device`, `device-sm`, `screen`, `cta`, `form`, `highlight`, skuggor `float-lg|float-md|soft`, blur `photo|layer`, animationer `marquee-slow`, `drift-1..3`, `pulse-ring`, samt utilities `glass-light`, `glass-dark`, `glass-nav` (liquid glass på foton), `bg-hero-tint(-mobile)`, `bg-photo-tint(-mobile)` (full-bleed foto-hero, WP-75: kant i kant, innehåll i `max-w-360`-container, toning för >= 4.5:1), `bg-cta-tint(-mobile)`, `bg-scrim-bottom`, `bg-flytt-stage`, `object-hero-mobile`.
Foton: `public/marketing/` (Unsplash, se CREDITS.md). Text på foto ligger alltid på en toning (min. 4,5:1).

## 14. Logotyp SE: b-klockan (WP-74, D-049)

Booking Buddys märke: gement **b** med kraftig stam och en rundel som tjock ring med limegröna klockvisare. Källor: `docs/design/brand/*.svg`. Komponenter: `BbMark` (`src/components/ui/bb-mark.tsx`, bara märket) och `BrandLogo` (`variant` full/mark, `tone` auto/light/dark). CL behåller sin logotyp.

- **Ordmärke:** "booking" (600) + "buddy" (800), Bricolage Grotesque, `tracking-headline`, märket till vänster med `gap-2`.
- **Färger:** på ljus yta ink + `flash-dot` (visare, kontrast på ljust); på mörk yta `on-dark` + `lime`. `tone="auto"` följer `data-surface="dark"`.
- **Frizon:** minst märkets halva stamhöjd runt om (ca 0,5 x märkeshöjd). Inga effekter, ingen lime-ruta bakom märket (appikonen undantagen).
- **Minsta storlek:** 16 px favicon (`bb-favicon.svg`), 24 px på skärm (märket), ordmärket minst 19 px text.
- **Ikoner:** `public/brand/` (favicon 16/32, apple 180 utan rundade hörn, 192/512, maskable 512 med säkerhetsmarginal) genereras med `node scripts/gen-brand-icons.mjs`.
- **Mejl:** märket som PNG (`bb-mark-email.png`, hostad på marknadens domän) + ordet som text; alla mallar delar `renderLayout`.

## 15. Guidad visning (WP-72)

Referens: `docs/design/reference/visning/{Main,Mobil,Foretag}.dc.html`. Varm brons/kräm liquid glass.
Nya tokens i `tokens.css`: färgerna `bronze`, `bronze-mid`, `bronze-light`, `tour-ink`, `tour-soft`; skuggorna `spotlight` (enorm box-shadow som dimmar resten) och `row-open` (utfälld tjänsterad); animationerna `tour-in` och `tour-ring`; utilities `tour-glass` (kräm-glas), `tour-bronze`/`tour-bronze-soft` (brons-gradient), `tour-scrim`, `tour-spot` (spotlightens glid via left/top/width/height), `tour-spot-still`, `tour-note` (syns bara när `html[data-tour-on]`), `grid-cols-agenda-demo`.

- `components/tour/guided-tour.tsx`: generisk motor. Mål pekas ut med `data-tour="<namn>"` på riktiga element och mäts med getBoundingClientRect (fixed spotlight, fokusfälla, Esc, pil-tangenter, `aria-modal`). Steg utan mål på sidan hoppas över. Laddas alltid lazy (`tour-loader.tsx` / `next/dynamic`) så /[slug] inte växer (D-039).
- Kundvy: bara på `brand.demoSlug`. Företagsvy: `/ejemplo/negocio` (SE `/exempel/foretag`), statisk mockup (`business-demo.tsx`). Steget "Betalt direkt" (Stripe) finns bara i SE.
- Tjänsterad = accordion (`ProfileServiceList`): namn + längd, initialcirklar för personalen, pris, chevron; utfälld visas beskrivning + "Välj tid". Alla rader börjar hopfällda (referensen visar första raden utfälld som exempeltillstånd).
