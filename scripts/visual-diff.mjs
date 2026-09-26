// Visuell jämförelse: design lab vs referensbilder.
// Kräver: npm i -D playwright pixelmatch pngjs   (och `npx playwright install chromium`)
// Kör:    npm run visual                    (hela skärmarna + alla utsnitt, se README "Design lab")
//         npm run visual -- agenda          (bara en skärm)
//         npm run visual -- components      (bara utsnitten i design-lab/crops/crops.json, WP-02 steg 7)
//         npm run visual -- main-navrail    (bara ett enskilt utsnitt, samma id som i crops.json)
//
// Miljövariabler:
//   BASE_URL           bas-url för servern som redan kör (standard http://localhost:${PORT ?? 3000},
//                      så samma PORT som `npm run dev`/`test:e2e` används per worktree)
//   PORT                se ovan
//   VISUAL_MAX_DIFF    max andel avvikande pixlar, 0–1 (standard 0.02 = 2 %)
//   VISUAL_STRICT=1    en design lab-sida som svarar 404 räknas som fel i stället för
//                      "– pendiente" (används när WP-11–14 är klara och alla fem skärmar finns)
import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
const THRESHOLD = Number(process.env.VISUAL_MAX_DIFF ?? 0.02); // max 2 % avvikande pixlar
const STRICT = process.env.VISUAL_STRICT === "1";

// Hela skärmarna (WP-11–14). "– pendiente" (varken ✓ eller ✗) tills routen finns, om inte STRICT.
const screens = [
  { name: "main", url: "/design-lab/main", width: 1440, height: 900, ref: "Main.png" },
  { name: "agenda", url: "/design-lab/agenda", width: 1440, height: 900, ref: "Agenda.png" },
  { name: "reserva", url: "/design-lab/reserva", width: 390, height: 1060, ref: "Reserva.png" },
  { name: "hoy", url: "/design-lab/hoy", width: 390, height: 844, ref: "Hoy.png" },
  { name: "hora-flash", url: "/design-lab/hora-flash", width: 360, height: 640, ref: "HoraFlash.png" },
];

// Viewport per referensskärm, för utsnitten (WP-02 steg 7). Måste matcha screens ovan så att
// crop.json:s koordinater (räknade ur samma dc.html-layout) landar rätt.
const screenViewport = {
  "Main.png": { width: 1440, height: 900 },
  "Agenda.png": { width: 1440, height: 900 },
  "Reserva.png": { width: 390, height: 1060 },
  "Hoy.png": { width: 390, height: 844 },
  "HoraFlash.png": { width: 360, height: 640 },
};

const cropsPath = path.join(__dirname, "../src/app/design-lab/crops/crops.json");
const crops = fs.existsSync(cropsPath) ? JSON.parse(fs.readFileSync(cropsPath, "utf8")) : [];

const cropItems = crops.map((c) => ({
  name: c.id,
  url: `/design-lab/crops/${c.id}`,
  ...screenViewport[c.ref],
  ref: c.ref,
  clip: c.clip,
  group: "components",
}));
const screenItems = screens.map((s) => ({ ...s, group: "screens" }));

const only = process.argv[2];
let items;
if (!only) {
  items = [...screenItems, ...cropItems];
} else if (only === "components") {
  items = cropItems;
} else {
  // Ett enskilt namn kan vara antingen en hel skärm (main, agenda …) eller ett utsnitts-id
  // (main-navrail, agenda-calendar …) — sök i båda listorna.
  items = [...screenItems, ...cropItems].filter((i) => i.name === only);
  if (items.length === 0) {
    const known = [...screenItems.map((s) => s.name), "components", ...cropItems.map((c) => c.name)];
    console.error(
      `✗ okänt namn "${only}". Giltiga värden: ${known.join(", ")}.`,
    );
    process.exit(1);
  }
}

const outDir = ".visual-diff";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
let failed = 0;
let pending = 0;

for (const item of items) {
  const refPath = path.join("docs/design/screens", item.ref);
  if (!fs.existsSync(refPath)) {
    console.log(`– ${item.name}: referensbild saknas (${refPath}), hoppar över`);
    continue;
  }
  const ref = PNG.sync.read(fs.readFileSync(refPath));
  const scale = ref.width / item.width; // referensen är exporterad i Nx (normalt 2x)
  if (!Number.isInteger(scale)) {
    console.error(
      `✗ ${item.name}: skalan (${scale}) är inte ett heltal — ref.width=${ref.width}, viewport=${item.width}. Kontrollera crops.json/screens.`,
    );
    await browser.close();
    process.exit(1);
  }

  const page = await browser.newPage({
    viewport: { width: item.width, height: item.height },
    deviceScaleFactor: scale,
  });
  const response = await page.goto(BASE + item.url, { waitUntil: "networkidle" });
  if (response?.status() === 404) {
    await page.close();
    if (STRICT) {
      failed++;
      console.log(`✗ ${item.name}: 404 (VISUAL_STRICT=1)`);
    } else {
      pending++;
      console.log(`– ${item.name}: pendiente (404)`);
    }
    continue;
  }
  await page.evaluate(() => document.fonts.ready);

  const shotPath = path.join(outDir, `${item.name}.actual.png`);
  const clip = item.clip ?? { x: 0, y: 0, width: item.width, height: item.height };
  await page.screenshot({ path: shotPath, clip });
  await page.close();

  const actual = PNG.sync.read(fs.readFileSync(shotPath));
  const refClip = {
    x: Math.round(clip.x * scale),
    y: Math.round(clip.y * scale),
    width: Math.round(clip.width * scale),
    height: Math.round(clip.height * scale),
  };
  const w = Math.min(refClip.width, actual.width);
  const h = Math.min(refClip.height, actual.height);
  const cropRef = new PNG({ width: w, height: h });
  PNG.bitblt(ref, cropRef, refClip.x, refClip.y, w, h, 0, 0);
  const cropActual = new PNG({ width: w, height: h });
  PNG.bitblt(actual, cropActual, 0, 0, w, h, 0, 0);

  const diff = new PNG({ width: w, height: h });
  const bad = pixelmatch(cropRef.data, cropActual.data, diff.data, w, h, { threshold: 0.1 });
  fs.writeFileSync(path.join(outDir, `${item.name}.diff.png`), PNG.sync.write(diff));
  const ratio = bad / (w * h);
  const sizeOk = refClip.width === actual.width && refClip.height === actual.height;
  const ok = ratio <= THRESHOLD && sizeOk;
  if (!ok) failed++;
  console.log(
    `${ok ? "✓" : "✗"} ${item.name}: ${(ratio * 100).toFixed(2)} % avvikelse${sizeOk ? "" : ` (storleken skiljer sig: ref ${refClip.width}x${refClip.height} vs actual ${actual.width}x${actual.height})`} → ${outDir}/${item.name}.diff.png`,
  );
}

await browser.close();
if (pending > 0) {
  console.log(`\n${pending} sida(or) pendiente (404, WP-11–14 inte klara än). VISUAL_STRICT=1 gör detta till fel.`);
}
process.exit(failed ? 1 : 0);
