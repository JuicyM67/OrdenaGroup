import "server-only";

/**
 * Stadsdel/ort → `area_slug` (`businesses.area_slug`, CHECK
 * `^[a-z0-9]([a-z0-9-]{0,58}[a-z0-9])?$`): diakritiska tecken bort
 * ("Södermalm" → "sodermalm", "Ñuñoa" → "nunoa"), allt annat än a–z/0–9
 * blir bindestreck. `null` om inget återstår.
 */
export function areaSlug(name: string): string | null {
  const s = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return s === "" ? null : s;
}

/** Nominatims `address`-objekt: närmaste meningsfulla stadsdel/ort först. */
export function pickAreaName(
  address: Readonly<Record<string, string | undefined>>,
): string | null {
  for (const key of [
    "suburb",
    "city_district",
    "quarter",
    "neighbourhood",
    "town",
    "city",
    "municipality",
    "village",
  ]) {
    const v = address[key]?.trim();
    if (v) return v.slice(0, 80);
  }
  return null;
}
