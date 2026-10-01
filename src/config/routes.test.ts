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

  // WP-58: app-rutterna (/app/*, /baja/[token]) har svenska permalänkar på SE,
  // oförändrade på CL.
  it("CL: appHref() ger de spanska (filsystemets) app-sökvägarna, oförändrade", async () => {
    vi.stubEnv("NEXT_PUBLIC_MARKET", "CL");
    vi.resetModules();
    const { appHref } = await import("./routes");
    expect(appHref("appInicio")).toBe("/app/inicio");
    expect(appHref("appAgenda")).toBe("/app/agenda");
    expect(appHref("appHoy")).toBe("/app/hoy");
    expect(appHref("appClientes")).toBe("/app/clientes");
    expect(appHref("appClienteDetail", "123")).toBe("/app/clientes/123");
    expect(appHref("appClientesUtskick")).toBe("/app/clientes/utskick");
    expect(appHref("appClientesUtskickNytt")).toBe(
      "/app/clientes/utskick/nytt",
    );
    expect(appHref("appCaja")).toBe("/app/caja");
    expect(appHref("appCajaInformes")).toBe("/app/caja/informes");
    expect(appHref("appFlash")).toBe("/app/flash");
    expect(appHref("appAjustes")).toBe("/app/ajustes");
    expect(appHref("appAjustesNegocio")).toBe("/app/ajustes/negocio");
    expect(appHref("appAjustesPerfil")).toBe("/app/ajustes/perfil");
    expect(appHref("appAjustesReglas")).toBe("/app/ajustes/reglas");
    expect(appHref("appAjustesServicios")).toBe("/app/ajustes/servicios");
    expect(appHref("appAjustesFormulario")).toBe("/app/ajustes/formulario");
    expect(appHref("appAjustesHorario")).toBe("/app/ajustes/horario");
    expect(appHref("appAjustesSocios")).toBe("/app/ajustes/socios");
    expect(appHref("appAjustesEquipo")).toBe("/app/ajustes/equipo");
    expect(appHref("appAjustesPrivacidad")).toBe("/app/ajustes/privacidad");
    expect(appHref("appSolicitud", "abc")).toBe("/app/solicitudes/abc");
    expect(appHref("appInvitacion", "tok")).toBe("/app/invitacion/tok");
    expect(appHref("appBienvenida", "tok")).toBe("/app/bienvenida/tok");
    expect(appHref("appOnboarding")).toBe("/app/onboarding");
    expect(appHref("baja", "tok")).toBe("/baja/tok");
  });

  it("SE: appHref() ger de svenska app-sökvägarna", async () => {
    vi.stubEnv("NEXT_PUBLIC_MARKET", "SE");
    vi.resetModules();
    const { appHref } = await import("./routes");
    expect(appHref("appInicio")).toBe("/app/start");
    expect(appHref("appAgenda")).toBe("/app/kalender");
    expect(appHref("appHoy")).toBe("/app/idag");
    expect(appHref("appClientes")).toBe("/app/kunder");
    expect(appHref("appClienteDetail", "123")).toBe("/app/kunder/123");
    expect(appHref("appClientesUtskick")).toBe("/app/kunder/utskick");
    expect(appHref("appClientesUtskickNytt")).toBe(
      "/app/kunder/utskick/nytt",
    );
    expect(appHref("appCaja")).toBe("/app/kassa");
    expect(appHref("appCajaInformes")).toBe("/app/kassa/rapporter");
    expect(appHref("appFlash")).toBe("/app/blixttider");
    expect(appHref("appAjustes")).toBe("/app/installningar");
    expect(appHref("appAjustesNegocio")).toBe("/app/installningar/foretag");
    expect(appHref("appAjustesPerfil")).toBe("/app/installningar/profil");
    expect(appHref("appAjustesReglas")).toBe(
      "/app/installningar/bokningsregler",
    );
    expect(appHref("appAjustesServicios")).toBe(
      "/app/installningar/tjanster",
    );
    expect(appHref("appAjustesFormulario")).toBe(
      "/app/installningar/bokningsformular",
    );
    expect(appHref("appAjustesHorario")).toBe(
      "/app/installningar/oppettider",
    );
    expect(appHref("appAjustesSocios")).toBe("/app/installningar/medlemmar");
    expect(appHref("appAjustesEquipo")).toBe("/app/installningar/team");
    expect(appHref("appAjustesPrivacidad")).toBe(
      "/app/installningar/integritet",
    );
    expect(appHref("appSolicitud", "abc")).toBe("/app/forfragningar/abc");
    expect(appHref("appInvitacion", "tok")).toBe("/app/inbjudan/tok");
    expect(appHref("appBienvenida", "tok")).toBe("/app/valkommen/tok");
    expect(appHref("appOnboarding")).toBe("/app/kom-igang");
    expect(appHref("baja", "tok")).toBe("/avregistrera/tok");
  });

  it("appRoutePrefixes(): prefixet (utan id/token) för en dynamisk app-rutt, i båda marknadernas form", async () => {
    const { appRoutePrefixes } = await import("./routes");
    expect(appRoutePrefixes("appInvitacion")).toEqual([
      "/app/invitacion/",
      "/app/inbjudan/",
    ]);
    expect(appRoutePrefixes("appBienvenida")).toEqual([
      "/app/bienvenida/",
      "/app/valkommen/",
    ]);
    expect(appRoutePrefixes("appSolicitud")).toEqual([
      "/app/solicitudes/",
      "/app/forfragningar/",
    ]);
  });

  it("seRouteRewrites()/seRouteRedirects(): inkluderar app-rutterna, inkl. dynamiska segment", async () => {
    const { seRouteRewrites, seRouteRedirects } = await import("./routes");
    const rewrites = seRouteRewrites();
    const redirects = seRouteRedirects();
    const bySource = Object.fromEntries(
      rewrites.map((r) => [r.source, r.destination]),
    );
    expect(bySource["/app/start"]).toBe("/app/inicio");
    expect(bySource["/app/kalender"]).toBe("/app/agenda");
    expect(bySource["/app/installningar/team"]).toBe("/app/ajustes/equipo");
    expect(bySource["/app/kunder/:id"]).toBe("/app/clientes/:id");
    expect(bySource["/app/forfragningar/:id"]).toBe("/app/solicitudes/:id");
    expect(bySource["/app/inbjudan/:token"]).toBe("/app/invitacion/:token");
    expect(bySource["/app/valkommen/:token"]).toBe("/app/bienvenida/:token");
    expect(bySource["/app/kom-igang"]).toBe("/app/onboarding");
    expect(bySource["/avregistrera/:token"]).toBe("/baja/:token");

    const redirectsBySource = Object.fromEntries(
      redirects.map((r) => [r.source, r.destination]),
    );
    expect(redirectsBySource["/app/inicio"]).toBe("/app/start");
    expect(redirectsBySource["/app/clientes/:id"]).toBe("/app/kunder/:id");
    expect(redirectsBySource["/baja/:token"]).toBe("/avregistrera/:token");
    expect(redirects.every((r) => r.permanent === true)).toBe(true);
  });
});
