/**
 * Initialer till Avatar: "Camila R." → "CR", "Barbería Norte" → "BN".
 *
 * - Första bokstaven i första och sista ordet (ett ord → en bokstav).
 * - Partiklar (de, del, la, las, los, y, e) hoppas över om minst två andra
 *   ord finns kvar ("Barbería de la Esquina" → "BE").
 * - Ord utan bokstav (siffror, skiljetecken) räknas inte.
 * - Accenter och ñ behålls som versaler ("álvaro ñuñez" → "ÁÑ"); indata
 *   normaliseras till NFC, så NFD ger samma resultat.
 * - Tomt eller inga bokstäver → "" (Avatar visar då en ikon).
 */
const PARTICLES = new Set(["de", "del", "la", "las", "los", "y", "e"]);
const FIRST_LETTER = /\p{L}\p{M}*/u;
const HAS_LETTER = /\p{L}/u;

function firstLetter(word: string): string {
  const m = FIRST_LETTER.exec(word);
  return m ? m[0].toUpperCase().normalize("NFC") : "";
}

export function initialsOf(name: string): string {
  const words = name
    .normalize("NFC")
    .split(/\s+/u)
    .filter((w) => HAS_LETTER.test(w));
  if (words.length === 0) return "";
  const main = words.filter((w) => !PARTICLES.has(w.toLowerCase()));
  const pool = main.length >= 2 ? main : words;
  const first = pool[0]!;
  if (pool.length === 1) return firstLetter(first);
  return firstLetter(first) + firstLetter(pool[pool.length - 1]!);
}
