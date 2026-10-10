// WP-74 (D-049): genererar SE:s favicon/appikoner/mejlmärke som PNG ur docs/design/brand/*.svg.
// Körs manuellt (`node scripts/gen-brand-icons.mjs`), PNG:erna checkas in under public/brand/.
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const dir = new URL("../docs/design/brand/", import.meta.url);
const out = new URL("../public/brand/", import.meta.url);
const read = (f) => readFileSync(new URL(f, dir), "utf8");
const png = async (svg, size, file) =>
  writeFileSync(
    new URL(file, out),
    await sharp(Buffer.from(svg), { density: 600 })
      .resize(size, size)
      .png()
      .toBuffer(),
  );

// Glyfen (b + klockvisare) ur app-ikonen, för full-bleed-varianter utan rundade hörn.
const glyph = read("bb-app-icon.svg").match(/<g [\s\S]*<\/g>/)[0];
const inner = glyph.replace(/^<g [^>]*>/, "").replace(/<\/g>$/, "");
const square = (scale) => {
  const tx = 32 - 32.75 * scale;
  const ty = 32 - 31.75 * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#16161A"/><g transform="translate(${tx} ${ty}) scale(${scale})">${inner}</g></svg>`;
};

await png(read("bb-favicon.svg"), 32, "bb-favicon-32.png");
await png(read("bb-favicon.svg"), 16, "bb-favicon-16.png");
await png(square(0.8), 180, "bb-apple-180.png");
await png(read("bb-app-icon.svg"), 192, "bb-icon-192.png");
await png(read("bb-app-icon.svg"), 512, "bb-icon-512.png");
await png(square(0.62), 512, "bb-icon-maskable-512.png");
await png(read("bb-mark.svg"), 112, "bb-mark-email.png");
console.log("klart");
