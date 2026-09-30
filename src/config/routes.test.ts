import { afterEach, describe, expect, it, vi } from "vitest";

describe("routes.ts", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("CL: href() ger de spanska sökvägarna, oförändrade", async () => {
    vi.stubEnv("NEXT_PUBLIC_MARKET", "CL");
    vi.resetModules();
    const { href, hrefIndustria, hrefLegal } = await import("./routes");
    expect(href("inicio")).toBe("/");
    expect(href("precios")).toBe("/precios");
    expect(href("funcionalidades")).toBe("/funcionalidades");
    expect(href("funcionalidades", "agenda")).toBe("/funcionalidades#agenda");
    expect(href("horasFlash")).toBe("/horas-flash");
    expect(href("ventajas")).toBe("/ventajas");
    expect(href("preguntas")).toBe("/preguntas");
    expect(href("contacto")).toBe("/contacto");
    expect(hrefIndustria("barberias")).toBe("/para/barberias");
    expect(hrefIndustria("peluquerias")).toBe("/para/peluquerias");
    expect(hrefIndustria("estetica")).toBe("/para/estetica");
    expect(hrefIndustria("kinesiologia")).toBe("/para/kinesiologia");
    expect(hrefLegal("privacidad")).toBe("/legal/privacidad");
    expect(hrefLegal("terminos")).toBe("/legal/terminos");
    expect(hrefLegal("encargo")).toBe("/legal/encargo");
  });

  it("SE: href() ger de svenska sökvägarna", async () => {
    vi.stubEnv("NEXT_PUBLIC_MARKET", "SE");
    vi.resetModules();
    const { href, hrefIndustria, hrefLegal } = await import("./routes");
    expect(href("inicio")).toBe("/");
    expect(href("precios")).toBe("/priser");
    expect(href("funcionalidades")).toBe("/funktioner");
    expect(href("funcionalidades", "agenda")).toBe("/funktioner#agenda");
    expect(href("horasFlash")).toBe("/flashtider");
    expect(href("ventajas")).toBe("/fordelar");
    expect(href("preguntas")).toBe("/vanliga-fragor");
    expect(href("contacto")).toBe("/kontakt");
    expect(hrefIndustria("barberias")).toBe("/for/barberare");
    expect(hrefIndustria("peluquerias")).toBe("/for/frisorer");
    expect(hrefIndustria("estetica")).toBe("/for/hudvard");
    expect(hrefIndustria("kinesiologia")).toBe("/for/naprapat");
    expect(hrefLegal("privacidad")).toBe("/legal/integritet");
    expect(hrefLegal("terminos")).toBe("/legal/villkor");
    expect(hrefLegal("encargo")).toBe("/legal/bitradesavtal");
  });

  it("seRouteRewrites(): en svensk slug per rutt/industri, mot rätt sidfil", async () => {
    const { seRouteRewrites } = await import("./routes");
    const rewrites = seRouteRewrites();
    const bySource = Object.fromEntries(
      rewrites.map((r) => [r.source, r.destination]),
    );
    expect(bySource["/priser"]).toBe("/precios");
    expect(bySource["/funktioner"]).toBe("/funcionalidades");
    expect(bySource["/flashtider"]).toBe("/horas-flash");
    expect(bySource["/fordelar"]).toBe("/ventajas");
    expect(bySource["/vanliga-fragor"]).toBe("/preguntas");
    expect(bySource["/kontakt"]).toBe("/contacto");
    expect(bySource["/for/barberare"]).toBe("/para/barberias");
    expect(bySource["/for/frisorer"]).toBe("/para/peluquerias");
    expect(bySource["/for/hudvard"]).toBe("/para/estetica");
    expect(bySource["/for/naprapat"]).toBe("/para/kinesiologia");
    expect(bySource["/legal/integritet"]).toBe("/legal/privacidad");
    expect(bySource["/legal/villkor"]).toBe("/legal/terminos");
    expect(bySource["/legal/bitradesavtal"]).toBe("/legal/encargo");
    // "/" rörs inte (rewrite av startsidan till sig själv är onödigt och kan krocka).
    expect(rewrites.some((r) => r.source === "/")).toBe(false);
  });

  it("seRouteRedirects(): 308 från varje gammal spansk sökväg till dess svenska motsvarighet", async () => {
    const { seRouteRedirects } = await import("./routes");
    const redirects = seRouteRedirects();
    const bySource = Object.fromEntries(
      redirects.map((r) => [r.source, r.destination]),
    );
    expect(bySource["/precios"]).toBe("/priser");
    expect(bySource["/funcionalidades"]).toBe("/funktioner");
    expect(bySource["/horas-flash"]).toBe("/flashtider");
    expect(bySource["/ventajas"]).toBe("/fordelar");
    expect(bySource["/preguntas"]).toBe("/vanliga-fragor");
    expect(bySource["/contacto"]).toBe("/kontakt");
    expect(bySource["/para/barberias"]).toBe("/for/barberare");
    expect(bySource["/para/peluquerias"]).toBe("/for/frisorer");
    expect(bySource["/para/estetica"]).toBe("/for/hudvard");
    expect(bySource["/para/kinesiologia"]).toBe("/for/naprapat");
    expect(bySource["/legal/privacidad"]).toBe("/legal/integritet");
    expect(bySource["/legal/terminos"]).toBe("/legal/villkor");
    expect(bySource["/legal/encargo"]).toBe("/legal/bitradesavtal");
    expect(redirects.every((r) => r.permanent === true)).toBe(true);
    expect(redirects.some((r) => r.source === "/")).toBe(false);
  });

  it("seRouteRewrites() och seRouteRedirects() är exakta motsatser av varandra", async () => {
    const { seRouteRewrites, seRouteRedirects } = await import("./routes");
    const rewrites = seRouteRewrites();
    const redirects = seRouteRedirects();
    expect(redirects).toHaveLength(rewrites.length);
    for (const rw of rewrites) {
      expect(
        redirects.some(
          (rd) => rd.source === rw.destination && rd.destination === rw.source,
        ),
      ).toBe(true);
    }
  });
});
