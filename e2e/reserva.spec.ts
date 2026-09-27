import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { errores, reserva } from "../src/i18n";

const ESTADOS = [
  "estandar",
  "normal",
  "lleno",
  "lista-unida",
  "lista-duplicada",
  "sin-seleccion",
  "datos",
  "datos-lista",
  "datos-errores",
  "enviando",
  "slot-tomado",
  "error-red",
  "sin-conexion",
  "confirmacion",
  "cargando",
  "sin-horas-dia",
  "sin-horas-rango",
  "sin-servicios",
  "no-disponible",
];

async function selectService(page: Page, name: RegExp) {
  await page.getByRole("button", { name }).first().click();
}

async function selectDay(page: Page, ariaLabel: string) {
  await page.getByRole("button", { name: ariaLabel, exact: false }).click();
}

test.describe("Reserva — flödet", () => {
  test("hela flödet på högst 3 skärmar: val → uppgifter → bekräftelse", async ({
    page,
  }) => {
    await page.goto("/barberia-norte");

    // Skärm 1: valen.
    await expect(
      page.getByRole("heading", { name: "Barbería Norte" }),
    ).toBeVisible();
    await selectService(page, /Corte \+ barba/);
    await expect(
      page.getByRole("button", { name: /Corte \+ barba/ }),
    ).toHaveAttribute("aria-pressed", "true");

    await selectDay(page, "Martes 6 de octubre");
    await page.getByRole("button", { name: /Elegir la hora 11:30/ }).click();

    await page
      .getByRole("button", { name: reserva.bookingBar.ctaReservar })
      .click();

    // Skärm 2: uppgifter.
    await expect(
      page.getByRole("heading", { name: reserva.clienteForm.titulo }),
    ).toBeVisible();
    await page.getByLabel(reserva.clienteForm.nombreLabel).fill("Joaquín Soto");
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

    // Skärm 3: bekräftelse.
    await expect(
      page.getByRole("heading", { name: reserva.confirmacion.titulo }),
    ).toBeVisible();
  });

  test("väntelistan: dag full → kort → Avísame → formulär → Unirme → En la lista", async ({
    page,
  }) => {
    await page.goto("/barberia-norte");
    await selectService(page, /Corte \+ barba/);
    await selectDay(page, "Sábado 3 de octubre");

    await expect(
      page.getByText(reserva.waitlist.diaLleno({ dia: "sábado" })),
    ).toBeVisible();

    await page
      .getByRole("button", { name: reserva.waitlist.ctaAvisame })
      .click();
    await expect(
      page.getByRole("heading", { name: reserva.clienteForm.titulo }),
    ).toBeVisible();

    await page.getByLabel(reserva.clienteForm.nombreLabel).fill("Camila Ríos");
    await page
      .getByLabel(reserva.clienteForm.telefonoLabel)
      .fill("+56 9 8765 4321");
    await page
      .getByRole("checkbox", {
        name: new RegExp(reserva.terminosListaEspera.slice(0, 15)),
      })
      .check();
    await page
      .getByRole("button", { name: reserva.waitlist.ctaUnirme })
      .click();

    await expect(page.getByText(reserva.waitlist.listo)).toBeVisible();
    await expect(
      page.getByRole("button", { name: reserva.waitlist.ctaEnLaLista }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  test("samtycken är okryssade från början; submit utan villkor ger fel", async ({
    page,
  }) => {
    await page.goto("/barberia-norte");
    await selectService(page, /Corte clásico/);
    await selectDay(page, "Viernes 2 de octubre");
    await page.getByRole("button", { name: /Elegir la hora 10:00/ }).click();
    await page
      .getByRole("button", { name: reserva.bookingBar.ctaReservar })
      .click();

    const terms = page.getByRole("checkbox").first();
    const marketing = page.getByRole("checkbox").nth(1);
    await expect(terms).not.toBeChecked();
    await expect(marketing).not.toBeChecked();

    await page.getByLabel(reserva.clienteForm.nombreLabel).fill("Ana Pérez");
    await page
      .getByLabel(reserva.clienteForm.telefonoLabel)
      .fill("+56 9 1234 5678");
    await page
      .getByRole("button", { name: reserva.antesDeConfirmar.ctaConfirmar })
      .click();

    await expect(
      page.getByText(errores.reserva.consentimientoRequerido),
    ).toBeVisible();
    await expect(terms).not.toBeChecked();
  });

  const PHONE_CASES: readonly [string, string][] = [
    ["", errores.reserva.telefono.empty],
    ["+56 9 1234 abcd", errores.reserva.telefono.invalid_chars],
    ["+54 9 11 1234 5678", errores.reserva.telefono.not_chilean],
    ["+56 9 1234 567", errores.reserva.telefono.invalid_length],
    ["+56 2 2123 4567", errores.reserva.telefono.not_mobile],
  ];

  for (const [value, message] of PHONE_CASES) {
    test(`teléfono "${value || "(vacío)"}" muestra "${message}"`, async ({
      page,
    }) => {
      await page.goto("/barberia-norte");
      await selectService(page, /Corte clásico/);
      await selectDay(page, "Viernes 2 de octubre");
      await page.getByRole("button", { name: /Elegir la hora 10:00/ }).click();
      await page
        .getByRole("button", { name: reserva.bookingBar.ctaReservar })
        .click();

      const phone = page.getByLabel(reserva.clienteForm.telefonoLabel);
      await phone.fill(value);
      await phone.blur();
      await expect(page.getByText(message)).toBeVisible();
    });
  }

  test("samtidighet: hora tomada → tillbaka till valen, felruta, tiden borta", async ({
    page,
  }) => {
    await page.goto("/barberia-norte");
    await selectService(page, /Corte \+ barba/);
    await selectDay(page, "Jueves 8 de octubre");
    await page.getByRole("button", { name: /Elegir la hora 17:15/ }).click();
    await page
      .getByRole("button", { name: reserva.bookingBar.ctaReservar })
      .click();

    await page.getByLabel(reserva.clienteForm.nombreLabel).fill("Pedro Vidal");
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

    await expect(page.getByText(errores.reserva.slot_taken)).toBeVisible();
    // Tillbaka på valen (service/día kvar), tiden 17:15 finns inte kvar.
    await expect(
      page.getByRole("button", { name: /Corte \+ barba/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: /Elegir la hora 17:15/ }),
    ).toHaveCount(0);
  });

  test("tenant-isolering: /estudio-sur visar aldrig Barbería Nortes data", async ({
    page,
  }) => {
    await page.goto("/estudio-sur");
    await expect(page.getByText("Manicure")).toBeVisible();
    await expect(page.getByText("Corte + barba")).toHaveCount(0);
    await expect(page.getByText("Diego")).toHaveCount(0);
  });

  test("okänd slug ger 404 med paginaNoExiste", async ({ page }) => {
    const response = await page.goto("/finns-inte");
    expect(response?.status()).toBe(404);
    await expect(page.getByText(reserva.vacios.paginaNoExiste)).toBeVisible();
  });

  test("negocio frozen visar negocioNoDisponible utan pasos", async ({
    page,
  }) => {
    await page.goto("/barberia-pausada");
    await expect(
      page.getByText(reserva.vacios.negocioNoDisponible),
    ).toBeVisible();
    await expect(page.getByText(reserva.pasos.servicio)).toHaveCount(0);
  });

  test("bakåtknappen: från formuläret ger valen med samma val kvar", async ({
    page,
  }) => {
    await page.goto("/barberia-norte");
    await selectService(page, /Corte clásico/);
    await selectDay(page, "Viernes 2 de octubre");
    await page.getByRole("button", { name: /Elegir la hora 10:00/ }).click();
    await page
      .getByRole("button", { name: reserva.bookingBar.ctaReservar })
      .click();
    await expect(
      page.getByRole("heading", { name: reserva.clienteForm.titulo }),
    ).toBeVisible();

    await page.goBack();

    await expect(
      page.getByRole("heading", { name: "Barbería Norte" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Corte clásico/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: /Elegir la hora 10:00/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("tangentbord: tjänst/dag/tid går att välja med Tab + Enter", async ({
    page,
  }) => {
    await page.goto("/barberia-norte");
    const service = page.getByRole("button", { name: /Corte clásico/ });
    await service.focus();
    await page.keyboard.press("Enter");
    await expect(service).toHaveAttribute("aria-pressed", "true");
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

  test("tidszon: Mar 6 visas 11:30 oavsett webbläsarens tidszon", async ({
    browser,
  }) => {
    const context = await browser.newContext({ timezoneId: "Europe/Madrid" });
    const page = await context.newPage();
    await page.goto("/barberia-norte");
    await selectService(page, /Corte \+ barba/);
    await selectDay(page, "Martes 6 de octubre");
    await expect(
      page.getByRole("button", { name: /Elegir la hora 11:30/ }),
    ).toBeVisible();
    await context.close();
  });

  test("dubbelklick på Confirmar ger exakt ett anrop", async ({ page }) => {
    const actionRequests: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "POST" && req.headers()["next-action"]) {
        actionRequests.push(req.url());
      }
    });

    await page.goto("/barberia-norte");
    await selectService(page, /Corte clásico/);
    await selectDay(page, "Viernes 2 de octubre");
    await page.getByRole("button", { name: /Elegir la hora 10:00/ }).click();
    await page
      .getByRole("button", { name: reserva.bookingBar.ctaReservar })
      .click();
    await page.getByLabel(reserva.clienteForm.nombreLabel).fill("Ana Pérez");
    await page
      .getByLabel(reserva.clienteForm.telefonoLabel)
      .fill("+56 9 1234 5678");
    await page
      .getByRole("checkbox", {
        name: new RegExp(reserva.consentimientos.terminos.slice(0, 20)),
      })
      .check();

    // Två riktiga klick i samma tick (inte två separata Playwright-actions,
    // som redan serialiseras av auto-wait) — det är scenariot där en
    // `submitting`-state som bara uppdateras vid nästa render INTE räcker
    // som skydd (se `customer-form.tsx`, `submittingRef`).
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find(
        (b) => b.textContent?.trim() === "Confirmar reserva",
      );
      btn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      btn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await expect(
      page.getByRole("heading", { name: reserva.confirmacion.titulo }),
    ).toBeVisible();
    expect(actionRequests).toHaveLength(1);
  });
});

test.describe("Reserva — prestanda (FRÅGA 7)", () => {
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

test.describe("Reserva — design lab", () => {
  test("/design-lab/reserva svarar 200 (estándar)", async ({ page }) => {
    const response = await page.goto("/design-lab/reserva");
    expect(response?.status()).toBe(200);
  });

  for (const estado of ESTADOS) {
    test(`axe: /design-lab/reserva?estado=${estado} utan överträdelser`, async ({
      page,
    }) => {
      await page.goto(`/design-lab/reserva?estado=${estado}`);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test("axe: /barberia-norte utan överträdelser", async ({ page }) => {
    await page.goto("/barberia-norte");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
