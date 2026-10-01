import "server-only";

/**
 * Typsnitt för `ImageResponse` (Satori): ingen DOM/CSS-kaskad, `next/font`
 * (som `src/app/fonts.ts` använder för resten av appen) fungerar inte här —
 * Satori tar bara emot råa typsnittsfiler via `fonts`-alternativet. Samma
 * Google Fonts-familjer som referensen (`docs/design/reference/
 * HoraFlash.dc.html`): Bricolage Grotesque (siffror/rubriker) och Plus
 * Jakarta Sans (brödtext). Hämtas vid anropstillfället (inget typsnitt
 * bundlat i repot) och cachas per processinstans (`FONT_CACHE`) — en kall
 * start gör upp till fyra hämtningar, varma anrop noll.
 *
 * Misslyckas en hämtning (nätverk nere, Google Fonts otillgängligt) faller
 * `storyFont` tillbaka på `undefined`: Satori ritar då texten i sitt eget
 * standardtypsnitt i stället för att hela bilden misslyckas — datan
 * (pris/datum/rabatt) är det som måste synas, inte typografin.
 */

/** Satoris (`next/og`) tillåtna vikter — bara dessa, inte `number`. */
type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export type GoogleFont = {
  name: string;
  data: ArrayBuffer;
  weight: FontWeight;
  style: "normal";
};

const FONT_CACHE = new Map<string, Promise<ArrayBuffer | null>>();

async function fetchFontData(
  family: string,
  weight: FontWeight,
): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      family,
    )}:wght@${weight}&display=swap`;
    const css = await fetch(cssUrl, {
      headers: {
        // CSS2 sin User-Agent moderno devuelve woff2 (que `next/og` sabe
        // decodificar); con uno antiguo se podría pedir ttf, pero no hace
        // falta acá.
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    }).then((r) => r.text());
    const match = /src: url\(([^)]+)\) format\('(?:woff2|truetype|opentype)'\)/.exec(
      css,
    );
    const fontUrl = match?.[1];
    if (!fontUrl) return null;
    const res = await fetch(fontUrl);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

function cached(
  family: string,
  weight: FontWeight,
): Promise<ArrayBuffer | null> {
  const key = `${family}:${weight}`;
  const hit = FONT_CACHE.get(key);
  if (hit) return hit;
  const p = fetchFontData(family, weight);
  FONT_CACHE.set(key, p);
  return p;
}

/** Hämtar vikterna som `route.tsx` behöver, parallellt. `null` för en vikt
 * som inte gick att hämta (utelämnas ur `fonts`-listan, se filkommentaren). */
export async function loadStoryFonts(): Promise<GoogleFont[]> {
  const specs: readonly { name: string; family: string; weight: FontWeight }[] = [
    { name: "Bricolage Grotesque", family: "Bricolage Grotesque", weight: 700 },
    { name: "Bricolage Grotesque", family: "Bricolage Grotesque", weight: 800 },
    { name: "Plus Jakarta Sans", family: "Plus Jakarta Sans", weight: 400 },
    { name: "Plus Jakarta Sans", family: "Plus Jakarta Sans", weight: 600 },
    { name: "Plus Jakarta Sans", family: "Plus Jakarta Sans", weight: 700 },
  ];
  const datas = await Promise.all(specs.map((s) => cached(s.family, s.weight)));
  const fonts: GoogleFont[] = [];
  for (const [i, data] of datas.entries()) {
    if (!data) continue;
    const spec = specs[i]!;
    fonts.push({ name: spec.name, data, weight: spec.weight, style: "normal" });
  }
  return fonts;
}
