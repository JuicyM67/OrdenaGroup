import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

// Se docs/tasks/plans/WP-14.md §5. Alla ?estado= som fixtures.ts känner till.
const ESTADOS = [
  undefined,
  "ahora",
  "atrasado",
  "sin-confirmar",
  "sin-proxima",
  "vacio",
  "cerrado",
  "muchas",
] as const;

function hoyUrl(estado: (typeof ESTADOS)[number]) {
  return estado ? `/design-lab/hoy?estado=${estado}` : "/design-lab/hoy";
}

async function tabUntilFocused(page: Page, locator: Locator, maxPresses = 400) {
  const handle = await locator.elementHandle();
  if (!handle) throw new Error("tabUntilFocused: elementet finns inte");
  for (let i = 0; i < maxPresses; i++) {
    const isFocused = await page.evaluate(
      (el) => el === document.activeElement,
      handle,
    );
    if (isFocused) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("tabUntilFocused: nådde inte elementet med Tab");
}

async function expectMinTapTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

test.describe("Hoy — routes", () => {
  test("/design-lab/hoy svarar 200 med en h1 'Hoy'", async ({ page }) => {
    const response = await page.goto("/design-lab/hoy");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: "Hoy" }),
    ).toBeVisible();
  });

  // WP-21: /app/hoy visar riktig data (D-020s grind borttagen, D-024). Den delade
  // storageState-sessionen (playwright.config.ts) saknar företag, så den redirectas till
  // onboarding, precis som /app (WP-15) — se e2e/onboarding.spec.ts. Ruttens riktiga
  // innehåll (h1, noindex, en ägare MED företag) testas i e2e/owner-live.spec.ts.
  test("/app/hoy utan negocio → redirige a /app/onboarding", async ({
    page,
  }) => {
    await page.goto("/app/hoy");
    await page.waitForURL("**/app/onboarding");
  });
});

// WP-21: /app/hoy visar riktig data — `?estado=` finns inte längre där (det var bara
// design labs tillståndssimulering). Reflowen vid 360 px för en riktig ägare (utan
// `?estado=`) testas i e2e/owner-live.spec.ts. Style-/layoutkontroller som inte beror på
// vilken data som visas (nowrap-knappar, "muchas"-scrollen) körs kvar mot /design-lab/hoy.
test.describe("Hoy — Llegó/No vino bryts inte till flera rader", () => {
  test("whitespace: nowrap, höjd h-12 (/design-lab/hoy, 360 px)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/design-lab/hoy");
    for (const name of ["Llegó", "No vino"]) {
      const button = page.getByRole("button", { name });
      const box = await button.boundingBox();
      const whiteSpace = await button.evaluate(
        (el) => getComputedStyle(el).whiteSpace,
      );
      expect(whiteSpace).toBe("nowrap");
      expect(box!.height).toBe(48);
    }
  });
});

// "Hoy — muchas (scroll)" (sista radens boundingBox ovanför flikraden efter sidscroll):
// borttaget (WP-21). Testade sidscroll på den RIKTIGA, responsiva /app/hoy (?estado=muchas,
// 14 rader) — /design-lab/hoy är en fast artboard med `overflow-hidden`
// (design-lab/hoy/page.tsx), där window.scrollTo inte gör något, och riktig data har
// varken `?estado=` eller en dag med 14 bokningar. Pixel-/scrollregression av det slaget
// hör till `npm run visual`, inte till WP-21 (se CLAUDE.md "inga pixeltester").

test.describe("Hoy — klickytor ≥ 44×44", () => {
  test("flikar, Llegó/No vino och notisknappen", async ({ page }) => {
    await page.goto("/design-lab/hoy?estado=solicitudes");
    // WP-47: den gamla flikraden (Hoy/Agenda/Clientes/Caja, Clientes/Caja 404:ade) byttes
    // mot OwnerMobileTabBar (Inicio/Agenda/Hoy/Ajustes) — och QuickActions (Crear hora
    // flash/Lista de espera/Cobrar, ingen av rutterna finns) döljs helt.
    for (const name of ["Inicio", "Agenda", "Hoy", "Ajustes"]) {
      await expectMinTapTarget(page.getByRole("link", { name, exact: true }));
    }
    for (const name of ["Llegó", "No vino"]) {
      await expectMinTapTarget(page.getByRole("button", { name }));
    }
    // WP-45: klockan räknar väntande förfrågningar; ?estado=solicitudes har en, så
    // aria-label är den singulara varianten av nav.notificacionesNuevas.
    await expectMinTapTarget(
      page.getByRole("button", { name: "1 notificación nueva" }),
    );
  });
});

test.describe("Hoy — notisknappen", () => {
  test("badge och aria-label speglar unreadNotifications (>0 → prick + notificacionesNuevas)", async ({
    page,
  }) => {
    await page.goto("/design-lab/hoy?estado=solicitudes");
    const button = page.getByRole("button", { name: "1 notificación nueva" });
    await expect(button.locator(".bg-alert")).toBeVisible();
  });
});

test.describe("Hoy — pekskärm", () => {
  test.skip(({ isMobile }) => !isMobile, "bara relevant i mobilprojektet");

  test("tryck på Llegó visar nästa kund och läser upp bekräftelsen", async ({
    page,
  }) => {
    await page.goto("/design-lab/hoy");
    const card = page.getByRole("region", { name: "Próxima reserva" });
    await expect(card.getByText("Joaquín Rivas")).toBeVisible();

    await page.getByRole("button", { name: "Llegó" }).tap();

    await expect(card.getByText("Valentina Soto")).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Marcado como Llegó.");
    await expect(card).toBeFocused();
  });
});

test.describe("Hoy — tidszon (America/Santiago oavsett webbläsarens tidszon)", () => {
  for (const timezoneId of ["Europe/Madrid", "Asia/Tokyo"]) {
    test(`${timezoneId}: visar 15:00, Viernes 2 de octubre, en 20 min`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ timezoneId });
      const page = await context.newPage();
      await page.goto("/design-lab/hoy");
      await expect(page.getByText("Viernes 2 de octubre")).toBeVisible();
      await expect(page.getByText("15:00")).toBeVisible();
      await expect(page.getByText("Siguiente · en 20 min")).toBeVisible();
      await context.close();
    });
  }
});

test.describe("Hoy — tangentbord", () => {
  test.skip(
    ({ isMobile }) => isMobile,
    "tangentbordsnavigation, inte pekskärm",
  );

  test("header → Llegó → No vino → flikar, fokusring lime på mörk yta", async ({
    page,
  }) => {
    await page.goto("/design-lab/hoy?estado=solicitudes");

    const notif = page.getByRole("button", { name: "1 notificación nueva" });
    await tabUntilFocused(page, notif);

    const llego = page.getByRole("button", { name: "Llegó" });
    // WP-47: en extra tabbstopp jämfört med tidigare (avataren är nu en riktig knapp med
    // kontomenyn — inte längre en `aria-hidden`-span).
    await tabUntilFocused(page, llego, 6);
    const styles = await llego.evaluate((el) => {
      const s = getComputedStyle(el);
      return { color: s.outlineColor, width: s.outlineWidth };
    });
    expect(styles.color).toBe("rgb(227, 243, 107)");
    expect(styles.width).toBe("2px");

    const noVino = page.getByRole("button", { name: "No vino" });
    await tabUntilFocused(page, noVino, 5);

    // WP-47: QuickActions (Crear hora flash m.fl.) döljs — nästa tabbstopp efter No vino är
    // flikraden (OwnerMobileTabBar, Inicio/Agenda/Hoy/Ajustes).
    const inicioTab = page.getByRole("link", { name: "Inicio", exact: true });
    await tabUntilFocused(page, inicioTab, 10);
  });
});

test.describe("Hoy — NextClientCard, fokus efter Llegó", () => {
  test.skip(
    ({ isMobile }) => isMobile,
    "kräver tangentbordsaktivering (input-modality), inte pekskärm",
  );

  test("fokusringen ligger innanför kortet (negativ offset, lime på mörk botten)", async ({
    page,
  }) => {
    await page.goto("/design-lab/hoy");
    // tabIndex={-1}: kortet nås inte med Tab (avsiktligt, se DESIGN.md §7), utan får fokus
    // programmatiskt när Llegó flyttar vidare till nästa kund (FRÅGA 1). Aktivera Llegó med
    // tangentbordet (inte .click()) — annars räknar Chromium input-modality som "pekare" och
    // visar ingen focus-visible-ring alls på det nya kortet, oavsett offset.
    const llego = page.getByRole("button", { name: "Llegó" });
    await tabUntilFocused(page, llego, 10);
    await page.keyboard.press("Enter");
    const card = page.getByRole("region", { name: "Próxima reserva" });
    await expect(card).toBeFocused();
    const styles = await card.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        color: s.outlineColor,
        width: s.outlineWidth,
        offset: s.outlineOffset,
        background: s.backgroundColor,
      };
    });
    expect(styles.color).toBe("rgb(227, 243, 107)"); // lime
    expect(styles.width).toBe("2px");
    // Negativ offset → ringen ligger innanför kortets (mörka) bakgrund, inte på den ljusa
    // canvasen bakom det (granskningsfynd: ~1,1:1 kontrast där, 13,97:1 mot bg-dark).
    expect(styles.offset).toBe("-2px");
    expect(styles.background).toBe("rgb(28, 28, 34)"); // bg-dark
  });
});

test.describe("Hoy — cerrado", () => {
  test("nästa-kund-kortet visar 'Hoy no atiendes.', inte 'No tienes más clientes agendados hoy.'", async ({
    page,
  }) => {
    await page.goto("/design-lab/hoy?estado=cerrado");
    const card = page.getByRole("region", { name: "Próxima reserva" });
    await expect(card.getByText("Hoy no atiendes.")).toBeVisible();
    await expect(
      page.getByText("No tienes más clientes agendados hoy."),
    ).toHaveCount(0);
  });
});

test.describe("Hoy — reducerad rörelse", () => {
  test("transition-duration 0s på knappar och flikar", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/design-lab/hoy");
    const buttonDuration = await page
      .getByRole("button", { name: "Llegó" })
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(buttonDuration).toBe("0s");
    const tabDuration = await page
      .getByRole("link", { name: "Hoy", exact: true })
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(tabDuration).toBe("0s");
  });
});

test.describe("Hoy — axe", () => {
  for (const estado of ESTADOS) {
    test(`/design-lab/hoy?estado=${estado ?? "(standard)"} har inga axe-överträdelser`, async ({
      page,
    }) => {
      await page.goto(hoyUrl(estado));
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
  // "/app/hoy har inga axe-överträdelser": borttaget (WP-21) — samma skärm/komponent som
  // /design-lab/hoy ovan (redan täckt); den delade storageState-sessionen saknar företag,
  // så /app/hoy redirectar till /app/onboarding (se "Hoy — routes").
});
