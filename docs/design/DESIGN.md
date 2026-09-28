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
| time-xl | `font-display text-44 leading-none font-semibold tracking-display` |
| day-number (desktop) | `font-display text-30 font-bold tracking-display` |
| day-number (mobil) | `font-display text-22 font-bold` |
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

## 5. Form och luft

- Radier: se tokens (`shell` 32 → `chip` 10). Tumregel: ju större yta, desto större radie. Cirkelformade knappar för ikonknappar (48×48) och avatarer.
- Mellanrum: 4-bas. Standardgap: 8, 10, 12, 16, 20, 24. Panelpadding desktop 28/32, kortpadding 20/22, mobilpadding 20.
- Klickytor ≥ 44 px (ikonknappar 48, primärknappar 48–52 höga).

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
| **SegmentedControl** | Container vit 45 % opacitet, padding 4, radie 16. Knappar 96×36, radie 12. Vald = vit. | Agenda |
| **DayPill (desktop)** | Höjd 72, radie 16, bg vit 38 %. Idag = vit, dag + siffra i `violet`. Stängd dag = vit 20 %. | Agenda |
| **WeekGrid** | Vit panel radie 22. Timme = 94 px, tidskolumn 64. Linjer `line`. Dagkolumner flex-1 med border-left `line`. Nu-linje 2 px `alert` med prick 10 px. Stängd dag: randigt mönster + "Cerrado". | Agenda |
| **EventBlock** | Absolut positionerad, inset 5 px, radie 12, padding 7/9. Bakgrund = personalens färg. Flash = lime + svart tagg "Flash −20%". Från väntelista = peach + tagg "Lista de espera". Blockering = `#F1F1EE`, text muted. Vald = 2 px ink-kant. Tid visas om höjd ≥ 44, avatar om ≥ 96. | Agenda |
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
| Button | `src/components/ui/button.tsx` | `variant` (primary/secondary/accent/outline-dark/inverse), `size` (xs…2xl), `asChild` (Radix Slot) |
| IconButton | `src/components/ui/icon-button.tsx` | `label` (obligatorisk, blir aria-label), `tone`, `size`, `shape`, `badge?`, `asChild?` (Radix Slot, WP-11; stöds inte tillsammans med `badge`) |
| Chip | `src/components/ui/chip.tsx` | `tone` (…/peach-50, WP-11), `size` (md/sm/xs/tag/trend/badge, WP-11), `weight` (default/bold, WP-11, läggs efter `size` så `cn()` låter `font-bold` vinna), inget eget utsnitt (se steg 7) |
| Pill | `src/components/ui/pill.tsx` | `selected`, `aria-pressed` |
| Card | `src/components/ui/card.tsx` | `as`, `tone`, `radius`, `padding`; mörka toner sätter `data-surface="dark"` |
| Avatar | `src/components/ui/avatar.tsx` | `initials`, `shape`, `size`, `tone` |
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

_Fylls i av WP-12._

### Byggt i WP-13

_Fylls i av WP-13._

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
