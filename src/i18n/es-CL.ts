/**
 * Todos los textos de producto en español de Chile (tú, sin voseo, sin
 * anglicismos). Reglas completas de tono y formato en
 * `docs/content/GUIA_DE_ESTILO.md`.
 *
 * Alcance (WP-03, F5–F8): Reserva (`/[slug]`), la reserva del cliente
 * (`r/[token]`), Inicio, Agenda, Hoy, las seis plantillas de WhatsApp de la
 * fase 1 y el respaldo por correo. Onboarding, Clientes, Caja, Ajustes y el
 * abono con Mercado Pago se escriben en WP-03b.
 *
 * Los nombres de los días de la semana y de los meses NO están acá: viven en
 * `src/lib/format/` (WP-04), para que el mismo nombre ("Vie", "vie", "oct")
 * salga igual en servidor y cliente sin depender de la versión de ICU.
 *
 * El nombre del producto nunca se escribe en este archivo (regla dura 10,
 * R1 del plan de WP-03): se usa `brand.name`/`brand.tagline` cuando hace
 * falta nombrarlo.
 */
import { brand } from "@/config/brand";

import type { Trad } from "./index";

// ---------------------------------------------------------------------------
// comun: acciones y estados generales
// ---------------------------------------------------------------------------

export const comun = {
  cargando: "Cargando…",
  sinConexion: "Estás sin conexión. Revisa tu internet.",
  algoSalioMal: "Algo salió mal. Intenta de nuevo.",
  reintentar: "Reintentar",
  volver: "Volver",
  noMantener: "No, mantener",
  cancelarReserva: "Cancelar reserva",
  guardar: "Guardar",
  cerrar: "Cerrar",
  confirmar: "Confirmar",
  deshacer: "Deshacer",
  /** Ordinal femenino compartido entre Agenda y Hoy: "1.ª visita", "6.ª
   * visita". Una sola definición para no tener dos copias. */
  visita: (p: { n: number }): string => `${p.n}.ª visita`,
} as const satisfies Trad;

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
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// estados: chips de estado de una reserva y etiquetas de origen
// ---------------------------------------------------------------------------

export const estados = {
  confirmada: "Confirmada",
  abonoPagado: "Abono pagado",
  sinConfirmar: "Sin confirmar",
  confirmo: "Confirmó",
  confirmoPorWhatsapp: "Confirmó por WhatsApp",
  llego: "Llegó",
  noVino: "No vino",
  cancelada: "Cancelada",
  listaDeEspera: "Lista de espera",
  desdeLista: "Desde lista",
  abono: "Abono",
  flash: "Flash",
  flashConDescuento: (p: { porcentaje: number }): string =>
    `Flash −${p.porcentaje}%`,
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// calendario: lo que no son nombres de día/mes (eso vive en src/lib/format/)
// ---------------------------------------------------------------------------

export const calendario = {
  hoy: "Hoy",
  cerrado: "Cerrado",
  /** Texto oculto (sr-only) para el punto de color del MiniCalendar
   * (`c.dot` en Main.dc.html, sin texto accesible hoy) que marca un día con
   * reservas. Clave propuesta por WP-11/WP-12 (R2 del plan de WP-03b). */
  diaConReservas: "Con reservas",
  vista: {
    mes: "Mes",
    semana: "Semana",
    dia: "Día",
  },
  mesAnterior: "Mes anterior",
  mesSiguiente: "Mes siguiente",
  semanaAnterior: "Semana anterior",
  semanaSiguiente: "Semana siguiente",
  /** "GMT−3" en verano, "GMT−4" en invierno (Santiago no cambia el signo). */
  zonaHoraria: (p: { offset: number }): string =>
    `GMT${p.offset < 0 ? "−" : "+"}${Math.abs(p.offset)}`,
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// errores: códigos de error de la agenda, del lado del cliente y del dueño
// ---------------------------------------------------------------------------

export const errores = {
  reserva: {
    // Las claves de reserva y de telefono son las mismas que los códigos de
    // error reales (SCHEDULING.md y `chileanMobileInputSchema` en
    // src/lib/format/schemas.ts, WP-04), en snake_case, para que
    // `satisfies Record<Codigo, string>` funcione del lado de quien defina
    // el tipo del código (WP-10/WP-04) sin tener que traducir nombres.
    slot_taken: "Alguien tomó esa hora recién, elige otra.",
    too_soon: "Es muy pronto para reservar esta hora, elige una más adelante.",
    /** Códigos nuevos de `BookingError` (WP-10, `src/server/bookings/`,
     * FRÅGA 4 del plan de WP-10): `createBooking`/`moveBooking`/
     * `cancelBooking` pueden devolverlos también del lado del cliente
     * (`/[slug]` y `r/[token]`). */
    too_far:
      "Por ahora no puedes reservar tan lejos, elige una fecha más cercana.",
    service_not_offered: "Ese servicio ya no está disponible. Elige otro.",
    not_found: "No encontramos esa reserva.",
    invalid_status: "Esta reserva ya no se puede cambiar.",
    outside_cancel_window:
      "Ya pasó el plazo para cancelar o cambiar esta reserva sin costo.",
    invalid_input: "Revisa los datos e intenta de nuevo.",
    outside_hours: "Ese horario ya no está disponible.",
    network: "No pudimos conectar. Revisa tu conexión e intenta de nuevo.",
    waitlist_duplicate: "Ya estás en la lista de espera para este día.",
    nombreVacio: "Escribe tu nombre.",
    emailInvalido: "Revisa tu correo electrónico.",
    consentimientoRequerido: "Acepta los términos para continuar.",
    /** Mismos códigos que `PhoneError` (src/lib/format/phone.ts, WP-04) para
     * el celular del cliente en Reserva, así `satisfies Record<PhoneError,
     * string>` funciona del lado de WP-04/WP-13 sin traducir nombres. El
     * teléfono del negocio (que puede ser fijo) y los esquemas de CLP, RUT,
     * fecha y hora son de WP-03b. */
    telefono: {
      empty: "Escribe tu número de teléfono.",
      invalid_chars: "Usa solo números, por ejemplo +56 9 1234 5678.",
      not_chilean: "Por ahora solo aceptamos números chilenos (+56).",
      invalid_length:
        "Un celular chileno tiene 8 dígitos después de +56 9. Revisa el número.",
      not_mobile: "Escribe un celular chileno, por ejemplo +56 9 1234 5678.",
      invalid_prefix: "Ese número no es válido. Revisa el código de área.",
    },
  },
  agenda: {
    slot_taken: "Esa hora ya se ocupó. Elige otra.",
    outside_hours: "Esa hora está fuera del horario de atención.",
    /** Mismos códigos nuevos de `BookingError` que `errores.reserva`, en
     * tono para la dueña (WP-12, reserva manual/mover/cancelar desde
     * Agenda). `too_far` no debería ocurrir para el dueño (inv. 5 de
     * WP-10: sin horizonte), pero la clave existe para que
     * `satisfies Record<BookingError, string>` funcione igual. */
    too_far: "Esa fecha está fuera del rango permitido.",
    service_not_offered: "Ese profesional no ofrece este servicio.",
    not_found: "Esa reserva ya no existe.",
    invalid_status: "Esa reserva ya no se puede cambiar.",
    outside_cancel_window:
      "Ya pasó el plazo para cancelar o cambiar esta reserva.",
    invalid_input: "Revisa los datos e intenta de nuevo.",
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// reserva: /[slug] — F5, F8 para el cliente
// ---------------------------------------------------------------------------

export const reserva = {
  meta: {
    titulo: (p: { negocio: string }): string => `Reservar en ${p.negocio}`,
    vendidoPor: (p: { negocio: string }): string =>
      `Reserva gestionada por ${brand.name} para ${p.negocio}.`,
  },
  header: {
    confirmacionWhatsapp: "Confirmación por WhatsApp",
    /** "{dias} · {rango}", p. ej. "Lun–Sáb · 10:00–19:00" (ambos ya
     * formateados por WP-04). */
    horario: (p: { dias: string; rango: string }): string =>
      `${p.dias} · ${p.rango}`,
    /** "{comuna}, Santiago", p. ej. "Providencia, Santiago" (fixture de
     * Reserva.dc.html línea 26). Fase 1 solo vende en la Región
     * Metropolitana (VISION, "Santiago"), así que la ciudad no es un campo
     * de `businesses`: se escribe literal acá, no es el nombre del
     * producto (regla dura 10). */
    ubicacion: (p: { comuna: string }): string => `${p.comuna}, Santiago`,
  },
  pasos: {
    servicio: "1 · Elige el servicio",
    profesional: "2 · ¿Con quién?",
    cualquiera: "Cualquiera",
    diaYHora: "3 · Día y hora",
  },
  /** Texto oculto (sr-only) para los días del selector de fecha (paso 3):
   * hoy el punto de color (`d.dotStyle` en Reserva.dc.html) es la única
   * marca de "lleno" o "con hora flash", sin texto accesible. Claves
   * propuestas por WP-13 (R2 del plan de WP-03b). */
  dia: {
    llenoOculto: "Día lleno",
    flashOculto: "Con hora flash",
  },
  /** aria-label de cada botón de hora del paso 3 (`{{t.t}}` en
   * Reserva.dc.html solo muestra la hora, p. ej. "11:30"). */
  horaAria: (p: { hora: string }): string => `Elegir la hora ${p.hora}`,
  // No hay `duracion` acá: "35 min" llega ya formateado por
  // `formatDuration` de WP-04 (src/lib/format/), igual que los montos y las
  // horas.
  descuento: (p: { porcentaje: number }): string => `−${p.porcentaje}%`,
  precioAnteriorAria: (p: { precio: string }): string =>
    `Precio antes del descuento: ${p.precio}`,
  waitlist: {
    /** Todos los días de la semana son masculinos: "el lunes", "el sábado". */
    diaLleno: (p: { dia: string }): string => `El ${p.dia} está lleno`,
    cuerpo:
      "Únete a la lista de espera. Si alguien cancela, te avisamos por WhatsApp y la hora es tuya con un toque.",
    listo: "Listo, estás en la lista",
    ctaAvisame: "Avísame",
    ctaUnirme: "Unirme a la lista",
    ctaEnLaLista: "En la lista",
    /** Recibo más completo (p. ej. en un toast o una tarjeta aparte),
     * distinto del check corto `listo` que se ve dentro de la propia tarjeta
     * de la lista de espera. */
    confirmacion: (p: { servicio: string; dia: string }): string =>
      `Quedaste en la lista de espera para ${p.servicio} el ${p.dia}.`,
  },
  /** Casilla de consentimiento para unirse a la lista de espera (WP-13):
   * es una acción distinta de "Confirmar reserva", así que no viaja dentro
   * de `consentimientos` ni de su hash de versión. Pendiente: si esta
   * pantalla necesita su propia versión/hash (mismo patrón que
   * `clientes.consentimientoManual.version` en el plan de WP-03b, paso 7)
   * queda para que el orquestador/planner lo decida; ver el informe de
   * esta entrega. */
  terminosListaEspera:
    "Acepto recibir por WhatsApp el aviso si se libera una hora.",
  resumen: {
    conProfesional: (p: {
      servicio: string;
      dia: string;
      hora: string;
      profesional: string;
    }): string => `${p.servicio} · ${p.dia}, ${p.hora} · ${p.profesional}`,
    sinProfesional: (p: {
      servicio: string;
      dia: string;
      hora: string;
    }): string => `${p.servicio} · ${p.dia}, ${p.hora}`,
    listaEspera: (p: { servicio: string; dia: string }): string =>
      `${p.servicio} · ${p.dia} · lista de espera`,
  },
  bookingBar: {
    ctaReservar: "Reservar",
    ctaReservado: "¡Reservado!",
  },
  clienteForm: {
    titulo: "Tus datos",
    nombreLabel: "Nombre",
    nombrePlaceholder: "Tu nombre",
    telefonoLabel: "Celular",
    telefonoPlaceholder: "+56 9 1234 5678",
    emailLabel: "Correo (opcional)",
    emailAyuda: "Te lo pedimos por si el mensaje de WhatsApp no llega.",
    emailPlaceholder: "tucorreo@ejemplo.cl",
  },
  antesDeConfirmar: {
    politicaCancelacion: (p: { horas: number }): string =>
      `Puedes cancelar o cambiar la hora hasta ${p.horas} h antes, sin costo.`,
    avisoWhatsapp: (p: { negocio: string }): string =>
      `Te enviaremos la confirmación y un recordatorio por WhatsApp de ${p.negocio} a este número.`,
    ctaConfirmar: "Confirmar reserva",
  },
  /** Versión "2026-10-v1" (borrador, ver R8 del plan): pendiente de revisión
   * de un abogado antes de WP-27. Si cambias `terminos`, `terminosLinkTexto`,
   * `politicaLinkTexto`, `privacidadLinkTexto`, `responsable`, `marketing`,
   * `antesDeConfirmar.avisoWhatsapp` o `antesDeConfirmar.politicaCancelacion`,
   * sube `version` y registra el nuevo hash en `es-CL.test.ts` (`HASHES`). */
  consentimientos: {
    version: "2026-10-v1",
    terminos:
      "Acepto los términos de la reserva y la política de cancelación, y recibir por WhatsApp la confirmación y los recordatorios de esta hora.",
    terminosLinkTexto: "los términos de la reserva",
    politicaLinkTexto: "la política de cancelación",
    privacidadLinkTexto: "la política de privacidad",
    /** Quién trata los datos (Ley 21.719): el negocio es responsable, la
     * plataforma los procesa por su encargo. Nunca se nombra el producto acá
     * (regla dura 10): "la plataforma" es una palabra común, no el nombre. */
    responsable: (p: { negocio: string }): string =>
      `Tus datos los trata ${p.negocio}; la plataforma los procesa por encargo.`,
    marketing: (p: { negocio: string }): string =>
      `Quiero recibir ofertas y novedades de ${p.negocio} por WhatsApp. Puedo responder BAJA cuando quiera.`,
  },
  confirmacion: {
    titulo: "¡Listo, tu hora quedó reservada!",
    resumenTitulo: "Resumen de tu reserva",
    avisoWhatsapp: "Te enviamos la confirmación por WhatsApp.",
    verMiReserva: "Ver mi reserva",
  },
  vacios: {
    eligeServicio: "Elige un servicio para ver las horas disponibles.",
    cargandoHorarios: "Buscando horas disponibles…",
    sinHorariosEseDia: "No quedan horas ese día. Elige otro.",
    sinHorariosEnRango: "No hay horas disponibles en los próximos días.",
    sinServicios: "Este negocio todavía no tiene servicios cargados.",
    negocioNoDisponible: "Este negocio no está recibiendo reservas por ahora.",
    paginaNoExiste: "No encontramos esta página de reservas.",
  },
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
  confirmarCancelacion: {
    titulo: "¿Cancelar tu reserva?",
    cuerpo: "Le avisaremos al negocio y liberaremos tu hora para otra persona.",
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
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// inicio: Main.dc.html — F6 para el dueño (desktop)
// ---------------------------------------------------------------------------

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
    resumen: (p: { horas: string; monto: string }): string =>
      `Recuperaste ${p.horas} · ${p.monto} con la lista de espera y las horas flash.`,
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
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// agenda: Agenda.dc.html — F6 para el dueño (semana, día, popover)
// ---------------------------------------------------------------------------

export const agenda = {
  /** aria-label de `<section aria-label="Calendario mensual">` (aside). */
  calendarioMensualAria: "Calendario mensual",
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
    avisoWhatsapp: "Se avisa solo por WhatsApp",
    /** Aviso al desmarcar el último profesional visible en "Mostrar en la
     * agenda": siempre debe quedar al menos uno, para no dejar la semana
     * vacía sin darse cuenta. */
    minimoUnProfesional: "Debes dejar al menos un profesional visible.",
  },
  nuevaReserva: "Nueva reserva",
  agregarProfesional: "Agregar profesional",
  verAgendaDe: (p: { nombre: string }): string => `Ver agenda de ${p.nombre}`,
  vistaAria: "Vista",
  /** aria-label de la sección semanal: "Semana del {desde} al {hasta}". */
  semana: (p: { desde: string; hasta: string }): string =>
    `Semana del ${p.desde} al ${p.hasta}`,
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
    },
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

// ---------------------------------------------------------------------------
// plantillasWhatsapp: mallar de Meta para F7/F8 (fase 1, las seis de UTILITY)
// ---------------------------------------------------------------------------

/** Variables con posición: {{1}}, {{2}}… en el orden exacto del body. Este
 * orden es el contrato con WP-16 (integrations-engineer): no se reordena sin
 * avisar. */
export interface VariablePlantilla {
  readonly numero: number;
  readonly significado: string;
  readonly ejemplo: string;
  readonly fuente: string;
}

export type BotonPlantilla =
  | { readonly tipo: "QUICK_REPLY"; readonly texto: string }
  | {
      readonly tipo: "URL";
      readonly texto: string;
      /** Sufijo dinámico del botón (su propio "{{1}}", con numeración propia
       * respecto del body). */
      readonly sufijo: { readonly ejemplo: string; readonly fuente: string };
      /** true mientras `brand.domain` sea `null` (FRÅGA 3 / D-001): la
       * plantilla no se puede enviar a Meta hasta tener la base de la URL. */
      readonly dominioPendiente: boolean;
    };

export interface Plantilla {
  readonly nombre: string;
  readonly categoria: "UTILITY";
  readonly idioma: "es";
  readonly body: string;
  readonly variables: readonly VariablePlantilla[];
  readonly footer: string | null;
  readonly botones: readonly BotonPlantilla[];
  readonly nota: string;
}

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
  /** Pie de página de los cuatro correos. `plataforma` se recibe como
   * parámetro (no se interpola `brand.name` acá): quien arma el correo en
   * WP-16 decide qué nombre mostrar. */
  pie: (p: { negocio: string; plataforma: string }): string =>
    `Recibes este correo porque reservaste en ${p.negocio} a través de ${p.plataforma}.`,
} as const satisfies Trad;
