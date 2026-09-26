import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { brand } from "@/config/brand";

import {
  agenda,
  calendario,
  comun,
  errores,
  estados,
  gestion,
  hoy,
  inicio,
  nav,
  reserva,
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
// Esta tabla alimenta las pruebas de tono, paridad de diseño y flexión.
// ---------------------------------------------------------------------------

const muestras: string[] = [];
function registrar(texto: string): string {
  muestras.push(texto);
  return texto;
}

describe("flexión (n = 0, 1, 2, 21) y patrones dinámicos", () => {
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

  it("inicio.stats.reservasHoy", () => {
    expect(registrar(inicio.stats.reservasHoy({ n: 2 }))).toBe(
      "Reservas hoy · 2 por confirmar",
    );
  });

  it("agenda.panel.reservasCount", () => {
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

  it("agenda.popover.visita y hoy.visita (ordinal femenino)", () => {
    expect(registrar(agenda.popover.visita({ n: 6 }))).toBe("6.ª visita");
    expect(agenda.popover.visita({ n: 1 })).toBe("1.ª visita");
    expect(agenda.popover.visita({ n: 2 })).toBe("2.ª visita");
    expect(agenda.popover.visita({ n: 21 })).toBe("21.ª visita");
    expect(registrar(hoy.visita({ n: 3 }))).toBe("3.ª visita");
  });

  it("hoy.restoDia.resumen", () => {
    expect(registrar(hoy.restoDia.resumen({ n: 6, monto: "$84.000" }))).toBe(
      "6 reservas · $84.000",
    );
    expect(hoy.restoDia.resumen({ n: 1, monto: "$12.000" })).toBe(
      "1 reserva · $12.000",
    );
  });

  it("estados.flashConDescuento", () => {
    expect(registrar(estados.flashConDescuento({ porcentaje: 20 }))).toBe(
      "Flash −20%",
    );
  });

  it("reserva.descuento y reserva.duracion", () => {
    expect(registrar(reserva.descuento({ porcentaje: 20 }))).toBe("−20%");
    expect(registrar(reserva.duracion({ minutos: 35 }))).toBe("35 min");
  });

  it("reserva.waitlist.diaLleno", () => {
    expect(registrar(reserva.waitlist.diaLleno({ dia: "sábado" }))).toBe(
      "El sábado está lleno",
    );
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
    // Sin profesional (cuando el cliente elige "Cualquiera")
    expect(
      registrar(
        reserva.resumen.sinProfesional({
          servicio: "Corte + barba",
          dia: "Mar 6",
          hora: "11:30",
        }),
      ),
    ).toBe("Corte + barba · Mar 6, 11:30");
    // Lista de espera: svc.name + ' · ' + day.label + ' · lista de espera'
    expect(
      registrar(
        reserva.resumen.listaEspera({
          servicio: "Corte + barba",
          dia: "Sáb 3",
        }),
      ),
    ).toBe("Corte + barba · Sáb 3 · lista de espera");
  });

  it("reserva.meta.titulo y reserva.header.horario", () => {
    expect(registrar(reserva.meta.titulo({ negocio: "Barbería Norte" }))).toBe(
      "Reservar en Barbería Norte",
    );
    expect(
      registrar(
        reserva.header.horario({ dias: "Lun–Sáb", rango: "10:00–19:00" }),
      ),
    ).toBe("Lun–Sáb · 10:00–19:00");
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

  it("reserva.consentimientos.marketing menciona WhatsApp y BAJA", () => {
    const texto = registrar(
      reserva.consentimientos.marketing({ negocio: "Barbería Norte" }),
    );
    expect(texto).toContain("WhatsApp");
    expect(texto).toContain("BAJA");
    expect(texto).toContain("Barbería Norte");
  });

  it("gestion.fueraDePlazo", () => {
    const texto = registrar(
      gestion.fueraDePlazo({
        horas: 4,
        telefonoNegocio: "+56 9 1234 5678",
      }),
    );
    expect(texto).toContain("4 h");
    expect(texto).toContain("+56 9 1234 5678");
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

  it("hoy.siguiente y hoy.detalleCliente (relativo lo calcula WP-04/scheduling)", () => {
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

  function todosLosStringsEstaticos(): string[] {
    const encontrados: string[] = [];
    for (const raiz of Object.values(AREAS)) {
      paraCadaHoja(raiz, "", (_ruta, hoja) => {
        if (typeof hoja === "string") encontrados.push(hoja);
      });
    }
    return encontrados;
  }

  it("la tabla de muestras (describe anterior) se llenó correctamente", () => {
    // Vitest corre los tests de un mismo archivo en orden de declaración: si
    // esto falla, revisa que el describe "flexión" siga antes que este.
    expect(muestras.length).toBeGreaterThan(20);
  });

  it("ningún texto estático usa un giro prohibido", () => {
    for (const texto of todosLosStringsEstaticos()) {
      for (const [nombreRegla, regex] of Object.entries(prohibido)) {
        expect(regex.test(texto), `${nombreRegla}: "${texto}"`).toBe(false);
      }
    }
  });

  it("ninguna muestra generada por una función usa un giro prohibido", () => {
    for (const texto of muestras) {
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
  // Se arma desde brand.name para no escribir el nombre en este archivo.
  const patronMarca = new RegExp(`\\b${brand.name}\\b`, "i");

  it("ningún texto estático contiene el nombre del producto", () => {
    for (const raiz of Object.values(AREAS)) {
      paraCadaHoja(raiz, "", (ruta, hoja) => {
        if (typeof hoja === "string") {
          expect(patronMarca.test(hoja), ruta).toBe(false);
        }
      });
    }
  });

  it("el nombre solo aparece en muestras donde se interpola brand.name", () => {
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
// Paridad de diseño: el texto estático existe tal cual en la referencia
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
    {
      clave: "reserva.duracion({minutos: 35})",
      texto: reserva.duracion({ minutos: 35 }),
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
      clave: "agenda.popover.visita({n:6})",
      texto: agenda.popover.visita({ n: 6 }),
      archivo: "Agenda",
    },
    {
      clave: "agenda.popover.conProfesional({profesional:Diego})",
      texto: agenda.popover.conProfesional({ profesional: "Diego" }),
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
  ];

  const archivos: Record<string, string> = {
    Reserva: RESERVA_HTML,
    Main: MAIN_HTML,
    Agenda: AGENDA_HTML,
    Hoy: HOY_HTML,
  };

  for (const { clave, texto, archivo } of casos) {
    it(`${clave} está tal cual en ${archivo}.dc.html`, () => {
      const contenido = archivos[archivo];
      expect(contenido, archivo).toBeDefined();
      expect(
        (contenido ?? "").includes(texto),
        `"${texto}" no aparece en ${archivo}.dc.html`,
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

describe("errores.reserva.telefono (códigos de chileanMobileInputSchema)", () => {
  const codigos = [
    "invalidType",
    "empty",
    "invalidChars",
    "notChilean",
    "invalidLength",
    "notMobile",
  ] as const;

  it.each(codigos)("%s tiene un texto no vacío", (codigo) => {
    expect(errores.reserva.telefono[codigo].length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Consentimientos: la versión está ligada al contenido exacto del texto
// ---------------------------------------------------------------------------

describe("consentimientos", () => {
  // Texto congelado de la versión 2026-10-v1 (utkast, ver R8 del plan
  // WP-03). Si cambias `reserva.consentimientos.terminos` o
  // `reserva.consentimientos.marketing`, copia el nuevo texto acá Y sube
  // `consentimientos.version`.
  const CONGELADO_V1 = {
    version: "2026-10-v1",
    terminos: "Acepto los términos de la reserva y la política de cancelación.",
    marketingEjemplo:
      "Quiero recibir ofertas y novedades de Barbería Norte por WhatsApp. Puedo responder BAJA cuando quiera.",
  };

  function sha256(texto: string): string {
    return createHash("sha256").update(texto, "utf8").digest("hex");
  }

  it('la versión está ligada al hash del texto (sube "consentimientos.version" si cambias el texto)', () => {
    expect(reserva.consentimientos.version).toBe(CONGELADO_V1.version);

    const hashActual = sha256(
      reserva.consentimientos.terminos +
        reserva.consentimientos.marketing({ negocio: "Barbería Norte" }),
    );
    const hashCongelado = sha256(
      CONGELADO_V1.terminos + CONGELADO_V1.marketingEjemplo,
    );

    expect(
      hashActual,
      'El texto de consentimiento cambió: sube "consentimientos.version" y actualiza CONGELADO_V1 en este test.',
    ).toBe(hashCongelado);
  });

  it("nunca están preseleccionados y el de marketing es opcional (revisado por security-reviewer)", () => {
    // No hay forma de "marcar por defecto" un string: la prueba documenta la
    // regla para quien construya el checkbox (WP-11/13): ambas casillas
    // deben iniciar sin marcar, y la de marketing es una casilla aparte.
    expect(reserva.consentimientos.terminos).not.toMatch(
      /marcad[oa] por defecto/i,
    );
    expect(
      reserva.consentimientos.marketing({ negocio: "Barbería Norte" }),
    ).toContain("BAJA");
  });
});
