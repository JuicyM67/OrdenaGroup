import { describe, expect, it } from "vitest";

import {
  CARTEL_PAGE_SIZE,
  cartelDisplayUrl,
  cartelLink,
  cartelQuery,
  parseCartelOptions,
} from "./carteles";

describe("parseCartelOptions", () => {
  it("sin parámetros: cartel de reservas A4 claro", () => {
    expect(parseCartelOptions({})).toEqual({
      kind: "reservas",
      size: "a4",
      style: "claro",
    });
  });

  it("acepta valores de la lista", () => {
    expect(
      parseCartelOptions({ cartel: "cuenta", tamano: "a5", estilo: "lima" }),
    ).toEqual({ kind: "cuenta", size: "a5", style: "lima" });
  });

  it("valores desconocidos vuelven al valor por defecto", () => {
    expect(
      parseCartelOptions({
        cartel: "resenas",
        tamano: "carta",
        estilo: "<script>",
      }),
    ).toEqual({ kind: "reservas", size: "a4", style: "claro" });
  });

  it("un tamaño que no existe para el cartel usa el del cartel", () => {
    expect(
      parseCartelOptions({ cartel: "reservas", tamano: "a6x4" }).size,
    ).toBe("a4");
    expect(parseCartelOptions({ cartel: "cuenta", tamano: "a3" }).size).toBe(
      "a6x4",
    );
  });

  it("ida y vuelta por la query", () => {
    const o = { kind: "cuenta", size: "a6x4", style: "oscuro" } as const;
    const params = Object.fromEntries(new URLSearchParams(cartelQuery(o)));
    expect(parseCartelOptions(params)).toEqual(o);
  });

  it("4 por hoja se imprime en A4", () => {
    expect(CARTEL_PAGE_SIZE.a6x4).toBe("A4");
    expect(CARTEL_PAGE_SIZE.a3).toBe("A3");
  });
});

describe("cartelLink", () => {
  it("reservas: página del negocio con utm_source=cartel", () => {
    expect(cartelLink("reservas", "https://ordenagroup.cl", "mi-salon")).toBe(
      "https://ordenagroup.cl/mi-salon?utm_source=cartel",
    );
  });

  it("cuenta: ingreso de clientes con utm_source=cartel", () => {
    expect(cartelLink("cuenta", "https://ordenagroup.cl", "mi-salon")).toBe(
      "https://ordenagroup.cl/cuenta/ingresar?utm_source=cartel",
    );
  });

  it("la dirección en texto va sin protocolo", () => {
    expect(cartelDisplayUrl("https://ordenagroup.cl", "mi-salon")).toBe(
      "ordenagroup.cl/mi-salon",
    );
  });
});
