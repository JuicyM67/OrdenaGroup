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
 * en 5 pasos (WP-51 agregó "Tu página"), el perfil del negocio (`negocio`) y el catálogo (`servicios`,
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

import { CTA_RESERVAR, numeroEntero } from "./es-CL.compartido";
import type { BotonPlantilla } from "./es-CL.panel";
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
    /** Código nuevo (seguridad, WP-27, pilotblockerare): demasiados intentos
     * desde el mismo IP, o ya hay demasiadas reservas futuras con este
     * número de teléfono en este negocio. */
    rate_limited: "Demasiados intentos. Prueba de nuevo en unos minutos.",
    /** WP-64: el pago online no se pudo iniciar; la reserva no quedó hecha. */
    payment_unavailable:
      "No pudimos iniciar el pago. Tu reserva no se hizo, inténtalo de nuevo.",
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
      /** Código nuevo (WP-M2, D-025/D-026): mismo caso que `not_chilean`,
       * nombre neutral para cuando el mercado activo determina el país
       * válido (no siempre Chile). Mismo texto que `not_chilean` por ahora;
       * las dos claves existen porque `not_chilean` sigue en uso mientras se
       * migra. */
      wrong_country: "Escribe un número de celular chileno.",
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
  /** WP-46 (D-034): cuando el servidor o la base de datos rechazan una
   * acción porque las siete banderas de `memberships` no la permiten (una
   * cuenta de personal, nunca el dueño). `accion` describe en minúscula lo
   * que se intentó hacer, para armar una sola frase ("No tienes permiso
   * para cancelar esta reserva."); `redirigido` es el aviso cuando además se
   * saca a la persona de una pantalla a la que no puede entrar (Ajustes →
   * Equipo, Caja, etc.), de vuelta a `/app/agenda`. */
  permiso: {
    generico: "No tienes permiso para hacer esto.",
    accion: (p: { accion: string }): string =>
      `No tienes permiso para ${p.accion}.`,
    redirigido:
      "No tienes permiso para ver esa página. Te llevamos a tu agenda.",
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
    ctaReservar: CTA_RESERVAR,
    ctaReservado: "¡Reservado!",
    /** WP-45: variante de `ctaReservado` cuando la reserva nace `requested`
     * (el negocio no confirma automático). */
    ctaSolicitudEnviada: "¡Solicitud enviada!",
  },
  clienteForm: {
    titulo: "Tus datos",
    nombreLabel: "Nombre",
    nombrePlaceholder: "Tu nombre",
    telefonoLabel: "Celular",
    telefonoPlaceholder: "+56 9 1234 5678",
    emailLabel: "Correo",
    emailAyuda: "Aquí te llegan la confirmación y el recordatorio.",
    emailPlaceholder: "tucorreo@ejemplo.cl",
  },
  /** WP-64 (D-044): pago online al reservar (Stripe Checkout). */
  pago: {
    opcionalLabel: "Pagar ahora con tarjeta",
    opcionalAyuda: "Pagas de forma segura en Stripe. Si no, pagas en el local.",
    obligatorioAviso:
      "Para reservar esta hora pagas con tarjeta. Al enviar te llevamos a la página de pago.",
    reservadoAviso:
      "El monto se reserva en tu tarjeta y se cobra cuando el negocio confirme tu hora. Si no la confirma, no se cobra nada.",
    okAviso: "Listo, recibimos tu pago. Te llega la confirmación por correo.",
    canceladoAviso:
      "No se hizo el pago. Tu solicitud sigue enviada y pagas en el local.",
    liberadaAviso:
      "No se hizo el pago, así que la hora quedó libre. Puedes reservar de nuevo.",
  },
  antesDeConfirmar: {
    politicaCancelacion: (p: { horas: number }): string =>
      `Puedes cancelar o cambiar la hora hasta ${p.horas} h antes, sin costo.`,
    avisoWhatsapp: (p: { negocio: string }): string =>
      `Te enviaremos la confirmación y un recordatorio por WhatsApp de ${p.negocio} a este número.`,
    /** WP-45: variante de `avisoWhatsapp` cuando el negocio tiene apagada la
     * confirmación automática (`auto_confirm_bookings = false`, el valor por
     * defecto). CL todavía no tiene plantilla de WhatsApp para "solicitud
     * recibida" (WP-22 pendiente), por eso el primer aviso es por correo. */
    avisoWhatsappSolicitud: (p: { negocio: string }): string =>
      `Si tu hora queda pendiente, te avisamos por correo; ya confirmada, la confirmación y el recordatorio llegan por WhatsApp de ${p.negocio}.`,
    ctaConfirmar: "Confirmar reserva",
    /** WP-45: variante de `ctaConfirmar` cuando el negocio tiene apagada la
     * confirmación automática: la reserva queda `requested`, no `confirmed`. */
    ctaEnviarSolicitud: "Enviar solicitud",
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
    descuentoSocio: (p: { descuento: string }): string =>
      `Descuento socio: −${p.descuento}`,
    /** WP-31: descuento por el link de una oferta (gana el mayor, no se suman). */
    descuentoOferta: (p: { descuento: string }): string =>
      `Descuento de tu oferta: −${p.descuento}`,
    verMiReserva: "Ver mi reserva",
  },
  /** WP-31: aviso en el flujo cuando la persona llega con `/{slug}?o=…`. */
  oferta: {
    aviso: (p: { pct: number }): string =>
      `Tienes ${p.pct}% de descuento con tu oferta`,
  },
  /** WP-45 (D-033): pantalla de confirmación cuando la reserva nace
   * `requested` (el negocio no confirma automático), en vez de
   * `reserva.confirmacion`. */
  confirmacionSolicitud: {
    titulo: "¡Solicitud enviada!",
    resumenTitulo: "Resumen de tu solicitud",
    aviso: (p: { negocio: string }): string =>
      `Te avisaremos por correo cuando ${p.negocio} confirme tu hora.`,
    verMiSolicitud: "Ver mi solicitud",
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

// ---------------------------------------------------------------------------
// formulario: categorías de servicios y preguntas del formulario de reserva
// (WP-40, D-031). Cubre Ajustes → "Formulario de reserva" (vy A,
// `.visual-diff/ref/falt-A-bokningsformular.html`), la pestaña "Frågor vid
// bokning" de un servicio (vy B, `falt-B-per-tjanst.html`) y las categorías
// de Servicios (`falt-kategorier.html`). Se agrega al final del archivo
// (mismo criterio que las áreas de WP-03b, ver `docs/content/README.md`):
// evita conflictos con otros paquetes que también tocan `es-CL.ts`.
//
// Las tres referencias de arriba son bocetos en sueco (`.visual-diff/ref/`,
// no `docs/design/reference/*.dc.html`): no hay paridad palabra a palabra
// que revisar acá (mismo caso que WP-03b, R1 de su plan), solo las reglas
// de tono y marca de siempre (GUIA_DE_ESTILO.md). Las sugerencias de
// preguntas por rubro viven aparte, en
// `src/i18n/presets/booking-questions.es-CL.ts` (D-031: "los presets viven
// en código", no acá ni en la base de datos).
// ---------------------------------------------------------------------------

export const formulario = {
  sinPreguntas: "Todavía no agregas preguntas.",
  /** Fila fija "Nombre, teléfono y correo" en vy A: siempre está en el
   * formulario, no se puede apagar ni mover (`falt-A`, fila "Låst"). */
  candado: {
    titulo: "Nombre, teléfono y correo",
    ayuda: "Siempre está en el formulario.",
    etiqueta: "Fijo",
  },
  preguntasContador: (p: { n: number; max: number }): string =>
    `Preguntas al cliente · ${p.n} de ${p.max}`,
  sugerencias: {
    /** `bransch` llega ya en español, de
     * `BOOKING_QUESTION_INDUSTRY_LABELS` (`src/i18n/presets/`), en
     * minúscula porque va a mitad de frase (GUIA §3): "Sugerencias para
     * peluquerías". */
    titulo: (p: { bransch: string }): string => `Sugerencias para ${p.bransch}`,
    cuerpo: (p: { n: number }): string =>
      `${p.n} ${p.n === 1 ? "pregunta típica" : "preguntas típicas"} que puedes activar. Tú decides cuáles.`,
    ctaVer: "Ver sugerencias",
    ctaOcultar: "Ocultar sugerencias",
  },
  ctaNuevaPregunta: "+ Nueva pregunta",
  /** `question_kind` (DB enum, WP-40 paso 1): mismo orden que
   * `BookingQuestionKind` en `src/i18n/presets/booking-questions.es-CL.ts`. */
  tipos: {
    short_text: "Texto corto",
    long_text: "Texto largo",
    single_choice: "Opción única",
    multi_choice: "Varias opciones",
    number: "Número",
    yes_no: "Sí/no",
    date: "Fecha",
  },
  obligatoria: "Obligatoria",
  opcional: "Opcional",
  todosLosServicios: "Todos los servicios",
  /** Insignia corta junto a una pregunta con `saveToCustomer`/
   * `save_to_customer` activo (`falt-A`, "Sparas på kundkortet"). */
  guardaEnFicha: "Se guarda en la ficha",
  preview: {
    /** "Así lo ve tu cliente · {servicio}" (`falt-A`, panel de la derecha).
     * Los campos del propio formulario dentro del teléfono reutilizan
     * `reserva.clienteForm.*` y `reserva.antesDeConfirmar.ctaConfirmar`: no
     * hay copy nuevo para ellos acá. */
    titulo: (p: { servicio: string }): string =>
      `Así lo ve tu cliente · ${p.servicio}`,
  },
  categorias: {
    titulo: "Categorías",
    ctaNueva: "+ Nueva categoría",
    nameLabel: "Nombre de la categoría",
    namePlaceholder: "Ej: Mujeres",
    ayuda:
      "Arrastra para ordenarlas. Se muestran como pestañas para tus clientes.",
    vacia: "Todavía no tiene servicios.",
    /** Grupo para los servicios sin categoría, en la lista de Ajustes →
     * Servicios (no es una categoría real, no tiene fila en
     * `service_categories`). */
    sinAsignar: "Sin categoría",
    ctaRenombrar: "Cambiar nombre",
    ctaEliminar: "Eliminar categoría",
    /** Borrar una categoría no borra sus servicios (`on delete set null`,
     * plan de WP-40 paso 1): quedan en `sinAsignar`. */
    confirmarEliminar: {
      titulo: "¿Eliminar esta categoría?",
      cuerpo:
        "Sus servicios quedan sin categoría. Puedes asignarles otra cuando quieras.",
      ctaSi: "Sí, eliminar",
      ctaNo: comun.noMantener,
    },
    /** Pestaña "Todos" en la página de reservas del cliente, junto a las
     * pestañas por categoría, para cuando el negocio tiene más de una
     * (ui-engineer decide si la muestra: no está dibujada en
     * `falt-kategorier.html`, que solo tiene las pestañas por categoría). */
    pestanaTodas: "Todos",
  },
  /** vy B: pestaña "Frågor vid bokning" en la edición de un servicio
   * (`falt-B-per-tjanst.html`). Comparte datos y componentes con vy A (el
   * resto de las claves de `formulario`), filtrados a un solo servicio. */
  servicioPregunta: {
    pestanaDetalles: "Tiempo y precio",
    sinPreguntas: "Este servicio todavía no tiene preguntas.",
    sinMasSugerencias: "No quedan más sugerencias para este servicio.",
    pestana: "Preguntas al reservar",
    ctaDesdeSugerencias: (p: { bransch: string }): string =>
      `+ Desde sugerencias para ${p.bransch}`,
    ctaPreguntaPropia: "+ Pregunta propia",
    /** "también se usa en {servicios}" (`falt-B`, "används även i
     * Slingor"): `servicios` ya viene como lista formateada (ver
     * `horarios.intervalos` para el mismo patrón de armar una lista). */
    tambienUsadaEn: (p: { servicios: string }): string =>
      `también se usa en ${p.servicios}`,
    usarEnOtrosServicios: "Usar esta pregunta también en otros servicios",
    /** Quita la pregunta de este servicio (no la borra si se usa en otros;
     * `formulario.editor.ctaEliminar` sí la borra del todo). */
    ctaQuitar: "Quitar",
  },
  /** Panel "Gäller för" (`falt-kategorier.html`): a qué servicios apunta una
   * pregunta (`booking_question_targets`, plan de WP-40 paso 1). */
  aplicaA: {
    titulo: "Aplica a",
    todos: "Todos los servicios",
    elegidos: "Servicios elegidos",
    buscarPlaceholder: "Buscar servicio",
    todaLaCategoria: (p: { nombre: string }): string =>
      `Toda la categoría ${p.nombre}`,
    /** "{x} de {y}" servicios elegidos de esa categoría (`falt-kategorier`,
     * "3 av 3" / "1 av 2"). */
    seleccion: (p: { x: number; y: number }): string => `${p.x} de ${p.y}`,
    autoNuevosServicios:
      "Agrega la pregunta automáticamente a los servicios nuevos de las categorías elegidas.",
    ctaGuardar: (p: { n: number }): string =>
      `Guardar · ${p.n} ${p.n === 1 ? "servicio" : "servicios"}`,
  },
  /** Formulario de "Ny fråga"/"Egen fråga" (`falt-A`, `falt-B`): mismos
   * campos para crear una pregunta propia o editar una activada desde
   * sugerencias. */
  editor: {
    tituloNueva: "Nueva pregunta",
    etiquetaPropia: "Pregunta propia",
    preguntaLabel: "Pregunta para el cliente",
    preguntaPlaceholder: "Ej: ¿Qué color prefieres?",
    ayudaLabel: "Texto de ayuda (opcional)",
    tipoLabel: "Tipo de pregunta",
    obligatoriaLabel: "Obligatoria",
    alternativosLabel: "Alternativas",
    ctaAgregarAlternativa: "+ Agregar",
    ctaGuardar: "Guardar pregunta",
    ctaEliminar: "Eliminar pregunta",
  },
  /** Botones "Ja"/"Nej" del switch de obligatoria (`falt-B`) y, del lado
   * del cliente, de una pregunta de tipo `yes_no` en el formulario de
   * reserva. */
  siNo: {
    si: "Sí",
    no: "No",
  },
  /** Caja de aviso en vy A/B (`falt-B`, pie de la tarjeta): versión en
   * español de Chile del boceto en sueco (que menciona el GDPR, que no
   * aplica acá). Ley 21.719, no diagnósticos ni RUT — mismo criterio que
   * `servicios.campos.nombreAyuda` y GUIA §9/§9.1. Revisado por
   * security-reviewer (plan de WP-40 paso 8, §6). */
  avisoDatosSensibles:
    "No preguntes por salud, diagnósticos ni RUT. Esos datos necesitan protección especial según la Ley 21.719.",
  errores: {
    /** Tope duro del servidor (plan de WP-40 paso 3, §6): 5 preguntas por
     * servicio, contando las que llegan por categoría. */
    too_many_questions:
      "Ese servicio ya tiene 5 preguntas, el máximo. Quita una antes de agregar otra.",
    /** Nombres de código propuestos por `copywriter-es-cl` (mismo criterio
     * que `acceso.errores`/`validacion`): scheduling-engineer confirma los
     * códigos reales del esquema de Zod de
     * `src/lib/validation/booking-questions.ts` (plan de WP-40 paso 3) y
     * ajusta las claves si hace falta. Del lado del cliente en la página de
     * reservas, no del dueño en Ajustes (esas usan `validacion`). */
    respuesta: {
      required: "Responde esta pregunta para reservar.",
      invalid_option: "Elige una opción de la lista.",
      empty_selection: "Elige al menos una opción.",
      duplicate_option: "No repitas la misma opción.",
      too_long: (p: { max: number }): string =>
        `Escribe como máximo ${p.max} caracteres.`,
      invalid_number: "Escribe un número entero, sin decimales.",
      /** Mismo texto que `validacion.numeroEntero` (dueño en Ajustes): una
       * sola definición para "número entero entre X y Y". */
      out_of_range: numeroEntero,
      invalid_date: "Esa fecha no existe.",
      invalid_date_format: "Elige una fecha válida.",
    },
  },
  /** Cómo se muestran las respuestas ya guardadas: agenda (detalle de la
   * reserva), Hoy (tarjeta del cliente), la ficha del cliente y el correo
   * "Tienes una reserva nueva" al dueño (plan de WP-40 paso 8; el correo lo
   * arma integrations-engineer, plan paso 4). Una sola definición para las
   * cuatro pantallas. */
  visualizacion: {
    titulo: "Respuestas de la reserva",
    /** "{etiqueta}: {valor}", una respuesta por línea (para el correo en
     * texto plano y como base de la fila en agenda/Hoy/ficha). */
    par: (p: { etiqueta: string; valor: string }): string =>
      `${p.etiqueta}: ${p.valor}`,
    sinRespuestas: "No hay respuestas para esta reserva.",
  },
  toast: {
    categoriaCreada: "Categoría creada.",
    categoriaRenombrada: "Categoría actualizada.",
    categoriaEliminada: "Categoría eliminada.",
    preguntaGuardada: "Pregunta guardada.",
    preguntaEliminada: "Pregunta eliminada.",
    deshacer: comun.deshacer,
  },
} as const satisfies Trad;

// WP-72: recorrido guiado.
export { visita } from "./es-CL.visita";
export { smsCreditos } from "./es-CL.sms-creditos";
export { descubre } from "./es-CL.descubre";
export { cuenta } from "./es-CL.cuenta";
export { vales } from "./es-CL.vales";
export { suscripcion } from "./es-CL.suscripcion";
export { ofertas } from "./es-CL.ofertas";

// Textos de la app del negocio y mensajes: `es-CL.panel.ts` (JS-budget de `/[slug]`, D-039).
export {
  nav,
  estados,
  calendario,
  gestion,
  inicio,
  agenda,
  hoy,
  plantillasWhatsapp,
  whatsappSesion,
  email,
  validacion,
  acceso,
  invitacionNegocio,
  negocio,
  onboarding,
  servicios,
  profesionales,
  horarios,
  ajustes,
  clientes,
  campanas,
  CAJA_METODOS_MANUALES,
  caja,
  abono,
  sms,
  perfil,
  solicitudes,
  equipo,
  invitacion,
  redesSociales,
  baja,
  flashStory,
  flash,
  vOferta,
  uxTextos,
  resenas,
  importar,
  planes,
} from "./es-CL.panel";
export type { BotonPlantilla } from "./es-CL.panel";
