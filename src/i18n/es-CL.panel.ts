/**
 * Textos de la app del negocio y de los mensajes (es-CL), separados de
 * `es-CL.ts` por la JS-budget de la página de reservas (`/[slug]`, D-039):
 * el bundler compila cada módulo una sola vez con la unión de las
 * exportaciones que usa cualquier componente cliente, así que todo lo que
 * vivía en `es-CL.ts` terminaba en el chunk de `/[slug]`. Acá queda todo lo
 * que la página de reservas no usa en el cliente; `es-CL.ts` lo reexporta
 * (mismas exportaciones y nombres que antes). El nombre del producto nunca
 * se escribe acá (regla dura 10).
 */
import { CTA_RESERVAR, numeroEntero } from "./es-CL.compartido";
import type { Plantilla } from "./es-CL";
import type { Trad } from "./index";

// ---------------------------------------------------------------------------
// nav: navegación y aria-label compartidos entre Inicio, Agenda y Hoy
// ---------------------------------------------------------------------------

export const nav = {
  principal: "Principal",
  inicio: "Inicio",
  hoy: "Hoy",
  agenda: "Agenda",
  clientes: "Clientes",
  horasFlash: "Horas flash",
  cajaEInformes: "Caja e informes",
  caja: "Caja",
  ajustes: "Ajustes",
  cerrarSesion: "Cerrar sesión",
  secciones: "Secciones",
  volverAlInicio: "Volver al inicio",
  buscar: "Buscar",
  notificaciones: "Notificaciones",
  /** Texto oculto (sr-only) del contador que acompaña a `notificaciones`
   * cuando hay avisos sin leer: WP-11 lo usa junto al ícono de campana, que
   * hoy en Main.dc.html no tiene texto accesible propio. Nombre de clave
   * propuesto por WP-11 (R2 del plan de WP-03b). */
  notificacionesNuevas: (p: { n: number }): string =>
    `${p.n} ${p.n === 1 ? "notificación nueva" : "notificaciones nuevas"}`,
  masOpciones: "Más opciones",
  /** WP-47: aria-label del menú desplegable de la cuenta (UserPill/avatar
   * móvil), no un texto visible. */
  menuUsuario: (p: { nombre: string }): string => `Menú de ${p.nombre}`,
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// estados: chips de estado de una reserva y etiquetas de origen
// ---------------------------------------------------------------------------

export const estados = {
  confirmada: "Confirmada",
  abonoPagado: "Abono pagado",
  pagada: "Pagada",
  sinConfirmar: "Sin confirmar",
  /** WP-45 (D-033): chip de una reserva `requested`, cuando el negocio
   * todavía no la confirma ni la rechaza. Distinto de `sinConfirmar` (ahí
   * quien no confirmó es el cliente, con `confirmed_by_customer_at`; acá es
   * el negocio el que falta). */
  porConfirmar: "Por confirmar",
  confirmo: "Confirmó",
  confirmoPorWhatsapp: "Confirmó por WhatsApp",
  llego: "Llegó",
  noVino: "No vino",
  cancelada: "Cancelada",
  /** WP-56: chip de una reserva `cancel_requested` — el cliente pidió
   * cancelar y el negocio todavía no responde (`businesses.cancel_approval`).
   * Se usa en `/r/[token]`, Agenda, Hoy y el popover; tono propio (`deposit`)
   * para distinguirla de `porConfirmar` (esa es una reserva nueva, esta es
   * una cancelación). */
  cancelacionPendiente: "Cancelación pendiente",
  listaDeEspera: "Lista de espera",
  desdeLista: "Desde lista",
  abono: "Abono",
  flash: "Flash",
  flashConDescuento: (p: { porcentaje: number }): string =>
    `Flash −${p.porcentaje}%`,
  /** Agregado al final por WP-03b (§3 del plan, única excepción permitida
   * en esta exportación ya existente): estado de una reserva con abono
   * pendiente de pago (F11). */
  pendientePago: "Esperando abono",
  /** WP-54: etiqueta del cliente marcado como `customers.is_member` (cliente
   * frecuente con un beneficio propio, D-034) — "socio", no "miembro" (esa
   * palabra ya designa a alguien del equipo, `MemberView`/Ajustes → Equipo).
   * Se usa en Clientes (lista y ficha), Agenda (popover) y Hoy. */
  socio: "Socio",
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// calendario: lo que no son nombres de día/mes (eso vive en src/lib/format/)
// ---------------------------------------------------------------------------

export const calendario = {
  hoy: "Hoy",
  cerrado: "Cerrado",
  /** Etiqueta completa (sr-only) para el punto de color del MiniCalendar
   * (`c.dot` en Main.dc.html, sin texto accesible hoy) que marca un día con
   * reservas: "{fecha}, con reservas" (minúscula a mitad de frase). `fecha`
   * ya viene formateada por WP-04. Clave propuesta por WP-11/WP-12 (R2 del
   * plan de WP-03b). */
  diaConReservas: (p: { fecha: string }): string => `${p.fecha}, con reservas`,
  vista: {
    mes: "Mes",
    semana: "Semana",
    dia: "Día",
  },
  mesAnterior: "Mes anterior",
  mesSiguiente: "Mes siguiente",
  semanaAnterior: "Semana anterior",
  semanaSiguiente: "Semana siguiente",
  diaAnterior: "Día anterior",
  diaSiguiente: "Día siguiente",
  /** "GMT−3" en verano, "GMT−4" en invierno (Santiago no cambia el signo). */
  zonaHoraria: (p: { offset: number }): string =>
    `GMT${p.offset < 0 ? "−" : "+"}${Math.abs(p.offset)}`,
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// gestion: r/[token] — F7 para el cliente (ver, cambiar, cancelar)
// ---------------------------------------------------------------------------

export const gestion = {
  titulo: "Tu reserva",
  campos: {
    servicio: "Servicio",
    dia: "Día",
    hora: "Hora",
    profesional: "Profesional",
    negocio: "Negocio",
    direccion: "Dirección",
  },
  ctaCambiarHora: "Cambiar hora",
  ctaCancelarReserva: "Cancelar reserva",
  /** WP-45: aviso en `r/[token]` cuando la reserva todavía está `requested`
   * (el negocio no la confirmó ni la rechazó). El chip de estado usa
   * `estados.porConfirmar`; esto es el texto largo debajo del chip. */
  pendienteAviso:
    "El negocio todavía no confirma esta hora. Te avisaremos apenas lo haga.",
  /** WP-56: aviso bajo el chip `estados.cancelacionPendiente`, cuando el
   * cliente pidió cancelar y el negocio todavía no responde (la hora sigue
   * reservada hasta entonces). */
  cancelacionPendienteAviso: (p: { negocio: string }): string =>
    `Tu cancelación está esperando la respuesta de ${p.negocio}. Te avisaremos apenas responda.`,
  confirmarCancelacion: {
    titulo: "¿Cancelar tu reserva?",
    cuerpo: "Le avisaremos al negocio y liberaremos tu hora para otra persona.",
    /** WP-56: cuando `booking.cancelNeedsApproval` — la hora no se libera
     * de inmediato, el negocio tiene que aprobar la cancelación primero. */
    cuerpoPendiente:
      "Esta vez el negocio tiene que aprobar tu cancelación. Mientras tanto, tu hora sigue reservada.",
    ctaSi: "Sí, cancelar",
    ctaNo: "No, mantener",
  },
  fueraDePlazo: (p: { horas: number; telefonoNegocio: string }): string =>
    `Ya pasó el plazo de ${p.horas} h para cancelar o cambiar desde acá. Escribe al ${p.telefonoNegocio} para ver otras opciones.`,
  yaCancelada: "Esta reserva ya fue cancelada.",
  yaPaso: "Esta reserva ya pasó.",
  linkInvalido: "Este link no es válido.",
  linkVencido: "Este link ya venció.",
  cambioConfirmado: "Listo, tu hora quedó cambiada.",
  cancelacionConfirmada: "Listo, tu reserva quedó cancelada.",
  /** Siguiente paso desde un estado sin salida (link inválido/vencido,
   * reserva ya pasada o ya cancelada). */
  ctaReservarOtraHora: "Reservar otra hora",
  /** D-063: revocar el consentimiento de WhatsApp desde el link de gestión
   * (Ley 21.719). TODO_COPY: revisión de copywriter-es-cl. */
  whatsapp: {
    activo: (p: { negocio: string }): string =>
      `Recibes los avisos de ${p.negocio} por WhatsApp.`,
    ctaDejar: "Dejar de recibirlos por WhatsApp",
    dejado:
      "Listo, ya no te escribiremos por WhatsApp. Los avisos te llegan por correo.",
    error: "No pudimos guardar el cambio. Inténtalo de nuevo.",
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// inicio: Main.dc.html — F6 para el dueño (desktop)
// ---------------------------------------------------------------------------

/** "{horas} · {monto}": la parte destacada en lima del hero (DESIGN.md).
 * Función privada para que `inicio.hero.destacado` y `inicio.hero.resumen`
 * compartan el mismo separador en un solo lugar (regla dura 6: los
 * componentes no arman su propio texto). */
function heroDestacado(p: { horas: string; monto: string }): string {
  return `${p.horas} · ${p.monto}`;
}

export const inicio = {
  titulo: "Inicio",
  /** aria-label de la sección `<section aria-label="Resumen de la semana">`. */
  resumenSemanaAria: "Resumen de la semana",
  /** aria-label del MiniCalendar en Inicio (distinto del panel de Agenda). */
  calendarioAria: "Calendario",
  metaRow: (p: { fecha: string; negocio: string; comuna: string }): string =>
    `${p.fecha} · ${p.negocio}, ${p.comuna}`,
  hola: (p: { nombre: string }): string => `Hola, ${p.nombre}`,
  hero: {
    titulo: "Tu agenda se llenó sola esta semana",
    tituloVacio: "Esta semana todavía no recuperaste horas",
    /** "1 hora" / "4 horas": WP-04 entrega el número, acá vive la flexión. */
    horas: (p: { n: number }): string =>
      `${p.n} ${p.n === 1 ? "hora" : "horas"}`,
    destacado: heroDestacado,
    resumen: (p: { horas: string; monto: string }): string =>
      `Recuperaste ${heroDestacado(p)} con la lista de espera y las horas flash.`,
    resumenVacio:
      "Activa la lista de espera y las horas flash para empezar a recuperar horas.",
    verDetalle: "VER DETALLE",
  },
  features: {
    listaEspera: {
      titulo: "Lista de espera",
      resumen: (p: { n: number; dia: string }): string =>
        `${p.n} ${p.n === 1 ? "persona" : "personas"} · ${p.dia}`,
    },
    horasFlash: {
      titulo: "Horas flash",
      resumen: (p: { activas: number; reservadas: number }): string =>
        `${p.activas} ${p.activas === 1 ? "activa" : "activas"} · ${p.reservadas} ${p.reservadas === 1 ? "reservada" : "reservadas"}`,
    },
    teEchamosDeMenos: {
      titulo: "Te echamos de menos",
      resumen: (p: { n: number }): string =>
        `${p.n} ${p.n === 1 ? "cliente" : "clientes"} sin volver`,
      enviarRecordatorio: "Enviar recordatorio",
    },
  },
  stats: {
    reservasHoy: (p: { n: number }): string =>
      `Reservas hoy · ${p.n} por confirmar`,
    ingresosSemana: "Ingresos esta semana",
    inasistencias: "Inasistencias · últimos 30 días",
    tendencia: {
      bajando: "bajando",
      subiendo: "subiendo",
      igual: "igual",
    },
  },
  agendaHoy: {
    titulo: "Agenda de hoy",
    verAgenda: "Ver agenda",
    fila: (p: { servicio: string; profesional: string }): string =>
      `${p.servicio} · con ${p.profesional}`,
    vacio: "No tienes reservas para hoy todavía.",
    /** WP-47: ítem del menú "Más opciones" (agenda-row.tsx) que lleva a esa
     * reserva en `/app/agenda?vista=dia&fecha=`. */
    verEnAgenda: "Ver en agenda",
  },
  /** WP-fixar-sv: lista compacta de las próximas reservas (no solo las de hoy), para que
   * el dueño no se pierda una reserva de la próxima semana si está mirando la semana
   * actual en la Agenda. Cada fila lleva a la semana de esa reserva
   * (`/app/agenda?fecha=`). */
  proximasReservas: {
    titulo: "Próximas reservas",
    verAgenda: "Ver en la agenda",
    vacio: "No tienes próximas reservas.",
    /** "Vie 9 oct · 15:00". */
    fechaHora: (p: { fecha: string; hora: string }): string =>
      `${p.fecha} · ${p.hora}`,
  },
  /** WP-45 (D-033): lista de solicitudes pendientes por confirmar
   * (`requested`), arriba de todo en Inicio; se oculta cuando no hay
   * ninguna. Mismo texto que el título de la campana
   * (`solicitudes.campana.titulo`, GUIA §2: mismo vocabulario). */
  solicitudes: {
    titulo: "Solicitudes por confirmar",
  },
  flashCard: {
    titulo: "Hora flash activa",
    /** Estado sin ninguna hora flash activa (WP-11): reemplaza a la
     * tarjeta cuando no hay nada que compartir. */
    vacio: "No tienes ninguna hora flash activa todavía.",
    compartir: "Compartir hora flash",
    detalle: (p: { servicio: string; profesional: string }): string =>
      `${p.servicio} con ${p.profesional}`,
    /** "{fecha} · {hora} · −{porcentaje}%", p. ej. "Mar 6 · 11:30 · −20%". */
    fechaHoraDescuento: (p: {
      fecha: string;
      hora: string;
      porcentaje: number;
    }): string => `${p.fecha} · ${p.hora} · −${p.porcentaje}%`,
  },
  /** Agregado al final por copywriter-es-cl (tarjeta del link de reservas en
   * Inicio, para copiarlo o compartirlo por WhatsApp): mismo patrón que
   * `estados.pendientePago`, única excepción permitida en esta exportación
   * ya existente. `titulo` repite a propósito el mismo texto que
   * `negocio.slug.label` (GUIA §4: mismo vocabulario para el mismo
   * concepto), y `ayuda` repite el texto de
   * `landing.comoFunciona.pasos.compartir.texto` (mismo consejo, dos
   * lugares). */
  tuLink: {
    titulo: "Tu link de reservas",
    ayuda: "Pégalo en tu Instagram y compártelo por WhatsApp.",
    copiar: "Copiar link",
    copiado: "Link copiado",
    compartirWhatsapp: "Compartir por WhatsApp",
    /** Mensaje prellenado de un link `wa.me/?text=…` que el dueño le manda a
     * sus clientes: no es una plantilla de Meta (no pasa por la revisión de
     * WhatsApp), es texto de sesión que el propio dueño edita y envía. */
    mensajeWhatsapp: (p: { negocio: string; url: string }): string =>
      `Hola, puedes reservar tu hora en ${p.negocio} aquí: ${p.url}`,
    /** GUIA: "página de reservas" es el término fijo para la página a la que
     * lleva el link (distinta del link en sí). */
    abrir: "Ver mi página de reservas",
    /** WP-47: la Clipboard API puede fallar (permiso denegado, contexto no
     * seguro) — se muestra en vez de fallar en silencio. */
    errorCopiar: "No pudimos copiar el link. Cópialo manualmente.",
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// agenda: Agenda.dc.html — F6 para el dueño (semana, día, popover)
// ---------------------------------------------------------------------------

/** Texto de ayuda compartido para campos de notas libres (protección de
 * datos, Ley 21.719): reservas manuales (`agenda.manual.notasAyuda`) y
 * clientes (`clientes.notas.ayuda`, WP-03b). Una sola definición para que
 * no se desalineen. */
const NOTAS_AYUDA =
  "Las ven tú y tus administradores, y el cliente puede pedir una copia de sus datos. No anotes datos de salud ni información sensible.";

/** Mismo texto en el riel de Agenda (`agenda.agregarProfesional`) y en el
 * formulario de equipo de Ajustes (`profesionales.ctaAgregar`, WP-03b):
 * GUIA §4, "mismo vocabulario" para el mismo botón. */
const AGREGAR_PROFESIONAL = "Agregar profesional";

/** Filtro de Agenda (`agenda.filtroEquipo`) y de Hoy (`hoy.filtroEquipo`),
 * WP-46 (D-034): alterna entre ver solo las reservas propias o las de todo
 * el equipo. Solo tiene sentido para una cuenta `staff`: el dueño siempre ve
 * todo el equipo. Una sola definición para que el texto no se desalinee
 * entre las dos pantallas (GUIA §4). */
const FILTRO_EQUIPO = {
  misReservas: "Mis reservas",
  todoElEquipo: "Todo el equipo",
} as const;

export const agenda = {
  /** aria-label de `<section aria-label="Calendario mensual">` (aside). */
  calendarioMensualAria: "Calendario mensual",
  filtroEquipo: FILTRO_EQUIPO,
  panel: {
    profesionales: "Profesionales",
    reservasCount: (p: { n: number }): string =>
      `${p.n} ${p.n === 1 ? "reserva" : "reservas"}`,
    /** aria-label de `<section aria-label="Mostrar en la agenda">`,
     * distinto del título visible `mostrar` de abajo. */
    mostrarAria: "Mostrar en la agenda",
    mostrar: "Mostrar",
    horasFlash: "Horas flash",
    desdeListaDeEspera: "Desde lista de espera",
    bloqueosYAlmuerzo: "Bloqueos y almuerzo",
    esperanEl: (p: { n: number; dia: string }): string =>
      `${p.n} ${p.n === 1 ? "espera" : "esperan"} el ${p.dia}`,
    avisoWhatsapp: "Se avisa por WhatsApp o por correo",
    /** Aviso al desmarcar el último profesional visible en "Mostrar en la
     * agenda": siempre debe quedar al menos uno, para no dejar la semana
     * vacía sin darse cuenta. */
    minimoUnProfesional: "Debes dejar al menos un profesional visible.",
    /** WP-23: estado de cada fila en la lista del cupo de espera. */
    listaEsperaEstado: {
      waiting: "En espera",
      offered: "Oferta enviada",
    },
    quitarDeLaLista: (p: { nombre: string }): string =>
      `Quitar a ${p.nombre} de la lista de espera`,
    /** WP-30: aria-label del bloque de una hora flash activa (aún no
     * reservada) en el rutnät. */
    horaFlashDisponibleAria: (p: {
      hora: string;
      porcentaje: number;
    }): string => `Hora flash disponible a las ${p.hora}, −${p.porcentaje}%`,
  },
  nuevaReserva: "Nueva reserva",
  /** WP-30: menú al hacer clic en un espacio vacío de la agenda (día). */
  celdaVacia: {
    menuAria: "Crear en esta hora",
    nuevaReserva: "Nueva reserva",
    horaFlash: "Hora flash",
  },
  agregarProfesional: AGREGAR_PROFESIONAL,
  verAgendaDe: (p: { nombre: string }): string => `Ver agenda de ${p.nombre}`,
  vistaAria: "Vista",
  /** aria-label de la sección semanal: "Semana del {desde} al {hasta}". */
  semana: (p: { desde: string; hasta: string }): string =>
    `Semana del ${p.desde} al ${p.hasta}`,
  /** WP-50: vista mensual (`month-grid.tsx`, härledd — ingen ritad referens). */
  mes: {
    /** aria-label de `<section aria-label="Cuadrícula del mes">`. */
    rejillaAria: "Cuadrícula del mes",
    /** aria-label de una celda de día con reservas: "{fecha}, {n} reservas". */
    celdaConReservasAria: (p: { fecha: string; n: number }): string =>
      `${p.fecha}, ${p.n} ${p.n === 1 ? "reserva" : "reservas"}`,
    celdaSinReservasAria: (p: { fecha: string }): string =>
      `${p.fecha}, sin reservas`,
    celdaCerradaAria: (p: { fecha: string }): string => `${p.fecha}, cerrado`,
    /** UX-granskning (sección "Agenda"): barra de llenado de la celda — "Lleno" cuando la
     * capacidad del día está copada (≥ 95 %, `summarizeMonthFill`). */
    lleno: "Lleno",
    celdaLlenaAria: (p: { fecha: string }): string => `${p.fecha}, lleno`,
    /** Botón (mobile) que alterna entre la vista Día y Mes. */
    verMesAria: "Ver el mes",
    verDiaAria: "Ver el día",
  },
  bloqueo: {
    almuerzo: "Almuerzo",
    bloqueado: "bloqueado",
  },
  /** El bloque de una reserva en la grilla semanal (`e.box` en
   * Agenda.dc.html): el nombre del cliente va directo en `e.title` (dato,
   * no copy), pero la segunda línea (`{{e.time}} · {{e.sub}}`) y el
   * aria-label del bloque completo son texto de producto. Claves
   * propuestas por WP-12 (R2 del plan de WP-03b). */
  bloque: {
    meta: (p: { hora: string; servicio: string }): string =>
      `${p.hora} · ${p.servicio}`,
    aria: (p: {
      cliente: string;
      servicio: string;
      hora: string;
      profesional: string;
    }): string => `${p.cliente}, ${p.servicio}, ${p.hora} con ${p.profesional}`,
  },
  diaCerrado: "Cerrado",
  columnaVacia: "Sin reservas en este horario.",
  popover: {
    titulo: "Detalle de la reserva",
    // El ordinal de visita vive en `comun.visita` (compartido con Hoy).
    conProfesional: (p: { profesional: string }): string =>
      `con ${p.profesional}`,
    /** "{telefono} · {visita}" (subtítulo bajo el nombre del cliente). */
    telefonoYVisita: (p: { telefono: string; visita: string }): string =>
      `${p.telefono} · ${p.visita}`,
    /** "{fecha} · {rango}", p. ej. "Vie 2 oct · 11:30 – 12:05". */
    fechaYRango: (p: { fecha: string; rango: string }): string =>
      `${p.fecha} · ${p.rango}`,
    pagoLinea: (p: { precio: string; monto: string }): string =>
      `${p.precio} · abono ${p.monto} pagado`,
    acciones: {
      llego: "Llegó",
      noVino: "No vino",
      mover: "Mover",
    },
    cerrar: "Cerrar",
  },
  mover: {
    titulo: "Mover reserva",
    elegirNuevaHora: "Elige la nueva hora",
  },
  manual: {
    tituloNueva: "Nueva reserva",
    campos: {
      servicio: "Servicio",
      profesional: "Profesional",
      cliente: "Cliente",
      telefono: "Celular",
      dia: "Día",
      hora: "Hora",
      notas: "Notas (opcional)",
    },
    /** Mismo texto que `clientes.notas.ayuda` (WP-03b): ver `NOTAS_AYUDA`
     * arriba. */
    notasAyuda: NOTAS_AYUDA,
    ctaGuardar: "Guardar reserva",
  },
  confirmarAviso: {
    mover: {
      titulo: "¿Mover esta reserva?",
      cuerpo: "Se le avisará al cliente por WhatsApp con la nueva hora.",
      ctaSi: "Sí, mover",
      ctaNo: "No, mantener",
    },
    cancelar: {
      titulo: "¿Cancelar esta reserva?",
      cuerpo: "Se le avisará al cliente por WhatsApp.",
      ctaSi: "Sí, cancelar",
      ctaNo: "No, mantener",
    },
  },
  toast: {
    llego: "Marcado como Llegó.",
    noVino: "Marcado como No vino.",
    movida: "Reserva movida.",
    cancelada: "Reserva cancelada.",
    deshacer: "Deshacer",
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// hoy: Hoy.dc.html — F6 para el dueño (mobile)
// ---------------------------------------------------------------------------

export const hoy = {
  titulo: "Hoy",
  filtroEquipo: FILTRO_EQUIPO,
  proximaReserva: "Próxima reserva",
  /** "Siguiente · {relativo}". `relativo` se arma con `hoy.relativo.*` a
   * partir del número de minutos/horas que calcula WP-04/scheduling: acá
   * nunca se hace aritmética de fechas, solo la frase. */
  siguiente: (p: { relativo: string }): string => `Siguiente · ${p.relativo}`,
  /** WP-04/scheduling entrega el número (minutos u horas+minutos); acá solo
   * vive la frase, para no repetir el cálculo ni el horario de verano. */
  relativo: {
    ahora: "ahora",
    enMin: (p: { n: number }): string => `en ${p.n} min`,
    enHoras: (p: { h: number; m: number }): string =>
      p.m === 0 ? `en ${p.h} h` : `en ${p.h} h ${p.m} min`,
    atrasado: (p: { n: number }): string => `${p.n} min de atraso`,
  },
  sinProximaReserva: "No tienes más clientes agendados hoy.",
  // El ordinal de visita vive en `comun.visita` (compartido con Agenda).
  /** "{servicio} · con {profesional} · {visita}". `visita` es el resultado
   * de `comun.visita`. */
  detalleCliente: (p: {
    servicio: string;
    profesional: string;
    visita: string;
  }): string => `${p.servicio} · con ${p.profesional} · ${p.visita}`,
  acciones: {
    llego: "Llegó",
    noVino: "No vino",
  },
  accionesRapidas: {
    crearHoraFlash: "Crear hora flash",
    listaEspera: (p: { n: number }): string => `Lista de espera · ${p.n}`,
    cobrar: "Cobrar",
  },
  restoDia: {
    titulo: "Resto del día",
    resumen: (p: { n: number; monto: string }): string =>
      `${p.n} ${p.n === 1 ? "reserva" : "reservas"} · ${p.monto}`,
    /** "{servicio} · {profesional}" (sin "con"), fila de la lista del resto
     * del día. */
    detalle: (p: { servicio: string; profesional: string }): string =>
      `${p.servicio} · ${p.profesional}`,
    vacio: "No tienes más reservas hoy.",
    diaCerrado: "Hoy no atiendes.",
  },
} as const satisfies Trad;

export type BotonPlantilla =
  | { readonly tipo: "QUICK_REPLY"; readonly texto: string }
  | {
      readonly tipo: "URL";
      readonly texto: string;
      /** Sufijo dinámico del botón (su propio "{{1}}", con numeración propia
       * respecto del body). */
      readonly sufijo: { readonly ejemplo: string; readonly fuente: string };
      /** true mientras `brand.domain` sea `null` (pregunta 3 / D-001): la
       * plantilla no se puede enviar a Meta hasta tener la base de la URL. */
      readonly dominioPendiente: boolean;
    };

export const plantillasWhatsapp = {
  reservaConfirmada: {
    nombre: "reserva_confirmada",
    categoria: "UTILITY",
    idioma: "es",
    body: "Tu hora en {{1}} quedó confirmada, {{2}}: {{3}} el {{4}} a las {{5}} con {{6}}. Puedes cancelarla sin costo hasta {{7}} h antes.",
    variables: [
      {
        numero: 1,
        significado: "Nombre del negocio",
        ejemplo: "Barbería Norte",
        fuente: "businesses.name",
      },
      {
        numero: 2,
        significado: "Nombre del cliente",
        ejemplo: "Joaquín",
        fuente: "primera palabra de customers.name",
      },
      {
        numero: 3,
        significado: "Servicio",
        ejemplo: "Corte + barba",
        fuente: "services.name",
      },
      {
        numero: 4,
        significado:
          "Fecha (día explícito y en formato largo, no relativo; WP-04 la arma con lower(bookings.period))",
        ejemplo: "viernes 2 de octubre",
        fuente: "lower(bookings.period) (America/Santiago, formato largo)",
      },
      {
        numero: 5,
        significado: "Hora",
        ejemplo: "15:00",
        fuente: "lower(bookings.period) (America/Santiago)",
      },
      {
        numero: 6,
        significado: "Profesional",
        ejemplo: "Diego",
        fuente: "staff.name",
      },
      {
        numero: 7,
        significado: "Horas del plazo de cancelación",
        ejemplo: "4",
        fuente: "businesses.cancel_window_hours",
      },
    ],
    footer: null,
    botones: [
      {
        tipo: "URL",
        texto: "Ver mi reserva",
        sufijo: {
          ejemplo: "q3Zr8Kx1VbN0pT7wYc2LmA9sHd4GfJ6eRu5iOk-_XyW",
          fuente:
            "token de gestión aleatorio de 32 bytes en base64url (43 caracteres), generado por el servidor al enviar; en la base se guarda solo su hash; el link nunca se deriva del hash",
        },
        dominioPendiente: true,
      },
    ],
    nota: "Utility: confirma una reserva que el propio cliente acaba de hacer. No ofrece nada nuevo, solo detalla su compra.",
  },
  recordatorio24h: {
    nombre: "recordatorio_24h",
    categoria: "UTILITY",
    idioma: "es",
    body: "Recordatorio de {{1}}, {{2}}: tu hora de {{3}} es el {{4}} a las {{5}}. Responde Confirmo o Necesito cambiar.",
    variables: [
      {
        numero: 1,
        significado: "Nombre del negocio",
        ejemplo: "Barbería Norte",
        fuente: "businesses.name",
      },
      {
        numero: 2,
        significado: "Nombre del cliente",
        ejemplo: "Joaquín",
        fuente: "primera palabra de customers.name",
      },
      {
        numero: 3,
        significado: "Servicio",
        ejemplo: "Corte + barba",
        fuente: "services.name",
      },
      {
        numero: 4,
        significado: "Fecha (día explícito, no relativo: ver R7)",
        ejemplo: "viernes 2 de octubre",
        fuente: "lower(bookings.period) (America/Santiago)",
      },
      {
        numero: 5,
        significado: "Hora",
        ejemplo: "15:00",
        fuente: "lower(bookings.period) (America/Santiago)",
      },
    ],
    footer: null,
    botones: [
      { tipo: "QUICK_REPLY", texto: "Confirmo" },
      { tipo: "QUICK_REPLY", texto: "Necesito cambiar" },
    ],
    nota: "Utility: recuerda una reserva ya confirmada por el cliente, sin ofrecer nada nuevo.",
  },
  reservaCancelada: {
    nombre: "reserva_cancelada",
    categoria: "UTILITY",
    idioma: "es",
    body: "Tu hora en {{1}} quedó cancelada, {{2}}: era el {{3}} a las {{4}}. Puedes reservar otra cuando quieras.",
    variables: [
      {
        numero: 1,
        significado: "Nombre del negocio",
        ejemplo: "Barbería Norte",
        fuente: "businesses.name",
      },
      {
        numero: 2,
        significado: "Nombre del cliente",
        ejemplo: "Joaquín",
        fuente: "primera palabra de customers.name",
      },
      {
        numero: 3,
        significado: "Fecha de la hora cancelada",
        ejemplo: "viernes 2 de octubre",
        fuente: "lower(bookings.period) (America/Santiago)",
      },
      {
        numero: 4,
        significado: "Hora cancelada",
        ejemplo: "15:00",
        fuente: "lower(bookings.period) (America/Santiago)",
      },
    ],
    footer: null,
    botones: [
      {
        tipo: "URL",
        texto: "Reservar de nuevo",
        sufijo: {
          ejemplo: "barberia-norte",
          fuente: "businesses.slug",
        },
        dominioPendiente: true,
      },
    ],
    nota: "Utility: confirma la cancelación de la propia reserva del cliente. El botón lleva a la página de reservas del mismo negocio, sin descuentos ni texto de venta (R5: riesgo de reclasificación a marketing si se agrega algún incentivo).",
  },
  reservaMovida: {
    nombre: "reserva_movida",
    categoria: "UTILITY",
    idioma: "es",
    body: "Tu hora en {{1}} cambió, {{2}}: ahora es el {{3}} a las {{4}} con {{5}}. Si no te acomoda, puedes cambiarla o cancelarla desde el botón.",
    variables: [
      {
        numero: 1,
        significado: "Nombre del negocio",
        ejemplo: "Barbería Norte",
        fuente: "businesses.name",
      },
      {
        numero: 2,
        significado: "Nombre del cliente",
        ejemplo: "Joaquín",
        fuente: "primera palabra de customers.name",
      },
      {
        numero: 3,
        significado: "Nueva fecha (formato largo)",
        ejemplo: "sábado 3 de octubre",
        fuente: "lower(bookings.period) (America/Santiago)",
      },
      {
        numero: 4,
        significado: "Nueva hora",
        ejemplo: "11:30",
        fuente: "lower(bookings.period) (America/Santiago)",
      },
      {
        numero: 5,
        significado: "Profesional",
        ejemplo: "Diego",
        fuente: "staff.name",
      },
    ],
    footer: null,
    botones: [
      {
        tipo: "URL",
        texto: "Ver mi reserva",
        sufijo: {
          ejemplo: "q3Zr8Kx1VbN0pT7wYc2LmA9sHd4GfJ6eRu5iOk-_XyW",
          fuente:
            "token de gestión aleatorio de 32 bytes en base64url (43 caracteres), generado por el servidor al enviar; en la base se guarda solo su hash; el link nunca se deriva del hash. WP-16 genera un token nuevo cada vez que se reenvía esta plantilla.",
        },
        dominioPendiente: true,
      },
    ],
    nota: "Utility: informa un cambio en la propia reserva del cliente, hecho por el negocio.",
  },
  listaEsperaOferta: {
    nombre: "lista_espera_oferta",
    categoria: "UTILITY",
    idioma: "es",
    body: "Se liberó una hora en {{1}} para ti, {{2}}: {{3}} el {{4}} a las {{5}}. Tienes {{6}} min para responder; la hora es para quien confirme primero.",
    variables: [
      {
        numero: 1,
        significado: "Nombre del negocio",
        ejemplo: "Barbería Norte",
        fuente: "businesses.name",
      },
      {
        numero: 2,
        significado: "Nombre del cliente",
        ejemplo: "Joaquín",
        fuente: "primera palabra de customers.name",
      },
      {
        numero: 3,
        significado: "Servicio",
        ejemplo: "Corte + barba",
        fuente: "services.name",
      },
      {
        numero: 4,
        significado: "Fecha",
        ejemplo: "viernes 2 de octubre",
        fuente: "lower(bookings.period) (America/Santiago)",
      },
      {
        numero: 5,
        significado: "Hora",
        ejemplo: "15:00",
        fuente: "lower(bookings.period) (America/Santiago)",
      },
      {
        numero: 6,
        significado: "Minutos para responder",
        ejemplo: "15",
        fuente: "waitlist_entries.offer_expires_at − now()",
      },
    ],
    footer: null,
    botones: [
      { tipo: "QUICK_REPLY", texto: "Sí, la quiero" },
      { tipo: "QUICK_REPLY", texto: "No, gracias" },
    ],
    nota: "Utility: avisa sobre la propia inscripción del cliente en la lista de espera, no es una promoción nueva.",
  },
  listaEsperaTomada: {
    nombre: "lista_espera_tomada",
    categoria: "UTILITY",
    idioma: "es",
    body: "Esa hora en {{1}} ya fue tomada, {{2}}. Sigues en la lista de espera para el {{3}} y te avisaremos si se libera otra.",
    variables: [
      {
        numero: 1,
        significado: "Nombre del negocio",
        ejemplo: "Barbería Norte",
        fuente: "businesses.name",
      },
      {
        numero: 2,
        significado: "Nombre del cliente",
        ejemplo: "Joaquín",
        fuente: "primera palabra de customers.name",
      },
      {
        numero: 3,
        significado: "Fecha completa por la que sigue esperando",
        ejemplo: "sábado 3 de octubre",
        fuente: "waitlist_entries.date (formato largo)",
      },
    ],
    footer: null,
    botones: [],
    nota: "Utility: informa el resultado de la propia oferta que se le hizo al cliente.",
  },
} as const satisfies Record<string, Plantilla>;

/** Mensajes de sesión: texto libre dentro de la ventana de 24 h del cliente,
 * no se envían a Meta para revisión. El número de WhatsApp es compartido
 * entre negocios (D-007), así que cada mensaje nombra al negocio. */
export const whatsappSesion = {
  confirmo: (p: { negocio: string }): string =>
    `¡Gracias por confirmar tu hora en ${p.negocio}! Te esperamos.`,
  necesitoCambiar: (p: { negocio: string; linkGestion: string }): string =>
    `Sin problema. Cambia tu hora en ${p.negocio} aquí: ${p.linkGestion}`,
  /** La confirmación completa (con la política de cancelación) llega aparte
   * por la plantilla `reserva_confirmada`; acá solo se avisa que la hora
   * quedó tomada. */
  listaEsperaConfirmada: (p: {
    negocio: string;
    servicio: string;
    fecha: string;
    hora: string;
  }): string =>
    `¡Listo! Tu hora de ${p.servicio} en ${p.negocio} quedó para el ${p.fecha} a las ${p.hora}. Te llega la confirmación con todos los detalles.`,
  listaEsperaYaTomada: (p: { negocio: string }): string =>
    `Esa hora en ${p.negocio} ya fue tomada por otra persona. Sigues en la lista de espera.`,
  listaEsperaNoGracias: (p: { negocio: string }): string =>
    `Listo, seguimos avisándote si se libera otra hora en ${p.negocio}.`,
  listaEsperaExpirada: (p: { negocio: string }): string =>
    `El tiempo para responder ya pasó. Te avisaremos si se libera otra hora en ${p.negocio}.`,
  noEntendido: (p: { negocio: string; telefonoNegocio: string }): string =>
    `No entendimos tu mensaje. Escribe directo a ${p.negocio} al ${p.telefonoNegocio} si necesitas ayuda.`,
  /** Respuesta a "BAJA": deja de mandar marketing (hora_flash,
   * te_echamos_de_menos), pero las utility (confirmación, recordatorio) de
   * las propias reservas siguen llegando. */
  baja: (p: { negocio: string }): string =>
    `Listo, no te enviaremos más ofertas de ${p.negocio}. Seguirás recibiendo solo los avisos de tus reservas.`,
  /** Baja total: además de las ofertas, deja de mandar los avisos de
   * reservas por WhatsApp (el cliente sigue pudiendo gestionar su hora por
   * su link de gestión o llamando al negocio). */
  bajaTotal: (p: { negocio: string }): string =>
    `Listo, ya no recibirás ningún mensaje de ${p.negocio} por acá, ni ofertas ni recordatorios de tus reservas. Para gestionar una reserva, entra a tu link de gestión.`,
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// email: respaldo por correo para las cuatro notificaciones de F7
// ---------------------------------------------------------------------------

export const email = {
  reservaConfirmada: {
    asunto: (p: { negocio: string }): string =>
      `Tu hora en ${p.negocio} quedó confirmada`,
    /** Texto corto que muchos clientes de correo muestran junto al asunto
     * en la bandeja de entrada, antes de abrir el mensaje. */
    preheader: (p: { servicio: string; fecha: string; hora: string }): string =>
      `${p.servicio} el ${p.fecha} a las ${p.hora}.`,
    cuerpo: (p: {
      cliente: string;
      negocio: string;
      servicio: string;
      fecha: string;
      hora: string;
      profesional: string;
      horasCancelacion: number;
      linkGestion: string;
    }): string =>
      `Hola ${p.cliente}:\n\nTu hora en ${p.negocio} quedó confirmada.\n\nServicio: ${p.servicio}\nDía: ${p.fecha}\nHora: ${p.hora}\nProfesional: ${p.profesional}\n\nPuedes cancelarla o cambiarla sin costo hasta ${p.horasCancelacion} h antes, desde este link: ${p.linkGestion}\n\nTe esperamos.`,
  },
  recordatorio24h: {
    asunto: (p: { negocio: string; fecha: string }): string =>
      `Recordatorio: tu hora en ${p.negocio} el ${p.fecha}`,
    preheader: (p: { fecha: string; hora: string }): string =>
      `Tu hora es el ${p.fecha} a las ${p.hora}.`,
    cuerpo: (p: {
      cliente: string;
      negocio: string;
      servicio: string;
      fecha: string;
      hora: string;
      linkGestion: string;
    }): string =>
      `Hola ${p.cliente}:\n\nTe recordamos tu hora en ${p.negocio}.\n\nServicio: ${p.servicio}\nDía: ${p.fecha}\nHora: ${p.hora}\n\nSi necesitas cambiarla, entra aquí: ${p.linkGestion}`,
  },
  reservaCancelada: {
    asunto: (p: { negocio: string }): string =>
      `Tu hora en ${p.negocio} fue cancelada`,
    preheader: (p: { fecha: string; hora: string }): string =>
      `Tu hora del ${p.fecha} a las ${p.hora} quedó cancelada.`,
    cuerpo: (p: {
      cliente: string;
      negocio: string;
      fecha: string;
      hora: string;
      linkNuevaReserva: string;
    }): string =>
      `Hola ${p.cliente}:\n\nTu hora en ${p.negocio} del ${p.fecha} a las ${p.hora} quedó cancelada.\n\nPuedes reservar otra cuando quieras: ${p.linkNuevaReserva}`,
  },
  reservaMovida: {
    asunto: (p: { negocio: string }): string =>
      `Tu hora en ${p.negocio} cambió de horario`,
    preheader: (p: { fecha: string; hora: string }): string =>
      `Ahora es el ${p.fecha} a las ${p.hora}.`,
    cuerpo: (p: {
      cliente: string;
      negocio: string;
      fecha: string;
      hora: string;
      profesional: string;
      linkGestion: string;
    }): string =>
      `Hola ${p.cliente}:\n\nTu hora en ${p.negocio} cambió.\n\nNuevo día: ${p.fecha}\nNueva hora: ${p.hora}\nProfesional: ${p.profesional}\n\nRevisa el detalle aquí: ${p.linkGestion}`,
  },
  /** Pie de página de los cuatro correos de arriba. `plataforma` se recibe
   * como parámetro (no se interpola `brand.name` acá): quien arma el correo
   * en WP-16 decide qué nombre mostrar. Los correos nuevos de abajo
   * (`bienvenida`, `nuevaReservaDueno`, etc., agregados por copywriter-es-cl
   * para completar los mails de marca) usan en cambio `comun.piePagina`, con
   * `marca` como parámetro explícito: misma idea, pensada para una
   * plantilla HTML con logo en vez de un correo de puro texto. */
  pie: (p: { negocio: string; plataforma: string }): string =>
    `Recibes este correo porque reservaste en ${p.negocio} a través de ${p.plataforma}.`,
  /** Piezas reutilizables para las plantillas HTML nuevas de abajo
   * (`bienvenida`, `nuevaReservaDueno`, `cancelacionDueno`,
   * `listaEsperaCupo`, `horaFlash`): saludo, pie de página con la marca y
   * las etiquetas de botón más comunes. Los cuatro correos de reserva de
   * arriba (WP-03) siguen con su propio `cuerpo` en texto plano: no se
   * tocan para no romper lo que ya integró WP-16. */
  comun: {
    saludo: (p: { nombre: string }): string => `Hola ${p.nombre}:`,
    /** "Enviado por {marca} en nombre de {negocio}.": `marca` llega como
     * parámetro (regla dura 10), igual que en `acceso` más abajo. */
    piePagina: (p: { marca: string; negocio: string }): string =>
      `Enviado por ${p.marca} en nombre de ${p.negocio}.`,
    porQueRecibes:
      "Recibes este correo porque tienes una cuenta o una reserva con nosotros.",
    ayuda: "¿Tienes dudas? Responde este correo o escríbenos por WhatsApp.",
    verReserva: "Ver mi reserva",
    cambiarHora: "Cambiar hora",
    cancelar: "Cancelar reserva",
    agregarCalendario: "Agregar al calendario",
    comoLlegar: "Cómo llegar",
  },
  /** Al dueño, apenas termina el onboarding (F1). */
  bienvenida: {
    asunto: (p: { marca: string }): string => `Bienvenido a ${p.marca}`,
    preheader: "Tu página de reservas ya está lista para recibir clientes.",
    titulo: "¡Tu agenda está lista!",
    texto:
      "Ya puedes compartir tu link de reservas y empezar a recibir horas. Aquí tienes tres cosas para hacer hoy:",
    pasos: {
      link: "Copia tu link de reservas: está en Inicio y en Ajustes.",
      compartir: "Compártelo por WhatsApp o pégalo en tu Instagram.",
      recordatorios:
        "Los recordatorios automáticos ya están activos, así tus clientes no se olvidan de su hora.",
    },
    cta: "Ir a mi agenda",
  },
  /** Invitación a crear un negocio, enviada por un admin de la plataforma
   * (F19/WP-36, `/admin` → "Nuevo negocio"). El link lleva a
   * `/app/bienvenida/[token]`. */
  invitacionAdmin: {
    asunto: (p: { marca: string }): string =>
      `Te agregaron como administrador de ${p.marca}`,
    preheader: "Entra y activa la verificación en dos pasos.",
    titulo: "Ahora eres administrador",
    texto: (p: { marca: string }): string =>
      `Te agregaron como administrador de la plataforma ${p.marca}. Entra con el botón; el enlace sirve una sola vez.`,
    mfa: (p: { url: string }): string =>
      `Después abre ${p.url} y activa la verificación en dos pasos: sin ella no puedes usar el panel de administración.`,
    cta: "Entrar",
  },
  invitacionNegocio: {
    asunto: (p: { marca: string }): string => `Te invitamos a ${p.marca}`,
    preheader: "Acepta la invitación y arma tu agenda en minutos.",
    titulo: "Tienes una invitación",
    texto: (p: { negocio: string }): string =>
      `Te invitamos a crear la agenda de ${p.negocio}. Haz clic en el botón para aceptarla y empezar.`,
    cta: "Aceptar invitación",
  },
  /** Al dueño, cuando un cliente reserva por su cuenta desde `/[slug]`. */
  nuevaReservaDueno: {
    asunto: (p: { cliente: string; fecha: string }): string =>
      `Nueva reserva de ${p.cliente} el ${p.fecha}`,
    preheader: (p: { servicio: string; hora: string }): string =>
      `${p.servicio} a las ${p.hora}.`,
    titulo: "Tienes una reserva nueva",
    texto: (p: {
      cliente: string;
      servicio: string;
      fecha: string;
      hora: string;
    }): string =>
      `${p.cliente} reservó ${p.servicio} para el ${p.fecha} a las ${p.hora}.`,
    cta: "Ver mi agenda",
  },
  /** Al dueño, cuando un cliente cancela su propia reserva desde
   * `r/[token]` o por WhatsApp. Misma forma que `nuevaReservaDueno`. */
  cancelacionDueno: {
    asunto: (p: { cliente: string; fecha: string }): string =>
      `${p.cliente} canceló su hora del ${p.fecha}`,
    preheader: (p: { servicio: string; hora: string }): string =>
      `Se liberó la hora de las ${p.hora} de ${p.servicio}.`,
    titulo: "Una reserva se canceló",
    texto: (p: {
      cliente: string;
      servicio: string;
      fecha: string;
      hora: string;
    }): string =>
      `${p.cliente} canceló su hora de ${p.servicio} del ${p.fecha} a las ${p.hora}. Esa hora ya quedó libre en tu agenda.`,
    cta: "Ver mi agenda",
  },
  /** Al dueño, cuando una solicitud queda pendiente de confirmar (WP-45,
   * D-033): no se manda si `auto_confirm_bookings` está prendido (ahí la
   * reserva nace `confirmed` y usa `nuevaReservaDueno`). Misma forma que
   * `nuevaReservaDueno`/`cancelacionDueno`. */
  nuevaSolicitud: {
    asunto: (p: { cliente: string; fecha: string }): string =>
      `Solicitud de ${p.cliente} para el ${p.fecha}`,
    preheader: (p: { servicio: string; hora: string }): string =>
      `${p.servicio} a las ${p.hora}. Confírmala o recházala.`,
    titulo: "Tienes una solicitud por confirmar",
    texto: (p: {
      cliente: string;
      servicio: string;
      fecha: string;
      hora: string;
    }): string =>
      `${p.cliente} solicitó ${p.servicio} para el ${p.fecha} a las ${p.hora}. Confírmala o recházala antes de que expire.`,
    cta: "Revisar solicitud",
  },
  /** WP-56: al dueño, cuando un cliente pide cancelar y el negocio exige
   * aprobación (`businesses.cancel_approval`). `cta` lleva a
   * `/app/solicitudes/{id}`. Misma forma que `nuevaSolicitud`. */
  solicitudCancelacion: {
    asunto: (p: { cliente: string; fecha: string }): string =>
      `${p.cliente} quiere cancelar su hora del ${p.fecha}`,
    preheader: (p: { servicio: string; hora: string }): string =>
      `${p.servicio} a las ${p.hora}. Acepta o rechaza la cancelación.`,
    titulo: "Tienes una cancelación por responder",
    texto: (p: {
      cliente: string;
      servicio: string;
      fecha: string;
      hora: string;
    }): string =>
      `${p.cliente} pidió cancelar su hora de ${p.servicio} del ${p.fecha} a las ${p.hora}. La hora sigue reservada hasta que respondas.`,
    cta: "Responder",
  },
  /** D-063 (WhatsApp, WP-22): al dueño, cuando el cliente respondió
   * "Necesito cambiar" al recordatorio. No se le responde nada automático al
   * cliente: el negocio lo contacta. TODO_COPY: revisión de copywriter-es-cl. */
  clienteQuiereCambiar: {
    asunto: (p: { cliente: string; fecha: string }): string =>
      `${p.cliente} necesita cambiar su hora del ${p.fecha}`,
    preheader: (p: { servicio: string; hora: string }): string =>
      `${p.servicio} a las ${p.hora}. Contáctalo para buscar otra hora.`,
    titulo: "Un cliente necesita cambiar su hora",
    texto: (p: {
      cliente: string;
      servicio: string;
      fecha: string;
      hora: string;
    }): string =>
      `${p.cliente} respondió "Necesito cambiar" al recordatorio de su hora de ${p.servicio} del ${p.fecha} a las ${p.hora}. La hora sigue reservada hasta que la muevas o la canceles.`,
    cta: "Ver mi agenda",
  },
  /** WP-56: al cliente, cuando el negocio no acepta su cancelación (la hora
   * sigue en pie). `telefono` es el del negocio, si lo tiene. */
  cancelacionRechazada: {
    asunto: (p: { negocio: string }): string =>
      `${p.negocio} no aceptó tu cancelación`,
    preheader: (p: { fecha: string; hora: string }): string =>
      `Tu hora del ${p.fecha} a las ${p.hora} sigue reservada.`,
    cuerpo: (p: {
      cliente: string;
      negocio: string;
      fecha: string;
      hora: string;
      telefono?: string;
    }): string =>
      `Hola ${p.cliente}:\n\n${p.negocio} no aceptó la cancelación de tu hora del ${p.fecha} a las ${p.hora}, así que sigue reservada.\n\n${p.telefono ? `Si necesitas cambiarla, contacta a ${p.negocio} al ${p.telefono}.` : `Si necesitas cambiarla, contacta a ${p.negocio}.`}`,
  },
  /** Al cliente, apenas manda una solicitud desde `/[slug]` cuando el
   * negocio tiene apagada la confirmación automática (WP-45, F7): por ahora
   * solo por correo (CL: hasta que exista la plantilla de WhatsApp de
   * WP-22; "Ägarens svar" 2). La confirmación real (WhatsApp + recordatorio)
   * llega después, con `reservaConfirmada`, cuando el negocio la acepte. */
  solicitudRecibida: {
    asunto: (p: { negocio: string }): string =>
      `Recibimos tu solicitud de hora en ${p.negocio}`,
    preheader: (p: { servicio: string; fecha: string; hora: string }): string =>
      `${p.servicio} el ${p.fecha} a las ${p.hora}.`,
    titulo: "Recibimos tu solicitud",
    texto: (p: {
      negocio: string;
      servicio: string;
      fecha: string;
      hora: string;
    }): string =>
      `Tu solicitud de ${p.servicio} en ${p.negocio} para el ${p.fecha} a las ${p.hora} quedó pendiente de confirmación. Te avisamos apenas ${p.negocio} la confirme.`,
    cta: "Ver mi solicitud",
  },
  /** Al cliente, cuando el negocio rechaza su solicitud (WP-45). Misma forma
   * que `reservaCancelada` (cuerpo de texto plano + botón para reservar de
   * nuevo). `motivo` es opcional: lo escribe el negocio al rechazar
   * (`solicitudes.rechazarDialog.motivoLabel`) y solo se incluye si existe. */
  solicitudRechazada: {
    asunto: (p: { negocio: string }): string =>
      `Tu solicitud de hora en ${p.negocio} no se pudo confirmar`,
    preheader: (p: { fecha: string; hora: string }): string =>
      `La hora del ${p.fecha} a las ${p.hora} no quedó confirmada.`,
    cuerpo: (p: {
      cliente: string;
      negocio: string;
      fecha: string;
      hora: string;
      linkNuevaReserva: string;
      motivo?: string;
    }): string =>
      `Hola ${p.cliente}:\n\n${p.negocio} no pudo confirmar tu solicitud de hora del ${p.fecha} a las ${p.hora}.${p.motivo ? ` Motivo: ${p.motivo}.` : ""}\n\nPuedes reservar otra hora cuando quieras: ${p.linkNuevaReserva}`,
  },
  /** Al cliente, cuando la solicitud vence antes de que el negocio la
   * confirme o la rechace (WP-45, "Ägarens svar" 1: 24 h después de
   * enviada, o 2 h antes de la hora si eso llega primero). Misma forma que
   * `solicitudRechazada`, sin `motivo` (nadie la rechazó a mano). */
  solicitudVencida: {
    asunto: (p: { negocio: string }): string =>
      `Tu solicitud de hora en ${p.negocio} venció`,
    preheader: (p: { fecha: string; hora: string }): string =>
      `La hora del ${p.fecha} a las ${p.hora} ya no está disponible.`,
    cuerpo: (p: {
      cliente: string;
      negocio: string;
      fecha: string;
      hora: string;
      linkNuevaReserva: string;
    }): string =>
      `Hola ${p.cliente}:\n\nTu solicitud de hora en ${p.negocio} para el ${p.fecha} a las ${p.hora} venció antes de que alcanzáramos a confirmarla.\n\nPuedes reservar otra hora cuando quieras: ${p.linkNuevaReserva}`,
  },
  /** Al cliente en lista de espera, cuando se libera un cupo (respaldo por
   * correo del WhatsApp `lista_espera_oferta`). */
  listaEsperaCupo: {
    asunto: (p: { negocio: string }): string =>
      `Se liberó una hora en ${p.negocio}`,
    preheader: (p: { servicio: string; fecha: string }): string =>
      `${p.servicio} el ${p.fecha}. Confirma antes de que se acabe el tiempo.`,
    titulo: "¡Se liberó tu hora!",
    texto: (p: { servicio: string; fecha: string }): string =>
      `Hay una hora libre para ${p.servicio} el ${p.fecha}. Es tuya si confirmas a tiempo.`,
    cta: "Confirmar hora",
    expira: (p: { minutos: number }): string =>
      `Tienes ${p.minutos} min para confirmar antes de que se la ofrezcamos a otra persona.`,
  },
  /** WP-23: al cliente en lista de espera, cuando la hora que le ofrecimos
   * ya fue tomada por otra persona (respaldo por correo del WhatsApp
   * `lista_espera_tomada`). Solo texto (sin botón: no hay nada que hacer en
   * línea, sigue esperando). Misma frase que la plantilla de WhatsApp. */
  listaEsperaTomada: {
    asunto: (p: { negocio: string }): string =>
      `Esa hora en ${p.negocio} ya se ocupó`,
    preheader: (p: { fecha: string }): string =>
      `Sigues en la lista de espera para el ${p.fecha}.`,
    cuerpo: (p: { cliente: string; negocio: string; fecha: string }): string =>
      `Hola ${p.cliente}:\n\nEsa hora en ${p.negocio} ya fue tomada por otra persona. Sigues en la lista de espera para el ${p.fecha} y te avisaremos si se libera otra.`,
  },
  /** Oferta de una hora liberada con descuento (marketing): respaldo por
   * correo de la hora flash que el dueño comparte. */
  horaFlash: {
    asunto: (p: { negocio: string; pct: number }): string =>
      `Hora flash en ${p.negocio}: −${p.pct}%`,
    preheader: "Queda poco tiempo para aprovecharla.",
    titulo: (p: { pct: number }): string => `−${p.pct}% por tiempo limitado`,
    texto: (p: { servicio: string; fecha: string; hora: string }): string =>
      `Aprovecha ${p.servicio} el ${p.fecha} a las ${p.hora} con descuento. Se acaba pronto.`,
    cta: "Reservar ahora",
  },
  /** WP-31 (F14): campaña de marketing (`/app/clientes/utskick`, mensaje
   * libre que escribió el dueño, más una oferta opcional). `oferta` arma la
   * línea "−X % de descuento, válido hasta …" para la caja destacada (solo
   * si la campaña tiene `offer_pct`); `baja` es el link del pie de página,
   * siempre presente (hard rule 7 — ninguna campaña sin forma de darse de
   * baja). */
  campanaMarketing: {
    asunto: (p: { negocio: string }): string => `Novedades de ${p.negocio}`,
    preheader: "Entérate de esta oferta.",
    titulo: (p: { negocio: string }): string => `Un mensaje de ${p.negocio}`,
    ofertaLabel: "Oferta",
    oferta: (p: { pct: number; fecha?: string }): string =>
      p.fecha
        ? `−${p.pct}% de descuento, válido hasta ${p.fecha}`
        : `−${p.pct}% de descuento`,
    ofertaTextoLabel: "Detalle",
    cta: "Reservar",
    baja: "Darme de baja de estas ofertas",
    porQue: (p: { negocio: string }): string =>
      `Recibes este correo porque aceptaste recibir ofertas de ${p.negocio}.`,
  },
  /** Correos de acceso (Supabase Auth, WP-03b paso 2, F1): link mágico y
   * confirmación de cuenta. Piezas separadas (ya no un solo `cuerpo` de
   * texto plano) para que WP-15/WP-16 armen una plantilla HTML con botón:
   * el link real (`{{ .ConfirmationURL }}`) va en el `href` del botón `cta`,
   * y el código (`{{ .Token }}`) se escribe junto al texto de `codigo`
   * directo en el HTML. Ninguno de los dos placeholders de Supabase vive ya
   * en este archivo (a diferencia de la versión anterior de este bloque):
   * son sintaxis de plantilla de Supabase, no interpolación de `es-CL.ts`.
   * `asunto` recibe `marca` como parámetro en vez de interpolar `brand.name`
   * directo. */
  acceso: {
    magicLink: {
      asunto: (p: { marca: string }): string =>
        `Tu link para entrar a ${p.marca}`,
      preheader: "Haz clic en el link para entrar a tu cuenta.",
      titulo: "Entra a tu cuenta",
      texto:
        "Haz clic en el botón para entrar a tu cuenta. Es un link de un solo uso.",
      cta: "Entrar a mi cuenta",
      codigo: "O usa este código:",
      ignorar:
        "Si no pediste este correo, puedes ignorarlo. No compartas este código con nadie.",
      expira: "El link y el código vencen en 15 minutos.",
    },
    confirmation: {
      asunto: (p: { marca: string }): string =>
        `Confirma tu cuenta de ${p.marca}`,
      preheader: "Confirma tu cuenta para empezar a usarla.",
      titulo: "Confirma tu cuenta",
      texto: "Haz clic en el botón para confirmar tu cuenta y entrar.",
      cta: "Confirmar mi cuenta",
      codigo: "O usa este código:",
      ignorar:
        "Si no creaste esta cuenta, puedes ignorar este correo. No compartas este código con nadie.",
      expira: "El link y el código vencen en 15 minutos.",
    },
  },
  /** Línea que WP-16/25 agregan dentro de `reservaConfirmada.cuerpo` cuando
   * el servicio tiene abono (WP-03b paso 6, F11): una nueva propiedad
   * opcional en `cuerpo` no es posible sin romper el tipo (`Trad` no admite
   * parámetros opcionales ad hoc), así que va aparte. */
  abono: {
    lineaConfirmacion: (p: {
      monto: string;
      saldo: string;
      condiciones: string;
    }): string =>
      `Pagaste ${p.monto} de abono. El resto (${p.saldo}) lo pagas en el local. ${p.condiciones}`,
  },
  /** Al profesional invitado (WP-46, D-034): único canal de invitación en
   * v1 (el plan de WP-46 descarta SMS/WhatsApp para esto). Mismas piezas que
   * `nuevaReservaDueno`/`cancelacionDueno` (asunto, preheader, titulo,
   * texto, cta), más `expira` e `ignorar` con el mismo criterio que
   * `email.acceso` (WP-03b paso 2). Mandato de Meta: nombre de la plantilla
   * `invitacionEquipo` (plan de WP-46, paso 4). `invitadoPor` es el nombre
   * del dueño que envía la invitación. */
  invitacionEquipo: {
    asunto: (p: { negocio: string }): string =>
      `Te invitaron a la cuenta de ${p.negocio}`,
    preheader: (p: { invitadoPor: string; negocio: string }): string =>
      `${p.invitadoPor} te invitó a entrar a la cuenta de ${p.negocio}.`,
    titulo: "Te invitaron a una cuenta",
    texto: (p: { invitadoPor: string; negocio: string }): string =>
      `${p.invitadoPor} te invitó a entrar a la cuenta de ${p.negocio} y ver la agenda.`,
    cta: "Aceptar invitación",
    expira: "Este link vence en 7 días.",
    ignorar: "Si no esperabas esta invitación, puedes ignorar este correo.",
  },
  /** WP-54: precio con descuento de socio, en la tarjeta de la reserva
   * (`reservaConfirmada`/`solicitudRecibida`) en vez de la fila "Precio".
   * `descuento` ya viene formateado, sin signo. */
  miembro: {
    precioLabel: "Precio socio",
    /** WP-31: mismo formato, cuando el descuento viene de una oferta. */
    precioOfertaLabel: "Precio con oferta",
    precio: (p: { precio: string; descuento: string }): string =>
      `${p.precio} (−${p.descuento})`,
  },
  /** WP-54: al cliente, cuando el negocio lo marca como socio y toca
   * "Avisar al cliente". Transaccional (no requiere consentimiento de
   * marketing). `beneficio` = texto del negocio o `beneficioPct`. */
  bienvenidaMiembro: {
    asunto: (p: { negocio: string }): string =>
      `Ahora eres socio de ${p.negocio}`,
    preheader: (p: { beneficio: string }): string =>
      `Tu beneficio: ${p.beneficio}.`,
    titulo: "¡Ya eres socio!",
    texto: (p: { cliente: string; negocio: string }): string =>
      `Hola ${p.cliente}: desde hoy eres socio de ${p.negocio}.`,
    beneficio: (p: { beneficio: string }): string =>
      `Tu beneficio: ${p.beneficio}. Se aplica cuando reservas con tu mismo número de teléfono.`,
    beneficioPct: (p: { pct: number }): string =>
      `${p.pct} % de descuento en tus reservas`,
    cta: "Reservar hora",
  },
  /** WP-65 (D-045): al cliente, 2 h después de una cita realizada. */
  solicitudResena: {
    asunto: (p: { negocio: string }): string => `¿Cómo te fue en ${p.negocio}?`,
    preheader: "Cuéntanos en un minuto. Tu opinión ayuda a otros a elegir.",
    titulo: "¿Cómo te fue?",
    texto: (p: {
      cliente: string;
      negocio: string;
      servicio: string;
    }): string =>
      `Hola ${p.cliente}: gracias por visitar ${p.negocio}. ¿Qué te pareció tu ${p.servicio}?`,
    ayuda:
      "Tu reseña se publica en su página de reservas solo con tu nombre y la inicial de tu apellido. Puedes editarla durante 7 días.",
    cta: "Dejar mi reseña",
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// WP-03b (desde acá): onboarding, catálogo, Clientes, Caja, Ajustes y el
// abono con Mercado Pago. Mismas reglas que arriba (D-016): `tú`, sin
// anglicismos evitables, sin el nombre del producto salvo vía `brand.name`.
// No hay `.dc.html` de referencia para estas pantallas (R1 del plan de
// WP-03b): no hay prueba de paridad de diseño para las exportaciones de
// abajo, solo de contrato contra códigos y enums (ver `es-CL.v2.test.ts`).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// validacion: códigos de error de los esquemas de src/lib/format/ (WP-04)
// para los campos que completa el dueño (clp, rut, fecha, hora, hora local,
// teléfono del negocio y del cliente, correo). Las claves son el código real
// después del prefijo (`clp.out_of_range` → `validacion.clp.out_of_range`),
// para que `satisfies Record<Codigo, string>` funcione sin traducir nombres
// (mismo patrón que `errores.reserva.telefono`).
// ---------------------------------------------------------------------------

export const validacion = {
  clp: {
    empty: "Escribe un monto.",
    invalid_format: "Usa solo números, sin decimales.",
    out_of_range: "Ese monto es demasiado alto.",
    invalid_type: "Ese monto no es válido.",
  },
  // Ningún campo usa RUT todavía en fase 1 (F17 lo necesitará). Se escribe
  // igual porque el esquema ya existe (plan de WP-03b, paso 1).
  rut: {
    empty: "Escribe un RUT.",
    invalid_format: "Ese RUT no tiene un formato válido.",
    invalid_check_digit: "Revisa el dígito verificador.",
    out_of_range: "Ese RUT no es válido.",
  },
  date: {
    invalid_format: "Elige una fecha válida.",
    invalid_date: "Esa fecha no existe.",
    invalid_type: "Esa fecha no es válida.",
  },
  time: {
    invalid_format: "Usa el formato hora:minutos, por ejemplo 15:00.",
    out_of_range: "Esa hora no existe. Revisa la hora y los minutos.",
    invalid_type: "Esa hora no es válida.",
  },
  /** `fromLocalStrict` (src/lib/format/dates.ts, WP-04): cuando el dueño
   * bloquea una hora en el propio día del cambio de horario de verano. */
  horaLocal: {
    nonexistent_local_time:
      "Esa hora no existe ese día por el cambio de hora. Elige otra.",
    ambiguous_local_time:
      "Esa hora se repite ese día por el cambio de hora. Elige antes o después del cambio.",
  },
  /** Teléfono del negocio (F1): mobile_or_fixed, `chileanPhoneInputSchema`.
   * Los seis códigos son `PhoneError` (src/lib/format/phone.ts); `not_mobile`
   * no puede ocurrir en este modo, pero la clave existe para que
   * `satisfies Record<PhoneError | "invalid_type" | "invalid_format", string>`
   * compile. */
  telefonoNegocio: {
    empty: "Escribe el teléfono del negocio.",
    invalid_chars: "Usa solo números, por ejemplo +56 9 1234 5678.",
    not_chilean: "Por ahora solo aceptamos números chilenos (+56).",
    /** Ver `errores.reserva.telefono.wrong_country` (WP-M2). */
    wrong_country: "Escribe un número de celular chileno.",
    invalid_length:
      "Ese número no tiene la cantidad de dígitos de un teléfono chileno. Revisa el número.",
    not_mobile: "Escribe un celular chileno, por ejemplo +56 9 1234 5678.",
    invalid_prefix:
      "Ese número no es válido. Debe empezar con 9 (celular) o con un código de área (fijo).",
    invalid_type: "Ese teléfono no es válido.",
    invalid_format: "Revisa el teléfono del negocio.",
  },
  /** Celular de un cliente que el dueño escribe a mano (Clientes, reserva
   * manual): mismos seis códigos que `telefonoNegocio`, en tono distinto
   * (es el celular de otra persona, no el propio). */
  telefonoCliente: {
    empty: "Escribe el celular del cliente.",
    invalid_chars: "Usa solo números, por ejemplo +56 9 1234 5678.",
    not_chilean: "Por ahora solo aceptamos celulares chilenos (+56).",
    /** Ver `errores.reserva.telefono.wrong_country` (WP-M2). */
    wrong_country: "Escribe un número de celular chileno.",
    invalid_length:
      "Un celular chileno tiene 8 dígitos después de +56 9. Revisa el número.",
    not_mobile: "Escribe un celular chileno, por ejemplo +56 9 1234 5678.",
    invalid_prefix: "Ese número no es válido. Revisa el código de área.",
    invalid_type: "Ese celular no es válido.",
    invalid_format: "Revisa el celular del cliente.",
  },
  email: {
    invalid: "Revisa el correo electrónico.",
  },
  requerido: "Completa este campo.",
  numeroEntero,
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// acceso: inicio de sesión con link mágico + código de 6 dígitos (F1,
// pregunta 2 del plan de WP-03b). No hay código por WhatsApp en v1.
// ---------------------------------------------------------------------------

export const acceso = {
  login: {
    titulo: "Entrar",
    emailLabel: "Correo",
    emailPlaceholder: "tucorreo@ejemplo.cl",
    cta: "Enviarme el link",
    /** Estado del botón `cta` mientras se envía la solicitud. */
    enviando: "Enviando…",
    sinContrasena: "No necesitas contraseña.",
    /** Botón de vuelta a la página de inicio (arriba a la izquierda). */
    volver: "Volver al inicio",
    /** Texto grande del panel con foto. */
    bienvenida: "Qué bueno verte de nuevo",
    bienvenidaTexto: "Tus clientes reservan solos, y tú te dedicas a lo tuyo.",
    /** Título y bajada de la tarjeta (el h1 de la página). */
    cardTitulo: "Entra a tu agenda",
    cardTexto:
      "Te enviamos un código y un link a tu correo: no hay contraseña que recordar.",
    /** WP-83 (D-068): link a la página de registro (`SIGNUP_PATH`). TODO_COPY */
    nuevoPregunta: "¿Primera vez acá?",
    nuevoLink: "Crea tu agenda gratis",
  },
  /** WP-83 (D-068): `/comenzar`, registro de un negocio nuevo. Mismo correo
   * (código + link) que `/login`; la cuenta se crea al entrar. TODO_COPY */
  registro: {
    titulo: "Crea tu agenda",
    /** La última palabra va destacada (igual que `login.bienvenida`). */
    bienvenida: "Comienza gratis",
    bienvenidaTexto:
      "Tu página de reservas queda lista en minutos. Sin tarjeta de crédito.",
    cardTitulo: "Crea tu agenda",
    cardTexto: "Parte con tu correo y lo armamos juntos.",
    pasos: {
      correo: "Escribe tu correo",
      codigo: "Ingresa el código que te enviamos (o abre el link)",
      datos:
        "Pega el link de tu sistema de reservas anterior, o completa tus datos",
    },
    cta: "Crear mi agenda",
    cuentaPregunta: "¿Ya tienes cuenta?",
    cuentaLink: "Entra",
  },
  /** WP-83 (D-068): el código del correo se escribe acá (alternativa al
   * link). TODO_COPY */
  codigo: {
    label: "Código del correo",
    placeholder: "123456",
    cta: "Entrar",
    verificando: "Revisando…",
    oLink: "O toca el botón del correo.",
  },
  enviado: {
    titulo: "Revisa tu correo",
    enviadoA: (p: { email: string }): string =>
      `Te enviamos un código y un link a ${p.email}.`,
    codigoLabel: "O escribe el código de 6 dígitos",
    reenviarEn: (p: { segundos: number }): string =>
      `Reenviar en ${p.segundos} s`,
    reenviar: "Reenviar",
    usarOtroCorreo: "Usar otro correo",
    /** Título de la tarjeta cuando el link ya salió. */
    tituloBandeja: "Revisa tu bandeja de entrada",
    sinCorreo: "¿No te llegó el correo?",
    sinCorreoAyuda: "Mira también en spam. A veces tarda un minuto.",
    reenviado: "Listo, te enviamos otro correo.",
  },
  /** Nombres propuestos por copywriter (R2 del plan de WP-03b): WP-15
   * confirma la lista real de códigos de Supabase Auth y ajusta las claves
   * si hace falta. */
  errores: {
    invalid_email: "Escribe un correo válido.",
    otp_expired: "Ese link o código venció. Pide uno nuevo.",
    invalid_otp: "Ese código no es válido. Revísalo o pide uno nuevo.",
    over_email_send_rate_limit: "Espera un minuto antes de pedir otro link.",
    /** PKCE: el link se abrió en un navegador distinto al que lo pidió,
     * común cuando se abre desde el navegador interno de WhatsApp. */
    pkce_mismatch:
      "Abre el link en el mismo navegador donde lo pediste, o usa el código.",
    captcha_failed:
      "No pudimos verificar que eres una persona. Intenta de nuevo.",
    session_expired: "Tu sesión venció. Entra de nuevo.",
    network: "No pudimos conectar. Revisa tu conexión e intenta de nuevo.",
    /** WP-83: límite propio de intentos con el código (10 minutos). TODO_COPY */
    too_many_attempts:
      "Hiciste muchos intentos. Espera unos minutos y pide un código nuevo.",
  },
  sesionCerrada: "Cerraste tu sesión.",
} as const satisfies Trad;

/** `/app/bienvenida/[token]` (F19/WP-36): página pública donde alguien
 * invitado por un admin de la plataforma acepta la invitación y entra a su
 * cuenta nueva. Misma familia que `acceso` (reexportada vía `src/i18n/
 * auth.ts`, no `@/i18n`, para no engordar el bundle de `/login`). */
export const invitacionNegocio = {
  titulo: "Completa tu registro",
  cargando: "Confirmando tu invitación…",
  continuarCta: "Continuar con mi correo",
  enviando: "Enviando…",
  enviado: (p: { email: string }): string =>
    `Te enviamos un link a ${p.email}. Ábrelo para continuar.`,
  errores: {
    not_found: "No encontramos esa invitación.",
    accepted: "Esa invitación ya se usó.",
    expired: "Esa invitación venció. Pide una nueva.",
    email_mismatch:
      "Esa invitación es para otra cuenta. Entra con el correo al que la enviamos.",
    network: "No pudimos conectar. Intenta de nuevo.",
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// negocio: perfil del negocio (onboarding paso 1 y Ajustes)
// ---------------------------------------------------------------------------

export const negocio = {
  campos: {
    nameLabel: "Nombre del negocio",
    namePlaceholder: "Ej: Barbería Central",
    comunaLabel: "Comuna",
    categoryLabel: "Rubro",
    phoneLabel: "Teléfono del negocio",
    phoneAyuda:
      "Celular o fijo. Tus clientes lo ven en la confirmación y lo usan para escribirte si no pueden cambiar su hora solos.",
    phonePlaceholder: "+56 9 1234 5678",
    // WP-85 (D-070): la dirección es obligatoria (Descubre, mapa), salvo para
    // quien atiende a domicilio.
    addressLabel: "Dirección",
    addressPlaceholder: "Calle y número",
    addressAyuda:
      "Donde te encuentran tus clientes. Aparece en tu página de reservas y en Descubre.",
    sinLocal: "No tenemos local: atendemos a domicilio",
    sinLocalAyuda:
      "Así apareces en Descubre en las comunas donde atiendes, en vez de en una dirección.",
    zonasLabel: "Comunas donde atiendes",
    zonasAyuda: "Escribe una comuna y toca Agregar. Puedes agregar varias.",
    zonasPlaceholder: "Ej: Ñuñoa",
    zonasAgregar: "Agregar",
    zonasQuitar: (p: { comuna: string }): string => `Quitar ${p.comuna}`,
    zonasMax: (p: { max: number }): string =>
      `Puedes agregar hasta ${p.max} comunas.`,
    zonasVacio: "Agrega al menos una comuna.",
  },
  /** Claves = valores guardados en `businesses.category` (pregunta 8 del plan
   * de WP-03b). La lista de comunas es dato, no copy: vive en WP-15. */
  rubros: {
    barberia: "Barbería",
    peluqueria: "Peluquería",
    estetica: "Estética",
    unas: "Uñas",
    cejas_pestanas: "Pestañas y cejas",
    masajes: "Masajes",
    kinesiologia: "Kinesiología y salud",
    // WP-85 (D-070): un rubro por categoría de Descubre (mismos nombres que
    // `descubre.categorias.nombres`).
    belleza: "Maquillaje y depilación",
    spa: "Spa",
    holistico: "Terapias holísticas",
    entrenamiento: "Entrenamiento y yoga",
    tatuajes: "Tatuajes y piercing",
    mascotas: "Mascotas",
    limpieza: "Limpieza y hogar",
    automotriz: "Autos",
    otro: "Otro",
  },
  slug: {
    label: "Tu link de reservas",
    ayuda:
      "Así se ve el link que le compartes a tus clientes. Puedes cambiarlo después en Ajustes.",
    /** Vista previa del link ya armado (dominio + slug), formateado por
     * quien la llama. */
    vistaPrevia: (p: { url: string }): string => `Tu link: ${p.url}`,
  },
  /** Nombres propuestos por copywriter (R2 del plan): `businesses_slug_format`
   * y `businesses_slug_not_reserved` (WP-01) validan 3–40 caracteres,
   * a–z, 0–9 y guiones. */
  errores: {
    slug_taken: "Ese link ya lo está usando otro negocio. Prueba con otro.",
    slug_reserved: "Ese link no está disponible. Prueba con otro.",
    slug_invalid:
      "Usa entre 3 y 40 letras minúsculas, números o guiones, sin espacios.",
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// onboarding: cuenta nueva en 5 pasos (F1, "menos de 10 minutos"; WP-51 agregó "Tu página")
// ---------------------------------------------------------------------------

/** Forma sin género para quien atiende sin equipo (revisión de seguridad,
 * 2026-09-27: "trabajas solo/sola" obligaba a elegir género). Compartida
 * entre `onboarding.intro.equipo` y `profesionales.vacio`. */
const AGREGA_EQUIPO_VACIO =
  "Agrega a las personas que atienden. Si atiendes sin equipo, agrégate a ti.";

export const onboarding = {
  bienvenida: "Configura tu agenda en 5 pasos, toma menos de 10 minutos.",
  paso: (p: { n: number; total: number }): string =>
    `Paso ${p.n} de ${p.total}`,
  /** Mismos nombres que las secciones equivalentes en `ajustes.secciones`
   * cuando significan lo mismo (§5 del plan: "mismo vocabulario"). */
  pasos: {
    servicios: "Servicios",
    equipo: "Equipo",
    horario: "Horario",
    /** WP-51: paso nuevo entre horario y link. El negocio ya existe en la
     * base de datos en este paso (a diferencia de los anteriores) — ver el
     * comentario sobre `finish()` en onboarding-wizard.tsx. */
    pagina: "Tu página",
    link: "Tu link",
  },
  ctaContinuar: "Continuar",
  ctaVolver: "Volver",
  ctaSaltar: "Saltar este paso",
  loHagoDespues: "Lo hago después",
  /** Una oración por paso, ≤ 120 caracteres (§5 del plan). */
  intro: {
    servicios: "Agrega lo que ofreces: nombre, duración y precio.",
    equipo: AGREGA_EQUIPO_VACIO,
    horario: "Cuéntanos cuándo atiendes cada día.",
    /** WP-51: todos los campos de este paso son opcionales ("Saltar este
     * paso" reutiliza `ctaSaltar`). */
    pagina:
      "Agrega fotos y datos de contacto para que te encuentren. Todo esto es opcional.",
    link: "Con esto ya tienes tu página de reservas lista.",
  },
  listo: {
    titulo: "Tu link está listo",
    ctaCopiar: "Copiar link",
    copiado: "Copiado",
    ctaCompartirWhatsapp: "Compartir por WhatsApp",
    ctaVerPagina: "Ver mi página",
    ctaIrAgenda: "Ir a mi agenda",
    /** Se manda desde el propio teléfono del dueño (Web Share/`wa.me`), no
     * por `message_outbox`: la regla dura 4 no aplica acá (ver el plan,
     * paso 3). */
    mensajeCompartir: (p: { negocio: string; url: string }): string =>
      `Hola, ya puedes reservar tu hora en ${p.negocio} acá: ${p.url}`,
  },
  checklist: {
    titulo: "Completa tu configuración",
    pasosPendientes: (p: { n: number }): string =>
      `${p.n} ${p.n === 1 ? "paso pendiente" : "pasos pendientes"}`,
    // WP-83 (D-068): la tarjeta de Inicio con el mismo estilo que el panel de
    // pasos del onboarding. TODO_COPY
    tituloCorto: "Comenzar",
    hola: "¡Hola! Terminemos de armar tu agenda",
    porcentaje: (p: { n: number }): string => `${p.n} %`,
    abrir: "Ver los pasos",
    cerrar: "Ocultar los pasos",
  },
  /** WP-83 (D-068): panel de pasos del onboarding, primer paso (importar) y
   * pantallas de carga. TODO_COPY */
  guia: {
    titulo: "Comenzar",
    progreso: (p: { n: number }): string => `${p.n} % listo`,
    pasoDe: (p: { n: number; total: number }): string =>
      `Paso ${p.n} de ${p.total}`,
    verPasos: "Ver todos los pasos",
    pasos: {
      inicio: "Trae tus datos",
      negocio: "Tu negocio",
      rubro: "Rubro",
      lugar: "Ubicación y contacto",
      servicios: "Servicios",
      equipo: "Equipo",
      horario: "Horario",
      pagina: "Tu página",
    },
  },
  inicio: {
    titulo: "¿Ya tienes una página de reservas?",
    texto:
      "Podemos traer tus servicios, precios y horario. Tú revisas todo antes de guardar.",
    si: "Sí, traer mis datos",
    no: "No, parto desde cero",
    noTexto: "Toma unos cinco minutos.",
    importado: "¡Listo! Revisa tus datos en el siguiente paso.",
    volverOpciones: "Volver a las opciones",
  },
  negocioPaso: {
    titulo: "¿Cómo se llama tu negocio?",
    texto: "Tus clientes ven este nombre. El link lo puedes cambiar después.",
    vistaPrevia: "Tu página de reservas",
  },
  rubroPaso: {
    titulo: "¿A qué te dedicas?",
    texto:
      "Elige el rubro que más se parezca al tuyo. Así te encuentran en Descubre.",
  },
  lugarPaso: {
    titulo: "¿Dónde te encuentran tus clientes?",
    texto: "La comuna aparece en tu página de reservas y en Descubre.",
  },
  /** Sin pago en la app (D-061/D-068): un plan pagado queda como solicitud y
   * el equipo lo activa. */
  planPaso: {
    titulo: "Elige tu plan",
    texto:
      "Parte gratis, o pide un plan pagado con 30 días de prueba, sin tarjeta. Te contactamos para activarlo.",
    porMes: "/mes + IVA",
    gratisPrecio: "$0",
    popular: "Popular",
    pedir: "Quiero este plan",
    pidiendo: "Enviando…",
    elegirGratis: "Seguir con Gratis",
    solicitadoTitulo: (p: { nombre: string }): string =>
      `Listo, pediste el plan ${p.nombre}`,
    solicitadoTexto:
      "Te contactamos pronto para activar tus 30 días de prueba. Mientras tanto, tu agenda funciona con el plan Gratis.",
    continuar: "Continuar",
    error:
      "No pudimos guardar tu solicitud. Intenta de nuevo o sigue con Gratis.",
  },
  creando: {
    titulo: "Estamos armando tu agenda",
    texto: "Toma solo unos segundos.",
    pasos: {
      negocio: "Creando tu negocio",
      servicios: "Agregando tus servicios",
      equipo: "Equipo y horario",
      pagina: "Publicando tu página de reservas",
    },
  },
  avisoSinServicios:
    "Tu página no recibe reservas hasta que agregues un servicio.",
  /** Aviso genérico al saltar cualquier paso (`ctaSaltar`), distinto de
   * `avisoSinServicios` (que es específico del paso de servicios). */
  pasoOmitidoAviso: (p: { seccion: string }): string =>
    `Saltaste este paso. Puedes completarlo después en Ajustes → ${p.seccion}.`,
  /** Casilla de consentimiento del último paso (Horario), WP-26 paso 6
   * (regla dura 7: nunca premarcada). El componente arma la frase como
   * `prefijo <a>terminosLinkTexto</a> medio <a>encargoLinkTexto</a>sufijo`
   * (mismo patrón que `reserva.consentimientos` en `customer-form.tsx`),
   * con enlaces a `hrefLegal("terminos")`/`hrefLegal("encargo")` en una
   * pestaña nueva. El servidor rechaza el envío sin esta casilla
   * (`acceptedTermsSchema`, `src/server/onboarding/schemas.ts`) con el
   * código `terms.not_accepted`, mapeado acá en `error`. */
  terminos: {
    prefijo: "Acepto los",
    terminosLinkTexto: "Términos",
    medio: "y el",
    encargoLinkTexto: "Acuerdo de encargo",
    sufijo: ".",
    error: "Debes aceptar los Términos y el Acuerdo de encargo para continuar.",
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// servicios: catálogo (onboarding paso 1 y Ajustes, mismos campos)
// ---------------------------------------------------------------------------

export const servicios = {
  campos: {
    nameLabel: "Nombre del servicio",
    namePlaceholder: "Ej: Corte de pelo",
    /** GUIA §9: texto de ayuda que siempre se ve bajo el nombre, en
     * onboarding y en Ajustes (misma clave en los dos lugares). No hay
     * filtro automático de palabras en v1 (pregunta 11 del plan). */
    nombreAyuda:
      "El nombre llega al cliente por WhatsApp y correo. Usa un nombre general, sin datos de salud.",
    /** Texto ampliado para kinesiología y estética (GUIA §9). Ejemplo
     * neutral (revisión de seguridad, 2026-09-27): ni "rehabilitación" ni
     * ningún otro nombre que sugiera una condición de salud. */
    nombreAyudaExtendida:
      'Por ejemplo, escribe "Sesión de kinesiología" o "Sesión (60 min)", no el diagnóstico ni el tratamiento específico.',
    durationLabel: "Duración (min)",
    priceLabel: "Precio",
    pricePlaceholder: "$10.000",
    bufferLabel: "Tiempo extra después",
    bufferAyuda: "Para limpiar o preparar. El cliente no lo ve.",
    // WP-84 (D-069): precio "desde". TODO_COPY.
    precioDesde: "Mostrar «desde» antes del valor",
    precioDesdeAyuda:
      "Para servicios cuyo valor final depende del trabajo. El cliente ve «desde $15.000».",
    categoryLabel: "Categoría (opcional)",
    profesionalesLabel: "¿Quién lo hace?",
    mostrarEnPaginaLabel: "Mostrar en la página de reservas",
    /** Nuevo en WP-41 (`services.description`, ≤ 500 caracteres): se
     * muestra en la página de reservas junto a la duración del servicio
     * (`perfil.publico.servicioDetalle`). */
    descripcionLabel: "Descripción (opcional)",
    descripcionPlaceholder: "Cuéntale al cliente qué incluye este servicio.",
    descripcionAyuda: "Se muestra en tu página de reservas.",
    subirAria: "Subir",
    bajarAria: "Bajar",
  },
  errores: {
    nombreVacio: "Escribe el nombre del servicio.",
    duracionInvalida: "La duración debe ser mayor a 0.",
    bufferInvalido: "El tiempo extra no puede ser negativo.",
    /** Sin cascada (bookings apunta al servicio): borrar un servicio con
     * reservas lo bloquea la base de datos (plan, paso 3). */
    service_in_use:
      "Ese servicio tiene reservas. Desactívalo en vez de borrarlo.",
    /** Nuevo en WP-41, tope del mismo campo de arriba. */
    descripcionMuyLarga: "La descripción no puede tener más de 500 caracteres.",
  },
  vacio: "Agrega los servicios que ofreces.",
  contador: (p: { n: number }): string =>
    `${p.n} ${p.n === 1 ? "servicio" : "servicios"}`,
  ctaAgregar: "Agregar servicio",
  ctaEliminar: "Eliminar servicio",
  ctaDesactivar: "Desactivar servicio",
  ctaActivar: "Activar servicio",
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// profesionales: equipo (onboarding paso 2 y Ajustes)
// ---------------------------------------------------------------------------

export const profesionales = {
  campos: {
    nameLabel: "Nombre",
    /** Nuevo en WP-41 (`staff.title`, opcional): rol o especialidad, se
     * muestra bajo el nombre en la página de reservas (p. ej.
     * "Colorista"). */
    tituloLabel: "Rol o especialidad (opcional)",
    tituloPlaceholder: "Ej: Colorista",
    tituloAyuda: "Se muestra en tu página de reservas.",
    /** WP-44: etiqueta accesible (sr-only) del selector de foto de personal,
     * gratis en todos los planes. */
    fotoLabel: "Foto de perfil (opcional)",
    colorLabel: "Color",
    serviciosLabel: "Servicios que hace",
    horarioLabel: "Horario",
    horarioIgualNegocio: "Igual que el negocio",
    horarioPropio: "Horario propio",
    activoLabel: "Activo",
  },
  /** `staff-1` … `staff-6` (src/styles/tokens.css): lavanda, celeste, lila,
   * durazno, menta, lima, en ese orden (plan, paso 3). Usadas como
   * `aria-label` de cada color y para el lector de pantalla. */
  colores: {
    "staff-1": "Lavanda",
    "staff-2": "Celeste",
    "staff-3": "Lila",
    "staff-4": "Durazno",
    "staff-5": "Menta",
    "staff-6": "Lima",
  },
  /** Un horario propio solo puede achicar el horario del negocio, nunca
   * ampliarlo (F3, `staff_hours`, R6 en el plan de WP-01): la base de datos
   * no lo impide, lo respeta el motor de WP-10. */
  horarioAyuda:
    "Un horario propio solo puede achicar el horario del negocio, nunca ampliarlo.",
  horarioAvisoFueraDeNegocio:
    "Ese horario queda fuera del horario del negocio. No se van a ofrecer horas ahí.",
  errores: {
    nombreVacio: "Escribe el nombre del profesional.",
    staff_has_future_bookings: (p: { n: number }): string =>
      `Tiene ${p.n} ${p.n === 1 ? "reserva próxima" : "reservas próximas"}, muévelas o cancélalas primero.`,
  },
  vacio: AGREGA_EQUIPO_VACIO,
  ctaAgregar: AGREGAR_PROFESIONAL,
  ctaEliminar: "Eliminar profesional",
  ctaDesactivar: "Desactivar profesional",
  ctaActivar: "Activar profesional",
  /** UX-granskning (sección "Inställningar"): menú "…" de cada fila en la pestaña Equipo
   * (team-section.tsx, fila única por persona). */
  ctaFoto: "Foto",
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// horarios: horario de atención y bloqueos/ausencias (onboarding paso 3 y
// Ajustes)
// ---------------------------------------------------------------------------

export const horarios = {
  abierto: "Abierto",
  cerrado: "Cerrado",
  ctaAgregarHorario: "Agregar horario",
  ctaQuitarHorario: "Quitar horario",
  ctaCopiarATodosLosDias: "Copiar a todos los días",
  /** "10:00–14:00 y 15:00–19:00": conjunción española de listas para 1, 2 y
   * 3 intervalos ("A", "A y B", "A, B y C"). `rangos` ya viene formateado
   * ("10:00–14:00") por WP-04; acá solo se arma la lista. */
  intervalos: (p: { rangos: readonly string[] }): string => {
    const r = p.rangos;
    if (r.length === 0) return "";
    if (r.length === 1) return r[0] ?? "";
    if (r.length === 2) return `${r[0]} y ${r[1]}`;
    return `${r.slice(0, -1).join(", ")} y ${r[r.length - 1]}`;
  },
  errores: {
    business_hours_start_before_end:
      "La hora de inicio debe ser antes que la de término.",
    business_hours_no_overlap: "Ese horario se cruza con otro del mismo día.",
  },
  /** `time_off_kind` (DB enum) y campos del formulario de bloqueo/ausencia. */
  bloqueos: {
    tituloNuevo: "Nuevo bloqueo",
    kind: {
      block: "Bloqueo",
      lunch: "Almuerzo",
      vacation: "Vacaciones",
      holiday: "Feriado",
    },
    alcance: {
      negocio: "Todo el negocio",
      profesional: "Un profesional",
    },
    campos: {
      desde: "Desde",
      hasta: "Hasta",
      nota: "Nota (opcional)",
    },
    notaAyuda: "Solo tu equipo la ve. No anotes datos de salud.",
    ctaAgregar: "Agregar bloqueo",
    ctaGuardar: "Guardar bloqueo",
    ctaEliminar: "Eliminar bloqueo",
    overlapsBookings: (p: { n: number }): string =>
      `Ese bloqueo se cruza con ${p.n} ${p.n === 1 ? "reserva" : "reservas"}. Muévelas antes de guardar.`,
  },
} as const satisfies Trad;

// WP-85 (D-070): Ajustes → Tu negocio → "Descubre".
export const descubreAjustes = {
  titulo: "Descubre",
  intro:
    "Descubre es nuestro catálogo donde los clientes encuentran negocios cerca de ellos. Aparecer ahí es gratis.",
  visibleLabel: "Mostrar mi negocio en Descubre",
  visibleAyuda:
    "Tu negocio aparece cuando tu perfil está completo. Puedes desactivarlo cuando quieras.",
  estado: {
    visible: "Tu negocio aparece en Descubre",
    ocultoPlataforma:
      "Tu negocio está oculto en Descubre. Escríbenos si crees que es un error.",
    falta: "Esto falta para que tu negocio aparezca:",
  },
  faltan: {
    imagen: "Un logo o una foto de portada (Ajustes → Perfil)",
    direccion: "La dirección del negocio (aquí arriba)",
    zonas: "Las comunas donde atiendes (aquí arriba)",
    servicio: "Al menos un servicio activo (Ajustes → Servicios)",
  },
  rubroLabel: "Rubro",
  rubroAyuda: "Tu rubro es tu categoría principal en Descubre.",
  extrasTitulo: "También ofrecemos",
  extrasAyuda: (p: { max: number }): string =>
    `Elige hasta ${p.max} categorías más para que más clientes te encuentren.`,
  extrasSugerencia:
    "Marcamos las categorías que aparecen en tus servicios. Revísalas y guarda.",
  sugerida: "Sugerida",
  guardar: "Guardar",
  // Aviso en Inicio cuando el negocio quiere aparecer pero falta algo.
  recordatorio: {
    texto: (p: { faltan: string }): string =>
      `Tu negocio todavía no aparece en Descubre: te falta ${p.faltan}.`,
    cta: "Completar",
    faltan: {
      imagen: "un logo o una foto de portada",
      direccion: "una dirección",
      zonas: "las comunas donde atiendes",
      servicio: "un servicio activo",
    },
    y: "y",
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// ajustes: pantalla de configuración permanente (perfil, reglas, cuenta)
// ---------------------------------------------------------------------------

export const ajustes = {
  secciones: {
    negocio: "Tu negocio",
    link: "Tu link de reservas",
    reglas: "Reglas de reserva",
    servicios: "Servicios",
    equipo: "Equipo",
    horario: "Horario",
    mercadopago: "Mercado Pago",
    cuenta: "Cuenta",
    /** Pestaña nueva (WP-40, D-031): `falt-A-bokningsformular.html`.
     * Mismo texto para la pestaña y para el título `<h1>` de la pantalla
     * (mismo criterio que las otras filas de `secciones`). */
    formularioReserva: "Formulario de reserva",
    /** Sección nueva (WP-26 paso 7, F12): exportar los datos del negocio y
     * eliminar la cuenta. */
    privacidad: "Privacidad y datos",
    /** Sección nueva (WP-54): el beneficio para clientes marcados como
     * `is_member` ("socios", ver `estados.socio`). WP-31: renombrada — ahora
     * también vive acá el recordatorio automático "Te echamos de menos"
     * (`winback`, mismo criterio de acceso, `can_edit_settings`). */
    socios: "Socios y envíos",
  },
  /** Sección "Socios" (WP-54): `businesses.member_discount_pct`/
   * `member_benefit_text`. Apagado = `member_discount_pct` es `null`. */
  socios: {
    activar: "Activar beneficio para socios",
    activarAyuda:
      "Cuando está prendido, puedes marcar a tus clientes frecuentes como socios desde su ficha en Clientes.",
    descuentoLabel: "Descuento para socios (%)",
    descuentoAyuda: "Un número entre 1 % y 100 %.",
    beneficioLabel: "Texto del beneficio (opcional)",
    beneficioPlaceholder: "Ej: 10 % de descuento en todos los tratamientos",
    beneficioAyuda: "Hasta 140 caracteres.",
  },
  /** WP-31 (F14): "Te echamos de menos" automático — un envío por cliente
   * cuyo último besuco pasó `winback_days` y que no recibió un winback en
   * los últimos 90 días (lo decide el trabajo diario, no acá). Apagado =
   * `businesses.winback_days` es `null`, igual que `socios` arriba. */
  winback: {
    titulo: "Te echamos de menos (automático)",
    activar: "Activar recordatorio automático",
    activarAyuda:
      "Les escribimos solos a los clientes que no han vuelto, sin que tengas que hacer nada.",
    diasLabel: "Días sin venir",
    diasAyuda: "Un número entre 30 y 365.",
    mensajeLabel: "Mensaje",
    mensajePlaceholder: "Ej: Te echamos de menos, vuelve pronto",
    mensajeAyuda: "Hasta 320 caracteres.",
    ofertaPctLabel: "Descuento (%, opcional)",
    ofertaPctAyuda: "Un número entre 1 % y 100 %.",
    ofertaDiasLabel: "Válido por (días)",
    ofertaDiasAyuda: "Cuántos días dura el descuento desde que se lo enviamos.",
  },
  reglas: {
    minNoticeLabel: "Anticipación mínima",
    maxDaysAheadLabel: (p: { n: number }): string =>
      `Reservas con hasta ${p.n} días de anticipación`,
    cancelWindowLabel: "Plazo para cancelar o cambiar",
    cancelWindowAyuda:
      "Este número se lo mostramos al cliente antes de confirmar y en la confirmación por WhatsApp.",
    slotIntervalLabel: "Cada cuánto se ofrecen horas",
    /** Interruptor nuevo (WP-45, D-033): apagado por defecto, incluso para
     * los negocios que ya existen ("Ägarens svar" 4). Si está apagado, las
     * reservas de la página nacen `requested` y hay que confirmarlas o
     * rechazarlas a mano; si está prendido, nacen `confirmed` directo, como
     * antes de WP-45. */
    confirmarAutomatico: "Confirmar reservas automáticamente",
    confirmarAutomaticoAyuda:
      "Si lo apagas, cada reserva que llega por tu página queda pendiente hasta que tú la confirmes o la rechaces. Mientras tanto, la hora queda bloqueada para que nadie más la tome.",
    /** WP-56: `businesses.cancel_approval` ("none"/"late"/"all"). */
    cancelApprovalLabel: "Cancelaciones del cliente",
    cancelApprovalAyuda:
      "Se aplica junto con el plazo de arriba: una cancelación dentro de ese plazo (o todas, según lo que elijas) queda pendiente hasta que tú la apruebes o la rechaces, sin liberar la hora.",
    cancelApprovalOpciones: {
      none: "Directas, sin tu aprobación",
      late: "Las que lleguen tarde necesitan tu aprobación",
      all: "Todas necesitan tu aprobación",
    },
  },
  waitlistMode: {
    sequential: "Uno por uno, en orden",
    broadcast: "A todos a la vez",
  },
  waitlistModeAyuda: {
    sequential: "Le avisamos a un cliente a la vez y esperamos su respuesta.",
    broadcast:
      "Le avisamos a todas las personas en espera y gana quien confirme primero.",
  },
  /** WP-23: `businesses.waitlist_hold_minutes` (5–240). Cuánto esperamos la
   * respuesta de un cliente (modo "uno por uno") antes de ofrecer la hora
   * al siguiente. */
  waitlistHoldMinutesLabel: "Tiempo de espera antes de ofrecer al siguiente",
  waitlistHoldMinutesAyuda: "Entre 5 y 240 minutos.",
  slugAviso:
    'Si cambias tu link, el anterior deja de funcionar. Los WhatsApp ya enviados con el botón "Reservar de nuevo" van a apuntar al link viejo.',
  guardarCambios: "Guardar cambios",
  /** Estado del botón `guardarCambios` mientras se guarda. */
  guardando: "Guardando…",
  cambiosGuardados: "Cambios guardados",
  cambiosSinGuardar: "Tienes cambios sin guardar",
  seguirEditando: "Seguir editando",
  /** Opción destructiva del diálogo de `cambiosSinGuardar` (GUIA §5: nunca
   * "Cancelar" para la opción de quedarse; acá es al revés, "seguir
   * editando" es la segura y esta es la que descarta). */
  salirSinGuardar: "Salir sin guardar",
  conflictoEdicion:
    "Alguien más cambió esto. Recarga para ver la última versión.",
  cuenta: {
    sesionComo: (p: { email: string }): string =>
      `Sesión iniciada como ${p.email}`,
  },
  /** Sección "Privacidad y datos" (WP-26 paso 7, F12): exportar el negocio
   * (JSON) y eliminar la cuenta con 30 días de arrepentimiento (ver
   * `src/server/privacy/business.ts` — `requestBusinessDeletion`/
   * `cancelBusinessDeletion`/`purgeBusiness`, "Ägarens svar" 2026-09-30). */
  privacidad: {
    exportarTitulo: "Exportar los datos de tu negocio",
    exportarAyuda:
      "Descarga un archivo con la información de tu negocio, tus clientes y tus reservas.",
    exportarCta: "Exportar datos",
    eliminarTitulo: "Eliminar tu cuenta",
    eliminarAyuda:
      "Te recomendamos exportar tus datos antes de eliminar tu cuenta.",
    eliminarCta: "Eliminar cuenta",
    eliminarDialogTitulo: "¿Eliminar tu cuenta?",
    /** `n` (no `dias`): mismo nombre genérico que el resto de `es-CL.ts`
     * para un conteo (`MUESTRA_GENERICA_V2` en `es-CL.v2.test.ts`). */
    eliminarDialogCuerpo: (p: { n: number }): string =>
      `Tu página de reservas se desactiva de inmediato. Tienes ${p.n} días para arrepentirte; después, eliminamos todo de forma definitiva.`,
    eliminarConfirmarSi: "Sí, eliminar cuenta",
    eliminarConfirmarNo: "No, mantener cuenta",
    /** Franja visible mientras `deletion_requested_at` esté seteado (planea
     * eliminarse, dentro del plazo). */
    solicitadaAviso: (p: { fecha: string }): string =>
      `Tu cuenta se eliminará el ${p.fecha}.`,
    solicitadaCtaDeshacer: "Deshacer",
    solicitadaDeshecha: "Eliminación cancelada.",
    error: "No pudimos completar la acción. Inténtalo de nuevo.",
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// clientes: Clientes (F9) — lista, ficha, notas y consentimientos
// ---------------------------------------------------------------------------

export const clientes = {
  /** Rubro de `/app/clientes` (WP-24), mismo patrón que `inicio.titulo`/
   * `hoy.titulo`: encabezado visible de la pantalla completa. */
  titulo: "Clientes",
  /** WP-31 (F14): botón en el encabezado de `/app/clientes` hacia el
   * historial de campañas (`/app/clientes/utskick`, ver `campanas`). Solo
   * para quien puede enviarlas (dueño o `can_manage_all_bookings`). */
  ctaCampanas: "Campañas",
  lista: {
    buscarPlaceholder: "Buscar por nombre o celular",
    columnaUltimaVisita: "Última visita",
    columnaVisitas: "Visitas",
    columnaInasistencias: "Inasistencias",
    /** Encabezado del selector de orden (WP-24, plan §Clientes). */
    ordenarPor: "Ordenar por",
    ordenar: {
      ultimaVisita: "Última visita",
      masVisitas: "Más visitas",
      nombre: "Nombre",
    },
    /** Chips de filtro (WP-24): los umbrales exactos van en las claves
     * `*Ayuda` de abajo, no acá, para no tener el número escrito en dos
     * lugares si alguien solo traduce el chip. */
    filtros: {
      todos: "Todos",
      habituales: "Habituales",
      inactivos: "Inactivos",
      conInasistencias: "Con inasistencias",
      /** WP-54: clientes con `is_member` (ver `estados.socio`). */
      socios: "Socios",
    },
    /** Texto de apoyo (bajo el chip o en su `aria-label`) con el criterio
     * exacto de cada filtro (plan de WP-24: "stamkunder ≥ 3 besök",
     * "inaktiva > 90 dagar"). */
    filtroHabitualesAyuda: "3 o más visitas",
    filtroInactivosAyuda: "Sin venir hace más de 90 días",
    vacio: "Todavía no tienes clientes.",
    sinResultados: (p: { busqueda: string }): string =>
      `No encontramos clientes para "${p.busqueda}".`,
    /** Distinto de `sinResultados` (búsqueda sin coincidencias): acá la
     * lista está vacía porque el filtro elegido no tiene a nadie, no porque
     * se haya buscado algo. */
    sinResultadosFiltro: "No tienes clientes que cumplan este filtro.",
  },
  ficha: {
    clienteDesde: (p: { fecha: string }): string => `Cliente desde ${p.fecha}`,
    visitas: (p: { n: number }): string =>
      `${p.n} ${p.n === 1 ? "visita" : "visitas"}`,
    inasistencias: (p: { n: number }): string =>
      `${p.n} ${p.n === 1 ? "inasistencia" : "inasistencias"}`,
    /** Títulos de sección de la ficha (WP-24, plan §Clientes): contacto,
     * consentimientos y estadísticas. El contacto en sí (celular, correo)
     * reutiliza `editar.phoneLabel`/`editar.emailLabel`; los consentimientos
     * reutilizan `consentimientos.*` de más abajo. */
    contactoTitulo: "Contacto",
    consentimientosTitulo: "Consentimientos",
    estadisticasTitulo: "Estadísticas",
    /** Monto total pagado por el cliente (pagos `approved`, todo el
     * historial): el monto ya formateado lo entrega `src/lib/format/`, acá
     * solo vive la etiqueta de la tarjeta (mismo patrón que
     * `caja.resumen.cobrado`). */
    totalGastado: "Total gastado",
    promedioPorVisita: "Promedio por visita",
    historialTitulo: "Historial",
    /** Vacíos de cada lista de la ficha: distintos porque una es el
     * historial (reservas pasadas) y la otra son las próximas. */
    historialVacio: "Este cliente todavía no tiene reservas.",
    proximasTitulo: "Próximas reservas",
    proximasVacio: "No tiene próximas reservas.",
    /** Respuestas guardadas a las preguntas de reserva (`booking_questions`,
     * D-031) que este cliente ya contestó alguna vez. */
    respuestasTitulo: "Respuestas a las preguntas de reserva",
    respuestasVacio: "Este cliente no respondió ninguna pregunta.",
    ctaNuevaReserva: "Nueva reserva",
    ctaLlamar: "Llamar",
    ctaWhatsapp: "Escribir por WhatsApp",
    ctaEmail: "Enviar correo",
    ctaVerFicha: "Ver ficha",
    /** WP-31 (F14): botón "Enviar oferta" en la ficha del cliente — lleva a
     * `/app/clientes/utskick/nytt?kunder=<id>` con este cliente ya elegido.
     * Solo la ve quien puede gestionarla (`CustomerDetail.canManageMembership`,
     * misma condición "dueño o `can_manage_all_bookings`" que la membresía).
     * Deshabilitado (con `ofertaSinConsentimiento` al lado) si el cliente no
     * aceptó recibir ofertas (`consentMarketing.at`). */
    ctaEnviarOferta: "Enviar oferta",
    ofertaSinConsentimiento: "Este cliente no aceptó recibir ofertas.",
    /** WP-54: tarjeta "Socio" en la ficha del cliente (kryssrutan "Medlem"
     * del plan). Solo la ve quien puede gestionarla
     * (`CustomerDetail.canManageMembership`). */
    membresiaTitulo: "Socio",
    socioDesde: (p: { fecha: string }): string => `Socio desde ${p.fecha}`,
    socioAyuda:
      "Márcalo como socio para ofrecerle el beneficio que configuraste en Ajustes.",
    /** Botón "Avisar al cliente" (D-030, `enqueueMemberWelcome`): solo
     * aparece si el cliente es socio y tiene correo. */
    notificarCta: "Avisar al cliente",
    notificarEnviado: "Le avisamos por correo.",
    /** `queued: false` — `dedupe_key` ya tenía un envío para este
     * membresía (mismo `member_since`). */
    notificarYaEnviado: "Ya le avisamos de su beneficio de socio.",
    /** WP-55: diálogo "Enviar mensaje" (botón junto a `ctaWhatsapp`, que
     * abre este diálogo en vez de un enlace directo): `wa.me` del lado del
     * cliente (WhatsApp Cloud API todavía no existe, D-006/D-007 — TODO:
     * reemplazar por un envío real cuando exista esa integración). */
    mensaje: {
      titulo: "Enviar mensaje",
      paraLabel: "Para",
      textoLabel: "Mensaje",
      textoPlaceholder: "Escribe tu mensaje…",
      contador: (p: { n: number; max: number }): string => `${p.n}/${p.max}`,
      /** Solo CL: aclara que el envío sale del WhatsApp del propio negocio
       * (número compartido de la plataforma, D-007), no de la plataforma. */
      notaWhatsapp:
        "Se abrirá WhatsApp con el mensaje listo. Confírmalo ahí para enviarlo desde el WhatsApp de tu negocio.",
      /** GUIA §5: nunca "Cancelar" a secas. */
      ctaCancelar: "Volver",
      ctaEnviar: "Enviar",
    },
  },
  notas: {
    label: "Notas",
    /** Mismo texto que `agenda.manual.notasAyuda`: ver `NOTAS_AYUDA` junto
     * a `agenda` (revisión de seguridad, 2026-09-27: menciona el derecho
     * del cliente a pedir copia de sus datos). */
    ayuda: NOTAS_AYUDA,
    /** `customers.notes` tiene tope de 1000 caracteres (plan de WP-24). */
    errorLargo: "Las notas no pueden tener más de 1.000 caracteres.",
  },
  editar: {
    tituloNuevo: "Nuevo cliente",
    tituloEditar: "Editar cliente",
    nameLabel: "Nombre",
    phoneLabel: "Celular",
    emailLabel: "Correo (opcional)",
    ctaGuardar: "Guardar cliente",
  },
  errores: {
    /** Nunca dice si el número ya existe en OTRO negocio (tenant-isolation,
     * plan §5). */
    customer_phone_taken: "Ya tienes un cliente con ese celular.",
  },
  /** `consent_channel` (DB enum). */
  consentimientos: {
    canal: {
      web: "En tu página de reservas",
      whatsapp: "Por WhatsApp",
      manual: "Registrado por ti",
    },
    /** Mismas tres etiquetas que `canal`, pero en minúscula y sin verbo,
     * para usar dentro de una frase (`aceptoEl`) en vez de como línea
     * suelta. "WhatsApp" mantiene su mayúscula porque es un nombre propio. */
    canalEnFrase: {
      web: "en tu página de reservas",
      whatsapp: "por WhatsApp",
      manual: "registrado por ti",
    },
    /** Fila de consentimiento con fecha y canal (plan de WP-03b, paso 5).
     * `canal` ya viene de `canalEnFrase`. */
    aceptoEl: (p: { fecha: string; canal: string }): string =>
      `Aceptó el ${p.fecha} (${p.canal})`,
    sinRegistro: "Todavía no dio su consentimiento.",
    baja: "Respondió BAJA a las ofertas.",
  },
  /** Casilla de consentimiento cuando el dueño agenda a un cliente sin que
   * haya pasado por `/[slug]` (walk-in, teléfono; pregunta 10 del plan): nunca
   * está premarcada, y se guarda con `consent_channel = 'manual'`. Versión
   * propia porque es un texto distinto del de `reserva.consentimientos`.
   * Alcance deliberado (revisión de seguridad, 2026-09-27): el consentimiento
   * queda en pie para "esta hora y las próximas" (no hay que volver a
   * pedirlo cada vez que el dueño agende al mismo cliente por teléfono). */
  consentimientoManual: {
    version: "manual-2026-10-v1",
    texto:
      "El cliente aceptó recibir por WhatsApp la confirmación y los recordatorios de esta hora y las próximas.",
    /** Texto de apoyo para el dueño, al lado de la casilla: qué decirle al
     * cliente antes de marcarla. */
    ayuda: (p: { negocio: string }): string =>
      `Cuéntale que le llegarán mensajes de WhatsApp de ${p.negocio} y que puede pedir que no le escriban.`,
    marketingRechazado: "El cliente no quiere recibir ofertas.",
  },
  anonimizado: "Cliente anonimizado",
  /** Acciones de dataskydd (Ley 21.719) en el popover de una reserva
   * (WP-26 paso 7): exportar los datos del cliente o anonimizarlo. La
   * anonimización usa `ConfirmDialog` (`src/components/ui/confirm-dialog.tsx`,
   * D-033: irreversible, las reservas y los pagos se mantienen sin datos
   * personales). */
  privacidad: {
    ctaExportar: "Exportar datos",
    ctaAnonimizar: "Anonimizar cliente",
    /** Confirmación corta (WP-24) al terminar de descargar el export,
     * mismo patrón que `agenda.toast.*`. */
    exportadoOk: "Descargamos los datos del cliente.",
    confirmarTitulo: "¿Anonimizar este cliente?",
    confirmarCuerpo:
      "Se eliminan su nombre, celular, correo y notas. Sus reservas y pagos se mantienen, sin esos datos. No se puede deshacer.",
    confirmarSi: "Sí, anonimizar",
    confirmarNo: "No, mantener",
    error: "No pudimos completar la acción. Inténtalo de nuevo.",
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// campanas: /app/clientes/utskick (WP-31, F14) — envíos de ofertas a
// clientes ("campañas") y el recordatorio automático "Te echamos de menos"
// (configurado en `ajustes.winback`). `channel` reutiliza
// `public.message_channel` ('email'|'sms'): acá solo las etiquetas, la
// lógica (a quién le llega, el envío real) vive en
// `src/server/campaigns/send.ts`. Solo le llega a clientes con
// `consent_marketing_at` (hard rule 7 — nunca premarcada, nunca a quien no
// dio su consentimiento), de ahí `soloConsentimiento`/`sinConsentimiento`.
// ---------------------------------------------------------------------------

export const campanas = {
  /** Encabezado de `/app/clientes/utskick` (historial de campañas). */
  titulo: "Campañas",
  canal: {
    email: "Correo",
    sms: "SMS",
  },
  historial: {
    vacio: "Todavía no has enviado ninguna campaña.",
    columnaCanal: "Canal",
    columnaFecha: "Fecha",
    columnaDestinatarios: "Destinatarios",
    /** Reservas hechas con el link de la oferta (`campaign_recipients.redeemed_booking_id`). */
    columnaReservas: "Reservas con el link",
    ctaNueva: "Nuevo envío",
    /** Toast al volver desde `/app/clientes/utskick/nytt` con `?enviado=1`. */
    enviadoToast: "Enviamos tu campaña.",
  },
  nueva: {
    titulo: "Nuevo envío",
    volver: "Volver a Campañas",
    nombreLabel: "Nombre de la campaña",
    nombrePlaceholder: "Ej: Vuelve en septiembre",
    audienciaLabel: "¿A quién le llega?",
    /** Etiquetas de `CampaignAudience.kind` (`campaigns.audience->>'kind'`). */
    audiencia: {
      all: "Todos los que aceptaron ofertas",
      members: "Socios",
      regulars: "Habituales",
      inactive: "Inactivos hace",
      selected: "Clientes elegidos",
    },
    audienciaInactivosDiasLabel: "días",
    /** "3 clientes elegidos" — cuando la audiencia llega por `?kunder=` (la
     * ficha del cliente) en vez de elegirse acá. */
    audienciaSeleccionadosResumen: (p: { n: number }): string =>
      `${p.n} ${p.n === 1 ? "cliente elegido" : "clientes elegidos"}`,
    mensajeLabel: "Mensaje",
    mensajePlaceholder: "Escribe tu mensaje…",
    contador: (p: { n: number; max: number }): string => `${p.n}/${p.max}`,
    ofertaActivar: "Agregar un descuento",
    ofertaActivarAyuda:
      "Opcional: un porcentaje de descuento, con un texto corto y una fecha de vencimiento.",
    ofertaPctLabel: "Descuento (%)",
    ofertaPctAyuda: "Un número entre 1 % y 100 %.",
    ofertaTextoLabel: "Texto del descuento (opcional)",
    ofertaTextoPlaceholder: "Ej: 15 % de descuento en tu próxima hora",
    ofertaValidoHastaLabel: "Válido hasta",
    previsualizacion: {
      titulo: "Antes de enviar",
      cargando: "Calculando…",
      destinatarios: (p: { n: number }): string =>
        `${p.n} ${p.n === 1 ? "cliente va a recibir este mensaje" : "clientes van a recibir este mensaje"}`,
      sinConsentimiento: (p: { n: number }): string =>
        `${p.n} ${p.n === 1 ? "cliente no lo recibe" : "clientes no lo reciben"} porque no aceptó recibir ofertas.`,
      vacio: "Elige a quién le llega para ver cuántos clientes lo recibirán.",
    },
    ctaEnviar: "Enviar",
    enviando: "Enviando…",
    confirmarTitulo: "¿Enviar esta campaña?",
    confirmarCuerpo: (p: { n: number }): string =>
      `Le va a llegar a ${p.n} ${p.n === 1 ? "cliente" : "clientes"} que aceptaron recibir ofertas. No se puede deshacer.`,
    confirmarSi: "Sí, enviar",
    confirmarNo: "No, seguir editando",
    soloConsentimiento:
      "Solo les llega a los clientes que aceptaron recibir ofertas.",
    error: {
      forbidden: "No tienes permiso para enviar campañas.",
      invalid_input: "Revisa los datos del formulario.",
      no_recipients: "No hay clientes que reciban este envío.",
      rate_limited:
        "Enviaste muchas campañas. Espera un momento y prueba de nuevo.",
      unexpected: "No pudimos enviar la campaña. Inténtalo de nuevo.",
    },
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// caja: Caja (F10) — resumen de pagos, marcar como pagada, anular
// ---------------------------------------------------------------------------

/** `payment_method` sin `mercadopago` (D-022, pregunta 7 del plan): los
 * métodos que el dueño puede elegir al marcar un pago a mano. Mercado Pago
 * solo lo cobra el propio flujo automático de abono, nunca a mano. Es una
 * lista de códigos, no texto de producto, así que vive fuera de `caja`
 * (`Trad` no admite arrays); las etiquetas siguen en `caja.metodo`. */
export const CAJA_METODOS_MANUALES = [
  "cash",
  "card_terminal",
  "transfer",
] as const;

export const caja = {
  /** Pestañas de `/app/caja` (WP-24): la caja del período elegido y los
   * informes con series más largas (§Caja e informes del plan). */
  tabs: {
    caja: "Caja",
    informes: "Informes",
  },
  /** SegmentedControl ≤ 7 caracteres (§5 del plan). `rango` agrega el
   * cuarto período de WP-24 (intervalo con fecha a elección, además de
   * hoy/semana/mes). */
  periodos: {
    hoy: "Hoy",
    semana: "Semana",
    mes: "Mes",
    rango: "Rango",
  },
  /** Mismo patrón que `agenda.semana` para la semana. */
  periodo: (p: { desde: string; hasta: string }): string =>
    `Del ${p.desde} al ${p.hasta}`,
  /** Selector de fechas cuando `periodos.rango` está activo (WP-24). */
  rangoPersonalizado: {
    desdeLabel: "Desde",
    hastaLabel: "Hasta",
    ctaAplicar: "Aplicar",
    error: "La fecha de inicio debe ser antes que la fecha de término.",
  },
  resumen: {
    cobrado: "Cobrado",
    porCobrar: "Por cobrar",
    abonosMercadopago: "Abonos por Mercado Pago",
    reservasCount: (p: { n: number }): string =>
      `${p.n} ${p.n === 1 ? "reserva" : "reservas"}`,
    /** WP-24: nuevos indicadores de la caja, mismo patrón que
     * `reservasCount` (un conteo flexionado). */
    inasistenciasCount: (p: { n: number }): string =>
      `${p.n} ${p.n === 1 ? "inasistencia" : "inasistencias"}`,
    ticketPromedio: "Ticket promedio",
    /** Explica qué cuenta como "cobrado" (F10: "las sumas cuadran con las
     * reservas"): pagos `approved` con `paid_at` dentro del período en
     * America/Santiago, menos los `refunded`. */
    explicacion:
      "Suma los pagos aprobados dentro del período (hora de Santiago), menos los devueltos.",
  },
  /** Títulos de las tres distribuciones de la caja (WP-24, plan §Caja):
   * por método de pago, por profesional y por servicio. Las etiquetas de
   * cada método siguen viviendo en `metodo`. */
  distribucion: {
    porMetodo: "Por método de pago",
    porProfesional: "Por profesional",
    porServicio: "Por servicio",
  },
  /** Lista de reservas terminadas y todavía sin pago (WP-24: "att ta betalt
   * för"). */
  porCobrarLista: {
    titulo: "Reservas por cobrar",
    vacio: "No tienes reservas terminadas sin cobrar.",
  },
  /** Lista de pagos registrados el día de hoy (WP-24). */
  pagosDeHoy: {
    titulo: "Pagos de hoy",
    vacio: "Todavía no registras pagos hoy.",
  },
  /** `payment_method` (DB enum): las etiquetas, para mostrar cómo quedó
   * pagada una reserva (incluida una ya pagada por Mercado Pago). El
   * selector de "Marcar como pagada" solo debe ofrecer
   * `CAJA_METODOS_MANUALES` (sin `mercadopago`, D-022). `swish`, `stripe`
   * y `gift_card` siguen en el enum de la base de datos (D-062); nunca se
   * ofrecen, pero la etiqueta existe porque el tipo cubre todo el enum. */
  metodo: {
    cash: "Efectivo",
    card_terminal: "Débito o crédito",
    transfer: "Transferencia",
    mercadopago: "Mercado Pago",
    swish: "Swish",
    stripe: "Online (tarjeta)",
    gift_card: "Tarjeta de regalo",
  },
  /** `payment_kind` (DB enum). */
  tipo: {
    deposit: "Abono",
    balance: "Saldo",
    full: "Pago completo",
  },
  /** `payment_status` (DB enum). */
  estado: {
    pending: "Pendiente",
    approved: "Aprobado",
    rejected: "Rechazado",
    refunded: "Devuelto",
  },
  marcarPagada: {
    titulo: "Marcar como pagada",
    /** WP-24 calcula `total` (ya con el descuento y el abono restados) y,
     * si quiere mostrar el detalle, arma `desglose` como un texto propio
     * ("precio $18.000 − descuento $0 − abono $6.000"): acá solo se decide
     * si va entre paréntesis o no. */
    aPagar: (p: { total: string; desglose?: string }): string =>
      p.desglose ? `${p.total} (${p.desglose})` : p.total,
    metodoLabel: "Método de pago",
    /** Monto editable, prellenado con `aPagar` (plan de WP-24). */
    montoLabel: "Monto",
    /** La propina es opcional y no entra a las sumas de la caja (plan de
     * WP-24: "ingår inte"). */
    propinaLabel: "Propina (opcional)",
    propinaAyuda: "La propina no se incluye en las sumas de la caja.",
    cta: "Marcar como pagada",
    confirmacion: (p: { metodo: string }): string => `Pagada con ${p.metodo}.`,
  },
  /** GUIA §5: nunca "Cancelar pago", el botón destructivo dice "Anular
   * pago" y el diálogo usa "Volver", nunca "Cancelar". No hay borrado
   * (RLS de `payments`), solo anulación. */
  anular: {
    cta: "Anular pago",
    tituloConfirmacion: "¿Anular este pago?",
    cuerpoConfirmacion: "Esto no se puede deshacer.",
  },
  soloLecturaMercadopago: "Pagado por Mercado Pago, no se puede editar acá.",
  errores: {
    already_paid:
      "Esta reserva ya se marcó como pagada. Recarga para ver el estado.",
    /** WP-24: la reserva se canceló entre que se abrió el popover y se
     * intentó cobrar. */
    booking_cancelled: "Esta reserva está cancelada, no se puede cobrar.",
    /** Monto inválido en "Marcar como pagada" (0, negativo o con
     * decimales: pengar = heltal CLP, regla dura 5). */
    invalid_amount: "Ese monto no es válido.",
    /** "Ångra betalning inom samma dag" del plan de WP-24: anular un pago
     * solo funciona el mismo día en que se registró. */
    same_day_required: "Solo puedes anular un pago del mismo día.",
  },
  vacioPeriodo: "No hay pagos en este período.",
  vacioDia: "No tienes reservas este día.",
  /** Pestaña "Informes" (WP-24, plan §Caja e informes): cuatro gráficos
   * simples con tokens, sin dependencia nueva. */
  informes: {
    ingresosPorSemana: {
      titulo: "Ingresos por semana",
      subtitulo: "Últimas 12 semanas",
    },
    ocupacionPorProfesional: {
      titulo: "Ocupación por profesional",
    },
    nuevosVsRecurrentes: {
      titulo: "Clientes nuevos y recurrentes",
      nuevos: "Nuevos",
      recurrentes: "Recurrentes",
    },
    tendenciaInasistencias: {
      titulo: "Tendencia de inasistencias",
    },
    /** Un solo vacío para los cuatro gráficos: todos dependen de la misma
     * falta de historial (negocio recién creado). */
    vacio: "Todavía no hay suficientes datos para mostrar esta estadística.",
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// abono: pago adelantado por Mercado Pago (F11) — Ajustes, servicio, Reserva,
// retorno de Mercado Pago, r/[token] y la vista del dueño
// ---------------------------------------------------------------------------

export const abono = {
  ajustes: {
    /** Encabezado dentro de la sección "Mercado Pago" de Ajustes
     * (`ajustes.secciones.mercadopago` es la pestaña/título de la sección
     * completa; esto es el título de este bloque en particular). */
    titulo: "Cobro de abonos",
    /** D-008: el abono nunca pasa por la plataforma. */
    explicacion:
      "El abono llega directo a tu cuenta de Mercado Pago. Nunca pasa por nosotros.",
    ctaConectar: "Conectar Mercado Pago",
    conectadaComo: (p: { cuenta: string }): string =>
      `Conectada como ${p.cuenta}`,
    ctaDesconectar: "Desconectar",
    confirmarDesconectar:
      "Los servicios con abono dejarán de pedirlo hasta que vuelvas a conectar.",
    errores: {
      oauth_cancelled: "Cancelaste la conexión con Mercado Pago.",
      oauth_denied: "Mercado Pago rechazó la conexión. Intenta de nuevo.",
      token_expired: "Tu conexión con Mercado Pago venció. Vuelve a conectar.",
      mp_unavailable: "Mercado Pago no está respondiendo. Intenta más tarde.",
    },
  },
  /** `deposit_kind` (DB enum) y campos del formulario de servicio. */
  servicio: {
    depositKindLabel: "Abono",
    depositKind: {
      none: "Sin abono",
      fixed: "Monto fijo",
      percent: "Porcentaje del precio",
    },
    depositValueLabel: "Monto del abono",
    /** Etiqueta propia para `deposit_kind = 'percent'` (revisión de
     * seguridad, 2026-09-27): ese campo pide un porcentaje, no un monto en
     * pesos, así que no puede compartir la etiqueta con `fixed`. */
    depositValuePercentLabel: "Porcentaje del abono",
    /** WP-25 calcula el monto (redondeo `percentOfClp`, ver IDEAS). */
    vistaPrevia: (p: { monto: string }): string =>
      `El cliente paga ${p.monto} para reservar.`,
    errores: {
      porcentajeFueraDeRango: "El porcentaje debe ser entre 1 y 100.",
      montoMayorAlPrecio:
        "El abono no puede ser mayor que el precio del servicio.",
      mp_not_connected: "Conecta Mercado Pago para pedir abono.",
    },
  },
  reserva: {
    requiereAbono: (p: { monto: string }): string =>
      `Requiere abono de ${p.monto}`,
    explicacion: (p: { monto: string; saldo: string }): string =>
      `Paga ${p.monto} ahora con Mercado Pago. El resto (${p.saldo}) lo pagas en el local.`,
    /** D-022 (regla del abono, antes D-019 en el plan): el abono se
     * descuenta del precio; si el cliente cancela dentro del plazo, EL
     * NEGOCIO lo devuelve; si cancela fuera de plazo o no viene, el negocio
     * se lo queda. La plataforma nunca toca ni promete devolver el abono
     * (D-008, D-022): nunca dice "te devolvemos", siempre "{negocio} te
     * devuelve". Mismo límite ("hasta … antes") que
     * `antesDeConfirmar.politicaCancelacion`. Este texto entra en el hash de
     * `consentimientos.version` (paso 7 del plan, pregunta 4 aprobada). */
    condiciones: (p: { negocio: string; horas: number }): string =>
      `Si cancelas hasta ${p.horas} h antes, ${p.negocio} te devuelve el abono. Si cancelas después o no vienes, ${p.negocio} se queda con el abono. Si cambias la hora, el abono se mantiene. Si ${p.negocio} cancela, te devuelve el abono.`,
    ctaPagar: "Pagar abono",
    redirigiendo: "Te llevamos a Mercado Pago…",
    tiempoParaPagar: (p: { minutos: number }): string =>
      `Tienes ${p.minutos} min para pagar. Después liberamos la hora.`,
    retorno: {
      aprobado: "Abono pagado, tu hora quedó confirmada.",
      pendiente: "Estamos confirmando tu pago…",
      rechazado: "El pago no se completó. Puedes intentar de nuevo.",
      expirado: "Se acabó el tiempo y la hora quedó libre.",
    },
    /** El pago llegó aprobado después de que la hora ya se liberó (webhook
     * tardío): devolución manual en v1 (D-022, automática queda en IDEAS).
     * Quien devuelve es siempre el negocio, nunca la plataforma (D-008). */
    pagoTardio: (p: { negocio: string; telefonoNegocio: string }): string =>
      `${p.negocio} recibió tu pago, pero la hora ya se había liberado. ${p.negocio} te devolverá el abono. Escribe al ${p.telefonoNegocio} para coordinarlo.`,
  },
  gestion: {
    abonoPagado: (p: { monto: string }): string => `Abono pagado: ${p.monto}`,
    /** Confirmación de cancelación desde `r/[token]` cuando la reserva
     * tiene abono: qué pasa con la plata según el plazo (D-022). Quien
     * devuelve es siempre el negocio, nunca la plataforma (D-008). */
    cancelarConAbonoDentroPlazo: (p: {
      monto: string;
      negocio: string;
    }): string => `${p.negocio} te devolverá ${p.monto}.`,
    /** Misma regla fuera de plazo. También es la línea que acompaña a
     * `gestion.fueraDePlazo` cuando la reserva tenía abono, para dejar
     * claro que tampoco se devuelve por ese camino. */
    cancelarConAbonoFueraPlazo: (p: { monto: string }): string =>
      `El abono de ${p.monto} no se devuelve.`,
  },
  /** Vista del dueño (Caja y Agenda): `estados.pendientePago` cubre el chip
   * de la reserva sin pagar; esto es la devolución pendiente. */
  dueno: {
    abonoPorDevolver: "Abono por devolver",
    devolverEnMercadopago: "Devuélvelo desde tu cuenta de Mercado Pago.",
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// perfil: WP-41 — el perfil público del negocio (`/[slug]`, secciones nuevas
// sobre el catálogo de WP-40) y Ajustes → "Perfil" (portada, logo, galería,
// sobre nosotros, Instagram). Se agrega al final del archivo (mismo criterio
// que las áreas de WP-03b/WP-40, ver `docs/content/README.md`): evita
// conflictos con otros paquetes que también tocan `es-CL.ts`.
//
// Referencia de diseño: `.visual-diff/ref/ProfilDesktop.dc.html` y
// `ProfilMobil.dc.html` (boceto en sueco, no `docs/design/reference/`: mismo
// caso que WP-40/`formulario`, no hay paridad palabra a palabra que
// revisar, solo tono y marca).
//
// Estados vacíos (plan de WP-41, "Contenido"): si el negocio no tiene
// galería o no escribió "Sobre nosotros", esa sección completa se oculta —
// no hace falta ningún texto de reemplazo, por eso no hay claves `vacio`
// acá para esos dos casos. La página sin servicios sigue usando
// `reserva.vacios.sinServicios`; el negocio congelado o inexistente sigue
// usando `reserva.vacios.negocioNoDisponible`/`paginaNoExiste` (mismo
// texto, no se duplica acá).
// ---------------------------------------------------------------------------

export const perfil = {
  /** `/[slug]`: encabezado, secciones y acciones de la página pública. */
  publico: {
    /** Los dos chips del encabezado (diseño: "Öppet nu · till 19:00" /
     * "Nästa lediga tid: idag 15:30"). `hasta`, `dia`, `hora` y `cuando` ya
     * vienen formateados (WP-04/motor de disponibilidad): acá solo se arma
     * la frase alrededor. */
    chips: {
      abiertoAhora: (p: { hasta: string }): string =>
        `Abierto ahora · hasta ${p.hasta}`,
      cerrado: "Cerrado",
      /** Chip de cerrado con la próxima apertura, cuando se conoce (p. ej.
       * "Abre lun a las 10:00"). Si no se conoce, se usa `cerrado` a
       * secas. */
      abreA: (p: { dia: string; hora: string }): string =>
        `Abre ${p.dia} a las ${p.hora}`,
      proximaHora: (p: { cuando: string }): string =>
        `Próxima hora: ${p.cuando}`,
    },
    /** Títulos de sección (`<h2>` en el diseño). `comoLlegar` reutiliza el
     * mismo texto que `email.comun.comoLlegar` (GUIA §2: mismo vocabulario
     * para el mismo concepto). */
    secciones: {
      reservarHora: "Reservar hora",
      /** Mismo texto que `onboarding.pasos.equipo`/`ajustes.secciones.equipo`
       * ("Equipo"), no "Profesionales": GUIA §2, mismo vocabulario que el
       * resto de la app para el mismo concepto. */
      profesionales: onboarding.pasos.equipo,
      sobreNosotros: "Sobre nosotros",
      horario: "Horario",
      comoLlegar: email.comun.comoLlegar,
      contacto: "Contacto",
    },
    /** WP-81 (D-066): tarjeta "Cómo llegar" con mapa (imagen fija de
     * OpenStreetMap) y botones para abrir la ruta en Google Maps o Apple
     * Maps. */
    indicaciones: "Ver ruta",
    appleMaps: "Apple Maps",
    mapaTitulo: (p: { direccion: string }): string =>
      `Mapa: ${p.direccion}. Abrir la ruta`,
    /** Sin el símbolo © (cuenta como emoji para `REGLAS_DE_TONO.emoji`). */
    mapaAtribucion: "Mapa de OpenStreetMap",
    /** Pestañas de la versión mobile (`role="tablist"` bajo la portada). */
    tabs: {
      servicios: "Servicios",
      equipo: onboarding.pasos.equipo,
      nosotros: "Nosotros",
      info: "Info",
    },
    /** Botón de cada fila de servicio: mismo texto que
     * `reserva.bookingBar.ctaReservar`, reutilizado para que nunca se
     * desalineen. */
    reservar: CTA_RESERVAR,
    /** WP-72: botón dentro del servicio desplegado ("Välj tid" en el diseño). */
    elegirHora: "Elegir hora",
    /** WP-72: nombre accesible del grupo de iniciales de quién hace el servicio. */
    haceElServicio: (p: { nombre: string }): string => `Lo hace: ${p.nombre}`,
    /** Botón fijo del "booking bar" mobile ("Boka nu" en el diseño). */
    reservarAhora: "Reservar ahora",
    /** "60 min · Tvätt, klippning och föning" en el diseño: `duracion` ya
     * viene formateada (`formatDuration`, WP-04). Si el servicio no tiene
     * descripción, se muestra solo la duración (regla dura 6: el
     * componente no arma esta frase por su cuenta). */
    servicioDetalle: (p: { duracion: string; descripcion?: string }): string =>
      p.descripcion ? `${p.duracion} · ${p.descripcion}` : p.duracion,
    /** WP-81 (D-066): segunda línea de la barra fija mobile. `barraServicio`
     * es la frase completa (lector de pantalla/`title`); en pantalla el
     * nombre va en su propio elemento `truncate` y `barraServicioResto` al
     * lado, para que la elipsis corte solo el nombre, nunca el precio. */
    barraServicio: (p: {
      nombre: string;
      duracion: string;
      precio: string;
    }): string => `${p.nombre} · ${p.duracion} · ${p.precio}`,
    barraServicioResto: (p: { duracion: string; precio: string }): string =>
      `· ${p.duracion} · ${p.precio}`,
    /** Título de la tarjeta oscura del panel lateral/aside ("Snabbast in"
     * en el diseño). */
    masRapido: "Más rápido",
    /** "Idag · Klippning dam" bajo los horarios de esa misma tarjeta. Los
     * botones de hora de adentro reutilizan `reserva.horaAria` (mismo
     * botón, mismo aria-label que en el paso 3 de Reserva). */
    masRapidoDetalle: (p: { dia: string; servicio: string }): string =>
      `${p.dia} · ${p.servicio}`,
    /** Mosaico "+ 8 bilder" de la galería: cuántas fotos hay además de las
     * que ya se ven en la grilla. */
    /** WP-81 (D-066): galería arriba en la página del negocio y vista a
     * pantalla completa con todas las fotos. */
    galeria: {
      mas: "Ver más fotos",
      abrir: (p: { negocio: string; n: number }): string =>
        `Ver ${p.n === 1 ? "la foto" : `las ${p.n} fotos`} de ${p.negocio}`,
      titulo: (p: { negocio: string }): string => `Fotos de ${p.negocio}`,
      cantidad: (p: { n: number }): string =>
        `${p.n} ${p.n === 1 ? "foto" : "fotos"}`,
      foto: (p: { negocio: string; n: number }): string =>
        `${p.negocio}, foto ${p.n}`,
      cerrar: "Cerrar",
    },
    /** aria-label del link a Instagram de la tarjeta de contacto. */
    instagramAria: (p: { negocio: string }): string =>
      `Instagram de ${p.negocio}`,
  },
  /** Ajustes → "Perfil": portada, logo, galería, sobre nosotros e
   * Instagram (`ajustes.secciones` todavía no tiene una fila para esta
   * pantalla nueva; quien construya la navegación la agrega con este mismo
   * título). */
  ajustes: {
    titulo: "Perfil",
    ayuda: "Así te ven tus clientes en tu página de reservas.",
    campos: {
      sobreNosotrosLabel: "Sobre nosotros",
      sobreNosotrosPlaceholder:
        "Cuéntales a tus clientes quiénes son, en qué son buenos y qué pueden esperar.",
      sobreNosotrosAyuda: "Se muestra en tu página de reservas.",
      instagramLabel: "Instagram",
      instagramPlaceholder: "@tunegocio",
      instagramAyuda: "Solo tu usuario, sin el link completo.",
      portadaLabel: "Imagen de portada",
      portadaAyuda: "Se ve en la parte de arriba de tu página de reservas.",
      logoLabel: "Logo",
      logoAyuda: "Si no subes uno, mostramos las iniciales de tu negocio.",
      galeriaLabel: "Galería",
      galeriaAyuda: "Hasta 12 fotos de tu local o tu trabajo.",
    },
    botones: {
      subir: "Subir imagen",
      cambiar: "Cambiar",
      eliminar: "Eliminar",
      moverArriba: "Mover arriba",
      moverAbajo: "Mover abajo",
    },
    errores: {
      tipoInvalido: "Ese archivo no es una imagen. Usa JPG, PNG o WEBP.",
      demasiadoGrande: "La imagen pesa más de 2 MB. Usa una más liviana.",
      maxImagenes:
        "Ya tienes 12 fotos en tu galería. Elimina una para agregar otra.",
      subidaFallida: "No pudimos subir la imagen. Intenta de nuevo.",
    },
    toast: {
      imagenSubida: "Imagen agregada.",
      imagenEliminada: "Imagen eliminada.",
      /** Mismo texto que `ajustes.cambiosGuardados` (una sola definición). */
      cambiosGuardados: ajustes.cambiosGuardados,
    },
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// solicitudes: WP-45 (D-033) — campana de notificaciones, diálogo de
// rechazo y mensajes compartidos entre la campana, Inicio y el popover de
// la Agenda para las reservas `requested`. El título de la lista de Inicio
// vive en `inicio.solicitudes.titulo` (mismo texto): acá se reusa esa
// misma clave para la campana en vez de escribirlo dos veces (GUIA §2,
// mismo vocabulario para el mismo concepto).
// ---------------------------------------------------------------------------

export const solicitudes = {
  campana: {
    titulo: inicio.solicitudes.titulo,
    /** Estado vacío de la campana (distinto de la lista de Inicio, que se
     * oculta directamente cuando no hay solicitudes). */
    vacio: "No tienes solicitudes pendientes.",
  },
  /** Fila de una solicitud, reutilizada en la campana y en la lista de
   * Inicio: "{cliente} · {servicio} · {fecha}, {hora}". */
  fila: (p: {
    cliente: string;
    servicio: string;
    fecha: string;
    hora: string;
  }): string => `${p.cliente} · ${p.servicio} · ${p.fecha}, ${p.hora}`,
  /** WP-56: etiqueta de una fila `kind: "cancel"` (el cliente pidió
   * cancelar), para distinguirla de una solicitud de reserva nueva en la
   * misma lista/campana. */
  etiquetaCancelacion: "Quiere cancelar",
  /** Botones de Confirmar/Rechazar: mismo texto en la campana, en Inicio y
   * en el popover de la Agenda. WP-56: `aprobarCancelacion` es el equivalente
   * de "Confirmar" para una fila `kind: "cancel"` — "Rechazar" sirve para
   * las dos (nekar una reserva nueva o nekar la cancelación, nunca
   * "Cancelar", GUIA §5). */
  acciones: {
    confirmar: "Confirmar",
    rechazar: "Rechazar",
    aprobarCancelacion: "Aprobar cancelación",
  },
  /** "Rechazar" nunca usa la palabra "Cancelar" (GUIA §5): es una acción
   * distinta de cancelar una reserva ya confirmada. `motivoLabel` es
   * opcional a propósito (plan de WP-45, paso 4): el negocio no está
   * obligado a explicar por qué rechaza. */
  rechazarDialog: {
    titulo: "¿Rechazar esta solicitud?",
    cuerpo: "Le avisaremos al cliente y podrá reservar otra hora.",
    motivoLabel: "Motivo (opcional)",
    motivoPlaceholder: "Por ejemplo: no tenemos hora ese día.",
    ctaSi: "Sí, rechazar",
    ctaNo: "No, mantener",
  },
  /** WP-56: nekar la cancelación — la reserva sigue confirmada, sin motivo
   * (no hay campo `reason` en `declineCancelRequest`). */
  rechazarCancelacionDialog: {
    titulo: "¿Rechazar esta cancelación?",
    cuerpo: "La reserva sigue confirmada y le avisaremos al cliente.",
    ctaSi: "Sí, rechazar",
    ctaNo: "No, mantener",
  },
  /** Feedback después de confirmar/rechazar, desde cualquiera de los tres
   * lugares (campana, Inicio, popover de la Agenda). */
  toast: {
    confirmada: "Solicitud confirmada.",
    rechazada: "Solicitud rechazada.",
    cancelacionAprobada: "Cancelación aprobada.",
    cancelacionRechazada: "No se aprobó la cancelación.",
  },
  /** WP-56: /app/solicitudes/[id] — se abre desde el sms/correo al negocio. */
  detalle: {
    tituloSolicitud: "Solicitud de reserva",
    tituloCancelacion: "Solicitud de cancelación",
    campos: {
      cliente: "Cliente",
      servicio: "Servicio",
      profesional: "Profesional",
      hora: "Hora",
    },
    /** La solicitud ya no existe, o la respondió otra persona, o el id no
     * es válido. */
    noEncontrada: "Esta solicitud ya no está disponible.",
    /** Alguien más ya la confirmó/rechazó/respondió antes de que entraras
     * (otra pestaña, otro miembro del equipo). */
    yaRespondida: "Esta solicitud ya fue respondida.",
    verAgenda: "Ver en la agenda",
    resultado: {
      confirmada: "Confirmaste la solicitud.",
      rechazada: "Rechazaste la solicitud.",
      cancelacionAprobada: "Aprobaste la cancelación. La hora quedó libre.",
      cancelacionRechazada:
        "Rechazaste la cancelación. La reserva sigue confirmada.",
    },
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// equipo: WP-46 (D-034) — Ajustes → Equipo. Cuentas de personal, separadas
// de las fichas de `profesionales` (una ficha puede no tener cuenta nunca, y
// una cuenta siempre está ligada a una ficha). Solo el dueño ve esta
// pantalla y puede invitar o cambiar permisos (FRÅGA 2 del plan: "no,
// bara ägaren").
//
// Las siete claves de `permisos` son el nombre de la columna de
// `memberships` sin el prefijo `can_` (`can_manage_own_bookings` →
// `manage_own_bookings`), mismo criterio que `errores.reserva`/
// `errores.agenda` con los códigos de `BookingError` (GUIA §8): así
// `satisfies Record<Bandera, {...}>` funciona del lado de quien defina el
// tipo de las siete banderas (db-engineer, `src/server/db/permissions.ts`)
// sin tener que traducir nombres.
// ---------------------------------------------------------------------------

export const equipo = {
  miPerfil: "Mi perfil",
  ctaInvitar: "Invitar a la cuenta",
  /** UX-granskning (sección "Inställningar"): menú "…" de cada fila en la pestaña Equipo. */
  ctaPermisos: "Permisos",
  /** Chip de estado junto a cada fila (fila única por persona, reemplaza las antiguas
   * secciones separadas "Invitaciones pendientes"/"Miembros"). Solo cuentas `role: 'staff'`
   * — `loadTeamData` no incluye la propia membresía del dueño (siempre `role: 'owner'`). */
  estadoCuenta: {
    ninguna: "Sin cuenta",
    invitada: "Invitado",
    activa: "Cuenta · Personal",
  },
  invitarDialog: {
    titulo: "Invitar a la cuenta",
    emailLabel: "Correo",
    emailPlaceholder: "nombre@ejemplo.cl",
    profesionalLabel: "Profesional",
    profesionalAyuda: "La cuenta queda ligada a este profesional de tu equipo.",
    permisosTitulo: "Qué puede hacer",
    ctaEnviar: "Enviar invitación",
    errores: {
      emailInvalido: "Revisa el correo.",
      profesionalRequerido: "Elige a qué profesional se liga esta cuenta.",
      /** Índice único parcial `(business_id, staff_id)` (plan, paso 1): una
       * ficha de personal solo puede tener una cuenta. */
      profesionalYaTieneCuenta:
        "Este profesional ya tiene una cuenta. Solo puede tener una.",
      emailYaEsMiembro: "Ese correo ya tiene acceso a esta cuenta.",
      /** "Ägarens svar" 1: una cuenta por negocio en v1. */
      emailOtroNegocio:
        "Ese correo ya pertenece a otro negocio. Por ahora no puede tener dos.",
    },
  },
  /** Nombre corto y ayuda de cada una de las siete banderas, en el mismo
   * orden que el paso 1 del plan. */
  permisos: {
    manage_own_bookings: {
      nombre: "Sus propias reservas",
      ayuda:
        "Puede crear, mover y marcar Llegó o No vino solo en las reservas que le corresponden a él o ella.",
    },
    manage_all_bookings: {
      nombre: "Todas las reservas",
      ayuda:
        "Puede crear, mover y marcar Llegó o No vino en las reservas de cualquier profesional.",
    },
    cancel_bookings: {
      nombre: "Cancelar o rechazar reservas",
      ayuda:
        "Puede cancelar una reserva confirmada o rechazar una solicitud pendiente.",
    },
    edit_catalog: {
      nombre: "Servicios y precios",
      ayuda: "Puede crear y editar servicios, precios y categorías.",
    },
    manage_team: {
      nombre: "Personal y horarios",
      ayuda:
        "Puede agregar profesionales y cambiar sus horarios. No incluye invitar cuentas ni cambiar permisos: eso lo hace solo el dueño.",
    },
    view_reports: {
      nombre: "Estadísticas y caja",
      ayuda:
        "Puede ver los ingresos, las estadísticas del negocio y el historial de caja.",
    },
    edit_settings: {
      nombre: "Ajustes y perfil",
      ayuda:
        "Puede cambiar el horario de atención, las reglas de reserva y el perfil del negocio.",
    },
  },
  invitaciones: {
    titulo: "Invitaciones pendientes",
    enviada: (p: { fecha: string }): string => `Enviada el ${p.fecha}`,
    ctaReenviar: "Reenviar",
    ctaRevocar: "Revocar",
    confirmarRevocar: {
      titulo: "¿Revocar esta invitación?",
      cuerpo: "La persona ya no podrá aceptarla.",
      ctaSi: "Sí, revocar",
      ctaNo: "No, mantener",
    },
    toast: {
      reenviada: "Invitación reenviada.",
      revocada: "Invitación revocada.",
    },
  },
  miembros: {
    titulo: "Miembros",
    rol: {
      owner: "Dueño",
      staff: "Personal",
    },
    ctaEditarPermisos: "Editar permisos",
    ctaQuitarAcceso: "Quitar acceso",
    confirmarQuitar: {
      titulo: "¿Quitar el acceso a esta cuenta?",
      /** Aclara que la ficha de personal (`staff`) se mantiene, solo se
       * quita el acceso a la cuenta (plan, paso 6: "personalraden finns
       * kvar"). */
      cuerpo:
        "Ya no podrá entrar a tu cuenta. Su ficha de profesional se mantiene en tu equipo.",
      ctaSi: "Sí, quitar acceso",
      ctaNo: "No, mantener",
    },
    toast: {
      permisosGuardados: "Permisos guardados.",
      accesoQuitado: "Acceso quitado.",
    },
  },
  /** Estado vacío de toda la pantalla (todavía nadie invitado ni miembro,
   * aparte del dueño). */
  vacio: "Todavía no invitaste a nadie a tu cuenta.",
  /** "Ägarens svar" 4: las cuentas de personal siguen la cantidad de
   * profesionales de cada plan (D-009); el plan de un solo profesional no
   * puede invitar.
   *
   * UX-granskning (fel 4, sección "Fel jag hittage"): el texto anterior ("Tu plan actual
   * permite un solo profesional") confundía cuentas con profesionales — un negocio con 3
   * profesionales y plan Emprende lo veía como un límite de personal, cuando lo que limita
   * el plan son las CUENTAS (logins), no las fichas de profesional en el calendario. */
  limiteDelPlan: {
    titulo: "Cuentas de tu plan",
    texto: (p: { limit: number }): string =>
      `Tu plan tiene ${p.limit} ${p.limit === 1 ? "cuenta" : "cuentas"}. Cambia a Equipo para dar accesos propios a tu personal (Equipo 3, Local 10).`,
    cta: "Cambiar de plan",
  },
  /** Tarjeta discreta bajo la lista cuando el plan SÍ permite más cuentas (no
   * `planLimitReached`) — contexto, no una advertencia. */
  infoDelPlan: {
    conEspacio: (p: { used: number; limit: number }): string =>
      `Usas ${p.used} de ${p.limit} cuentas de tu plan.`,
    completo: (p: { limit: number }): string =>
      `Usas las ${p.limit} cuentas de tu plan. Cambia a Local para sumar más (hasta 10).`,
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// invitacion: WP-46 (D-034) — /app/invitacion/[token], la pantalla donde el
// profesional invitado acepta. Sin `.dc.html` de referencia (mismo criterio
// que WP-03b, R1 de su plan): pantalla nueva, no hay prueba de paridad de
// diseño para ella.
// ---------------------------------------------------------------------------

export const invitacion = {
  titulo: (p: { negocio: string }): string =>
    `Únete a la cuenta de ${p.negocio}`,
  texto: (p: { negocio: string }): string =>
    `Acepta la invitación para entrar y ver la agenda de ${p.negocio}.`,
  ctaAceptar: "Aceptar invitación",
  errores: {
    /** El token no corresponde a ninguna invitación (mismo criterio que
     * `gestion.linkInvalido`, para un link de gestión). */
    noEncontrada: "No encontramos esta invitación.",
    expirada:
      "Esta invitación ya venció. Pídele al dueño que te envíe una nueva.",
    revocada:
      "Esta invitación fue revocada. Pídele al dueño que te envíe una nueva si corresponde.",
    yaUsada: "Esta invitación ya fue usada.",
    /** La persona ya inició sesión, pero con un correo distinto del que
     * invitó el dueño: se muestra a qué dirección le corresponde la
     * invitación (plan, paso 5: "Entra con esa cuenta o pide una invitación
     * nueva"), nunca se liga la cuenta equivocada. */
    otroCorreo: (p: { email: string }): string =>
      `Esta invitación es para ${p.email}. Entra con esa cuenta o pide una invitación nueva.`,
    /** "Ägarens svar" 1: una cuenta por negocio en v1. */
    correoOtroNegocio:
      "Ese correo ya pertenece a otro negocio. Por ahora solo puedes tener una cuenta.",
    /** El negocio bajó de plan después de invitar, o ya llegó al tope de
     * profesionales de su plan (D-009). */
    limiteDelPlan:
      "El plan de este negocio no permite más cuentas de personal por ahora.",
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// redesSociales: WP-51 — TikTok y Facebook en el perfil público (`/[slug]`,
// header y tarjeta de contacto) y en Ajustes → Perfil / onboarding
// "Tu página". Bloque nuevo (en vez de ampliar `perfil`/`negocio`) para
// evitar conflictos con otros agentes que tocan es-CL.ts en paralelo (ver
// el worktree de WP-51). Instagram reutiliza las claves que ya existían
// (`perfil.ajustes.campos.instagram*`, `perfil.publico.instagramAria`):
// mismo vocabulario, sin duplicar.
// ---------------------------------------------------------------------------

export const redesSociales = {
  campos: {
    tiktokLabel: "TikTok",
    tiktokPlaceholder: "tunegocio",
    tiktokAyuda: "Solo tu usuario, sin el link completo.",
    facebookLabel: "Facebook",
    facebookPlaceholder: "tunegocio",
    facebookAyuda: "Solo tu usuario, sin el link completo.",
  },
  /** aria-label de los botones de ícono en el perfil público (header y
   * tarjeta de contacto). Instagram reutiliza `perfil.publico.instagramAria`. */
  tiktokAria: (p: { negocio: string }): string => `TikTok de ${p.negocio}`,
  facebookAria: (p: { negocio: string }): string => `Facebook de ${p.negocio}`,
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// baja: `/baja/[token]` (WP-31, F14) — página pública (sin login) a la que
// llega el link de baja de una campaña de marketing. Bloque nuevo al final
// del archivo (mismo criterio que `redesSociales`): evita conflictos con
// otros agentes que tocan `es-CL.ts` en paralelo.
// ---------------------------------------------------------------------------

export const baja = {
  titulo: "Darte de baja",
  cuerpo: (p: { negocio: string }): string =>
    `Vas a dejar de recibir ofertas y novedades de ${p.negocio} por correo o SMS. Vas a seguir recibiendo los avisos de tus propias reservas.`,
  cta: "Darme de baja",
  /** Después de confirmar (o si el link ya se había usado antes). */
  listo: (p: { negocio: string }): string =>
    `Listo. Ya no recibirás más ofertas de ${p.negocio}.`,
  /** Token inválido/desconocido → 404 (`notFound()`), no un mensaje acá. */
  error: "No pudimos procesar tu solicitud. Inténtalo de nuevo.",
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// flashStory: `GET /api/flash/[id]/story.png` (WP-30, F13) — las dos líneas
// de texto fijo de la imagen (1080×1920, `docs/design/reference/
// HoraFlash.dc.html`), aparte del contenido de la propia flash (negocio,
// servicio, día/hora, precios). Bloque nuevo al final del archivo (mismo
// criterio que `baja`/`redesSociales`): evita conflictos con otros agentes.
// ---------------------------------------------------------------------------

export const flashStory = {
  badge: "Hora flash",
  soloUnaHora: "Solo una hora",
  cta: "Reserva en el link de la bio",
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// flash: `/app/flash` (WP-30, F13) — pantalla del dueño: horas flash activas
// y reservadas (`listFlashSlots` solo devuelve las que no han terminado
// todavía, ver src/server/flash/slots.ts), diálogo "Nueva hora flash",
// tarjeta de cada hora (imagen para historia, copiar link, enviar a
// clientes, cancelar). Bloque nuevo al
// final del archivo (mismo criterio que `baja`/`flashStory`): evita
// conflictos con otros agentes que tocan `es-CL.ts` en paralelo.
// ---------------------------------------------------------------------------

export const flash = {
  titulo: "Horas flash",
  /** FlashCard (Inicio)/EventBlock (Agenda) cuando la hora no tiene
   * servicios específicos (`serviceIds: null` = todos). */
  todosLosServicios: "Todos los servicios",
  activas: {
    titulo: "Activas",
    vacio: "No tienes horas flash activas todavía.",
  },
  /** UX-granskning (sección "Blixttider"): el tomt läge anterior eran solo dos líneas de
   * texto. Ahora explica qué es una Hora flash y, si hay huecos libres (`listFreeGaps`),
   * los lista con un botón que abre "Nueva hora flash" ya precargado. */
  vacio: {
    explicacion:
      "Una Hora flash es un hueco libre con descuento. Compártela con un link y una imagen para tu historia, o envíala a los clientes que aceptaron recibir novedades.",
    huecosTitulo: "Huecos libres hoy y mañana",
    hoy: "Hoy",
    manana: "Mañana",
    hueco: (p: { dia: string; rango: string; profesional: string }): string =>
      `${p.dia} ${p.rango} · ${p.profesional}`,
    ctaConvertir: "Convertir en Hora flash",
  },
  reservadas: {
    titulo: "Reservadas",
    vacio: "No tienes horas flash reservadas todavía.",
  },
  nueva: {
    cta: "Nueva hora flash",
    titulo: "Nueva hora flash",
    campos: {
      profesional: "Profesional",
      dia: "Día",
      hora: "Hora de inicio",
      modo: "¿Cómo defines la hora?",
      modoDuracion: "Duración libre",
      modoServicios: "Servicios específicos",
      duracionLabel: "Duración",
      serviciosLabel: "Servicios",
      descuentoLabel: "Descuento (%)",
    },
    ctaGuardar: "Crear hora flash",
    errores: {
      profesionalRequerido: "Elige un profesional.",
      servicioRequerido: "Elige al menos un servicio.",
      descuentoInvalido: "Un número entre 1 % y 90 %.",
      forbidden:
        "No tienes permiso para crear horas flash para ese profesional.",
      not_free: "Esa hora no está libre en la agenda de ese profesional.",
      overlap: "Ya existe otra hora flash activa que se cruza con esa hora.",
      invalid_input: "Revisa los datos e inténtalo de nuevo.",
      unknown: "No pudimos crear la hora flash. Inténtalo de nuevo.",
    },
  },
  tarjeta: {
    descuento: (p: { porcentaje: number }): string => `−${p.porcentaje}%`,
    reservada: "Reservada",
    historiaTitulo: "Imagen para historia",
    descargar: "Descargar",
    copiarLink: "Copiar link",
    linkCopiado: "Link copiado",
    errorCopiar: "No pudimos copiar el link.",
    enviarAClientes: "Enviar a clientes",
    /** `sendFlashCampaign` → "flash_not_active" (la hora ya fue reservada o
     * cancelada mientras se armaba el envío). */
    enviarErrorNoActiva:
      "Esta hora flash ya no está activa, así que no se puede enviar.",
    cancelar: "Cancelar",
    cancelarDialogTitulo: "¿Cancelar esta hora flash?",
    cancelarDialogCuerpo:
      "La hora vuelve a quedar disponible sin descuento. Esta acción no se puede deshacer.",
    cancelarConfirmarSi: "Sí, cancelar",
    cancelarConfirmarNo: "No, mantener",
    errorCancelar: "No pudimos cancelar la hora flash. Inténtalo de nuevo.",
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// vOferta: `/v/[token]` (WP-23, F8) — página pública (sin login) de la
// oferta de lista de espera ("Se liberó una hora", `lista_espera_oferta`).
// Bloque nuevo al final del archivo (mismo criterio que `baja`/`flash`):
// evita conflictos con otros agentes que tocan `es-CL.ts` en paralelo.
// ---------------------------------------------------------------------------

export const vOferta = {
  titulo: "Se liberó una hora",
  campos: {
    servicio: "Servicio",
    dia: "Día",
    hora: "Hora",
    profesional: "Profesional",
  },
  expira: (p: { minutos: number; segundos: number }): string =>
    `Tienes ${p.minutos}:${p.segundos.toString().padStart(2, "0")} min para confirmar`,
  ctaTomar: "Tomar esta hora",
  tomando: "Confirmando…",
  confirmada: "¡Listo! Tu hora quedó reservada.",
  confirmadaAviso: "Te llega la confirmación con todos los detalles.",
  yaTomada: "Esa hora ya fue tomada por otra persona.",
  yaTomadaAviso:
    "Sigues en la lista de espera: te avisaremos si se libera otra.",
  vencida: "El tiempo para confirmar esta hora ya pasó.",
  yaReservada: "Ya reservaste esta hora.",
  linkInvalido: "Este link no es válido.",
  error: "No pudimos confirmar tu hora. Inténtalo de nuevo.",
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// uxTextos: WP-57 (UX-översyn) — etiquetas cortas del nuevo diseño.
// ---------------------------------------------------------------------------
export const uxTextos = {
  etiquetaHabitual: "Habitual",
  etiquetaAceptaOfertas: "Acepta ofertas",
  etiquetas: "Etiquetas",
  enviarCampanaN: (p: { n: number }): string => `Enviar campaña (${p.n})`,
  seleccionarA: (p: { nombre: string }): string => `Seleccionar a ${p.nombre}`,
  seleccionarTodos: "Seleccionar todos",
  marcarSocio: "Marcar como socio",
  quitarSocio: "Quitar de socios",
  consentTerminos: "Términos",
  consentOfertas: "Ofertas y novedades",
  deReservado: (p: { monto: string }): string => `de ${p.monto} reservado`,
  minimizarMenu: "Minimizar menú",
  expandirMenu: "Expandir menú",
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// resenas (WP-65, D-045): reseñas verificadas — página del cliente
// (`/resena/[token]`), página pública (`/[slug]`), panel del negocio
// (`/app/clientes/resenas`) y Ajustes → Reglas.
// ---------------------------------------------------------------------------

export const resenas = {
  formulario: {
    titulo: "¿Cómo te fue?",
    notaLabel: "Tu nota",
    estrella: (p: { n: number }): string =>
      p.n === 1 ? "1 estrella" : `${p.n} estrellas`,
    notaRequerida: "Elige de 1 a 5 estrellas.",
    comentarioLabel: "Cuéntanos más (opcional)",
    comentarioPlaceholder: "¿Qué te gustó? ¿Qué podríamos mejorar?",
    contador: (p: { n: number; max: number }): string => `${p.n}/${p.max}`,
    // "Elin K." slutar redan på punkt — ingen dubbel punkt.
    publicaComo: (p: { nombre: string }): string =>
      `Se publica como ${p.nombre.replace(/\.$/, "")}.`,
    enviar: "Publicar reseña",
    guardar: "Guardar cambios",
    enviando: "Guardando…",
    gracias: "¡Gracias por tu reseña!",
    graciasTexto: (p: { negocio: string }): string =>
      `Ya aparece en la página de ${p.negocio}. Puedes editarla durante 7 días con este mismo link.`,
    editar: "Editar mi reseña",
    cerrada:
      "Gracias por tu reseña. Ya pasaron 7 días, así que no se puede editar.",
    error: "No pudimos guardar tu reseña. Inténtalo de nuevo.",
    verPagina: "Ver la página",
    noEncontrada: "Este link de reseña no es válido o ya no está disponible.",
  },
  publico: {
    titulo: "Reseñas",
    cantidad: (p: { n: number }): string =>
      `${p.n} ${p.n === 1 ? "reseña" : "reseñas"}`,
    notaAria: (p: { nota: string; n: number }): string =>
      `Nota ${p.nota} de 5, ${p.n} ${p.n === 1 ? "reseña" : "reseñas"}`,
    estrellasAria: (p: { n: number }): string => `${p.n} de 5 estrellas`,
    verificadas: "Solo opinan clientes que tuvieron una cita.",
    anonimo: "Cliente",
    respuesta: (p: { negocio: string }): string => `Respuesta de ${p.negocio}`,
    verMas: "Ver más reseñas",
  },
  panel: {
    titulo: "Reseñas",
    filtrosLabel: "Filtrar reseñas",
    filtros: {
      todas: "Todas",
      sinResponder: "Sin responder",
      bajas: "Notas bajas",
    },
    vacio:
      "Aún no tienes reseñas. Después de cada cita le pedimos su opinión al cliente.",
    vacioFiltro: "No hay reseñas con este filtro.",
    sinComentario: "Sin comentario.",
    responder: "Responder",
    editarRespuesta: "Editar respuesta",
    respuestaLabel: "Respuesta pública",
    respuestaAyuda: "Se muestra bajo la reseña en tu página.",
    publicarRespuesta: "Publicar respuesta",
    cancelar: "Cancelar",
    reportar: "Reportar",
    reportada: "Reportada",
    oculta: "Oculta por moderación",
    reportarTitulo: "Reportar reseña",
    reportarTexto:
      "La revisamos y, si no cumple las reglas, la ocultamos. Las reseñas no se pueden borrar.",
    motivoLabel: "Motivo",
    motivos: {
      offensive: "Lenguaje ofensivo",
      false: "Información falsa",
      personal_data: "Datos personales",
      not_customer: "No fue nuestro cliente",
      other: "Otro motivo",
    },
    detalleLabel: "Detalle (opcional)",
    enviarReporte: "Enviar reporte",
    error: "No pudimos guardar. Inténtalo de nuevo.",
  },
  ajustes: {
    pedirResena: "Pedir reseña después de la cita",
    pedirResenaAyuda:
      "Enviamos un mensaje 2 horas después de cada cita. Solo opina quien tuvo una cita contigo.",
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// importar: WP-66 (D-046) — "Trae tus datos desde tu sistema anterior"
// (onboarding + Ajustes → Negocio). Tú, corto y cálido.
// ---------------------------------------------------------------------------
export const importar = {
  titulo: "¿Ya tienes una página de reservas?",
  intro:
    "Pega el link y traemos tus servicios, precios, horario y equipo. Tú revisas todo antes de guardar.",
  tituloAjustes: "Trae tus datos desde otro sistema",
  introAjustes:
    "Pega el link de tu página de reservas anterior y traemos servicios, horario y equipo. Revisas todo antes de guardar.",
  ctaAbrir: "Traer mis datos",
  linkLabel: "Link de tu página de reservas",
  linkPlaceholder: "https://agendapro.com/…",
  plataformas: (p: { lista: string }): string => `Funciona con ${p.lista}.`,
  ctaLeer: "Traer mis datos",
  ctaPegarTexto: "Prefiero pegar el texto",
  ctaUsarLink: "Mejor uso el link",
  textoLabel: "Pega aquí la info de tu página",
  textoAyuda:
    "Abre tu página, copia todo el texto (servicios, precios, horario) y pégalo acá.",
  progreso: {
    leyendo: "Leyendo tu página…",
    servicios: "Buscando tus servicios…",
    precios: "Ordenando precios y horario…",
    casi: "Casi listo…",
  },
  aviso: "Puede tardar hasta un minuto. Quédate tranquilo en esta pantalla.",
  // WP-84 (D-069): plan sugerido según lo que eliges importar. TODO_COPY.
  planSugerida: (p: {
    servicios: number;
    personal: number;
    plan: string;
  }): string =>
    `Elegiste ${p.servicios} ${p.servicios === 1 ? "servicio" : "servicios"} y ${p.personal} ${p.personal === 1 ? "persona" : "personas"} en el equipo. Te sugerimos el plan ${p.plan}.`,
  planSugeridaAyuda: (p: { gratis: string }): string =>
    `En ${p.gratis} quedan activos solo 3 servicios; el resto se guarda inactivo hasta que cambies de plan.`,
  /** WP-83: título de la pantalla de carga (lista de pasos). TODO_COPY */
  cargandoTitulo: "Estamos trayendo tus datos",
  ctaCancelar: "Cancelar",
  revisarTitulo: "Revisa lo que encontramos",
  revisarIntro:
    "Desmarca lo que no quieras traer. Puedes cambiar precios y duraciones.",
  desde: (p: { plataforma: string }): string => `Desde ${p.plataforma}`,
  grupos: {
    perfil: "Perfil",
    horario: "Horario",
    servicios: "Categorías y servicios",
    equipo: "Equipo",
  },
  campos: {
    nombre: "Nombre",
    sobre: "Sobre nosotros",
    direccion: "Dirección",
    comuna: "Comuna",
    telefono: "Teléfono",
    email: "Correo",
    web: "Sitio web",
    instagram: "Instagram",
    tiktok: "TikTok",
    facebook: "Facebook",
    rubro: "Rubro",
    duracion: "Duración (min)",
    precio: "Precio",
  },
  cerrado: "Cerrado",
  todoElHorario: "Usar este horario",
  precioDesde: "Precio “desde”: revisa el monto",
  yaExiste: "Ya existe, no se toca",
  faltaDuracion: "Falta la duración",
  faltaPrecio: "Falta el precio",
  categoria: (p: { nombre: string }): string => `Categoría: ${p.nombre}`,
  soloInfo: "Solo informativo, no se guarda.",
  imagenes: "El logo y la portada no se importan: súbelos tú en Perfil.",
  verLogo: "Ver logo",
  verPortada: "Ver portada",
  notasTitulo: "Lo que no encontramos",
  confianzaBaja:
    "Tu página tenía poca información: revisa todo con calma antes de guardar.",
  ctaImportar: (p: { n: number }): string =>
    `Importar lo seleccionado (${p.n})`,
  ctaUsar: "Usar estos datos",
  ctaDescartar: "Descartar",
  importando: "Importando…",
  listo: (p: { servicios: number; equipo: number }): string =>
    `Listo: importamos ${p.servicios} servicios y ${p.equipo} personas.`,
  omitidos: (p: { lista: string }): string =>
    `Ya existían y no los tocamos: ${p.lista}.`,
  listoOnboarding:
    "Listo, llenamos los pasos con tus datos. Revísalos antes de seguir.",
  ningunoSeleccionado: "Marca al menos una cosa para importar.",
  errorEn: (p: { item: string; motivo: string }): string =>
    `“${p.item}”: ${p.motivo}`,
  errores: {
    url_invalid: "Ese link no se ve bien. Cópialo directo desde el navegador.",
    platform_unsupported:
      "Todavía no leemos esa plataforma. Pega el texto de tu página y lo hacemos igual.",
    text_too_short:
      "Pega un poco más de texto: con tus servicios y precios basta.",
    text_too_long:
      "Es demasiado texto. Pega solo servicios, precios y horario.",
    daily_limit: "Ya hiciste 3 importaciones hoy. Inténtalo de nuevo mañana.",
    paused:
      "La importación está en pausa por ahora. Puedes agregar tus servicios a mano.",
    unavailable: "La importación no está disponible.",
    fetch_failed:
      "No pudimos abrir tu página. Pega el texto y lo hacemos igual.",
    empty:
      "No encontramos datos del negocio ahí. Revisa el link o pega el texto.",
    refused:
      "No pudimos leer esa página. Pega el texto y lo intentamos de nuevo.",
    busy: "Hay mucha demanda ahora. Inténtalo en un par de minutos.",
    failed: "Algo falló al leer tu página. Inténtalo de nuevo.",
    cancelled: "Cancelaste la importación.",
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// planes (WP-73, D-048): nombres de plan, bloqueos con "Ver planes", resumen de
// uso en Ajustes → Tu plan y la marca "Creado con …" en la página de reservas
// del plan Gratis. La matriz vive en `src/config/plans.ts`.
// ---------------------------------------------------------------------------

export const planes = {
  nombres: {
    free: "Gratis",
    emprende: "Emprende",
    equipo: "Equipo",
    local: "Local",
    custom: "A medida",
  },
  funciones: {
    unbranded: "Página de reservas sin nuestra marca",
    waitlist: "Lista de espera",
    flash: "Horas flash",
    campaigns: "Envíos, Te echamos de menos y socios",
    full_reports: "Caja e informes completos",
    staff_accounts: "Cuentas para tu equipo",
    offers: "Ofertas en el marketplace",
    priority_support: "Soporte prioritario",
  },
  bloqueo: {
    titulo: (p: { funcion: string; plan: string }): string =>
      `${p.funcion} viene en el plan ${p.plan}`,
    ganchos: {
      unbranded: "Mejora tu plan y muestra solo tu marca.",
      waitlist:
        "Mejora tu plan y no pierdas a nadie cuando se libere una hora.",
      flash: "Mejora tu plan y llena tus horas vacías.",
      campaigns: "Mejora tu plan y trae de vuelta a tus clientes.",
      full_reports: "Mejora tu plan y mira tus números completos.",
      staff_accounts: "Mejora tu plan y dale una cuenta a tu equipo.",
      offers: "Mejora tu plan y vende tus servicios a clientes nuevos.",
      priority_support: "Mejora tu plan y te atendemos primero.",
    },
    verPlanes: "Ver planes",
    bloqueado: "Bloqueado",
  },
  ajustes: {
    titulo: "Tu plan",
    planActual: "Plan actual",
    usoTitulo: "Uso",
    cuentas: "Cuentas",
    servicios: "Servicios activos",
    deMax: (p: { usado: number; max: number }): string =>
      `${p.usado} de ${p.max}`,
    sinLimite: (p: { usado: number }): string => `${p.usado} · sin límite`,
    incluye: "Qué incluye tu plan",
    noIncluye: "No incluido",
    cambiarPlan: "Cambiar plan",
    contacto: "Contáctanos",
    /** WP-80 (D-061): facturación manual — sin compra de plan en la app. TODO_COPY */
    administrado: (p: { marca: string }): string =>
      `Tu plan lo administra ${p.marca}. Para cambios, contáctanos.`,
    cambiarAyuda:
      "Muy pronto podrás cambiar de plan desde acá. Por ahora, revisa los planes y escríbenos: lo cambiamos por ti.",
    pausado:
      "Si bajas de plan, no se borra nada: lo que no viene en el nuevo plan queda en pausa hasta que vuelvas a subir.",
  },
  errores: {
    plan_locked:
      "Tu plan no incluye esta función. Revisa los planes para activarla.",
    plan_limit_services:
      "Tu plan permite hasta 3 servicios activos. Mejora tu plan para agregar más.",
  },
  creadoCon: (p: { marca: string }): string => `Creado con ${p.marca}`,
} as const satisfies Trad;
