import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { brand } from "@/config/brand";

import {
  agenda,
  calendario,
  comun,
  email,
  errores,
  estados,
  gestion,
  hoy,
  inicio,
  nav,
  plantillasWhatsapp,
  reserva,
  whatsappSesion,
} from "./es-CL";

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const REF_DIR = path.resolve(process.cwd(), "docs/design/reference");

function leerReferencia(nombre: string): string {
  return fs.readFileSync(path.join(REF_DIR, nombre), "utf8");
}

const RESERVA_HTML = leerReferencia("Reserva.dc.html");
const MAIN_HTML = leerReferencia("Main.dc.html");
const AGENDA_HTML = leerReferencia("Agenda.dc.html");
const HOY_HTML = leerReferencia("Hoy.dc.html");

/** El texto aparece como nodo de texto (`>texto<`), como valor de atributo
 * (`"texto"`, p. ej. un aria-label) o como string de JS en el script de
 * ejemplo (`'texto'`). Más estricto que un `.includes()` suelto. */
function apareceComoNodo(contenido: string, texto: string): boolean {
  // Nodo de texto (con espacios o saltos de línea alrededor), atributo o
  // string de JS.
  const t = escaparRegExp(texto);
  return new RegExp(`>\\s*${t}\\s*<|"${t}"|'${t}'`).test(contenido);
}

function escaparRegExp(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type Hoja = string | ((p: never) => string);
type Rama = { readonly [k: string]: Hoja | Rama };

/** Recorre un área completa y visita cada hoja (string o función). */
function paraCadaHoja(
  raiz: Rama,
  prefijo: string,
  visitar: (ruta: string, hoja: Hoja) => void,
): void {
  for (const [clave, valor] of Object.entries(raiz)) {
    const ruta = prefijo ? `${prefijo}.${clave}` : clave;
    if (typeof valor === "string" || typeof valor === "function") {
      visitar(ruta, valor);
    } else {
      paraCadaHoja(valor, ruta, visitar);
    }
  }
}

const AREAS: Record<string, Rama> = {
  comun,
  nav,
  estados,
  calendario,
  errores,
  reserva,
  gestion,
  inicio,
  agenda,
  hoy,
};

function todosLosStringsEstaticos(): string[] {
  const encontrados: string[] = [];
  for (const raiz of Object.values(AREAS)) {
    paraCadaHoja(raiz, "", (_ruta, hoja) => {
      if (typeof hoja === "string") encontrados.push(hoja);
    });
  }
  return encontrados;
}

/** Recolecta todos los strings de un árbol de datos cualquiera (no solo
 * `Trad`): usado para `plantillasWhatsapp` (que tiene `numero`, `dominioPendiente`,
 * etc. además de strings). Ignora números, booleanos y funciones. */
function recolectarStringsProfundo(valor: unknown, out: string[]): void {
  if (typeof valor === "string") {
    out.push(valor);
  } else if (Array.isArray(valor)) {
    for (const v of valor) recolectarStringsProfundo(v, out);
  } else if (valor && typeof valor === "object") {
    for (const v of Object.values(valor)) recolectarStringsProfundo(v, out);
  }
}

// ---------------------------------------------------------------------------
// Estructura: cada hoja es un string no vacío o una función
// ---------------------------------------------------------------------------

describe("estructura", () => {
  for (const [nombreArea, raiz] of Object.entries(AREAS)) {
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
// Estructura profunda: cada función, llamada con parámetros genéricos, no
// deja `undefined`, `NaN`, `null`, `[object`, ni llaves `{`/`{{` sueltas.
// ---------------------------------------------------------------------------

/** Un valor por cada nombre de parámetro usado en cualquier función de
 * `es-CL.ts`. No es "correcto" gramaticalmente para cada función (p. ej.
 * `horas` sirve tanto para textos con número como con string ya formateado):
 * solo sirve para detectar restos rotos, no para verificar el texto exacto
 * (eso ya lo hacen las pruebas de "flexión" y "paridad de diseño"). */
const MUESTRA_GENERICA: Record<string, unknown> = {
  n: 3,
  h: 1,
  m: 30,
  offset: -3,
  porcentaje: 20,
  horas: "4 horas",
  activas: 2,
  reservadas: 1,
  horasCancelacion: 4,
  negocio: "Barbería Norte",
  cliente: "Joaquín",
  nombre: "Diego",
  servicio: "Corte + barba",
  profesional: "Diego",
  dia: "sábado",
  fecha: "viernes 2 de octubre",
  hora: "15:00",
  monto: "$84.000",
  precio: "$12.000",
  telefono: "+56 9 •••• 4821",
  telefonoNegocio: "+56 9 1234 5678",
  visita: "3.ª visita",
  relativo: "en 20 min",
  desde: "28 de septiembre",
  hasta: "4 de octubre",
  comuna: "Providencia",
  rango: "11:30 – 12:05",
  dias: "Lun–Sáb",
  linkGestion: "https://ejemplo.cl/r/abc123",
  linkNuevaReserva: "https://ejemplo.cl/barberia-norte",
  plataforma: "la plataforma",
};

const PATRON_RESTO_ROTO = /undefined|NaN|\bnull\b|\[object|\{\{|\{[a-zA-Z]/;

function invocarGenerico(fn: unknown): unknown {
  return (fn as (p: Record<string, unknown>) => unknown)(MUESTRA_GENERICA);
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

describe("cada función soporta parámetros genéricos sin dejar restos rotos", () => {
  const raices: Record<string, unknown> = { ...AREAS, email, whatsappSesion };
  for (const [nombre, raiz] of Object.entries(raices)) {
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
    // @ts-expect-error "noExiste" no es una clave de reserva.pasos
    expect(reserva.pasos.noExiste).toBeUndefined();
  });

  it("una clave inexistente en agenda.popover no compila", () => {
    // @ts-expect-error "noExiste" no es una clave de agenda.popover
    expect(agenda.popover.noExiste).toBeUndefined();
  });

  it("llamar una función sin sus parámetros no compila", () => {
    // @ts-expect-error falta "profesional"
    expect(agenda.popover.conProfesional({})).toBeTruthy();
  });

  it("llamar una función con un parámetro mal escrito no compila", () => {
    // @ts-expect-error "dias" está mal escrito, no "dia"
    expect(reserva.waitlist.diaLleno({ diaa: "sábado" })).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Muestras: cada función se llama con parámetros representativos.
// Esta tabla alimenta las pruebas de tono, marca, paridad de diseño y
// paridad inversa.
// ---------------------------------------------------------------------------

const muestras: string[] = [];
function registrar(texto: string): string {
  muestras.push(texto);
  return texto;
}

describe("flexión (n = 0, 1, 2, 21) y patrones dinámicos", () => {
  it("comun.visita (ordinal femenino, compartido entre Agenda y Hoy)", () => {
    expect(registrar(comun.visita({ n: 6 }))).toBe("6.ª visita");
    expect(registrar(comun.visita({ n: 3 }))).toBe("3.ª visita");
    expect(comun.visita({ n: 1 })).toBe("1.ª visita");
    expect(comun.visita({ n: 21 })).toBe("21.ª visita");
  });

  it("inicio.features.listaEspera.resumen", () => {
    expect(
      registrar(inicio.features.listaEspera.resumen({ n: 1, dia: "sábado" })),
    ).toBe("1 persona · sábado");
    expect(
      registrar(inicio.features.listaEspera.resumen({ n: 3, dia: "sábado" })),
    ).toBe("3 personas · sábado");
    expect(inicio.features.listaEspera.resumen({ n: 21, dia: "sábado" })).toBe(
      "21 personas · sábado",
    );
    expect(inicio.features.listaEspera.resumen({ n: 0, dia: "sábado" })).toBe(
      "0 personas · sábado",
    );
  });

  it("inicio.features.horasFlash.resumen", () => {
    expect(
      registrar(
        inicio.features.horasFlash.resumen({ activas: 2, reservadas: 1 }),
      ),
    ).toBe("2 activas · 1 reservada");
    expect(
      inicio.features.horasFlash.resumen({ activas: 1, reservadas: 2 }),
    ).toBe("1 activa · 2 reservadas");
  });

  it("inicio.features.teEchamosDeMenos.resumen", () => {
    expect(registrar(inicio.features.teEchamosDeMenos.resumen({ n: 12 }))).toBe(
      "12 clientes sin volver",
    );
    expect(inicio.features.teEchamosDeMenos.resumen({ n: 1 })).toBe(
      "1 cliente sin volver",
    );
  });

  it("inicio.stats.reservasHoy (incluye el estado en 0)", () => {
    expect(registrar(inicio.stats.reservasHoy({ n: 2 }))).toBe(
      "Reservas hoy · 2 por confirmar",
    );
    expect(inicio.stats.reservasHoy({ n: 0 })).toBe(
      "Reservas hoy · 0 por confirmar",
    );
  });

  it("inicio.hero.horas", () => {
    expect(registrar(inicio.hero.horas({ n: 4 }))).toBe("4 horas");
    expect(inicio.hero.horas({ n: 1 })).toBe("1 hora");
  });

  it("inicio.flashCard.fechaHoraDescuento", () => {
    expect(
      registrar(
        inicio.flashCard.fechaHoraDescuento({
          fecha: "Mar 6",
          hora: "11:30",
          porcentaje: 20,
        }),
      ),
    ).toBe("Mar 6 · 11:30 · −20%");
  });

  it("agenda.panel.reservasCount (incluye el estado en 0)", () => {
    expect(registrar(agenda.panel.reservasCount({ n: 21 }))).toBe(
      "21 reservas",
    );
    expect(agenda.panel.reservasCount({ n: 1 })).toBe("1 reserva");
    expect(agenda.panel.reservasCount({ n: 0 })).toBe("0 reservas");
  });

  it("agenda.panel.esperanEl", () => {
    expect(registrar(agenda.panel.esperanEl({ n: 3, dia: "sábado" }))).toBe(
      "3 esperan el sábado",
    );
    expect(agenda.panel.esperanEl({ n: 1, dia: "sábado" })).toBe(
      "1 espera el sábado",
    );
    expect(agenda.panel.esperanEl({ n: 0, dia: "sábado" })).toBe(
      "0 esperan el sábado",
    );
    expect(agenda.panel.esperanEl({ n: 21, dia: "sábado" })).toBe(
      "21 esperan el sábado",
    );
  });

  it("agenda.popover.telefonoYVisita y agenda.popover.fechaYRango", () => {
    expect(
      registrar(
        agenda.popover.telefonoYVisita({
          telefono: "+56 9 •••• 4821",
          visita: comun.visita({ n: 6 }),
        }),
      ),
    ).toBe("+56 9 •••• 4821 · 6.ª visita");
    expect(
      registrar(
        agenda.popover.fechaYRango({
          fecha: "Vie 2 oct",
          rango: "11:30 – 12:05",
        }),
      ),
    ).toBe("Vie 2 oct · 11:30 – 12:05");
  });

  it("hoy.restoDia.resumen y hoy.restoDia.detalle", () => {
    expect(registrar(hoy.restoDia.resumen({ n: 6, monto: "$84.000" }))).toBe(
      "6 reservas · $84.000",
    );
    expect(hoy.restoDia.resumen({ n: 1, monto: "$12.000" })).toBe(
      "1 reserva · $12.000",
    );
    expect(
      registrar(
        hoy.restoDia.detalle({
          servicio: "Corte clásico",
          profesional: "Matías",
        }),
      ),
    ).toBe("Corte clásico · Matías");
  });

  it("hoy.relativo.* (WP-04 entrega el número, acá vive la frase)", () => {
    expect(registrar(hoy.relativo.enMin({ n: 20 }))).toBe("en 20 min");
    expect(registrar(hoy.relativo.enHoras({ h: 1, m: 15 }))).toBe(
      "en 1 h 15 min",
    );
    // m = 0: nunca "en 1 h 0 min".
    expect(registrar(hoy.relativo.enHoras({ h: 2, m: 0 }))).toBe("en 2 h");
    expect(registrar(hoy.relativo.atrasado({ n: 5 }))).toBe("5 min de atraso");
    expect(hoy.relativo.ahora).toBe("ahora");
  });

  it("estados.flashConDescuento", () => {
    expect(registrar(estados.flashConDescuento({ porcentaje: 20 }))).toBe(
      "Flash −20%",
    );
  });

  it("reserva.descuento", () => {
    expect(registrar(reserva.descuento({ porcentaje: 20 }))).toBe("−20%");
  });

  it("reserva.waitlist.diaLleno y reserva.waitlist.confirmacion", () => {
    expect(registrar(reserva.waitlist.diaLleno({ dia: "sábado" }))).toBe(
      "El sábado está lleno",
    );
    expect(
      registrar(
        reserva.waitlist.confirmacion({
          servicio: "Corte + barba",
          dia: "sábado",
        }),
      ),
    ).toBe("Quedaste en la lista de espera para Corte + barba el sábado.");
    registrar(reserva.waitlist.ctaUnirme);
  });

  it("reserva.consentimientos.privacidadLinkTexto y .responsable", () => {
    registrar(reserva.consentimientos.privacidadLinkTexto);
    const texto = registrar(
      reserva.consentimientos.responsable({ negocio: "Barbería Norte" }),
    );
    expect(texto).toContain("Barbería Norte");
    expect(texto).toContain("la plataforma");
  });

  it("reserva.resumen.* sigue la fórmula del diseño (BookingBar)", () => {
    // Fórmula original: svc.name + ' · ' + day.label + ', ' + st.time + ' · ' + who
    expect(
      registrar(
        reserva.resumen.conProfesional({
          servicio: "Corte + barba",
          dia: "Mar 6",
          hora: "11:30",
          profesional: "Diego",
        }),
      ),
    ).toBe("Corte + barba · Mar 6, 11:30 · Diego");
    expect(
      registrar(
        reserva.resumen.sinProfesional({
          servicio: "Corte + barba",
          dia: "Mar 6",
          hora: "11:30",
        }),
      ),
    ).toBe("Corte + barba · Mar 6, 11:30");
    expect(
      registrar(
        reserva.resumen.listaEspera({
          servicio: "Corte + barba",
          dia: "Sáb 3",
        }),
      ),
    ).toBe("Corte + barba · Sáb 3 · lista de espera");
  });

  it("reserva.meta.titulo", () => {
    expect(registrar(reserva.meta.titulo({ negocio: "Barbería Norte" }))).toBe(
      "Reservar en Barbería Norte",
    );
  });

  it("reserva.meta.vendidoPor menciona el nombre del negocio y de la marca", () => {
    const texto = registrar(
      reserva.meta.vendidoPor({ negocio: "Barbería Norte" }),
    );
    expect(texto).toContain("Barbería Norte");
    expect(texto).toContain(brand.name);
  });

  it("reserva.antesDeConfirmar.*", () => {
    registrar(reserva.antesDeConfirmar.politicaCancelacion({ horas: 4 }));
    registrar(
      reserva.antesDeConfirmar.avisoWhatsapp({ negocio: "Barbería Norte" }),
    );
    expect(
      reserva.antesDeConfirmar.politicaCancelacion({ horas: 4 }),
    ).toContain("4 h");
    expect(
      reserva.antesDeConfirmar.avisoWhatsapp({ negocio: "Barbería Norte" }),
    ).toContain("Barbería Norte");
  });

  it("reserva.precioAnteriorAria", () => {
    expect(
      registrar(reserva.precioAnteriorAria({ precio: "$18.000" })),
    ).toContain("$18.000");
  });

  it("reserva.consentimientos.marketing menciona WhatsApp y BAJA", () => {
    const texto = registrar(
      reserva.consentimientos.marketing({ negocio: "Barbería Norte" }),
    );
    expect(texto).toContain("WhatsApp");
    expect(texto).toContain("BAJA");
    expect(texto).toContain("Barbería Norte");
  });

  it("gestion.fueraDePlazo (sin forma generizada)", () => {
    const texto = registrar(
      gestion.fueraDePlazo({
        horas: 4,
        telefonoNegocio: "+56 9 1234 5678",
      }),
    );
    expect(texto).toContain("4 h");
    expect(texto).toContain("+56 9 1234 5678");
    expect(texto).not.toMatch(/\bsola\b/);
  });

  it("inicio.metaRow y inicio.hola", () => {
    expect(
      registrar(
        inicio.metaRow({
          fecha: "Viernes 2 de octubre",
          negocio: "Barbería Norte",
          comuna: "Providencia",
        }),
      ),
    ).toBe("Viernes 2 de octubre · Barbería Norte, Providencia");
    expect(registrar(inicio.hola({ nombre: "Camila" }))).toBe("Hola, Camila");
  });

  it("inicio.hero.resumen", () => {
    expect(
      registrar(inicio.hero.resumen({ horas: "4 horas", monto: "$72.000" })),
    ).toBe(
      "Recuperaste 4 horas · $72.000 con la lista de espera y las horas flash.",
    );
  });

  it("inicio.agendaHoy.fila e inicio.flashCard.detalle", () => {
    expect(
      registrar(
        inicio.agendaHoy.fila({
          servicio: "Corte + barba",
          profesional: "Diego",
        }),
      ),
    ).toBe("Corte + barba · con Diego");
    expect(
      registrar(
        inicio.flashCard.detalle({
          servicio: "Corte + barba",
          profesional: "Diego",
        }),
      ),
    ).toBe("Corte + barba con Diego");
  });

  it("agenda.verAgendaDe y agenda.semana", () => {
    expect(registrar(agenda.verAgendaDe({ nombre: "Diego" }))).toBe(
      "Ver agenda de Diego",
    );
    expect(
      registrar(
        agenda.semana({
          desde: "28 de septiembre",
          hasta: "4 de octubre",
        }),
      ),
    ).toBe("Semana del 28 de septiembre al 4 de octubre");
  });

  it("agenda.popover.conProfesional y agenda.popover.pagoLinea", () => {
    expect(
      registrar(agenda.popover.conProfesional({ profesional: "Diego" })),
    ).toBe("con Diego");
    expect(
      registrar(
        agenda.popover.pagoLinea({ precio: "$12.000", monto: "$3.000" }),
      ),
    ).toBe("$12.000 · abono $3.000 pagado");
  });

  it("hoy.siguiente y hoy.detalleCliente", () => {
    expect(registrar(hoy.siguiente({ relativo: "en 20 min" }))).toBe(
      "Siguiente · en 20 min",
    );
    expect(
      registrar(
        hoy.detalleCliente({
          servicio: "Corte + barba",
          profesional: "Diego",
          visita: "3.ª visita",
        }),
      ),
    ).toBe("Corte + barba · con Diego · 3.ª visita");
  });

  it("hoy.accionesRapidas.listaEspera", () => {
    expect(registrar(hoy.accionesRapidas.listaEspera({ n: 3 }))).toBe(
      "Lista de espera · 3",
    );
  });

  it("calendario.zonaHoraria (verano UTC−3, invierno UTC−4)", () => {
    expect(registrar(calendario.zonaHoraria({ offset: -3 }))).toBe("GMT−3");
    expect(registrar(calendario.zonaHoraria({ offset: -4 }))).toBe("GMT−4");
  });
});

// ---------------------------------------------------------------------------
// Mensajes de sesión y correo con parámetros realistas (para tono/marca)
// ---------------------------------------------------------------------------

const EJEMPLO = {
  negocio: "Barbería Norte",
  cliente: "Joaquín",
  servicio: "Corte + barba",
  fecha: "viernes 2 de octubre",
  hora: "15:00",
  profesional: "Diego",
  horasCancelacion: 4,
  linkGestion: "https://ejemplo.cl/r/abc123",
  linkNuevaReserva: "https://ejemplo.cl/barberia-norte",
  telefonoNegocio: "+56 9 1234 5678",
  plataforma: "la plataforma",
} as const;

const muestrasSesionYCorreo: string[] = [
  whatsappSesion.confirmo({ negocio: EJEMPLO.negocio }),
  whatsappSesion.necesitoCambiar({
    negocio: EJEMPLO.negocio,
    linkGestion: EJEMPLO.linkGestion,
  }),
  whatsappSesion.listaEsperaConfirmada({
    negocio: EJEMPLO.negocio,
    servicio: EJEMPLO.servicio,
    fecha: EJEMPLO.fecha,
    hora: EJEMPLO.hora,
  }),
  whatsappSesion.listaEsperaYaTomada({ negocio: EJEMPLO.negocio }),
  whatsappSesion.listaEsperaNoGracias({ negocio: EJEMPLO.negocio }),
  whatsappSesion.listaEsperaExpirada({ negocio: EJEMPLO.negocio }),
  whatsappSesion.noEntendido({
    negocio: EJEMPLO.negocio,
    telefonoNegocio: EJEMPLO.telefonoNegocio,
  }),
  email.reservaConfirmada.asunto({ negocio: EJEMPLO.negocio }),
  email.reservaConfirmada.cuerpo({ ...EJEMPLO }),
  email.recordatorio24h.asunto({
    negocio: EJEMPLO.negocio,
    fecha: EJEMPLO.fecha,
  }),
  email.recordatorio24h.cuerpo({ ...EJEMPLO }),
  email.reservaCancelada.asunto({ negocio: EJEMPLO.negocio }),
  email.reservaCancelada.cuerpo({ ...EJEMPLO }),
  email.reservaMovida.asunto({ negocio: EJEMPLO.negocio }),
  email.reservaMovida.cuerpo({ ...EJEMPLO }),
  email.pie({ negocio: EJEMPLO.negocio, plataforma: EJEMPLO.plataforma }),
  whatsappSesion.baja({ negocio: EJEMPLO.negocio }),
  whatsappSesion.bajaTotal({ negocio: EJEMPLO.negocio }),
];

const textosPlantillas: string[] = [];
recolectarStringsProfundo(plantillasWhatsapp, textosPlantillas);

describe("baja, bajaTotal y el pie del correo nombran al negocio", () => {
  it("whatsappSesion.baja y .bajaTotal", () => {
    expect(whatsappSesion.baja({ negocio: EJEMPLO.negocio })).toContain(
      EJEMPLO.negocio,
    );
    expect(whatsappSesion.bajaTotal({ negocio: EJEMPLO.negocio })).toContain(
      EJEMPLO.negocio,
    );
  });

  it("email.pie recibe la plataforma como parámetro, no la escribe a mano", () => {
    const texto = email.pie({
      negocio: EJEMPLO.negocio,
      plataforma: EJEMPLO.plataforma,
    });
    expect(texto).toContain(EJEMPLO.negocio);
    expect(texto).toContain(EJEMPLO.plataforma);
  });
});

// ---------------------------------------------------------------------------
// Tono: sin "usted", sin voseo, sin slang, sin anglicismos, sin emoji
// ---------------------------------------------------------------------------

describe("tono", () => {
  const prohibido = {
    usted: /\busted(es)?\b/i,
    voseo: /\b(podés|tenés|querés|sabés|reservá|elegí)\b/i,
    slangPo: /\bpo\b/i,
    slangWena: /\bwena\b/i,
    booking: /\bbooking\b/i,
    checkin: /\bcheck-?in\b/i,
    emoji: /\p{Extended_Pictographic}/u,
  };

  it("la tabla de muestras (describe anterior) se llenó correctamente", () => {
    // Vitest corre los tests de un mismo archivo en orden de declaración: si
    // esto falla, revisa que el describe "flexión" siga antes que este.
    expect(muestras.length).toBeGreaterThan(20);
  });

  it("ningún texto (UI, plantillas de WhatsApp, sesión o correo) usa un giro prohibido", () => {
    const todos = [
      ...todosLosStringsEstaticos(),
      ...muestras,
      ...textosPlantillas,
      ...muestrasSesionYCorreo,
    ];
    for (const texto of todos) {
      for (const [nombreRegla, regex] of Object.entries(prohibido)) {
        expect(regex.test(texto), `${nombreRegla}: "${texto}"`).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Marca: el nombre del producto solo entra vía brand.name (regla dura 10)
// ---------------------------------------------------------------------------

describe("marca", () => {
  // Se arma desde brand.name (escapado) para no escribir el nombre en este
  // archivo ni romper si brand.name tuviera algún carácter especial de regex.
  const patronMarca = new RegExp(`\\b${escaparRegExp(brand.name)}\\b`, "i");

  it("ningún texto (UI, plantillas, sesión o correo) contiene el nombre del producto salvo donde se interpola brand.name", () => {
    const todos = [
      ...todosLosStringsEstaticos(),
      ...textosPlantillas,
      ...muestrasSesionYCorreo,
    ];
    for (const texto of todos) {
      expect(patronMarca.test(texto), texto).toBe(false);
    }
    for (const texto of muestras) {
      if (patronMarca.test(texto)) {
        expect(texto, texto).toContain(brand.name);
        expect(texto.split(brand.name).length - 1, texto).toBe(1);
      }
    }
  });

  it("el hero de Inicio usa el pretérito (llenó), no el nombre", () => {
    expect(patronMarca.test(inicio.hero.titulo)).toBe(false);
    expect(inicio.hero.titulo).toContain("llenó");
  });
});

// ---------------------------------------------------------------------------
// Nombres de fixtures: no deben aparecer en es-CL.ts fuera de un `ejemplo`
// de Meta (tenant-isolation, R9 del plan de WP-03).
// ---------------------------------------------------------------------------

describe("nombres de fixtures no aparecen fuera de un ejemplo de Meta", () => {
  const ES_CL_PATH = path.resolve(process.cwd(), "src/i18n/es-CL.ts");
  const FUENTE = fs.readFileSync(ES_CL_PATH, "utf8");
  const SIN_EJEMPLOS = FUENTE.split("\n")
    .filter((linea) => !/\bejemplo\s*:/.test(linea))
    .join("\n");

  const NOMBRES_FIXTURE = [
    "Barbería Norte",
    "Joaquín",
    "Camila",
    "Martina Lagos",
    "Valentina Soto",
    "Ignacio Pérez",
    "Corte clásico",
    "Perfilado de barba",
  ];

  it.each(NOMBRES_FIXTURE)(
    '"%s" no aparece fuera de un campo "ejemplo"',
    (nombre) => {
      expect(SIN_EJEMPLOS.includes(nombre), nombre).toBe(false);
    },
  );
});

// ---------------------------------------------------------------------------
// Paridad de diseño: el texto estático existe tal cual en la referencia
// (como nodo de texto, atributo o string de JS: ver `apareceComoNodo`).
// ---------------------------------------------------------------------------

describe("paridad de diseño", () => {
  const casos: Array<{ clave: string; texto: string; archivo: string }> = [
    // Reserva
    {
      clave: "reserva.header.confirmacionWhatsapp",
      texto: reserva.header.confirmacionWhatsapp,
      archivo: "Reserva",
    },
    {
      clave: "reserva.pasos.servicio",
      texto: reserva.pasos.servicio,
      archivo: "Reserva",
    },
    {
      clave: "reserva.pasos.profesional",
      texto: reserva.pasos.profesional,
      archivo: "Reserva",
    },
    {
      clave: "reserva.pasos.cualquiera",
      texto: reserva.pasos.cualquiera,
      archivo: "Reserva",
    },
    {
      clave: "reserva.pasos.diaYHora",
      texto: reserva.pasos.diaYHora,
      archivo: "Reserva",
    },
    {
      clave: "reserva.waitlist.cuerpo",
      texto: reserva.waitlist.cuerpo,
      archivo: "Reserva",
    },
    {
      clave: "reserva.waitlist.listo",
      texto: reserva.waitlist.listo,
      archivo: "Reserva",
    },
    {
      clave: "reserva.waitlist.ctaAvisame",
      texto: reserva.waitlist.ctaAvisame,
      archivo: "Reserva",
    },
    {
      clave: "reserva.waitlist.ctaEnLaLista",
      texto: reserva.waitlist.ctaEnLaLista,
      archivo: "Reserva",
    },
    {
      clave: "reserva.bookingBar.ctaReservar",
      texto: reserva.bookingBar.ctaReservar,
      archivo: "Reserva",
    },
    {
      clave: "reserva.bookingBar.ctaReservado",
      texto: reserva.bookingBar.ctaReservado,
      archivo: "Reserva",
    },
    {
      clave: "reserva.meta.titulo({negocio: Barbería Norte})",
      texto: reserva.meta.titulo({ negocio: "Barbería Norte" }),
      archivo: "Reserva",
    },
    {
      clave: "reserva.waitlist.diaLleno({dia: sábado})",
      texto: reserva.waitlist.diaLleno({ dia: "sábado" }),
      archivo: "Reserva",
    },
    {
      clave: "reserva.descuento({porcentaje: 20})",
      texto: reserva.descuento({ porcentaje: 20 }),
      archivo: "Reserva",
    },

    // Inicio (Main.dc.html)
    { clave: "nav.principal", texto: nav.principal, archivo: "Main" },
    { clave: "nav.inicio", texto: nav.inicio, archivo: "Main" },
    { clave: "nav.agenda", texto: nav.agenda, archivo: "Main" },
    { clave: "nav.clientes", texto: nav.clientes, archivo: "Main" },
    { clave: "nav.horasFlash", texto: nav.horasFlash, archivo: "Main" },
    { clave: "nav.cajaEInformes", texto: nav.cajaEInformes, archivo: "Main" },
    { clave: "nav.ajustes", texto: nav.ajustes, archivo: "Main" },
    { clave: "nav.cerrarSesion", texto: nav.cerrarSesion, archivo: "Main" },
    { clave: "nav.buscar", texto: nav.buscar, archivo: "Main" },
    { clave: "nav.notificaciones", texto: nav.notificaciones, archivo: "Main" },
    { clave: "nav.masOpciones", texto: nav.masOpciones, archivo: "Main" },
    {
      clave: "inicio.resumenSemanaAria",
      texto: inicio.resumenSemanaAria,
      archivo: "Main",
    },
    {
      clave: "inicio.calendarioAria",
      texto: inicio.calendarioAria,
      archivo: "Main",
    },
    { clave: "inicio.hero.titulo", texto: inicio.hero.titulo, archivo: "Main" },
    {
      clave: "inicio.hero.verDetalle",
      texto: inicio.hero.verDetalle,
      archivo: "Main",
    },
    {
      clave: "inicio.features.listaEspera.titulo",
      texto: inicio.features.listaEspera.titulo,
      archivo: "Main",
    },
    {
      clave: "inicio.features.horasFlash.titulo",
      texto: inicio.features.horasFlash.titulo,
      archivo: "Main",
    },
    {
      clave: "inicio.features.teEchamosDeMenos.titulo",
      texto: inicio.features.teEchamosDeMenos.titulo,
      archivo: "Main",
    },
    {
      clave: "inicio.features.teEchamosDeMenos.enviarRecordatorio",
      texto: inicio.features.teEchamosDeMenos.enviarRecordatorio,
      archivo: "Main",
    },
    {
      clave: "inicio.stats.ingresosSemana",
      texto: inicio.stats.ingresosSemana,
      archivo: "Main",
    },
    {
      clave: "inicio.stats.inasistencias",
      texto: inicio.stats.inasistencias,
      archivo: "Main",
    },
    {
      clave: "inicio.stats.tendencia.bajando",
      texto: inicio.stats.tendencia.bajando,
      archivo: "Main",
    },
    {
      clave: "inicio.agendaHoy.titulo",
      texto: inicio.agendaHoy.titulo,
      archivo: "Main",
    },
    {
      clave: "inicio.agendaHoy.verAgenda",
      texto: inicio.agendaHoy.verAgenda,
      archivo: "Main",
    },
    {
      clave: "inicio.flashCard.titulo",
      texto: inicio.flashCard.titulo,
      archivo: "Main",
    },
    {
      clave: "inicio.flashCard.compartir",
      texto: inicio.flashCard.compartir,
      archivo: "Main",
    },
    {
      clave: "calendario.mesAnterior",
      texto: calendario.mesAnterior,
      archivo: "Main",
    },
    {
      clave: "calendario.mesSiguiente",
      texto: calendario.mesSiguiente,
      archivo: "Main",
    },
    { clave: "estados.confirmada", texto: estados.confirmada, archivo: "Main" },
    {
      clave: "estados.abonoPagado",
      texto: estados.abonoPagado,
      archivo: "Main",
    },
    {
      clave: "estados.sinConfirmar",
      texto: estados.sinConfirmar,
      archivo: "Main",
    },
    {
      clave: "estados.listaDeEspera",
      texto: estados.listaDeEspera,
      archivo: "Main",
    },
    {
      clave: "inicio.metaRow(...)",
      texto: inicio.metaRow({
        fecha: "Viernes 2 de octubre",
        negocio: "Barbería Norte",
        comuna: "Providencia",
      }),
      archivo: "Main",
    },
    {
      clave: "inicio.hola({nombre: Camila})",
      texto: inicio.hola({ nombre: "Camila" }),
      archivo: "Main",
    },
    {
      clave: "inicio.features.listaEspera.resumen({n:3, dia: sábado})",
      texto: inicio.features.listaEspera.resumen({ n: 3, dia: "sábado" }),
      archivo: "Main",
    },
    {
      clave: "inicio.features.horasFlash.resumen({activas:2, reservadas:1})",
      texto: inicio.features.horasFlash.resumen({ activas: 2, reservadas: 1 }),
      archivo: "Main",
    },
    {
      clave: "inicio.features.teEchamosDeMenos.resumen({n:12})",
      texto: inicio.features.teEchamosDeMenos.resumen({ n: 12 }),
      archivo: "Main",
    },
    {
      clave: "inicio.stats.reservasHoy({n:2})",
      texto: inicio.stats.reservasHoy({ n: 2 }),
      archivo: "Main",
    },
    {
      clave: "inicio.flashCard.detalle(...)",
      texto: inicio.flashCard.detalle({
        servicio: "Corte + barba",
        profesional: "Diego",
      }),
      archivo: "Main",
    },
    {
      clave: "inicio.flashCard.fechaHoraDescuento(...)",
      texto: inicio.flashCard.fechaHoraDescuento({
        fecha: "Mar 6",
        hora: "11:30",
        porcentaje: 20,
      }),
      archivo: "Main",
    },

    // Agenda
    {
      clave: "nav.volverAlInicio",
      texto: nav.volverAlInicio,
      archivo: "Agenda",
    },
    {
      clave: "agenda.nuevaReserva",
      texto: agenda.nuevaReserva,
      archivo: "Agenda",
    },
    {
      clave: "agenda.agregarProfesional",
      texto: agenda.agregarProfesional,
      archivo: "Agenda",
    },
    {
      clave: "agenda.calendarioMensualAria",
      texto: agenda.calendarioMensualAria,
      archivo: "Agenda",
    },
    {
      clave: "agenda.panel.mostrarAria",
      texto: agenda.panel.mostrarAria,
      archivo: "Agenda",
    },
    {
      clave: "agenda.panel.profesionales",
      texto: agenda.panel.profesionales,
      archivo: "Agenda",
    },
    {
      clave: "agenda.panel.mostrar",
      texto: agenda.panel.mostrar,
      archivo: "Agenda",
    },
    {
      clave: "agenda.panel.horasFlash",
      texto: agenda.panel.horasFlash,
      archivo: "Agenda",
    },
    {
      clave: "agenda.panel.desdeListaDeEspera",
      texto: agenda.panel.desdeListaDeEspera,
      archivo: "Agenda",
    },
    {
      clave: "agenda.panel.bloqueosYAlmuerzo",
      texto: agenda.panel.bloqueosYAlmuerzo,
      archivo: "Agenda",
    },
    {
      clave: "agenda.panel.avisoWhatsapp",
      texto: agenda.panel.avisoWhatsapp,
      archivo: "Agenda",
    },
    {
      clave: "agenda.bloqueo.almuerzo",
      texto: agenda.bloqueo.almuerzo,
      archivo: "Agenda",
    },
    {
      clave: "agenda.bloqueo.bloqueado",
      texto: agenda.bloqueo.bloqueado,
      archivo: "Agenda",
    },
    { clave: "agenda.vistaAria", texto: agenda.vistaAria, archivo: "Agenda" },
    { clave: "agenda.diaCerrado", texto: agenda.diaCerrado, archivo: "Agenda" },
    {
      clave: "agenda.popover.titulo",
      texto: agenda.popover.titulo,
      archivo: "Agenda",
    },
    {
      clave: "agenda.popover.cerrar",
      texto: agenda.popover.cerrar,
      archivo: "Agenda",
    },
    {
      clave: "agenda.popover.acciones.llego",
      texto: agenda.popover.acciones.llego,
      archivo: "Agenda",
    },
    {
      clave: "agenda.popover.acciones.noVino",
      texto: agenda.popover.acciones.noVino,
      archivo: "Agenda",
    },
    {
      clave: "agenda.popover.acciones.mover",
      texto: agenda.popover.acciones.mover,
      archivo: "Agenda",
    },
    { clave: "calendario.hoy", texto: calendario.hoy, archivo: "Agenda" },
    {
      clave: "calendario.cerrado",
      texto: calendario.cerrado,
      archivo: "Agenda",
    },
    {
      clave: "calendario.vista.mes",
      texto: calendario.vista.mes,
      archivo: "Agenda",
    },
    {
      clave: "calendario.vista.semana",
      texto: calendario.vista.semana,
      archivo: "Agenda",
    },
    {
      clave: "calendario.vista.dia",
      texto: calendario.vista.dia,
      archivo: "Agenda",
    },
    {
      clave: "calendario.semanaAnterior",
      texto: calendario.semanaAnterior,
      archivo: "Agenda",
    },
    {
      clave: "calendario.semanaSiguiente",
      texto: calendario.semanaSiguiente,
      archivo: "Agenda",
    },
    {
      clave: "calendario.zonaHoraria({offset:-3})",
      texto: calendario.zonaHoraria({ offset: -3 }),
      archivo: "Agenda",
    },
    {
      clave: "estados.confirmoPorWhatsapp",
      texto: estados.confirmoPorWhatsapp,
      archivo: "Agenda",
    },
    {
      clave: "estados.flashConDescuento({porcentaje:20})",
      texto: estados.flashConDescuento({ porcentaje: 20 }),
      archivo: "Agenda",
    },
    {
      clave: "agenda.panel.esperanEl({n:3, dia:sábado})",
      texto: agenda.panel.esperanEl({ n: 3, dia: "sábado" }),
      archivo: "Agenda",
    },
    {
      clave: "agenda.semana(...)",
      texto: agenda.semana({
        desde: "28 de septiembre",
        hasta: "4 de octubre",
      }),
      archivo: "Agenda",
    },
    {
      clave: "agenda.popover.conProfesional({profesional:Diego})",
      texto: agenda.popover.conProfesional({ profesional: "Diego" }),
      archivo: "Agenda",
    },
    {
      clave: "agenda.popover.telefonoYVisita(...)",
      texto: agenda.popover.telefonoYVisita({
        telefono: "+56 9 •••• 4821",
        visita: comun.visita({ n: 6 }),
      }),
      archivo: "Agenda",
    },
    {
      clave: "agenda.popover.fechaYRango(...)",
      texto: agenda.popover.fechaYRango({
        fecha: "Vie 2 oct",
        rango: "11:30 – 12:05",
      }),
      archivo: "Agenda",
    },
    {
      clave: "agenda.popover.pagoLinea(...)",
      texto: agenda.popover.pagoLinea({ precio: "$12.000", monto: "$3.000" }),
      archivo: "Agenda",
    },

    // Hoy
    { clave: "hoy.titulo", texto: hoy.titulo, archivo: "Hoy" },
    { clave: "nav.secciones", texto: nav.secciones, archivo: "Hoy" },
    { clave: "nav.caja", texto: nav.caja, archivo: "Hoy" },
    { clave: "hoy.proximaReserva", texto: hoy.proximaReserva, archivo: "Hoy" },
    { clave: "estados.confirmo", texto: estados.confirmo, archivo: "Hoy" },
    { clave: "hoy.acciones.llego", texto: hoy.acciones.llego, archivo: "Hoy" },
    {
      clave: "hoy.acciones.noVino",
      texto: hoy.acciones.noVino,
      archivo: "Hoy",
    },
    {
      clave: "hoy.accionesRapidas.crearHoraFlash",
      texto: hoy.accionesRapidas.crearHoraFlash,
      archivo: "Hoy",
    },
    {
      clave: "hoy.accionesRapidas.cobrar",
      texto: hoy.accionesRapidas.cobrar,
      archivo: "Hoy",
    },
    {
      clave: "hoy.restoDia.titulo",
      texto: hoy.restoDia.titulo,
      archivo: "Hoy",
    },
    { clave: "estados.abono", texto: estados.abono, archivo: "Hoy" },
    { clave: "estados.desdeLista", texto: estados.desdeLista, archivo: "Hoy" },
    { clave: "estados.flash", texto: estados.flash, archivo: "Hoy" },
    {
      clave: "hoy.siguiente({relativo: en 20 min})",
      texto: hoy.siguiente({ relativo: "en 20 min" }),
      archivo: "Hoy",
    },
    {
      clave: "hoy.detalleCliente(...)",
      texto: hoy.detalleCliente({
        servicio: "Corte + barba",
        profesional: "Diego",
        visita: "3.ª visita",
      }),
      archivo: "Hoy",
    },
    {
      clave: "hoy.accionesRapidas.listaEspera({n:3})",
      texto: hoy.accionesRapidas.listaEspera({ n: 3 }),
      archivo: "Hoy",
    },
    {
      clave: "hoy.restoDia.resumen({n:6, monto: $84.000})",
      texto: hoy.restoDia.resumen({ n: 6, monto: "$84.000" }),
      archivo: "Hoy",
    },
    {
      clave: "hoy.restoDia.detalle(...)",
      texto: hoy.restoDia.detalle({
        servicio: "Corte clásico",
        profesional: "Matías",
      }),
      archivo: "Hoy",
    },
  ];

  const archivos: Record<string, string> = {
    Reserva: RESERVA_HTML,
    Main: MAIN_HTML,
    Agenda: AGENDA_HTML,
    Hoy: HOY_HTML,
  };

  for (const { clave, texto, archivo } of casos) {
    it(`${clave} está tal cual en ${archivo}.dc.html`, () => {
      const contenido = archivos[archivo] ?? "";
      expect(
        apareceComoNodo(contenido, texto),
        `"${texto}" no aparece como nodo de texto, atributo o string en ${archivo}.dc.html`,
      ).toBe(true);
    });
  }

  // Casos que el diseño solo muestra partido por una etiqueta <span> en medio:
  // se verifica el prefijo y el sufijo por separado en vez del texto completo.
  it("inicio.hero.resumen: el prefijo y el sufijo están en Main.dc.html", () => {
    expect(MAIN_HTML).toContain("Recuperaste ");
    expect(MAIN_HTML).toContain(" con la lista de espera y las horas flash.");
    expect(MAIN_HTML).toContain("4 horas · $72.000");
  });

  // La plantilla de diseño usa mustache ("{{s.name}}"), no un valor
  // renderizado: solo se puede comparar el prefijo estático.
  it("agenda.verAgendaDe: el prefijo estático coincide con la plantilla del diseño", () => {
    expect(AGENDA_HTML).toContain("Ver agenda de {{s.name}}");
    expect(
      agenda.verAgendaDe({ nombre: "Diego" }).startsWith("Ver agenda de "),
    ).toBe(true);
  });

  it("inicio.agendaHoy.fila: la forma coincide con la plantilla del diseño", () => {
    expect(MAIN_HTML).toContain("{{item.service}} · con {{item.staff}}");
    expect(
      inicio.agendaHoy.fila({
        servicio: "Corte + barba",
        profesional: "Diego",
      }),
    ).toBe("Corte + barba · con Diego");
  });
});

// ---------------------------------------------------------------------------
// Paridad inversa: todo texto/aria-label del diseño tiene una clave o está
// en la lista explícita de fixtures (nombres, servicios, montos, horas,
// fechas). Solo mira dentro de <x-dc>, sin <helmet> ni <script> (ahí vive la
// lógica y los datos de ejemplo del previsualizador, no la copy real).
// ---------------------------------------------------------------------------

describe("paridad inversa: todo texto del diseño tiene dueño", () => {
  const FIXTURES_DE_DISENO = [
    "Barbería Norte", // negocio de ejemplo (Reserva, Main, Agenda)
    "BN", // iniciales del negocio de ejemplo (Reserva)
    // Horario de ejemplo (Reserva): días y rango vienen de WP-04
    // (`calendar-es-CL.ts`, `formatLocalTimeRange`); el formato de rango de
    // días se define en WP-13.
    "Lun–Sáb · 10:00–19:00",
    "Providencia, Santiago", // dirección de ejemplo (Reserva)
    "Octubre 2026", // fecha de ejemplo (Main, Agenda); el formato real es de WP-04
    "CR", // iniciales de la dueña de ejemplo (Main, Hoy)
    "Camila R.", // nombre de la dueña de ejemplo (Main)
    "Lu",
    "Ma",
    "Mi",
    "Ju",
    "Vi",
    "Sá",
    "Do", // abreviaturas de día de ejemplo (WP-04)
    "Martina Lagos", // clienta de ejemplo (Agenda, popover)
    "Corte clásico", // servicio de ejemplo (Agenda, popover)
    "Joaquín Rivas", // cliente de ejemplo (Hoy)
  ];

  // Se arma dentro de cada `it`: `muestras` se completa cuando corren los tests
  // de flexión, que es después de recolectar este describe.
  const haystack = () =>
    [...todosLosStringsEstaticos(), ...muestras, ...FIXTURES_DE_DISENO].join(
      "\n",
    );

  const TIENE_LETRA = /[a-zA-ZÀ-ÿ]/;

  function extraerCandidatos(html: string): string[] {
    const inicioIdx = html.indexOf("<x-dc>");
    const finIdx = html.lastIndexOf("</x-dc>");
    let contenido = html.slice(inicioIdx, finIdx);
    contenido = contenido.replace(/<helmet>[\s\S]*?<\/helmet>/g, "");
    contenido = contenido.replace(/<script[\s\S]*?<\/script>/g, "");

    const candidatos: string[] = [];
    for (const m of contenido.matchAll(/aria-label="([^"]*)"/g)) {
      candidatos.push(m[1] ?? "");
    }
    for (const m of contenido.matchAll(/>([^<>]+)</g)) {
      candidatos.push(m[1] ?? "");
    }
    return candidatos;
  }

  function textoEstatico(candidato: string): string {
    return candidato
      .replace(/\{\{[^}]*\}\}/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const archivos: Record<string, string> = {
    Reserva: RESERVA_HTML,
    Main: MAIN_HTML,
    Agenda: AGENDA_HTML,
    Hoy: HOY_HTML,
  };

  for (const [nombre, html] of Object.entries(archivos)) {
    it(`${nombre}.dc.html: cada texto/aria-label estático está cubierto`, () => {
      const pendientes: string[] = [];
      for (const candidato of extraerCandidatos(html)) {
        const estatico = textoEstatico(candidato);
        if (!estatico || !TIENE_LETRA.test(estatico)) continue;
        if (!haystack().includes(estatico)) pendientes.push(estatico);
      }
      expect(
        pendientes,
        `Textos sin clave ni fixture en ${nombre}.dc.html: ${pendientes.join(" | ")}`,
      ).toEqual([]);
    });
  }
});

// ---------------------------------------------------------------------------
// Longitudes (medidas en docs/design/DESIGN.md y en la referencia)
// ---------------------------------------------------------------------------

describe("longitudes", () => {
  it("botones del popover ≤ 8 caracteres", () => {
    expect(agenda.popover.acciones.llego.length).toBeLessThanOrEqual(8);
    expect(agenda.popover.acciones.noVino.length).toBeLessThanOrEqual(8);
    expect(agenda.popover.acciones.mover.length).toBeLessThanOrEqual(8);
  });

  it("SegmentedControl ≤ 7 caracteres", () => {
    expect(calendario.vista.mes.length).toBeLessThanOrEqual(7);
    expect(calendario.vista.semana.length).toBeLessThanOrEqual(7);
    expect(calendario.vista.dia.length).toBeLessThanOrEqual(7);
  });

  it("CTA de BookingBar ≤ 12 caracteres", () => {
    expect(reserva.bookingBar.ctaReservar.length).toBeLessThanOrEqual(12);
    expect(reserva.bookingBar.ctaReservado.length).toBeLessThanOrEqual(12);
  });

  it("botones de NextClientCard ≤ 10 caracteres", () => {
    expect(hoy.acciones.llego.length).toBeLessThanOrEqual(10);
    expect(hoy.acciones.noVino.length).toBeLessThanOrEqual(10);
  });

  it("chips ≤ 22 caracteres", () => {
    expect(estados.confirmoPorWhatsapp.length).toBeLessThanOrEqual(22);
    expect(estados.confirmada.length).toBeLessThanOrEqual(22);
    expect(estados.abonoPagado.length).toBeLessThanOrEqual(22);
    expect(estados.sinConfirmar.length).toBeLessThanOrEqual(22);
  });
});

// ---------------------------------------------------------------------------
// Validación del celular del cliente (chileanMobileInputSchema, WP-04)
// ---------------------------------------------------------------------------

describe("errores.reserva.telefono (mismos códigos que PhoneError de WP-04)", () => {
  // src/lib/format/phone.ts: export type PhoneError = "empty" |
  // "invalid_chars" | "not_chilean" | "invalid_length" | "not_mobile" |
  // "invalid_prefix". Si WP-04 agrega un código, agrégalo acá también.
  const codigos = [
    "empty",
    "invalid_chars",
    "not_chilean",
    "invalid_length",
    "not_mobile",
    "invalid_prefix",
  ] as const;

  it.each(codigos)("%s tiene un texto no vacío", (codigo) => {
    expect(errores.reserva.telefono[codigo].length).toBeGreaterThan(0);
  });

  it("invalid_length dice qué hacer, no solo qué falló", () => {
    expect(errores.reserva.telefono.invalid_length).toMatch(/dígitos|revisa/i);
  });
});

describe("errores.reserva y errores.agenda usan las claves de los códigos reales", () => {
  it("errores.reserva tiene slot_taken, too_soon, outside_hours y waitlist_duplicate", () => {
    expect(errores.reserva.slot_taken.length).toBeGreaterThan(0);
    expect(errores.reserva.too_soon.length).toBeGreaterThan(0);
    expect(errores.reserva.outside_hours.length).toBeGreaterThan(0);
    expect(errores.reserva.waitlist_duplicate.length).toBeGreaterThan(0);
  });

  it("errores.agenda tiene slot_taken y outside_hours", () => {
    expect(errores.agenda.slot_taken.length).toBeGreaterThan(0);
    expect(errores.agenda.outside_hours).toBe(
      "Esa hora está fuera del horario de atención.",
    );
  });
});

// ---------------------------------------------------------------------------
// Consentimientos: la versión está ligada al contenido exacto del texto
// ---------------------------------------------------------------------------

describe("consentimientos", () => {
  // Hash literal por versión: cambiar cualquier texto de consentimiento sin
  // subir `version` y registrar el nuevo hash hace fallar el test, y el cambio
  // de hash queda visible en el diff.
  const HASHES: Record<string, string> = {
    "2026-10-v1":
      "",
  };

  function sha256(texto: string): string {
    return createHash("sha256").update(texto, "utf8").digest("hex");
  }

  // Orden fijo (S3, seguridad): todo el texto que ve el cliente antes de
  // aceptar, en el orden en que aparece en la pantalla de Reserva. Los
  // parámetros usan placeholders literales ("{negocio}", "{horas}") en vez
  // de un ejemplo real, para que el hash no dependa de un negocio de prueba.
  function textoConsentimiento(): string {
    const c = reserva.consentimientos;
    const a = reserva.antesDeConfirmar;
    return [
      c.terminos,
      c.terminosLinkTexto,
      c.politicaLinkTexto,
      c.privacidadLinkTexto,
      c.responsable({ negocio: "{negocio}" }),
      a.avisoWhatsapp({ negocio: "{negocio}" }),
      a.politicaCancelacion({ horas: "{horas}" as unknown as number }),
      c.marketing({ negocio: "{negocio}" }),
    ].join("\n");
  }

  it('la versión está ligada al hash del texto (sube "consentimientos.version" si cambias el texto)', () => {
    const version = reserva.consentimientos.version;
    const hashEsperado = HASHES[version];
    expect(
      hashEsperado,
      `No hay hash registrado para "${version}"`,
    ).toBeDefined();
    expect(
      sha256(textoConsentimiento()),
      'El texto de consentimiento cambió: sube "consentimientos.version" y registra su hash en HASHES.',
    ).toBe(hashEsperado);
  });

  it("el texto de términos menciona WhatsApp (aviso de opt-in, FRÅGA 6)", () => {
    expect(reserva.consentimientos.terminos).toContain("WhatsApp");
  });

  it("el texto de marketing es opcional y menciona BAJA (WP-13 arma la casilla; ver COMPLIANCE.md)", () => {
    expect(
      reserva.consentimientos.marketing({ negocio: "Barbería Norte" }),
    ).toContain("BAJA");
  });
});
