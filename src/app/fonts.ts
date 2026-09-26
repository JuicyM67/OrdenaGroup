import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";

// Variabel vikt med opsz-axel (D-015-spiken, WP-02 steg 0): referenserna laddar Bricolage
// med `opsz,wght@12..96`. Utan opsz-axeln avviker display-texten 7–29 % i utsnitt som
// "Octubre 2026" (30px) och "−20%" (118px), långt över 0,5 %-tröskeln i FRÅGA 4.
export const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
  variable: "--font-bricolage",
});

export const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
});
