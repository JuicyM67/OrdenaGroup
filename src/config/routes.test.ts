import { describe, expect, it } from "vitest";

import {
  appHref,
  appRoutePrefix,
  clLegacyRedirects,
  cuentaHref,
  FUNCION_IDS,
  funcionFromParam,
  funcionParamSlugs,
  hrefFuncion,
  hrefIndustria,
  hrefLegal,
  hrefMarketplace,
  hrefRubro,
  href,
  sitemapPaths,
} from "./routes";

describe("routes.ts", () => {
  it("href() ger filsystemets sökvägar", () => {
    expect(href("inicio")).toBe("/");
    expect(href("precios")).toBe("/precios");
    expect(href("funcionalidades")).toBe("/funcionalidades");
    expect(href("funcionalidades", "agenda")).toBe("/funcionalidades#agenda");
    expect(href("horasFlash")).toBe("/horas-flash");
    expect(href("ventajas")).toBe("/ventajas");
    expect(href("preguntas")).toBe("/preguntas");
    expect(href("contacto")).toBe("/contacto");
    expect(href("ejemploNegocio")).toBe("/demo/negocio");
    expect(href("paraClientes")).toBe("/para-clientes");
    expect(hrefIndustria("barberias")).toBe("/rubros/barberias");
    expect(hrefIndustria("peluquerias")).toBe("/rubros/peluquerias");
    expect(hrefIndustria("estetica")).toBe("/rubros/estetica");
    expect(hrefIndustria("kinesiologia")).toBe("/rubros/kinesiologia");
    expect(hrefLegal("privacidad")).toBe("/legal/privacidad");
    expect(hrefLegal("terminos")).toBe("/legal/terminos");
    expect(hrefLegal("encargo")).toBe("/legal/encargo");
  });

  it("funktions- och branschsidorna (WP-75)", () => {
    expect(hrefFuncion("reservas")).toBe("/funcionalidades/reservas-online");
    expect(hrefFuncion("horasFlash")).toBe("/horas-flash");
    expect(hrefFuncion("migracion")).toBe("/migracion");
    expect(funcionFromParam("reservas-online")).toBe("reservas");
    expect(funcionFromParam("pagos")).toBeUndefined();
    expect(funcionParamSlugs()).not.toContain("pagos");
    expect(FUNCION_IDS).toHaveLength(8);
    expect(hrefRubro("naglar")).toBe("/rubros/unas");
  });

  it("appHref() ger filsystemets app-sökvägar", () => {
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
    expect(appHref("appAjustesPlan")).toBe("/app/ajustes/plan");
    expect(appHref("appSolicitud", "abc")).toBe("/app/solicitudes/abc");
    expect(appHref("appInvitacion", "tok")).toBe("/app/invitacion/tok");
    expect(appHref("appBienvenida", "tok")).toBe("/app/bienvenida/tok");
    expect(appHref("appOnboarding")).toBe("/app/onboarding");
    expect(appHref("baja", "tok")).toBe("/baja/tok");
    expect(appHref("resena", "tok")).toBe("/resena/tok");
  });

  it("appRoutePrefix(): prefixet (utan id/token) för en dynamisk app-rutt", () => {
    expect(appRoutePrefix("appInvitacion")).toBe("/app/invitacion/");
    expect(appRoutePrefix("appBienvenida")).toBe("/app/bienvenida/");
    expect(appRoutePrefix("appSolicitud")).toBe("/app/solicitudes/");
  });

  it("kontot och marknadsplatsen", () => {
    expect(cuentaHref("cuenta")).toBe("/cuenta");
    expect(cuentaHref("cuentaResena", "b1")).toBe("/cuenta/resena/b1");
    expect(hrefMarketplace("descubre", "cabello", "providencia")).toBe(
      "/descubre/cabello/providencia",
    );
    expect(hrefMarketplace("oferta", "corte")).toBe("/oferta/corte");
  });

  it("clLegacyRedirects(): 308 från gamla sökvägar", () => {
    const bySource = Object.fromEntries(
      clLegacyRedirects().map((r) => [r.source, r.destination]),
    );
    expect(bySource["/ejemplo/negocio"]).toBe("/demo/negocio");
    expect(bySource["/para/barberias"]).toBe("/rubros/barberias");
    expect(bySource["/para/kinesiologia"]).toBe("/rubros/kinesiologia");
    expect(clLegacyRedirects().every((r) => r.permanent === true)).toBe(true);
  });

  it("sitemapPaths(): unika sökvägar, utan /funcionalidades/pagos", () => {
    const paths = sitemapPaths();
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toContain("/precios");
    expect(paths).not.toContain("/funcionalidades/pagos");
  });
});
