import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { reserva } from "../src/i18n";

/**
 * Reserva mot riktig data (WP-20): `/barberia-norte` är seed-företaget
 * (`supabase/seed.sql`), inte en fixture. Tiderna räknas av schemamotorn i
 * realtid (öppettider, lunch, befintliga bokningar), så testerna här väljer
 * "första lediga dag/tid" i stället för fasta datum/klockslag — till
 * skillnad från `e2e/design-lab-reserva.spec.ts`, som fortfarande har kvar
 * de exakta fixture-daterade flödestesterna (väntelistan, samtidighet,
 * tangentbord, tidszon, dubbelklick, nätverksfel …) oförändrade i sak.
 */

test.describe("Reserva (riktig data) — /barberia-norte", () => {
  test("hela flödet: tjänst → dag → hora → uppgifter → bekräftelse (riktig bokning i databasen)", async ({
    page,
  }) => {
    await page.goto("/barberia-norte");
    await expect(
      page.getByRole("heading", { name: "Barbería Norte" }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Corte clásico/ }).click();
    await expect(
      page.getByRole("button", { name: /Corte clásico/ }),
    ).toHaveAttribute("aria-pressed", "true");

    // Första lediga dagen (schemamotorn, "Cualquiera" är förvalt) — seedens
    // öppettider (mån–lör 10:00–19:00, 21 dagars fönster) ger alltid minst en.
    const daySection = page.locator('[aria-labelledby="paso-dia-hora"]');
    const firstDay = daySection.getByRole("button").first();
    await firstDay.waitFor();
    await firstDay.click();

    const firstTime = page
      .getByRole("button", { name: /Elegir la hora/ })
      .first();
    await firstTime.waitFor();
    await firstTime.click();

    await page
      .getByRole("button", { name: reserva.bookingBar.ctaReservar })
      .click();

    await expect(
      page.getByRole("heading", { name: reserva.clienteForm.titulo }),
    ).toBeVisible();
    await page
      .getByLabel(reserva.clienteForm.nombreLabel)
      .fill("Cliente Playwright");
    await page
      .getByLabel(reserva.clienteForm.telefonoLabel)
      .fill("+56 9 1234 5678");
    await page
      .getByRole("checkbox", {
        name: new RegExp(reserva.consentimientos.terminos.slice(0, 20)),
      })
      .check();
    await page
      .getByRole("button", { name: reserva.antesDeConfirmar.ctaConfirmar })
      .click();

    // Bekräftelsen nås bara efter att `createBooking` (motorn) faktiskt
    // skrev en rad i `bookings` — se `src/server/bookings/submit.db.test.ts`
    // för att den skrivningen (plus samtycket på kundraden) verkligen sker.
    await expect(
      page.getByRole("heading", { name: reserva.confirmacion.titulo }),
    ).toBeVisible();
  });

  test("okänd slug ger 404 med paginaNoExiste", async ({ page }) => {
    const response = await page.goto("/finns-inte");
    expect(response?.status()).toBe(404);
    await expect(page.getByText(reserva.vacios.paginaNoExiste)).toBeVisible();
  });

  test("360 px: ingen horisontell scroll på /barberia-norte", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "bara relevant i mobilprojektet (360 px)");
    await page.goto("/barberia-norte");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(true);
  });

  test("inga hydreringsfel: tom pageerror/console-error-lista", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => {
      errors.push(String(err));
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/barberia-norte");
    await page.waitForLoadState("networkidle");

    expect(errors).toEqual([]);
  });

  test("axe: /barberia-norte utan överträdelser", async ({ page }) => {
    await page.goto("/barberia-norte");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe("Reserva (riktig data) — prestanda (FRÅGA 7)", () => {
  // Budget (godkänd av ägaren): ≤ 170 kB gzip JS för /[slug], första tjänsten
  // klickbar inom 3,5 s, 4G (150 ms RTT, 1,6 Mbit/s ned / 750 kbit/s upp) och
  // 4x CPU-strypning via CDP. Bara Chromium har CDP.
  const JS_BUDGET_BYTES = 170 * 1024;
  const TIME_BUDGET_MS = 3500;

  test("4G + 4x CPU: JS ≤ 170 kB gzip och tjänsten klickbar inom 3,5 s", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "CDP finns bara i Chromium");

    const client = await page.context().newCDPSession(page);
    await client.send("Network.enable");
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });

    const jsRequests = new Map<string, boolean>();
    let jsBytes = 0;
    client.on("Network.responseReceived", (e) => {
      const mime = e.response.mimeType ?? "";
      if (mime.includes("javascript")) jsRequests.set(e.requestId, true);
    });
    client.on("Network.loadingFinished", (e) => {
      if (jsRequests.has(e.requestId)) jsBytes += e.encodedDataLength;
    });

    const start = Date.now();
    await page.goto("/barberia-norte", { waitUntil: "load" });
    const service = page.getByRole("button", { name: /Corte clásico/ });
    await service.click();
    await expect(service).toHaveAttribute("aria-pressed", "true");
    const elapsedMs = Date.now() - start;

    // Låt sista `loadingFinished`-events hinna fram innan vi summerar.
    await page.waitForTimeout(200);

    // Rapportera siffrorna oavsett utfall (planens R "gissa inte").
    console.log(
      `[prestanda] JS: ${(jsBytes / 1024).toFixed(1)} kB gzip (budget ${JS_BUDGET_BYTES / 1024} kB), tid: ${elapsedMs} ms (budget ${TIME_BUDGET_MS} ms)`,
    );

    expect(
      jsBytes,
      `JS-storlek ${(jsBytes / 1024).toFixed(1)} kB över budgeten ${JS_BUDGET_BYTES / 1024} kB`,
    ).toBeLessThanOrEqual(JS_BUDGET_BYTES);
    expect(
      elapsedMs,
      `Tid ${elapsedMs} ms över budgeten ${TIME_BUDGET_MS} ms`,
    ).toBeLessThanOrEqual(TIME_BUDGET_MS);
  });
});
