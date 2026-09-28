/**
 * Todos los textos de producto en español de Chile (tú, sin voseo, sin
 * anglicismos). Reglas completas de tono y formato en
 * `docs/content/GUIA_DE_ESTILO.md`.
 *
 * Alcance (WP-03, F5–F8): Reserva (`/[slug]`), la reserva del cliente
 * (`r/[token]`), Inicio, Agenda, Hoy, las seis plantillas de WhatsApp de la
 * fase 1 y el respaldo por correo.
 *
 * Alcance (WP-03b, F1–F3, F9–F11): inicio de sesión (`acceso`), onboarding
 * en 4 pasos, el perfil del negocio (`negocio`) y el catálogo (`servicios`,
 * `profesionales`, `horarios`), Clientes (F9), Caja (F10), Ajustes y el
 * abono por Mercado Pago (`abono`, F11), más las validaciones de esas
 * pantallas (`validacion`). Estas exportaciones viven al final del archivo
 * (R7 de su plan, para evitar conflictos con otros paquetes) y no tienen
 * `.dc.html` de referencia (R1: no hay prueba de paridad de diseño para
 * ellas, solo de contrato contra códigos y enums en `es-CL.v2.test.ts`).
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
  editar: "Editar",
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
  /** Agregado al final por WP-03b (§3 del plan, única excepción permitida
   * en esta exportación ya existente): estado de una reserva con abono
   * pendiente de pago (F11). */
  pendientePago: "Esperando abono",
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
     * pregunta 4 del plan de WP-10): `createBooking`/`moveBooking`/
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
    /** Código nuevo, fuera de la lista original de `BookingError` de WP-10
     * (agregado por pedido de revisión, 2026-09-27): el negocio no está
     * recibiendo reservas ahora mismo (`businesses.status = 'frozen'` u
     * otra causa). Mismo texto que `reserva.vacios.negocioNoDisponible`
     * (misma situación, dos puntos de entrada distintos). */
    business_unavailable: "Este negocio no está recibiendo reservas por ahora.",
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
     * Agenda). `too_far` y `too_soon` no deberían ocurrir para el dueño
     * (inv. 5 de WP-10: sin aviso mínimo ni horizonte), pero las claves
     * existen para que `satisfies Record<BookingError, string>` funcione
     * igual (pedido de revisión, 2026-09-27: faltaba `too_soon`, no
     * compilaba). */
    too_soon: "Es muy pronto para reservar esa hora.",
    too_far: "Esa fecha está fuera del rango permitido.",
    service_not_offered: "Ese profesional no ofrece este servicio.",
    not_found: "Esa reserva ya no existe.",
    invalid_status: "Esa reserva ya no se puede cambiar.",
    outside_cancel_window:
      "Ya pasó el plazo para cancelar o cambiar esta reserva.",
    invalid_input: "Revisa los datos e intenta de nuevo.",
    /** Solo por completitud de tipo: WP-10 nunca devuelve este código para
     * el actor `owner` (`errores.reserva` es la ruta real, del lado
     * cliente). Texto neutral porque no debería mostrarse nunca (revisión
     * de seguridad, 2026-09-27: evitar una narrativa específica —"cuenta
     * congelada"— que la dueña podría ver sin que sea la causa real). */
    business_unavailable: "No se pueden crear ni mover reservas por ahora.",
    network: "No pudimos conectar. Revisa tu conexión e intenta de nuevo.",
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// reserva: /[slug] — F5, F8 para el cliente
// ---------------------------------------------------------------------------

/** Única fuente del texto de `reserva.waitlist.terminos` (y de su alias
 * temporal `reserva.terminosListaEspera` más abajo), para que no existan
 * dos copias que puedan desalinearse. */
const TERMINOS_LISTA_ESPERA =
  "Acepto recibir por WhatsApp el aviso si se libera una hora.";

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
    /** Casilla de consentimiento para unirse a la lista de espera (WP-13):
     * es una acción distinta de "Confirmar reserva", así que se versiona
     * aparte de `consentimientos.version` (pedido de revisión,
     * 2026-09-27). El hash se registra en `es-CL.test.ts` junto al de
     * `consentimientos`. */
    terminos: TERMINOS_LISTA_ESPERA,
    consentimientoVersion: "lista-espera-2026-10-v1",
  },
  /**
   * @deprecated Alias temporal de `reserva.waitlist.terminos` (revisión de
   * seguridad, 2026-09-27), para que WP-13 no se rompa si mergea antes de
   * cambiar su referencia. Bórralo junto con el import en WP-13; no lo uses
   * en código nuevo.
   */
  terminosListaEspera: TERMINOS_LISTA_ESPERA,
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
  /** Versión "2026-10-v2" (borrador, ver R8 del plan): pendiente de revisión
   * de un abogado antes de WP-27. Si cambias `terminos`, `terminosLinkTexto`,
   * `politicaLinkTexto`, `privacidadLinkTexto`, `responsable`, `marketing`,
   * `antesDeConfirmar.avisoWhatsapp`, `antesDeConfirmar.politicaCancelacion`
   * o (desde v2) `abono.reserva.condiciones`, sube `version` y registra el
   * nuevo hash en `es-CL.test.ts` (`HASHES`). v1 queda registrada en el
   * archivo de hashes aunque ya no se use (GUIA §7, archivo inmutable). */
  consentimientos: {
    version: "2026-10-v2",
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
  agregarProfesional: AGREGAR_PROFESIONAL,
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
      /** true mientras `brand.domain` sea `null` (pregunta 3 / D-001): la
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
  /** Correos de acceso (Supabase Auth, WP-03b paso 2, F1). Son textos fijos
   * (no funciones): las variables `{{ .ConfirmationURL }}` y `{{ .Token }}`
   * son sintaxis de plantilla de Supabase, no interpolación de `es-CL.ts`,
   * y deben quedar literales para que WP-15 las copie tal cual a
   * `supabase/templates/*.html` (pregunta 3 del plan, R9). `brand.name`
   * aparece una vez en cada asunto, como remitente. */
  acceso: {
    magicLink: {
      asunto: `Tu link para entrar a ${brand.name}`,
      cuerpo: `Haz clic en este link para entrar a tu cuenta:\n\n{{ .ConfirmationURL }}\n\nO escribe este código en la pantalla de acceso: {{ .Token }}\n\nEl link y el código vencen en 15 minutos. Si no pediste este correo, puedes ignorarlo.\n\nNo compartas este código con nadie. Nunca te lo vamos a pedir por WhatsApp ni por teléfono.`,
    },
    confirmation: {
      asunto: `Confirma tu cuenta de ${brand.name}`,
      cuerpo: `Haz clic en este link para confirmar tu cuenta y entrar:\n\n{{ .ConfirmationURL }}\n\nO escribe este código en la pantalla de acceso: {{ .Token }}\n\nEl link y el código vencen en 15 minutos. Si no creaste esta cuenta, puedes ignorar este correo.\n\nNo compartas este código con nadie. Nunca te lo vamos a pedir por WhatsApp ni por teléfono.`,
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
  numeroEntero: (p: { min: number; max: number }): string =>
    `Escribe un número entero entre ${p.min} y ${p.max}.`,
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
    cuentaNueva: "Si es tu primera vez, creamos tu cuenta al tiro.",
  },
  enviado: {
    titulo: "Revisa tu correo",
    enviadoA: (p: { email: string }): string =>
      `Te enviamos un link a ${p.email}.`,
    codigoLabel: "O escribe el código de 6 dígitos",
    reenviarEn: (p: { segundos: number }): string =>
      `Reenviar en ${p.segundos} s`,
    reenviar: "Reenviar",
    usarOtroCorreo: "Usar otro correo",
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
  },
  sesionCerrada: "Cerraste tu sesión.",
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
    addressLabel: "Dirección (opcional)",
    addressPlaceholder: "Calle y número",
  },
  /** Claves = valores guardados en `businesses.category` (pregunta 8 del plan
   * de WP-03b). La lista de comunas es dato, no copy: vive en WP-15. */
  rubros: {
    barberia: "Barbería",
    peluqueria: "Peluquería",
    estetica: "Estética",
    unas: "Uñas",
    cejas_pestanas: "Cejas y pestañas",
    masajes: "Masajes",
    kinesiologia: "Kinesiología",
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
// onboarding: cuenta nueva en 4 pasos (F1, "menos de 10 minutos")
// ---------------------------------------------------------------------------

/** Forma sin género para quien atiende sin equipo (revisión de seguridad,
 * 2026-09-27: "trabajas solo/sola" obligaba a elegir género). Compartida
 * entre `onboarding.intro.equipo` y `profesionales.vacio`. */
const AGREGA_EQUIPO_VACIO =
  "Agrega a las personas que atienden. Si atiendes sin equipo, agrégate a ti.";

export const onboarding = {
  bienvenida: "Configura tu agenda en 4 pasos, toma menos de 10 minutos.",
  paso: (p: { n: number; total: number }): string =>
    `Paso ${p.n} de ${p.total}`,
  /** Mismos nombres que las secciones equivalentes en `ajustes.secciones`
   * cuando significan lo mismo (§5 del plan: "mismo vocabulario"). */
  pasos: {
    servicios: "Servicios",
    equipo: "Equipo",
    horario: "Horario",
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
  },
  avisoSinServicios:
    "Tu página no recibe reservas hasta que agregues un servicio.",
  /** Aviso genérico al saltar cualquier paso (`ctaSaltar`), distinto de
   * `avisoSinServicios` (que es específico del paso de servicios). */
  pasoOmitidoAviso: (p: { seccion: string }): string =>
    `Saltaste este paso. Puedes completarlo después en Ajustes → ${p.seccion}.`,
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
    bufferLabel: "Tiempo extra después",
    bufferAyuda: "Para limpiar o preparar. El cliente no lo ve.",
    categoryLabel: "Categoría (opcional)",
    profesionalesLabel: "¿Quién lo hace?",
    mostrarEnPaginaLabel: "Mostrar en la página de reservas",
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
  },
  reglas: {
    minNoticeLabel: "Anticipación mínima",
    maxDaysAheadLabel: (p: { n: number }): string =>
      `Reservas con hasta ${p.n} días de anticipación`,
    cancelWindowLabel: "Plazo para cancelar o cambiar",
    cancelWindowAyuda:
      "Este número se lo mostramos al cliente antes de confirmar y en la confirmación por WhatsApp.",
    slotIntervalLabel: "Cada cuánto se ofrecen horas",
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
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// clientes: Clientes (F9) — lista, ficha, notas y consentimientos
// ---------------------------------------------------------------------------

export const clientes = {
  lista: {
    buscarPlaceholder: "Buscar por nombre o celular",
    columnaUltimaVisita: "Última visita",
    columnaVisitas: "Visitas",
    columnaInasistencias: "Inasistencias",
    vacio: "Todavía no tienes clientes.",
    sinResultados: (p: { busqueda: string }): string =>
      `No encontramos clientes para "${p.busqueda}".`,
  },
  ficha: {
    clienteDesde: (p: { fecha: string }): string => `Cliente desde ${p.fecha}`,
    visitas: (p: { n: number }): string =>
      `${p.n} ${p.n === 1 ? "visita" : "visitas"}`,
    inasistencias: (p: { n: number }): string =>
      `${p.n} ${p.n === 1 ? "inasistencia" : "inasistencias"}`,
    historialTitulo: "Historial",
    proximasTitulo: "Próximas reservas",
    ctaNuevaReserva: "Nueva reserva",
    ctaLlamar: "Llamar",
    ctaWhatsapp: "Escribir por WhatsApp",
    ctaVerFicha: "Ver ficha",
  },
  notas: {
    label: "Notas",
    /** Mismo texto que `agenda.manual.notasAyuda`: ver `NOTAS_AYUDA` junto
     * a `agenda` (revisión de seguridad, 2026-09-27: menciona el derecho
     * del cliente a pedir copia de sus datos). */
    ayuda: NOTAS_AYUDA,
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
  /** SegmentedControl ≤ 7 caracteres (§5 del plan). */
  periodos: {
    hoy: "Hoy",
    semana: "Semana",
    mes: "Mes",
  },
  /** Mismo patrón que `agenda.semana` para la semana. */
  periodo: (p: { desde: string; hasta: string }): string =>
    `Del ${p.desde} al ${p.hasta}`,
  resumen: {
    cobrado: "Cobrado",
    porCobrar: "Por cobrar",
    abonosMercadopago: "Abonos por Mercado Pago",
    reservasCount: (p: { n: number }): string =>
      `${p.n} ${p.n === 1 ? "reserva" : "reservas"}`,
    /** Explica qué cuenta como "cobrado" (F10: "las sumas cuadran con las
     * reservas"): pagos `approved` con `paid_at` dentro del período en
     * America/Santiago, menos los `refunded`. */
    explicacion:
      "Suma los pagos aprobados dentro del período (hora de Santiago), menos los devueltos.",
  },
  /** `payment_method` (DB enum): las cuatro etiquetas, para mostrar cómo
   * quedó pagada una reserva (incluida una ya pagada por Mercado Pago). El
   * selector de "Marcar como pagada" solo debe ofrecer
   * `CAJA_METODOS_MANUALES` (sin `mercadopago`, D-022). */
  metodo: {
    cash: "Efectivo",
    card_terminal: "Débito o crédito",
    transfer: "Transferencia",
    mercadopago: "Mercado Pago",
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
  },
  vacioPeriodo: "No hay pagos en este período.",
  vacioDia: "No tienes reservas este día.",
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
// landing: página pública de marketing (no tiene `.dc.html` de referencia:
// no hay prueba de paridad de diseño, solo de tono y de marca, igual que las
// exportaciones de WP-03b). Mismas reglas de GUIA_DE_ESTILO.md, más una
// propia: ningún texto estático puede contener el verbo "llenar" en 3.ª
// persona singular, porque coincide con `brand.name` y
// activaría el mismo patrón que protege el nombre del producto (regla dura
// 10). Por eso acá se dice "llenar tu agenda", "se ocupa sola", "llenó" en
// pretérito, nunca esa forma: la única fuente de la frase del lema es
// `brand.tagline`, recibida como parámetro en `hero.titulo`.
//
// Los precios (heltal CLP, regla dura 5) no caben en `Trad` (solo strings o
// funciones que devuelven string), así que viven aparte en `PLANES_LANDING`,
// mismo patrón que `plantillasWhatsapp`/`CAJA_METODOS_MANUALES`: la UI los
// formatea con `src/lib/format/` (WP-04), igual que cualquier otro monto.
// ---------------------------------------------------------------------------

/** Mismo botón en el hero y en el cierre de la página (una sola fuente). */
const LANDING_CTA_CREAR_GRATIS = "Crear mi agenda gratis";

/** Mismo consejo que `inicio.tuLink.ayuda` (GUIA §4: mismo vocabulario para
 * el mismo concepto, en dos lugares distintos). */
const LANDING_PEGALO_EN_INSTAGRAM =
  "Pégalo en tu Instagram y compártelo por WhatsApp.";

export const landing = {
  meta: {
    titulo: (p: { nombre: string }): string =>
      `${p.nombre} — reservas online para tu negocio`,
    /** ≤ 155 caracteres (con `brand.name` real, ver `es-CL.landing.test.ts`). */
    descripcion: (p: { nombre: string }): string =>
      `${p.nombre} es el sistema de reservas para barberías, peluquerías, estética y kinesiología. Tus clientes reservan solos con un link. Prueba gratis.`,
  },
  nav: {
    precios: "Precios",
    preguntas: "Preguntas",
    entrar: "Entrar",
    ctaCrearAgenda: "Crear mi agenda",
  },
  hero: {
    /** Recibe la tagline como parámetro (nunca escrita a mano acá, regla
     * dura 10): quien arma la pantalla la llama con `brand.tagline`. */
    titulo: (p: { tagline: string }): string => p.tagline,
    subtitulo:
      "El sistema de reservas para barberías, peluquerías, estética y kinesiología. Tus clientes reservan solos con un link, sin llamadas ni mensajes uno a uno.",
    ctaPrimario: LANDING_CTA_CREAR_GRATIS,
    ctaSecundario: "Ver una agenda de ejemplo",
  },
  comoFunciona: {
    titulo: "Cómo funciona",
    pasos: {
      crear: {
        titulo: "Crea tu agenda",
        texto: "Cárgala en minutos: tus servicios, tu equipo y tus horarios.",
      },
      compartir: {
        titulo: "Comparte tu link",
        texto: LANDING_PEGALO_EN_INSTAGRAM,
      },
      reservan: {
        titulo: "Recibe tus reservas",
        texto:
          "Tus clientes reservan solos, cuando quieran. Tú ves todo en tu agenda.",
      },
    },
  },
  beneficios: {
    titulo: "Todo lo que necesitas para llenar tu agenda",
    items: {
      linkPropio: {
        titulo: "Tu link de reservas",
        texto:
          "Una página con tu marca donde tus clientes reservan solos, sin apps que instalar.",
      },
      agendaPorProfesional: {
        titulo: "Agenda por profesional",
        texto:
          "Cada persona de tu equipo tiene su propio calendario y sus propios horarios.",
      },
      recordatorios: {
        titulo: "Recordatorios automáticos",
        texto:
          "Por WhatsApp en los planes pagados, por correo en el plan gratis. Menos olvidos, menos horas vacías.",
      },
      listaDeEspera: {
        titulo: "Lista de espera",
        texto:
          "Si alguien cancela, avisamos a quien está esperando y esa hora se ocupa sola.",
      },
      abono: {
        titulo: "Abono para reducir inasistencias",
        texto:
          "Pide un abono al reservar. La plata llega directo a tu propia cuenta de Mercado Pago.",
      },
      precioUnico: {
        titulo: "Un precio para todo tu local",
        texto:
          "Sin cobros por persona: pagas un solo precio, agregues el equipo que agregues.",
      },
    },
  },
  paraQuien: {
    titulo: "Para quién es",
    items: {
      barberias: "Barberías",
      peluquerias: "Peluquerías",
      esteticaYUnas: "Estética y uñas",
      kinesiologiaYMasajes: "Kinesiología y masajes",
    },
  },
  precios: {
    titulo: "Precios",
    subtitulo:
      "Precios en CLP al mes + IVA. 30 días de prueba en planes pagados, sin permanencia.",
    /** Sin comprometer un número exacto de cupos: GO_TO_MARKET.md todavía
     * los deja como rango ("50–100"). */
    fundador:
      "Los primeros negocios que se suman pagan la mitad para siempre (plan Fundador).",
  },
  preguntas: {
    titulo: "Preguntas frecuentes",
    items: {
      instalar: {
        pregunta: "¿Necesito instalar algo?",
        respuesta:
          "No. Todo funciona desde el navegador, tanto para ti como para tus clientes.",
      },
      comoReservan: {
        pregunta: "¿Cómo reservan mis clientes?",
        respuesta:
          "Entran a tu link, eligen servicio, profesional y hora, y quedan confirmados al tiro. Sin llamadas ni conversar por WhatsApp.",
      },
      noLlego: {
        pregunta: "¿Qué pasa si alguien no llega?",
        respuesta:
          'Marcas "No vino" en tu agenda y, si pediste abono, tú decides qué hacer con esa plata.',
      },
      permanencia: {
        pregunta: "¿Tiene permanencia?",
        respuesta:
          "No. Los planes pagados tienen 30 días de prueba y puedes cambiarte de plan o darte de baja cuando quieras.",
      },
      datos: {
        pregunta: "¿Qué pasa con mis datos y los de mis clientes?",
        respuesta:
          "Son tuyos. Puedes exportarlos o pedir que los eliminemos cuando quieras.",
      },
      ayudaConfig: {
        pregunta: "¿Me ayudan a configurarlo?",
        respuesta:
          "En el onboarding la dejas lista en minutos. Si prefieres, también te acompañamos por WhatsApp.",
      },
    },
  },
  ctaFinal: {
    titulo: "¿Lista para dejar de perder horas?",
    texto:
      "Crea tu cuenta gratis, sin tarjeta de crédito. Si quieres WhatsApp y lista de espera, tienes 30 días de prueba en los planes pagados.",
    boton: LANDING_CTA_CREAR_GRATIS,
  },
  footer: {
    texto: "El sistema de reservas para pymes chilenas.",
    links: {
      precios: "Precios",
      entrar: "Entrar",
    },
    hechoEnSantiago: "Hecho en Santiago.",
  },
} as const satisfies Trad;

/** Un plan de precios de la landing (WP-XX, sin `.dc.html` de referencia).
 * `precioClp` es un heltal CLP (regla dura 5): la UI lo formatea con
 * `src/lib/format/` como cualquier otro monto, en vez de guardar acá un
 * string ya formateado que quedaría desactualizado si cambia el criterio de
 * formato. No vive dentro de `landing` porque `Trad` no admite números ni
 * arrays (mismo motivo que `plantillasWhatsapp`/`CAJA_METODOS_MANUALES`). */
export interface PlanLanding {
  readonly id: "gratis" | "emprende" | "equipo" | "local";
  readonly nombre: string;
  /** Heltal CLP, 0 para el plan Gratis. */
  readonly precioClp: number;
  readonly puntos: readonly string[];
  readonly cta: string;
}

/** Contenido de GO_TO_MARKET.md §Prissättning, en el mismo orden. */
export const PLANES_LANDING: readonly PlanLanding[] = [
  {
    id: "gratis",
    nombre: "Gratis",
    precioClp: 0,
    puntos: [
      "1 profesional",
      "Tu link de reservas",
      "Calendario",
      "Recordatorios por correo",
    ],
    cta: "Elegir Gratis",
  },
  {
    id: "emprende",
    nombre: "Emprende",
    precioClp: 9990,
    puntos: [
      "1 profesional",
      "Recordatorios por WhatsApp (~150 al mes)",
      "Lista de espera",
      "Tarjeta de sellos digital",
      "Abono para reservar",
    ],
    cta: "Elegir Emprende",
  },
  {
    id: "equipo",
    nombre: "Equipo",
    precioClp: 19990,
    puntos: [
      "Hasta 5 profesionales",
      "~600 WhatsApp al mes",
      "Horas flash",
      "Te echamos de menos",
      "Informes",
    ],
    cta: "Elegir Equipo",
  },
  {
    id: "local",
    nombre: "Local",
    precioClp: 34990,
    puntos: [
      "Hasta 12 profesionales",
      "Más WhatsApp incluido",
      "Soporte prioritario",
    ],
    cta: "Elegir Local",
  },
];
