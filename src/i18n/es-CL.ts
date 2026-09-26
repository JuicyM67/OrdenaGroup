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
    slotTaken: "Alguien tomó esa hora recién, elige otra.",
    tooSoon: "Es muy pronto para reservar esta hora, elige una más adelante.",
    outsideHours: "Ese horario ya no está disponible.",
    network: "No pudimos conectar. Revisa tu conexión e intenta de nuevo.",
    waitlistDuplicate: "Ya estás en la lista de espera para este día.",
    nombreVacio: "Escribe tu nombre.",
    consentimientoRequerido: "Acepta los términos para continuar.",
    /** Códigos de `chileanMobileInputSchema` (src/lib/format/schemas.ts,
     * WP-04) para el celular del cliente en Reserva. El teléfono del
     * negocio (móvil o fijo) y los esquemas de CLP, RUT, fecha y hora son de
     * WP-03b. */
    telefono: {
      invalidType: "Ingresa un número válido.",
      empty: "Escribe tu número de teléfono.",
      invalidChars: "Usa solo números, por ejemplo +56 9 1234 5678.",
      notChilean: "Por ahora solo aceptamos números chilenos (+56).",
      invalidLength: "Ese número no tiene la cantidad correcta de dígitos.",
      notMobile: "Escribe un celular chileno, por ejemplo +56 9 1234 5678.",
    },
  },
  agenda: {
    slotTaken: "Esa hora ya se ocupó. Elige otra.",
    outsideHours: "Ese horario está fuera del horario de atención.",
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
  },
  pasos: {
    servicio: "1 · Elige el servicio",
    profesional: "2 · ¿Con quién?",
    cualquiera: "Cualquiera",
    diaYHora: "3 · Día y hora",
  },
  duracion: (p: { minutos: number }): string => `${p.minutos} min`,
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
    ctaEnLaLista: "En la lista",
  },
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
  /** Utilities. Versión "2026-10-v1" (utkast, ver R8 del plan): pendiente de
   * revisión de un abogado antes de WP-27. Si cambias `terminos` o
   * `marketing`, sube `version` (el test lo obliga). */
  consentimientos: {
    version: "2026-10-v1",
    terminos: "Acepto los términos de la reserva y la política de cancelación.",
    terminosLinkTexto: "los términos de la reserva",
    politicaLinkTexto: "la política de cancelación",
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
    cuerpo: "Le avisaremos al negocio y liberamos tu hora para otra persona.",
    ctaSi: "Sí, cancelar",
    ctaNo: "No, mantener",
  },
  fueraDePlazo: (p: { horas: number; telefonoNegocio: string }): string =>
    `Ya pasó el plazo de ${p.horas} h para cancelar sola. Escribe al ${p.telefonoNegocio} para ver otras opciones.`,
  yaCancelada: "Esta reserva ya fue cancelada.",
  yaPaso: "Esta reserva ya pasó.",
  linkInvalido: "Este link no es válido.",
  linkVencido: "Este link ya venció.",
  cambioConfirmado: "Listo, tu hora quedó cambiada.",
  cancelacionConfirmada: "Listo, tu reserva quedó cancelada.",
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// inicio: Main.dc.html — F6 para el dueño (desktop)
// ---------------------------------------------------------------------------

export const inicio = {
  titulo: "Inicio",
  metaRow: (p: { fecha: string; negocio: string; comuna: string }): string =>
    `${p.fecha} · ${p.negocio}, ${p.comuna}`,
  hola: (p: { nombre: string }): string => `Hola, ${p.nombre}`,
  hero: {
    titulo: "Tu agenda se llenó sola esta semana",
    tituloVacio: "Esta semana todavía no recuperaste horas",
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
    compartir: "Compartir hora flash",
    detalle: (p: { servicio: string; profesional: string }): string =>
      `${p.servicio} con ${p.profesional}`,
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// agenda: Agenda.dc.html — F6 para el dueño (semana, día, popover)
// ---------------------------------------------------------------------------

export const agenda = {
  panel: {
    profesionales: "Profesionales",
    reservasCount: (p: { n: number }): string =>
      `${p.n} ${p.n === 1 ? "reserva" : "reservas"}`,
    mostrar: "Mostrar",
    horasFlash: "Horas flash",
    desdeListaDeEspera: "Desde lista de espera",
    bloqueosYAlmuerzo: "Bloqueos y almuerzo",
    esperanEl: (p: { n: number; dia: string }): string =>
      `${p.n} ${p.n === 1 ? "espera" : "esperan"} el ${p.dia}`,
    avisoWhatsapp: "Se avisa solo por WhatsApp",
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
  diaCerrado: "Cerrado",
  columnaVacia: "Sin reservas en este horario.",
  popover: {
    titulo: "Detalle de la reserva",
    /** Ordinal femenino: "1.ª visita", "6.ª visita". */
    visita: (p: { n: number }): string => `${p.n}.ª visita`,
    conProfesional: (p: { profesional: string }): string =>
      `con ${p.profesional}`,
    pagoLinea: (p: { precio: string; monto: string }): string =>
      `${p.precio} · abono ${p.monto} pagado`,
    acciones: {
      llego: "Llegó",
      noVino: "No vino",
      mover: "Mover",
    },
    cerrar: "Cerrar",
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
    deshacer: "Deshacer",
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// hoy: Hoy.dc.html — F6 para el dueño (mobile)
// ---------------------------------------------------------------------------

export const hoy = {
  titulo: "Hoy",
  proximaReserva: "Próxima reserva",
  /** "Siguiente · {relativo}". `relativo` ya viene calculado (R7): nunca
   * calculamos tiempo relativo acá, para no equivocarnos con el horario de
   * verano ni con la medianoche. */
  siguiente: (p: { relativo: string }): string => `Siguiente · ${p.relativo}`,
  sinProximaReserva: "No tienes más clientes agendados hoy.",
  /** "{servicio} · con {profesional} · {visita}". `visita` es el resultado
   * de `hoy.visita`. */
  detalleCliente: (p: {
    servicio: string;
    profesional: string;
    visita: string;
  }): string => `${p.servicio} · con ${p.profesional} · ${p.visita}`,
  visita: (p: { n: number }): string => `${p.n}.ª visita`,
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
        fuente: "customers.first_name",
      },
      {
        numero: 3,
        significado: "Servicio",
        ejemplo: "Corte + barba",
        fuente: "services.name",
      },
      {
        numero: 4,
        significado: "Fecha (día explícito, no relativo)",
        ejemplo: "vie 2 oct",
        fuente: "bookings.starts_at (America/Santiago)",
      },
      {
        numero: 5,
        significado: "Hora",
        ejemplo: "15:00",
        fuente: "bookings.starts_at (America/Santiago)",
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
        fuente: "businesses.cancellation_window_hours",
      },
    ],
    footer: null,
    botones: [
      {
        tipo: "URL",
        texto: "Ver mi reserva",
        sufijo: {
          ejemplo: "a1B2c3D4",
          fuente: "bookings.management_token",
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
        fuente: "customers.first_name",
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
        ejemplo: "vie 2 oct",
        fuente: "bookings.starts_at (America/Santiago)",
      },
      {
        numero: 5,
        significado: "Hora",
        ejemplo: "15:00",
        fuente: "bookings.starts_at (America/Santiago)",
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
        fuente: "customers.first_name",
      },
      {
        numero: 3,
        significado: "Fecha de la hora cancelada",
        ejemplo: "vie 2 oct",
        fuente: "bookings.starts_at (America/Santiago)",
      },
      {
        numero: 4,
        significado: "Hora cancelada",
        ejemplo: "15:00",
        fuente: "bookings.starts_at (America/Santiago)",
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
    body: "Tu hora en {{1}} cambió, {{2}}: ahora es el {{3}} a las {{4}} con {{5}}.",
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
        fuente: "customers.first_name",
      },
      {
        numero: 3,
        significado: "Nueva fecha",
        ejemplo: "sáb 3 oct",
        fuente: "bookings.starts_at (America/Santiago)",
      },
      {
        numero: 4,
        significado: "Nueva hora",
        ejemplo: "11:30",
        fuente: "bookings.starts_at (America/Santiago)",
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
          ejemplo: "a1B2c3D4",
          fuente: "bookings.management_token",
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
    body: "Se liberó una hora en {{1}} para ti, {{2}}: {{3}} el {{4}} a las {{5}}. Tienes {{6}} min para responder antes de que se ofrezca a otra persona.",
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
        fuente: "customers.first_name",
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
        ejemplo: "vie 2 oct",
        fuente: "bookings.starts_at (America/Santiago)",
      },
      {
        numero: 5,
        significado: "Hora",
        ejemplo: "15:00",
        fuente: "bookings.starts_at (America/Santiago)",
      },
      {
        numero: 6,
        significado: "Minutos para responder",
        ejemplo: "15",
        fuente: "waitlist_offers.expires_at − now()",
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
        fuente: "customers.first_name",
      },
      {
        numero: 3,
        significado: "Día por el que sigue esperando",
        ejemplo: "sábado",
        fuente: "waitlist_entries.day",
      },
    ],
    footer: null,
    botones: [],
    nota: "Utility: informa el resultado de la propia oferta que se le hizo al cliente.",
  },
} as const satisfies Record<string, Plantilla>;

/** Mensajes de sesión: fritext dentro del ventana de 24 h del cliente, no se
 * envían a Meta para revisión. */
export const whatsappSesion = {
  confirmo: "¡Gracias por confirmar! Te esperamos.",
  necesitoCambiar: (p: { linkGestion: string }): string =>
    `Sin problema. Cambia tu hora aquí: ${p.linkGestion}`,
  listaEsperaConfirmada: (p: {
    servicio: string;
    fecha: string;
    hora: string;
  }): string =>
    `¡Lista! Tu hora de ${p.servicio} quedó para el ${p.fecha} a las ${p.hora}.`,
  listaEsperaYaTomada:
    "Esa hora ya fue tomada por otra persona. Sigues en la lista de espera.",
  listaEsperaNoGracias: "Listo, seguimos avisándote si se libera otra hora.",
  listaEsperaExpirada:
    "El tiempo para responder ya pasó. Te avisaremos si se libera otra hora.",
  noEntendido: (p: { telefonoNegocio: string }): string =>
    `No entendimos tu mensaje. Escribe directo al ${p.telefonoNegocio} si necesitas ayuda.`,
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
} as const satisfies Trad;
