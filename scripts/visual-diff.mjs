// Visuell jämförelse: design lab vs referensbilder.
// Kräver: npm i -D playwright pixelmatch pngjs   (och `npx playwright install chromium`)
// Kör:    npm run visual            (lägg "visual": "node scripts/visual-diff.mjs" i package.json)
//         npm run visual -- agenda  (bara en skärm)
import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const THRESHOLD = Number(process.env.VISUAL_MAX_DIFF ?? 0.02); // max 2 % avvikande pixlar

const screens = [
  { name: "main", url: "/design-lab/main", width: 1440, height: 900, ref: "Main.png" },
  { name: "agenda", url: "/design-lab/agenda", width: 1440, height: 900, ref: "Agenda.png" },
  { name: "reserva", url: "/design-lab/reserva", width: 390, height: 1060, ref: "Reserva.png" },
  { name: "hoy", url: "/design-lab/hoy", width: 390, height: 844, ref: "Hoy.png" },
  { name: "hora-flash", url: "/design-lab/hora-flash", width: 360, height: 640, ref: "HoraFlash.png" },
];

const only = process.argv[2];
const outDir = ".visual-diff";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
let failed = 0;

for (const s of screens.filter((x) => !only || x.name === only)) {
  const refPath = path.join("docs/design/screens", s.ref);
  if (!fs.existsSync(refPath)) {
    console.log(`– ${s.name}: referensbild saknas (${refPath}), hoppar över`);
    continue;
  }
  const ref = PNG.sync.read(fs.readFileSync(refPath));
  const scale = ref.width / s.width; // referensen kan vara exporterad i 2x
  const page = await browser.newPage({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: scale });
  await page.goto(BASE + s.url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const shotPath = path.join(outDir, `${s.name}.actual.png`);
  await page.screenshot({ path: shotPath, clip: { x: 0, y: 0, width: s.width, height: s.height } });
  await page.close();

  const actual = PNG.sync.read(fs.readFileSync(shotPath));
  const w = Math.min(ref.width, actual.width), h = Math.min(ref.height, actual.height);
  const crop = (img) => { const out = new PNG({ width: w, height: h }); PNG.bitblt(img, out, 0, 0, w, h, 0, 0); return out; };
  const a = crop(ref), b = crop(actual), diff = new PNG({ width: w, height: h });
  const bad = pixelmatch(a.data, b.data, diff.data, w, h, { threshold: 0.1 });
  fs.writeFileSync(path.join(outDir, `${s.name}.diff.png`), PNG.sync.write(diff));
  const ratio = bad / (w * h);
  const ok = ratio <= THRESHOLD && ref.width === actual.width && ref.height === actual.height;
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${s.name}: ${(ratio * 100).toFixed(2)} % avvikelse${ref.width !== actual.width || ref.height !== actual.height ? " (storleken skiljer sig)" : ""} → ${outDir}/${s.name}.diff.png`);
}

await browser.close();
process.exit(failed ? 1 : 0);
