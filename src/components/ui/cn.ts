// Slår ihop klasser (clsx) och löser Tailwind-konflikter (tailwind-merge).
// Tailwinds standardtema är nollställt (D-015, tokens.css @theme), så tailwind-merge
// känner inte igen våra egna klassnamn (text-13, rounded-card, tracking-display …) som
// hörande till samma grupp som t.ex. text-ink. Utan den här listan skulle t.ex.
// cn("text-13", "text-ink") tappa "text-13" (R3, WP-02 steg 0.3).
// Håll listorna i synk med src/styles/tokens.css.
import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const fontSizes = [
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "22",
  "24",
  "26",
  "28",
  "30",
  "32",
  "38",
  "40",
  "44",
  "118",
  "event-title",
  "event-meta",
];

const colors = [
  "canvas",
  "surface",
  "line",
  "line-strong",
  "border",
  "ink",
  "ink-soft",
  "night",
  "dark",
  "dark-2",
  "dark-line",
  "dark-border",
  "muted",
  "subtle",
  "on-dark",
  "on-dark-soft",
  "on-dark-muted",
  "on-dark-subtle",
  "on-dark-faint",
  "lime",
  "lilac",
  "lilac-50",
  "lilac-100",
  "peach",
  "peach-50",
  "sky",
  "lavender",
  "mint",
  "lime-50",
  "violet",
  "blocked",
  "stripe",
  "flash-dot",
  "full-dot",
  "on-lilac-soft",
  "on-peach-soft",
  "on-lime-soft",
  "success-bg",
  "success-fg",
  "deposit-bg",
  "deposit-fg",
  "pending-bg",
  "pending-fg",
  "alert",
  "staff-1",
  "staff-2",
  "staff-3",
  "staff-4",
  "staff-5",
  "staff-6",
];

const radii = [
  "shell",
  "hero",
  "card",
  "tile",
  "icon",
  "control",
  "avatar",
  "event",
  "chip",
  "panel",
  "bar",
  "badge",
  "tag",
];

const tracking = ["display", "title", "mega", "caps"];

const leading = ["mega", "hero", "snug", "event", "body", "relaxed"];

/** @utility-klasserna i tokens.css (bg-agenda, bg-closed-stripes). */
const bgImages = ["agenda", "closed-stripes"];

/** --shadow-* i tokens.css utöver Tailwinds inbyggda "", "inner", "none". */
const shadows = ["popover", "glass"];

/** --blur-* i tokens.css (D-015 nollställer den; "glass" är första undantaget, navet). */
const blurs = ["glass"];

// Tailwind har en klassgrupp per sida/hörn för border-radius (rounded-t-*, rounded-tl-* …).
// Våra radie-tokens ska gå att kombinera/ersätta i alla dessa, inte bara den logiska
// (ingen sida angiven) gruppen "rounded".
const roundedSideGroups = [
  "rounded-s",
  "rounded-e",
  "rounded-t",
  "rounded-r",
  "rounded-b",
  "rounded-l",
  "rounded-ss",
  "rounded-se",
  "rounded-ee",
  "rounded-es",
  "rounded-tl",
  "rounded-tr",
  "rounded-br",
  "rounded-bl",
] as const;

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: fontSizes }],
      "text-color": [{ text: colors }],
      "bg-color": [{ bg: colors }],
      "bg-image": [{ bg: bgImages }],
      "border-color": [{ border: colors }],
      shadow: [{ shadow: shadows }],
      blur: [{ blur: blurs }],
      "backdrop-blur": [{ "backdrop-blur": blurs }],
      rounded: [{ rounded: radii }],
      ...Object.fromEntries(
        roundedSideGroups.map((group) => [group, [{ [group]: radii }]]),
      ),
      tracking: [{ tracking: tracking }],
      leading: [{ leading: leading }],
    },
  },
});

/** Slår ihop villkorliga klasser (clsx) och löser Tailwind-konflikter (tailwind-merge). */
export function cn(...inputs: ClassValue[]): string {
  return customTwMerge(clsx(inputs));
}
