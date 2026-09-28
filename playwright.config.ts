import { defineConfig, devices } from "@playwright/test";

// Portkonvention för parallella worktrees: PORT=31NN, där NN = arbetspaketets nummer
// (t.ex. PORT=3102 för WP-02). Port 3000 är reserverad för huvudworktreen (main).
// Se README "Köra flera agenter parallellt".
const port = Number(process.env.PORT ?? 3000);
const baseURL = process.env.BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      // WP-15: loggar in en ägare en gång (magisk länk mot lokal Supabase + Mailpit) och
      // sparar sessionen (storageState) för desktop/mobile — se e2e/auth.setup.ts. Filnamnet
      // (*.setup.ts, inte *.spec.ts) räcker för att desktop/mobile inte också kör den som ett
      // vanligt test (Playwrights standard testMatch är bara *.spec.ts/*.test.ts).
      //
      // Kräver BASE_URL=http://127.0.0.1:<port> (inte "localhost"): Supabases lokala
      // auth.site_url är satt till 127.0.0.1 (supabase/config.toml), så sessionscookien
      // sätts på den domänen — "localhost" skulle vara en annan cookie-origin och tappa
      // sessionen mellan setup och desktop/mobile.
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        storageState: "playwright/.auth/owner.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 360, height: 800 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
        storageState: "playwright/.auth/owner.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: process.env.CI
      ? `npm run start -- -p ${port}`
      : `npm run build && npm run start -- -p ${port}`,
    url: baseURL,
    // Bara återanvänd en server som redan körs om det uttryckligen begärs.
    // I en värld med flera worktrees kan port 3000 annars av misstag återanvändas
    // från en annan worktree, och testerna skulle testa fel kod.
    reuseExistingServer: process.env.PW_REUSE_SERVER === "1",
    timeout: 180_000,
  },
});
