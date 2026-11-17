import { describe, expect, it } from "vitest";

import {
  CARTEL_PAGE_SIZE,
  cartelDisplayUrl,
  cartelLink,
  cartelPrintQuery,
  parseCartelPrintParams,
} from "./carteles";

describe("parseCartelPrintParams", () => {
  it("sin parámetros: cartel de reservas, sin cambios de tamaño ni estilo", () => {
    expect(parseCartelPrintParams({})).toEqual({
      kind: "reservas",
      size: null,
      style: null,
    });
  });

  it("acepta valores de la lista", () => {
    expect(
      parseCartelPrintParams({
        cartel: "cuenta",
        tamano: "a5",
        estilo: "lima",
      }),
    ).toEqual({ kind: "cuenta", size: "a5", style: "lima" });
  });

  it("valores desconocidos se ignoran", () => {
    expect(
      parseCartelPrintParams({
        cartel: "resenas",
        tamano: "carta",
        estilo: "<script>",
      }),
    ).toEqual({ kind: "reservas", size: null, style: null });
  });

  it("un tamaño que no existe para el cartel se ignora", () => {
    expect(
      parseCartelPrintParams({ cartel: "reservas", tamano: "a6x4" }).size,
    ).toBeNull();
    expect(
      parseCartelPrintParams({ cartel: "cuenta", tamano: "a3" }).size,
    ).toBeNull();
  });

  it("la query de impresión solo lleva el cartel", () => {
    expect(cartelPrintQuery("cuenta")).toBe("cartel=cuenta");
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
