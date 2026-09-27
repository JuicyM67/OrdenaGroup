/**
 * Pruebas de las exportaciones nuevas de WP-03b (paso 1 del plan):
 * `validacion`, `acceso`, `negocio`, `onboarding`, `servicios`,
 * `profesionales`, `horarios`, `ajustes`, `clientes`, `caja` y `abono`.
 * Mismas familias de prueba que `es-CL.test.ts` (WP-03), reutilizando
 * `./test-helpers` para no duplicar las reglas de tono, el patrón de marca
 * ni la lista de nombres de fixture.
 *
 * No hay pruebas de "paridad de diseño" acá (R1 del plan de WP-03b: no
 * existe un `.dc.html` para estas pantallas), solo de contrato: contra los
 * tipos de error de `src/lib/format/` (WP-04) y contra los enums de
 * `src/types/database.ts` (WP-01).
 */
import { describe, expect, it } from "vitest";

import type { ClpError } from "@/lib/format/clp";
import type { PhoneError } from "@/lib/format/phone";
import type { RutError } from "@/lib/format/rut";
import {
  chileanMobileInputSchema,
  chileanPhoneInputSchema,
  clpInputSchema,
  localEndTimeSchema,
  localTimeSchema,
  rutInputSchema,
} from "@/lib/format/schemas";
import { Constants } from "@/types/database";

import {
  abono,
  acceso,
  ajustes,
  caja,
  clientes,
  horarios,
  negocio,
  onboarding,
  profesionales,
  servicios,
  validacion,
} from "./es-CL";
import {
  NOMBRES_FIXTURE,
  paraCadaHoja,
  PATRON_MARCA,
  PATRON_RESTO_ROTO,
  REGLAS_DE_TONO,
  type Rama,
} from "./test-helpers";

// ---------------------------------------------------------------------------
// `src/lib/format/dates.ts` no exporta alias para estas uniones de error
// (van inline en la firma de `parseLocalDate`/`parseLocalTime`/
// `fromLocalStrict`): se repiten acá tal cual, con la fuente anotada. Si
// WP-04 les cambia el nombre a los códigos, este archivo deja de compilar
// donde se usan (mismo efecto que un `import type`).
// ---------------------------------------------------------------------------
type DateError = "invalid_format" | "invalid_date"; // parseLocalDate
type TimeError = "invalid_format" | "out_of_range"; // parseLocalTime
type HoraLocalError = "nonexistent_local_time" | "ambiguous_local_time"; // fromLocalStrict

const AREAS_V2: Record<string, Rama> = {
  validacion,
  acceso,
  onboarding,
  negocio,
  servicios,
  profesionales,
  horarios,
  clientes,
  caja,
  ajustes,
  abono,
};

// ---------------------------------------------------------------------------
// Estructura: cada hoja es un string no vacío o una función
// ---------------------------------------------------------------------------

describe("estructura (WP-03b)", () => {
  for (const [nombreArea, raiz] of Object.entries(AREAS_V2)) {
    it(`${nombreArea}: cada hoja es un string no vacío o una función`, () => {
      paraCadaHoja(raiz, nombreArea, (ruta, hoja) => {
        if (typeof hoja === "string") {
          expect(hoja.length, ruta).toBeGreaterThan(0);
        } else {
          expect(typeof hoja, ruta).toBe("function");
        }
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Muestra genérica para invocar cada función con parámetros representativos
// ---------------------------------------------------------------------------

const MUESTRA_GENERICA_V2: Record<string, unknown> = {
  n: 3,
  total: 4,
  min: 1,
  max: 365,
  segundos: 45,
  email: "dueña@ejemplo.cl",
  url: "https://ejemplo.cl/barberia-central",
  saldo: "$6.000",
  cuenta: "dueña@mercadopago.cl",
  rangos: ["10:00–14:00", "15:00–19:00"],
  busqueda: "joaquín",
  metodo: "Efectivo",
  negocio: "Barbería Central",
  fecha: "12 de marzo de 2026",
  desde: "28 de septiembre",
  hasta: "4 de octubre",
  precio: "$18.000",
  descuento: "$0",
  abono: "$6.000",
  monto: "$6.000",
  horas: 4,
  minutos: 15,
};

function invocarGenerico(fn: unknown): unknown {
  return (fn as (p: Record<string, unknown>) => unknown)(MUESTRA_GENERICA_V2);
}

function revisarFuncionesGenerico(valor: unknown, ruta: string): void {
  if (typeof valor === "function") {
    const resultado = invocarGenerico(valor);
    expect(typeof resultado, ruta).toBe("string");
    const texto = resultado as string;
    expect(texto.length, ruta).toBeGreaterThan(0);
    expect(PATRON_RESTO_ROTO.test(texto), `${ruta}: "${texto}"`).toBe(false);
  } else if (Array.isArray(valor)) {
    valor.forEach((v, i) => revisarFuncionesGenerico(v, `${ruta}[${i}]`));
  } else if (valor && typeof valor === "object") {
    for (const [k, v] of Object.entries(valor)) {
      revisarFuncionesGenerico(v, ruta ? `${ruta}.${k}` : k);
    }
  }
}

describe("cada función soporta parámetros genéricos sin dejar restos rotos (WP-03b)", () => {
  for (const [nombre, raiz] of Object.entries(AREAS_V2)) {
    it(`${nombre}: ninguna función deja undefined/NaN/null/[object/llaves sueltas`, () => {
      revisarFuncionesGenerico(raiz, nombre);
    });
  }
});

// ---------------------------------------------------------------------------
// Tipos: @ts-expect-error debe fallar el typecheck si dejan de ser errores
// ---------------------------------------------------------------------------

describe("tipos (verificados por npm run typecheck)", () => {
  it("una clave inexistente no compila", () => {
    // @ts-expect-error "noExiste" no es una clave de caja
    expect(caja.noExiste).toBeUndefined();
  });

  it("llamar una función sin uno de sus parámetros no compila", () => {
    // @ts-expect-error falta "saldo"
    expect(abono.reserva.explicacion({ monto: "$6.000" })).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Contrato contra los tipos de error de src/lib/format/ (WP-04), a nivel de
// tipo (satisfies Record<Codigo, string> vía asignación) y a nivel de
// ejecución (los esquemas reales de Zod).
// ---------------------------------------------------------------------------

describe("validacion cubre los códigos reales de src/lib/format/ (tipo)", () => {
  it("validacion.telefonoNegocio y .telefonoCliente cubren PhoneError + invalid_type + invalid_format", () => {
    const a: Record<PhoneError | "invalid_type" | "invalid_format", string> =
      validacion.telefonoNegocio;
    const b: Record<PhoneError | "invalid_type" | "invalid_format", string> =
      validacion.telefonoCliente;
    expect(a).toBeDefined();
    expect(b).toBeDefined();
  });

  it("validacion.clp cubre ClpError + invalid_type", () => {
    const a: Record<ClpError | "invalid_type", string> = validacion.clp;
    expect(a).toBeDefined();
  });

  it("validacion.rut cubre RutError", () => {
    const a: Record<RutError, string> = validacion.rut;
    expect(a).toBeDefined();
  });

  it("validacion.date cubre DateError + invalid_type", () => {
    const a: Record<DateError | "invalid_type", string> = validacion.date;
    expect(a).toBeDefined();
  });

  it("validacion.time cubre TimeError + invalid_type", () => {
    const a: Record<TimeError | "invalid_type", string> = validacion.time;
    expect(a).toBeDefined();
  });

  it("validacion.horaLocal cubre HoraLocalError", () => {
    const a: Record<HoraLocalError, string> = validacion.horaLocal;
    expect(a).toBeDefined();
  });
});

describe("validacion cubre los códigos reales de src/lib/format/ (ejecución)", () => {
  it("chileanPhoneInputSchema con prefijo inválido → phone.invalid_prefix", () => {
    const r = chileanPhoneInputSchema.safeParse("+56 1 2345 6789");
    expect(r.success).toBe(false);
    const codigo = r.success ? "" : (r.error.issues[0]?.message ?? "");
    expect(codigo.split(".")[1]).toBe("invalid_prefix");
    expect(validacion.telefonoNegocio.invalid_prefix.length).toBeGreaterThan(0);
  });

  it("chileanPhoneInputSchema con serie 60x → phone.invalid_prefix", () => {
    const r = chileanPhoneInputSchema.safeParse("+56 60 123 4567");
    expect(r.success).toBe(false);
  });

  it("chileanMobileInputSchema con un fijo → phone.not_mobile", () => {
    const r = chileanMobileInputSchema.safeParse("+56 2 2123 4567");
    expect(r.success).toBe(false);
    const codigo = r.success ? "" : (r.error.issues[0]?.message ?? "");
    expect(codigo).toBe("phone.not_mobile");
  });

  it('clpInputSchema con "18.000,50" → clp.invalid_format', () => {
    const r = clpInputSchema.safeParse("18.000,50");
    expect(r.success).toBe(false);
    const codigo = r.success ? "" : (r.error.issues[0]?.message ?? "");
    expect(codigo).toBe("clp.invalid_format");
  });

  it("rutInputSchema con dígito verificador incorrecto → rut.invalid_check_digit", () => {
    const r = rutInputSchema.safeParse("12345678-9");
    expect(r.success).toBe(false);
    const codigo = r.success ? "" : (r.error.issues[0]?.message ?? "");
    expect(codigo).toBe("rut.invalid_check_digit");
  });

  it('localEndTimeSchema con "24:30" → time.out_of_range', () => {
    const r = localEndTimeSchema.safeParse("24:30");
    expect(r.success).toBe(false);
    const codigo = r.success ? "" : (r.error.issues[0]?.message ?? "");
    expect(codigo).toBe("time.out_of_range");
  });

  it('localTimeSchema con "24:00" (sin allowEndOfDay) → time.out_of_range', () => {
    const r = localTimeSchema.safeParse("24:00");
    expect(r.success).toBe(false);
    const codigo = r.success ? "" : (r.error.issues[0]?.message ?? "");
    expect(codigo).toBe("time.out_of_range");
  });

  // Cada código real (después del prefijo) tiene una clave en `validacion`.
  it.each([
    ["phone", "invalid_chars"],
    ["phone", "not_chilean"],
    ["phone", "invalid_length"],
    ["clp", "empty"],
    ["clp", "out_of_range"],
    ["rut", "empty"],
    ["rut", "invalid_format"],
    ["rut", "out_of_range"],
    ["date", "invalid_format"],
    ["date", "invalid_date"],
    ["time", "invalid_format"],
  ] as const)("%s.%s tiene una clave en validacion", (prefijo, codigo) => {
    const mapa =
      prefijo === "phone"
        ? validacion.telefonoNegocio
        : prefijo === "clp"
          ? validacion.clp
          : prefijo === "rut"
            ? validacion.rut
            : prefijo === "date"
              ? validacion.date
              : validacion.time;
    expect((mapa as Record<string, string>)[codigo]?.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Contrato contra los enums de la base de datos (src/types/database.ts)
// ---------------------------------------------------------------------------

describe("contrato contra los enums de la base de datos", () => {
  it("caja.metodo cubre payment_method exacto", () => {
    expect(Object.keys(caja.metodo).sort()).toEqual(
      [...Constants.public.Enums.payment_method].sort(),
    );
  });

  it("caja.tipo cubre payment_kind exacto", () => {
    expect(Object.keys(caja.tipo).sort()).toEqual(
      [...Constants.public.Enums.payment_kind].sort(),
    );
  });

  it("caja.estado cubre payment_status exacto", () => {
    expect(Object.keys(caja.estado).sort()).toEqual(
      [...Constants.public.Enums.payment_status].sort(),
    );
  });

  it("abono.servicio.depositKind cubre deposit_kind exacto", () => {
    expect(Object.keys(abono.servicio.depositKind).sort()).toEqual(
      [...Constants.public.Enums.deposit_kind].sort(),
    );
  });

  it("horarios.bloqueos.kind cubre time_off_kind exacto", () => {
    expect(Object.keys(horarios.bloqueos.kind).sort()).toEqual(
      [...Constants.public.Enums.time_off_kind].sort(),
    );
  });

  it("ajustes.waitlistMode cubre waitlist_mode exacto", () => {
    expect(Object.keys(ajustes.waitlistMode).sort()).toEqual(
      [...Constants.public.Enums.waitlist_mode].sort(),
    );
  });

  it("clientes.consentimientos.canal cubre consent_channel exacto", () => {
    expect(Object.keys(clientes.consentimientos.canal).sort()).toEqual(
      [...Constants.public.Enums.consent_channel].sort(),
    );
  });

  it("profesionales.colores cubre exactamente staff-1 … staff-6", () => {
    expect(Object.keys(profesionales.colores).sort()).toEqual(
      ["staff-1", "staff-2", "staff-3", "staff-4", "staff-5", "staff-6"].sort(),
    );
  });
});

// ---------------------------------------------------------------------------
// Flexión (n = 0, 1, 2, 21) y algunos patrones dinámicos
// ---------------------------------------------------------------------------

describe("flexión (n = 0, 1, 2, 21)", () => {
  it("clientes.ficha.visitas", () => {
    expect(clientes.ficha.visitas({ n: 0 })).toBe("0 visitas");
    expect(clientes.ficha.visitas({ n: 1 })).toBe("1 visita");
    expect(clientes.ficha.visitas({ n: 2 })).toBe("2 visitas");
    expect(clientes.ficha.visitas({ n: 21 })).toBe("21 visitas");
  });

  it("clientes.ficha.inasistencias", () => {
    expect(clientes.ficha.inasistencias({ n: 0 })).toBe("0 inasistencias");
    expect(clientes.ficha.inasistencias({ n: 1 })).toBe("1 inasistencia");
    expect(clientes.ficha.inasistencias({ n: 2 })).toBe("2 inasistencias");
  });

  it("caja.resumen.reservasCount y servicios.contador", () => {
    expect(caja.resumen.reservasCount({ n: 1 })).toBe("1 reserva");
    expect(caja.resumen.reservasCount({ n: 0 })).toBe("0 reservas");
    expect(servicios.contador({ n: 1 })).toBe("1 servicio");
    expect(servicios.contador({ n: 21 })).toBe("21 servicios");
  });

  it("onboarding.checklist.pasosPendientes", () => {
    expect(onboarding.checklist.pasosPendientes({ n: 1 })).toBe(
      "1 paso pendiente",
    );
    expect(onboarding.checklist.pasosPendientes({ n: 2 })).toBe(
      "2 pasos pendientes",
    );
  });

  it("profesionales.errores.staff_has_future_bookings", () => {
    expect(profesionales.errores.staff_has_future_bookings({ n: 1 })).toBe(
      "Tiene 1 reserva próxima, muévelas o cancélalas primero.",
    );
    expect(profesionales.errores.staff_has_future_bookings({ n: 3 })).toBe(
      "Tiene 3 reservas próximas, muévelas o cancélalas primero.",
    );
  });

  it("horarios.bloqueos.overlapsBookings", () => {
    expect(horarios.bloqueos.overlapsBookings({ n: 1 })).toBe(
      "Ese bloqueo se cruza con 1 reserva. Muévelas antes de guardar.",
    );
    expect(horarios.bloqueos.overlapsBookings({ n: 2 })).toBe(
      "Ese bloqueo se cruza con 2 reservas. Muévelas antes de guardar.",
    );
  });

  it("horarios.intervalos con 1, 2 y 3 rangos", () => {
    expect(horarios.intervalos({ rangos: ["10:00–14:00"] })).toBe(
      "10:00–14:00",
    );
    expect(
      horarios.intervalos({ rangos: ["10:00–14:00", "15:00–19:00"] }),
    ).toBe("10:00–14:00 y 15:00–19:00");
    expect(
      horarios.intervalos({
        rangos: ["09:00–12:00", "13:00–17:00", "18:00–20:00"],
      }),
    ).toBe("09:00–12:00, 13:00–17:00 y 18:00–20:00");
  });
});

// ---------------------------------------------------------------------------
// Tono y marca (mismas reglas que WP-03, vía ./test-helpers)
// ---------------------------------------------------------------------------

describe("tono y marca (WP-03b)", () => {
  function todosLosStringsEstaticosV2(): string[] {
    const encontrados: string[] = [];
    for (const raiz of Object.values(AREAS_V2)) {
      paraCadaHoja(raiz, "", (_ruta, hoja) => {
        if (typeof hoja === "string") encontrados.push(hoja);
      });
    }
    return encontrados;
  }

  it("ningún texto nuevo usa un giro prohibido", () => {
    for (const texto of todosLosStringsEstaticosV2()) {
      for (const [nombreRegla, regex] of Object.entries(REGLAS_DE_TONO)) {
        expect(regex.test(texto), `${nombreRegla}: "${texto}"`).toBe(false);
      }
    }
  });

  it("ningún texto nuevo escribe el nombre del producto a mano", () => {
    for (const texto of todosLosStringsEstaticosV2()) {
      expect(PATRON_MARCA.test(texto), texto).toBe(false);
    }
  });

  it("ningún nombre de fixture de diseño aparece suelto en las áreas nuevas", () => {
    const todos = todosLosStringsEstaticosV2().join("\n");
    for (const nombre of NOMBRES_FIXTURE) {
      expect(todos.includes(nombre), nombre).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// GUIA §5: ningún botón/diálogo dice "Cancelar" a secas
// ---------------------------------------------------------------------------

describe("GUIA §5: nunca 'Cancelar' a secas", () => {
  it("ninguna hoja de las áreas nuevas es exactamente 'Cancelar'", () => {
    for (const raiz of Object.values(AREAS_V2)) {
      paraCadaHoja(raiz, "", (ruta, hoja) => {
        if (typeof hoja === "string") {
          expect(hoja, ruta).not.toBe("Cancelar");
        }
      });
    }
  });

  it("caja.anular usa 'Anular pago', no 'Cancelar pago'", () => {
    expect(caja.anular.cta).toBe("Anular pago");
  });
});

// ---------------------------------------------------------------------------
// Protección de datos (Ley 21.719): las ayudas de anotaciones y nombres
// mencionan "salud"; el consentimiento manual está redactado como algo que
// hizo el cliente, no una casilla premarcada por el dueño (ver también
// "consentimiento manual de Clientes" en es-CL.test.ts).
// ---------------------------------------------------------------------------

describe("protección de datos", () => {
  it("servicios.campos.nombreAyuda menciona salud", () => {
    expect(servicios.campos.nombreAyuda).toMatch(/salud/);
  });

  it("clientes.notas.ayuda menciona salud", () => {
    expect(clientes.notas.ayuda).toMatch(/salud/);
  });

  it("horarios.bloqueos.notaAyuda menciona salud", () => {
    expect(horarios.bloqueos.notaAyuda).toMatch(/salud/);
  });
});

// ---------------------------------------------------------------------------
// Longitudes (sin referencia de diseño: estimadas de los componentes de
// WP-02, documentadas acá, R1 del plan de WP-03b)
// ---------------------------------------------------------------------------

describe("longitudes", () => {
  it("SegmentedControl de Caja ≤ 7 caracteres", () => {
    expect(caja.periodos.hoy.length).toBeLessThanOrEqual(7);
    expect(caja.periodos.semana.length).toBeLessThanOrEqual(7);
    expect(caja.periodos.mes.length).toBeLessThanOrEqual(7);
  });

  it("CTA de BookingBar (abono) ≤ 12 caracteres", () => {
    expect(abono.reserva.ctaPagar.length).toBeLessThanOrEqual(12);
  });

  it("Chips ≤ 22 caracteres", () => {
    for (const etiqueta of Object.values(caja.metodo)) {
      expect(etiqueta.length).toBeLessThanOrEqual(22);
    }
    for (const etiqueta of Object.values(caja.tipo)) {
      expect(etiqueta.length).toBeLessThanOrEqual(22);
    }
  });

  it("Oraciones de introducción de onboarding ≤ 120 caracteres", () => {
    for (const texto of Object.values(onboarding.intro)) {
      expect(texto.length).toBeLessThanOrEqual(120);
    }
  });
});
