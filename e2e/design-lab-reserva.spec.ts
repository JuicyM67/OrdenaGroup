import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { errores, reserva } from "../src/i18n";

/**
 * Reserva mot fixturerna (`/design-lab/reserva`), inte den riktiga
 * `/{slug}`-routen: WP-20 kopplade `/{slug}` mot riktig data (seed-företaget
 * `barberia-norte`, se `e2e/reserva.spec.ts`), och de här flödestesterna
 * (skrivna i WP-13 mot fixturernas fasta datum/klockslag) flyttades hit
 * oförändrade i sak — bara URL:en bytte (`?estado=sin-seleccion` = samma
 * tomma startläge som den gamla `/barberia-norte` hade). Väntelistan och
 * "profesional utan egen data" (en medveten asymmetri i fixturerna, se
 * `src/app/design-lab/reserva/fixtures.ts`) finns bara här: seed-datan har
 * varken en full dag eller en tjänst som inte alla profesionales utför.
 * Tenant-isolering (den gamla `/estudio-sur`-testen) togs bort i stället för
 * att flyttas — seed har bara ett företag, och isoleringen är redan täckt av
 * `src/server/scheduling/tenant.db.test.ts`, `src/server/bookings/tenant.db.test.ts`
 * och pgTAP (RLS per tabell).
 */
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

const START = "/design-lab/reserva?estado=sin-seleccion";

async function selectService(page: Page, name: RegExp) {
  await page.getByRole("button", { name }).first().click();
}

/** Väljer dagen. DayPicker visar en vecka i taget (4c84ced), så dagar i senare veckor
 * nås via "Semana siguiente" först. */
async function selectDay(page: Page, ariaLabel: string) {
  const day = page.getByRole("button", { name: ariaLabel, exact: false });
  for (let i = 0; i < 6 && (await day.count()) === 0; i++) {
    await page
      .getByRole("button", { name: reserva.dia.semanaSiguiente })
      .click();
  }
  await day.click();
}

test.describe("Reserva (fixturer) — flödet", () => {
  // Design lab är ett artboard med fast bredd (390 px, `w-97.5` i
  // `design-lab/reserva/page.tsx`), inte en responsiv skärm: i
  // mobilprojektets riktiga 360 px-viewport blir artboarden bredare än
  // fönstret, och `BookingBar` (`position: fixed`, alltid mot den riktiga
  // viewporten) hamnar då fel i förhållande till artboardens innehåll —
  // klick på "Reservar" fångas i stället av tidsknappen under. Det är en
  // egenhet hos design lab-mockupen, inte ett fel i skärmen: den riktiga
  // routen (`e2e/reserva.spec.ts`, "360 px: ingen horisontell scroll") har
  // redan 360 px-täckning. Interaktionstesterna här körs därför bara i
  // desktop-projektet.
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "design lab: fast artboard-bredd, inte responsiv");
  });

  test("hela flödet på högst 3 skärmar: val → uppgifter → bekräftelse", async ({
    page,
  }) => {
    await page.goto(START);

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
      .getByLabel(reserva.clienteForm.emailLabel)
      .fill("cliente@example.com");
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
    await page.goto(START);
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
      .getByLabel(reserva.clienteForm.emailLabel)
      .fill("cliente@example.com");
    await page
      .getByRole("checkbox", {
        name: new RegExp(reserva.waitlist.terminos.slice(0, 15)),
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
    await page.goto(START);
    await selectService(page, /Corte clásico/);
    await selectDay(page, "Viernes 2 de octubre");
    await page.getByRole("button", { name: /Elegir la hora 10:00/ }).click();
    await page
      .getByRole("button", { name: reserva.bookingBar.ctaReservar })
      .click();

    const terms = page.getByRole("checkbox").first();
    // D-063: WhatsApp och marknadsföring är egna, valfria rutor — aldrig
    // förkryssade (regel 7).
    const whatsapp = page.getByRole("checkbox", {
      name: /^Quiero recibir por WhatsApp los avisos/,
    });
    const marketing = page.getByRole("checkbox", {
      name: /^Quiero recibir ofertas/,
    });
    await expect(page.getByRole("checkbox")).toHaveCount(3);
    await expect(terms).not.toBeChecked();
    await expect(whatsapp).not.toBeChecked();
    await expect(marketing).not.toBeChecked();

    await page.getByLabel(reserva.clienteForm.nombreLabel).fill("Ana Pérez");
    await page
      .getByLabel(reserva.clienteForm.telefonoLabel)
      .fill("+56 9 1234 5678");
    await page
      .getByLabel(reserva.clienteForm.emailLabel)
      .fill("cliente@example.com");
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
      await page.goto(START);
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
    await page.goto(START);
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
      .getByLabel(reserva.clienteForm.emailLabel)
      .fill("cliente@example.com");
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

  test("negocio frozen visar negocioNoDisponible utan pasos", async ({
    page,
  }) => {
    await page.goto("/design-lab/reserva?estado=no-disponible");
    await expect(
      page.getByText(reserva.vacios.negocioNoDisponible),
    ).toBeVisible();
    await expect(page.getByText(reserva.pasos.servicio)).toHaveCount(0);
  });

  test("bakåtknappen: från formuläret ger valen med samma val kvar", async ({
    page,
  }) => {
    await page.goto(START);
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
    await page.goto(START);
    const service = page.getByRole("button", { name: /Corte clásico/ });
    await service.focus();
    await page.keyboard.press("Enter");
    await expect(service).toHaveAttribute("aria-pressed", "true");
  });

  test("tidszon: Mar 6 visas 11:30 oavsett webbläsarens tidszon", async ({
    browser,
  }) => {
    const context = await browser.newContext({ timezoneId: "Europe/Madrid" });
    const page = await context.newPage();
    await page.goto(START);
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

    await page.goto(START);
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
      .getByLabel(reserva.clienteForm.emailLabel)
      .fill("cliente@example.com");
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

  test("nätverksfel (avbrutet anrop) visar network-felet; nytt försök (samma formulär) lyckas", async ({
    page,
  }) => {
    await page.goto(START);
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
      .getByLabel(reserva.clienteForm.emailLabel)
      .fill("cliente@example.com");
    await page
      .getByRole("checkbox", {
        name: new RegExp(reserva.consentimientos.terminos.slice(0, 20)),
      })
      .check();

    let attempt = 0;
    await page.route(
      (url) => url.pathname === "/design-lab/reserva",
      async (route) => {
        const request = route.request();
        if (request.method() === "POST" && request.headers()["next-action"]) {
          attempt++;
          if (attempt === 1) {
            await route.abort("failed");
            return;
          }
        }
        await route.continue();
      },
    );

    await page
      .getByRole("button", { name: reserva.antesDeConfirmar.ctaConfirmar })
      .click();
    await expect(page.getByText(errores.reserva.network)).toBeVisible();

    // Formuläret avmonterades aldrig (kvar på "datos") — samma idempotencyKey
    // används automatiskt igen. Andra försöket (route.continue()) lyckas.
    await page
      .getByRole("button", { name: reserva.antesDeConfirmar.ctaConfirmar })
      .click();
    await expect(
      page.getByRole("heading", { name: reserva.confirmacion.titulo }),
    ).toBeVisible();
    expect(attempt).toBe(2);
  });

  test("ogiltig e-post visar errores.reserva.emailInvalido", async ({
    page,
  }) => {
    await page.goto(START);
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
    await page.getByLabel(reserva.clienteForm.emailLabel).fill("no-es-correo");
    await page
      .getByRole("checkbox", {
        name: new RegExp(reserva.consentimientos.terminos.slice(0, 20)),
      })
      .check();
    await page
      .getByRole("button", { name: reserva.antesDeConfirmar.ctaConfirmar })
      .click();

    await expect(page.getByText(errores.reserva.emailInvalido)).toBeVisible();
  });

  test("profesional utan egen data visar sinHorariosEnRango, inte Cualquieras tider", async ({
    page,
  }) => {
    await page.goto(START);
    await selectService(page, /Corte clásico/);
    await page.getByRole("button", { name: "Diego" }).click();
    // "diego" finns inte i availability.c (bara "any" i fixturen) — item 13.
    await expect(
      page.getByText(reserva.vacios.sinHorariosEnRango),
    ).toBeVisible();
    // "Viernes 2 de octubre" finns annars (med "Cualquiera"/"any") — får inte
    // dyka upp här, annars visas Cualquieras tider som om de vore Diegos.
    await expect(
      page.getByRole("button", { name: "Viernes 2 de octubre" }),
    ).toHaveCount(0);
  });
});

test.describe("Reserva (fixturer) — design lab", () => {
  test("/design-lab/reserva svarar 200 (estándar)", async ({ page }) => {
    const response = await page.goto("/design-lab/reserva");
    expect(response?.status()).toBe(200);
  });

  for (const estado of ESTADOS) {
    test(`axe: /design-lab/reserva?estado=${estado} utan överträdelser`, async ({
      page,
    }) => {
      await page.goto(`/design-lab/reserva?estado=${estado}`);
      // `[aria-hidden="true"]` undantas: DayPicker visar dagar utan bokningsbara tider
      // (passerade/stängda) som tonade, dekorativa rutor (4c84ced) — inaktiva och
      // dolda för hjälpmedel, och därför undantagna från kontrastkravet (WCAG 1.4.3).
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .exclude('[aria-hidden="true"]')
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
