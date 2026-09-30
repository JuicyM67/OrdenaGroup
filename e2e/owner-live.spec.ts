// WP-21: ägaren ser sina RIKTIGA bokningar (inte fixtures) i Inicio/Agenda/Hoy, och Llegó
// sparas mot databasen. Loggar in som den seedade ägaren (supabase/seed.sql,
// dueno@example.com → "Barbería Norte", slug barberia-norte) i stället för den delade
// storageState-sessionen (playwright.config.ts): den ägaren saknar företag (redirectas till
// /app/onboarding, se e2e/onboarding.spec.ts) och har inga bokningar att visa. Egen, fräsch
// session (som e2e/onboarding.spec.ts).
//
// seed.sql lägger bokningar måndag–lördag i DEN AKTUELLA veckan (relativt db reset); söndag
// saknar data helt, så hela testet hoppas över då. Ett enda test (inte flera): undviker
// upprepade magic-link-inloggningar mot samma e-post (max_frequency 1s, supabase/config.toml)
// och håller filen billig att köra — se CLAUDE.md "spara tokens".
//
// WP-21b (samma test, samma inloggade session — ingen ny magic-link): manuell bokning och
// flytt. "18:11"/"18:31" (nära stängning, utanför rutnätet) är valda för att sannolikt vara
// lediga hos alla tre profesionales oavsett vilken veckodag testet råkar köras (seedens
// bokningar ligger på hela/halva timmar tidigare på dagen, se supabase/seed.sql).
import { expect, test } from "@playwright/test";
import pg from "pg";

import { agenda, comun, inicio, reserva, solicitudes } from "../src/i18n";
import { waitForConfirmLink } from "./helpers/mailpit";

test.use({ storageState: { cookies: [], origins: [] } });
test.skip(
  ({ isMobile }) => isMobile,
  "ett enda test (desktop-projektet); byter viewport internt för 360 px-kontrollerna",
);

const OWNER_EMAIL = "dueno@example.com";
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

async function withDb<T>(fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** Bokningens status för kunden `name` (senast skapad först — den nya reservan). */
async function bookingStatusFor(name: string): Promise<string> {
  return withDb(async (client) => {
    const r = await client.query<{ status: string }>(
      `select bk.status::text as status
         from public.bookings bk
         join public.customers c on c.id = bk.customer_id
        where c.name = $1
        order by bk.created_at desc
        limit 1`,
      [name],
    );
    const row = r.rows[0];
    if (!row) throw new Error(`ingen bokning hittad för ${name}`);
    return row.status;
  });
}

/** Det lokala datumet (America/Santiago) för kundens senast skapade bokning. */
async function bookedLocalDateFor(name: string): Promise<string> {
  return withDb(async (client) => {
    const r = await client.query<{ local_date: string }>(
      `select to_char(lower(bk.period) at time zone 'America/Santiago', 'YYYY-MM-DD') as local_date
         from public.bookings bk
         join public.customers c on c.id = bk.customer_id
        where c.name = $1
        order by bk.created_at desc
        limit 1`,
      [name],
    );
    const row = r.rows[0];
    if (!row) throw new Error(`ingen bokning hittad för ${name}`);
    return row.local_date;
  });
}

/** Den lokala tiden (America/Santiago, "HH:MM") för kundens senast skapade bokning. */
async function bookedLocalTimeFor(name: string): Promise<string> {
  return withDb(async (client) => {
    const r = await client.query<{ local_time: string }>(
      `select to_char(lower(bk.period) at time zone 'America/Santiago', 'HH24:MI') as local_time
         from public.bookings bk
         join public.customers c on c.id = bk.customer_id
        where c.name = $1
        order by bk.created_at desc
        limit 1`,
      [name],
    );
    const row = r.rows[0];
    if (!row) throw new Error(`ingen bokning hittad för ${name}`);
    return row.local_time;
  });
}

test("ägarens riktiga bokningar i Inicio/Agenda/Hoy, Llegó sparas, en ny reserva på /barberia-norte syns i Agenda, och en manuell bokning kan skapas och flyttas (WP-21b)", async ({
  page,
}, testInfo) => {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
  }).format(new Date());
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    weekday: "short",
  }).format(new Date());
  test.skip(weekday === "Sun", "seed.sql lägger inga bokningar på söndagar");

  // --- Inloggning: den seedade ägaren (redan ett företag) ---
  await page.goto("/login");
  await page.getByLabel("Correo").fill(OWNER_EMAIL);
  await page.getByRole("button", { name: "Enviarme el link" }).click();
  await expect(
    page.getByText(`Te enviamos un link a ${OWNER_EMAIL}.`),
  ).toBeVisible();
  const link = await waitForConfirmLink(OWNER_EMAIL);
  await page.goto(link);
  await page.waitForURL("**/app/inicio");

  // --- Inicio: företagets riktiga namn (inte fixturens "Barbería Norte" i design lab-vis,
  // det ÄR samma namn i seeden — men det bevisar ändå att sidan läser businesses.name). ---
  await expect(page.getByText("Barbería Norte").first()).toBeVisible();

  // --- 1280×800: sin scroll horizontal (F6, min 1280 px). Om heroen klipps eller inte
  // beror på texternas längd i de tomma tillstånden (inga pixeltester i WP-21, se
  // CLAUDE.md — det hör till npm run visual). ---
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/app/inicio");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);

  // --- Agenda: noindex + dagvyn för idag visar en riktig bokning ur seeden ---
  await page.goto("/app/agenda");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );

  await page.goto(`/app/agenda?vista=dia&fecha=${today}`);
  await expect(page.getByRole("radio", { name: "Día" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  const firstBlock = page.getByTestId("event-block").first();
  await expect(firstBlock).toBeVisible();

  // --- 1280×800: sin scroll horizontal en Agenda (F6, min 1280 px) ---
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/app/agenda?vista=dia&fecha=${today}`);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);

  // --- Llegó: marca el primer bloque de hoy y persiste tras recargar (R7) ---
  const clientName = (
    await page
      .getByTestId("event-block")
      .first()
      .locator(".text-event-title")
      .innerText()
  ).trim();
  await page.getByTestId("event-block").first().click();
  await page
    .getByRole("dialog", { name: "Detalle de la reserva" })
    .getByRole("button", { name: "Llegó" })
    .click();
  await page.waitForTimeout(300); // server action (fire-and-forget), ver agenda-screen.tsx
  expect(await bookingStatusFor(clientName)).toBe("completed");
  await page.reload();
  await page.getByTestId("event-block").first().click();
  await expect(
    page
      .getByRole("dialog", { name: "Detalle de la reserva" })
      // Statuschipen (span), inte "Llegó"-knappen (button) — samma text finns i båda.
      .locator("span", { hasText: "Llegó" }),
  ).toBeVisible();

  // --- Hoy: noindex + sin scroll horizontal a 360 px (F6, mobil) ---
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/app/hoy");
  await expect(
    page.getByRole("heading", { level: 1, name: "Hoy" }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    360,
  );

  // --- WP-42: sin scroll horizontal a 390 px (Inicio/Agenda/Ajustes, ägarens app-skal
  // responsivo) — mismo patrón que el bloque de Hoy arriba. ---
  await page.setViewportSize({ width: 390, height: 800 });
  for (const path of ["/app/inicio", "/app/agenda", "/app/ajustes"]) {
    await page.goto(path);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(390);
  }

  // --- Reserva nueva en /barberia-norte (F5) → syns i ägarens Agenda ---
  await page.setViewportSize({ width: 1280, height: 800 });
  const newCustomer = `E2E WP-21 ${testInfo.workerIndex}-${Date.now()}`;
  const newPhone = `+569${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;

  await page.goto("/barberia-norte");
  await expect(
    page.getByRole("heading", { name: "Barbería Norte" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Corte clásico/ }).click();
  const daySection = page.locator('[aria-labelledby="paso-dia-hora"]');
  await daySection.getByRole("button").first().waitFor();
  await daySection.getByRole("button").first().click();
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
  await page.getByLabel(reserva.clienteForm.nombreLabel).fill(newCustomer);
  await page.getByLabel(reserva.clienteForm.telefonoLabel).fill(newPhone);
  await page
    .getByLabel(reserva.clienteForm.emailLabel)
    .fill("cliente@example.com");
  await page
    .getByRole("checkbox", {
      name: new RegExp(reserva.consentimientos.terminos.slice(0, 20)),
    })
    .check();
  // WP-45 (D-033): `barberia-norte` tiene `auto_confirm_bookings` apagado
  // (estándar, incluso para negocios existentes — Ägarens svar 4): la
  // reserva nace `requested`, la CTA/pantalla son las variantes de
  // solicitud.
  await page
    .getByRole("button", {
      name: reserva.antesDeConfirmar.ctaEnviarSolicitud,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: reserva.confirmacionSolicitud.titulo }),
  ).toBeVisible();
  expect(await bookingStatusFor(newCustomer)).toBe("requested");

  const bookedDate = await bookedLocalDateFor(newCustomer);
  await page.goto(`/app/agenda?vista=dia&fecha=${bookedDate}`);
  await expect(page.getByText(newCustomer)).toBeVisible();

  // --- WP-45: la campana en Inicio — el dueño confirma la solicitud. Se
  // acota al popover (`aria-label`, notification-bell.tsx): "Att bekräfta"
  // (pending-requests-card.tsx) muestra la MISMA fila más abajo en la
  // misma página, y un locator sin acotar sería ambiguo (strict mode). ---
  await page.goto("/app/inicio");
  await page.getByRole("button", { name: /notificaci/i }).click();
  const bellPopover = page.locator(
    `[aria-label="${inicio.solicitudes.titulo}"]`,
  );
  await expect(bellPopover).toBeVisible();
  await bellPopover
    .getByText(new RegExp(newCustomer))
    .locator("..")
    .getByRole("button", { name: solicitudes.acciones.confirmar })
    .click();
  await expect(async () => {
    expect(await bookingStatusFor(newCustomer)).toBe("confirmed");
  }).toPass();

  // --- WP-21b: reserva manual desde Agenda ("Nueva reserva") ---
  await page.goto(`/app/agenda?vista=dia&fecha=${today}`);
  const manualCustomer = `E2E Manual ${testInfo.workerIndex}-${Date.now()}`;
  const manualPhone = `+569${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;

  // Hay dos botones con el mismo nombre accesible: el de AgendaRail (decorativo, sin
  // handler, WP-12) y el de AgendaToolbar (el real, WP-21b) — este último es el último
  // en el DOM (AgendaShell: rail, aside, main).
  await page.getByRole("button", { name: agenda.nuevaReserva }).last().click();
  const manualDialog = page.getByRole("dialog", {
    name: agenda.manual.tituloNueva,
  });
  await expect(manualDialog).toBeVisible();
  await manualDialog
    .getByLabel(agenda.manual.campos.servicio, { exact: true })
    .selectOption({ label: "Corte clásico" });
  // WP-50: el campo "Día" ya no es un <input type="date"> (mostraba mm/dd/yyyy según el
  // idioma del navegador) sino un botón que abre un MiniCalendar — el diálogo ya se abre
  // con `defaultDate={focus}` = `today` (ver `/app/agenda?vista=dia&fecha=${today}` arriba),
  // así que no hace falta tocarlo.
  await manualDialog
    .getByLabel(agenda.manual.campos.hora, { exact: true })
    .fill("18:11");
  await manualDialog
    .getByLabel(agenda.manual.campos.cliente, { exact: true })
    .fill(manualCustomer);
  await manualDialog
    .getByLabel(agenda.manual.campos.telefono, { exact: true })
    .fill(manualPhone);
  await manualDialog
    .getByRole("button", { name: agenda.manual.ctaGuardar })
    .click();
  await expect(manualDialog).toBeHidden();

  await page.goto(`/app/agenda?vista=dia&fecha=${today}`);
  await expect(page.getByText(manualCustomer)).toBeVisible();
  expect(await bookedLocalTimeFor(manualCustomer)).toBe("18:11");

  // --- WP-21b: mover la reserva manual a otra hora, desde el popover ---
  await page.getByText(manualCustomer).click();
  await page
    .getByRole("dialog", { name: "Detalle de la reserva" })
    .getByRole("button", { name: agenda.popover.acciones.mover })
    .click();
  const moveDialog = page.getByRole("dialog", { name: agenda.mover.titulo });
  await expect(moveDialog).toBeVisible();
  // WP-50: mismo motivo que arriba — la reserva es de hoy, `defaultDate` ya es `today`.
  // 18:20 + 35 min (Corte clásico) = 18:55, dentro del horario (cierra 19:00) — 18:31
  // se pasaría de la hora de cierre y daría outside_hours.
  await moveDialog
    .getByLabel(agenda.manual.campos.hora, { exact: true })
    .fill("18:20");
  await moveDialog.getByRole("button", { name: comun.confirmar }).click();
  // El título del diálogo cambia al confirmar (paso 2) — el nombre accesible de
  // `moveDialog` ya no aplica, así que se usa un locator nuevo con el título del paso 2.
  const confirmStep = page.getByRole("dialog", {
    name: agenda.confirmarAviso.mover.titulo,
  });
  await expect(confirmStep).toBeVisible();
  await confirmStep
    .getByRole("button", { name: agenda.confirmarAviso.mover.ctaSi })
    .click();
  await expect(confirmStep).toBeHidden();

  await page.reload();
  await expect(page.getByText(manualCustomer)).toBeVisible();
  expect(await bookedLocalTimeFor(manualCustomer)).toBe("18:20");
});
