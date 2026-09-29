import { describe, expect, it } from "vitest";

import { emailFixtures } from "./fixtures";
import {
  EMAIL_TEMPLATE_KIND,
  EMAIL_TEMPLATE_NAMES,
  renderEmail,
} from "./render";

const MARKETS = ["CL", "SE"] as const;

describe("renderEmail", () => {
  for (const market of MARKETS) {
    const fixtures = emailFixtures(market);

    for (const template of EMAIL_TEMPLATE_NAMES) {
      it(`${template} (${market}): asunto, preheader, html y text sin huecos`, () => {
        const data = fixtures[template];
        const rendered = renderEmail(template, market, data);

        expect(rendered.subject.length).toBeGreaterThan(0);
        expect(rendered.preheader.length).toBeGreaterThan(0);
        expect(rendered.html.length).toBeGreaterThan(0);
        expect(rendered.text.length).toBeGreaterThan(0);

        // Con datos de ejemplo reales, ningún placeholder de plantilla
        // debería quedar sin interpolar.
        expect(rendered.html).not.toContain("{{");
        expect(rendered.text).not.toContain("{{");
        expect(rendered.html).not.toMatch(/\bundefined\b/);
        expect(rendered.text).not.toMatch(/\bundefined\b/);

        // < 100 kB (INTEGRATIONS/spec de este WP).
        expect(Buffer.byteLength(rendered.html, "utf8")).toBeLessThan(100_000);

        // Documento HTML válido a grandes rasgos.
        expect(rendered.html).toContain("<!DOCTYPE html>");
        expect(rendered.html).toContain("</html>");
      });
    }

    it(`(${market}) el idioma del documento coincide con la marca`, () => {
      const rendered = renderEmail(
        "reservaConfirmada",
        market,
        fixtures.reservaConfirmada,
      );
      expect(rendered.html).toContain(
        market === "SE" ? 'lang="sv-SE"' : 'lang="es-CL"',
      );
    });
  }

  it("todas las plantillas tienen un kind asignado (booking/account)", () => {
    for (const template of EMAIL_TEMPLATE_NAMES) {
      expect(["booking", "account"]).toContain(EMAIL_TEMPLATE_KIND[template]);
    }
  });

  it("magicLink/confirmation: el botón apunta a confirmUrl, no a un placeholder de Supabase", () => {
    const fixtures = emailFixtures("CL");
    const rendered = renderEmail("magicLink", "CL", fixtures.magicLink);
    // href="…" escapa entidades HTML (correcto), el texto plano no.
    expect(rendered.text).toContain(fixtures.magicLink.confirmUrl);
    expect(rendered.html).not.toContain("{{ .ConfirmationURL }}");
  });

  it("magicLink/confirmation: aceptan literales de Supabase para las plantillas estáticas", () => {
    const rendered = renderEmail("magicLink", "CL", {
      confirmUrl:
        "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink",
      token: "{{ .Token }}",
    });
    // El texto plano no escapa el `&`; el HTML lo hace en el atributo `href` (correcto).
    expect(rendered.text).toContain(
      "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink",
    );
    expect(rendered.html).toContain(
      "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=magiclink",
    );
    expect(rendered.text).toContain("{{ .Token }}");
  });

  it("reservaConfirmada: el bokningskort muestra servicio, hora, profesional, dirección y precio", () => {
    const fixtures = emailFixtures("CL");
    const rendered = renderEmail(
      "reservaConfirmada",
      "CL",
      fixtures.reservaConfirmada,
    );
    for (const value of [
      fixtures.reservaConfirmada.servicio,
      fixtures.reservaConfirmada.hora,
      fixtures.reservaConfirmada.profesional,
      fixtures.reservaConfirmada.direccion,
      fixtures.reservaConfirmada.precio,
    ]) {
      expect(rendered.html).toContain(value);
    }
  });
});
