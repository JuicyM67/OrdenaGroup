// Typsnitten i skylteditorn (WP-96, D-080), via next/font (självhostade, SIL OFL via Google
// Fonts). Importeras bara av skyltarna, så de laddas bara på fliken QR och utskriftssidan.
// Variablerna kopplas ihop med `cartel-fuente-*` i src/styles/carteles.css. "moderna"
// använder appens egna Bricolage + Jakarta (src/app/fonts.ts, alltid laddade).
import {
  Cormorant_Garamond,
  Great_Vibes,
  Jost,
  Playfair_Display,
  Quicksand,
} from "next/font/google";

const jost = Jost({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-cartel-jost",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "500", "700"],
  variable: "--font-cartel-cormorant",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-cartel-playfair",
});

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-cartel-great-vibes",
});

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-cartel-quicksand",
});

/** Klasserna som gör typsnittsvariablerna tillgängliga i skylten. */
export const CARTEL_FONT_VARIABLES = [
  jost.variable,
  cormorant.variable,
  playfair.variable,
  greatVibes.variable,
  quicksand.variable,
].join(" ");
