/**
 * Textos de la página pública (landing + sitio), separados de `es-CL.ts`
 * para que no entren al JS de las pantallas de la app (presupuesto de
 * `/r/[slug]`, FRÅGA 7). Solo los importa `src/i18n/marketing.ts` y sus
 * pruebas; `src/i18n/index.ts` no los reexporta.
 */
import type { Trad } from "./index";

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
    /** Pequeña etiqueta sobre el título (rediseño del hero: tarjeta lima a
     * la izquierda, imagen de producto a la derecha, banda oscura debajo). */
    etiqueta: "Reservas para tu local",
    /** Recibe la tagline como parámetro (nunca escrita a mano acá, regla
     * dura 10): quien arma la pantalla la llama con `brand.tagline`. */
    titulo: (p: { tagline: string }): string => p.tagline,
    subtitulo:
      "El sistema de reservas para barberías, peluquerías, estética y kinesiología. Tus clientes reservan solos con un link, sin llamadas ni mensajes uno a uno.",
    ctaPrimario: LANDING_CTA_CREAR_GRATIS,
    ctaSecundario: "Ver una agenda de ejemplo",
    /** aria-label de la imagen de producto a la derecha del hero (rediseño,
     * sin `.dc.html` de referencia todavía). */
    vistaPreviaAria: "Vista previa de la agenda y de una reserva",
  },
  /** Banda oscura con tres cifras debajo del hero (rediseño). Solo hechos
   * verificables (GUIA §11: "no promete nada que no esté en los documentos
   * de producto"), nunca un porcentaje inventado de inasistencias evitadas:
   * `minutos` repite el tiempo de `onboarding.bienvenida` ("menos de 10
   * minutos", MVP_SPEC.md F1), `comision` repite que el precio es único por
   * local (`landing.beneficios.items.precioUnico`), sin cobro por reserva. */
  heroStats: {
    siempreAbierto: {
      valor: "24/7",
      etiqueta: "Tus clientes reservan cuando quieren, de día o de noche.",
    },
    minutos: {
      valor: "10 min",
      etiqueta: "Es lo que toma armar tu agenda con los pasos guiados.",
    },
    comision: {
      valor: "$0",
      etiqueta: "No cobramos comisión por cada reserva que recibes.",
    },
    texto:
      "Reservas todo el día, sin llamadas ni mensajes de ida y vuelta. Tú ves cada hora ordenada en tu agenda.",
    cta: "Ver cómo funciona",
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
          "Por correo, con WhatsApp próximamente en los planes pagados. Menos olvidos, menos horas vacías.",
      },
      listaDeEspera: {
        titulo: "Lista de espera",
        texto:
          "Si alguien cancela, avisamos a quien está esperando y esa hora se ocupa sola.",
      },
      abono: {
        titulo: "Abono para reducir inasistencias",
        texto:
          "Próximamente: pide un abono al reservar. La plata llegará directo a tu propia cuenta de Mercado Pago.",
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
      "Crea tu cuenta gratis, sin tarjeta de crédito. Si quieres lista de espera y los demás extras, tienes 30 días de prueba en los planes pagados.",
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
      "Recordatorios por correo",
      "Lista de espera",
      "Abono para reservar (próximamente)",
    ],
    cta: "Elegir Emprende",
  },
  {
    id: "equipo",
    nombre: "Equipo",
    precioClp: 19990,
    puntos: [
      "Hasta 3 profesionales",
      "Recordatorios por correo",
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
      "Hasta 10 profesionales",
      "Recordatorios por correo",
      "Soporte prioritario",
    ],
    cta: "Elegir Local",
  },
];

// ---------------------------------------------------------------------------
// sitio: sitio público completo — nav, footer y las páginas de marketing más
// allá de la landing de una sola página (`landing`). Mismas reglas que
// `landing` (GUIA §11: tú, sin voseo, acá sí se puede vender). El nombre del
// producto nunca se escribe a mano (regla dura 10): entra como `{ nombre }`
// en cada `meta`. Reutiliza texto de `landing` donde el concepto es el mismo
// (GUIA §4, "mismo vocabulario"), en vez de duplicarlo.
//
// Lo que trae lista o número (secciones de Funcionalidades, filas de la
// tabla de Precios, contenido por rubro de Para quién) no cabe en `Trad`
// (mismo motivo que `PLANES_LANDING`): vive en `SITIO_FUNCIONALIDADES`,
// `SITIO_PRECIOS_TABLA` y `SITIO_PARA_INDUSTRIAS`, después de `sitio`.
// ---------------------------------------------------------------------------

/** Mismo botón de conversión en todas las páginas del sitio (una sola
 * fuente, como `LANDING_CTA_CREAR_GRATIS` dentro de `landing`). */
const SITIO_CTA = LANDING_CTA_CREAR_GRATIS;

/** Mismo nombre de rubro en el submenú de navegación, el pie de página y el
 * índice de "Para quién" (GUIA §4). */
const SITIO_INDUSTRIA = {
  barberias: "Barberías",
  peluquerias: "Peluquerías",
  estetica: "Estética",
  kinesiologia: "Kinesiología",
} as const;

const SITIO_PROXIMAMENTE = "Próximamente";

export const sitio = {
  nav: {
    /** Único trigger con menú desplegable (WP-43, "Nav A": 4 palabras en la
     * barra, solo "Producto" abre un panel). */
    producto: "Producto",
    /** Ahora es un link plano a la sección "Para quién" de la portada, sin
     * submenú propio (WP-43, "Nav A"). */
    paraQuien: "Para quién",
    precios: "Precios",
    /** Mismo texto que `ventajas.hero.etiqueta` (GUIA §4, mismo concepto):
     * lleva a esa página. */
    porQue: "Por qué elegirnos",
    entrar: "Entrar",
    ctaCrearAgenda: landing.nav.ctaCrearAgenda,
    /** Botón para cerrar el megamenú de escritorio o el menú de celular,
     * cuando ya está abierto (WP-hemsida). */
    cerrar: "Cerrar",
  },
  /** Contenido del panel de "Producto" (WP-43, "Nav A"): una sola columna de
   * seis ítems (icono + una línea de explicación) más la tarjeta destacada
   * que promociona Horas flash. Ya no hay secciones separadas de "Para
   * quién"/"Recursos": esos temas ahora son palabras planas de la barra
   * (`nav.paraQuien`, `nav.precios`, `nav.porQue`). `texto` de cada ítem mide
   * ~60 caracteres o menos (cabe en la columna del menú); los títulos no
   * tienen ese límite. */
  megamenu: {
    titulo: "Todo en uno",
    items: {
      reservas: {
        titulo: "Reservas",
        texto: "Tu link de reservas, listo para compartir.",
      },
      agenda: {
        titulo: "Agenda",
        texto: "Tu agenda semanal, por profesional.",
      },
      recordatorios: {
        titulo: "Recordatorios",
        texto: "Recordatorios automáticos por correo.",
      },
      listaEspera: {
        titulo: "Lista de espera",
        texto: "Cuando alguien cancela, la hora se ocupa sola.",
      },
      /** Mismo concepto que `ventajas.diferencias.items.d` (GUIA §4), acá en
       * una sola línea corta. */
      preguntas: {
        titulo: "Preguntas de tu rubro",
        texto: "El formulario se adapta a tu negocio.",
      },
      verTodas: {
        titulo: "Ver todas las funcionalidades",
        texto: "Revisa la lista completa.",
      },
    },
    destacado: {
      etiqueta: "Nuevo",
      titulo: "Horas flash",
      texto: "Vende tus horas libres con descuento antes de perderlas.",
      cta: "Descubre cómo funciona",
    },
  },
  footer: {
    descripcion: (p: { nombre: string }): string =>
      `${p.nombre}, el sistema de reservas para pymes chilenas: barberías, peluquerías, estética y kinesiología.`,
    columnas: {
      producto: "Producto",
      paraQuien: "Para quién",
      empresa: "Empresa",
    },
    links: {
      funcionalidades: "Funcionalidades",
      precios: "Precios",
      preguntas: "Preguntas",
      contacto: "Contacto",
      terminos: "Términos",
      privacidad: "Privacidad",
      ...SITIO_INDUSTRIA,
    },
    hechoEnSantiago: landing.footer.hechoEnSantiago,
  },
  /** Segunda versión del pie de página, con el calendario 3D flotante
   * (WP-hemsida, exploración "footer.dc.html"): convive con `footer` de
   * arriba (no lo reemplaza) hasta que se elija un diseño final. */
  footer2: {
    contacto: {
      titulo: "Contacto",
      /** La ciudad va literal, igual que en `reserva.header.ubicacion`
       * (fase 1 solo vende en la Región Metropolitana, VISION
       * "Santiago"): no es el nombre del producto (regla dura 10). */
      ciudad: "Santiago, Chile",
      /** aria-label del link de correo, cuyo texto visible es la casilla
       * real del negocio (dato, no copy). */
      correoAria: "Escríbenos un correo",
    },
    redes: {
      titulo: "Síguenos",
    },
    irA: {
      titulo: "Ir a",
    },
    legal: {
      terminos: "Términos",
      privacidad: "Privacidad",
      encargo: "Encargo de datos",
      contenido: "Contenido",
      /** Sin el símbolo © (cuenta como emoji para `REGLAS_DE_TONO.emoji`,
       * U+00A9 es Extended_Pictographic): se escribe en palabras. */
      derechos: (p: { anio: number }): string =>
        `${p.anio}. Todos los derechos reservados.`,
    },
    novedad: {
      etiqueta: "Nuevo",
      texto: "Horas flash ya disponible",
    },
  },
  /** Sección de la portada con las cuatro razones grandes para elegirnos,
   * cada una con su propia imagen de producto (WP-hemsida). */
  inicio: {
    /** Bento del hero de la portada (WP-hemsida): la píldora sobre el H1, la
     * tarjeta de "Tu semana" (maqueta, no una agenda real), el toast de
     * "Nueva reserva", la tarjeta del link de reservas y las dos cifras
     * (disponibilidad y comisión). No hay `heroBento.siguiente` ni
     * `heroBento.cta`/`nav`: la maqueta reutiliza `hoy.siguiente` (con
     * `hoy.relativo.enMin`), `landing.hero.ctaPrimario`/`ctaSecundario` y
     * `sitio.nav.entrar`/`ctaCrearAgenda`, que ya tienen el texto exacto que
     * necesita esta tarjeta (ver el reporte de WP-hemsida). */
    heroBento: {
      nuevo: {
        etiqueta: "Nuevo",
        texto: "Horas flash: vende tus horas libres",
      },
      /** Tarjeta de calendario del hero: siempre muestra Lun–Vie, sin
       * conectarse a una fecha real (a diferencia de `weekdayShort` de
       * `src/lib/format/`, pensado para una fecha concreta). */
      semana: {
        titulo: "Tu semana",
        vistaSemana: "Semana",
        vistaDia: "Día",
        dias: {
          lun: "Lun",
          mar: "Mar",
          mie: "Mié",
          jue: "Jue",
          vie: "Vie",
        },
      },
      /** Toast animado de una reserva nueva sobre la maqueta. `dia` ya llega
       * formateado (p. ej. "vie 2 oct"). */
      toast: (p: { dia: string; hora: string }): string =>
        `Nueva reserva · ${p.dia} ${p.hora}`,
      /** Mismo concepto que `inicio.tuLink` (agenda del dueño), acá con
       * textos de botón más cortos porque la tarjeta del hero es angosta. */
      link: {
        titulo: "Tu link de reservas",
        copiar: "Copiar",
        copiado: "Copiado",
        compartirAria: "Compartir tu link de reservas",
      },
      disponible: {
        valor: "24/7",
        pie: "de día o de noche",
      },
      /** `titulo`/`pie` son fijos; el monto sale de los datos demo. */
      comision: {
        titulo: "Comisión",
        pie: "por reserva",
      },
    },
    /** Franja de cifras justo bajo el hero de la portada (WP-hemsida,
     * exploración "sida-v2-morka-band.dc.html"): el título grande y las tres
     * cifras chicas ("24/7", "10 min", "$0"). Distinta de
     * `heroBento.disponible`/`heroBento.comision` (misma cifra, otro lugar y
     * otro pie de página, cada una con su propio texto). */
    intro: {
      titulo: "Todo lo que tu local necesita,",
      tituloDestacado: "nada que sobre.",
      stats: {
        disponible: { valor: "24/7", pie: "reservas online" },
        minutos: { valor: "10 min", pie: "para empezar" },
        comision: { valor: "$0", pie: "comisión" },
      },
    },
    /** Franja oscura con las cuatro razones grandes para elegirnos, cada una
     * en su propia tarjeta (WP-hemsida, exploración
     * "sida-v1-bento.dc.html"). */
    porQue: {
      etiqueta: "POR QUÉ FUNCIONA",
      titulo: "Menos mensajes,",
      tituloDestacado: "más horas llenas.",
      texto:
        "Cuatro razones por las que las barberías, peluquerías y centros de estética se quedan.",
      tarjetas: {
        reservas: {
          titulo: "Tus clientes reservan solos, a cualquier hora",
          texto:
            "Entran a tu link, eligen servicio, profesional y hora, y quedan confirmados al tiro.",
        },
        agenda: {
          titulo: "Tu agenda ordenada, en el computador y el celular",
        },
        inasistencias: {
          titulo: "Menos inasistencias",
          pregunta: "¿Llegó?",
        },
        precio: {
          titulo: "Un precio para todo tu local",
          pie: "profesionales, mismo precio",
        },
        local: {
          titulo: "Hecho para locales de verdad",
          texto: "Barberías, peluquerías, estética y kinesiología.",
          chip: (p: { n: number }): string => `+${p.n} reservas esta semana`,
        },
      },
    },
    usp: {
      reservasSolas: {
        titulo: "Tus clientes reservan solos, a cualquier hora",
        texto:
          "Entran a tu link, eligen servicio, profesional y hora, y quedan confirmados al tiro. Sin llamadas ni conversar por WhatsApp uno a uno.",
        puntos: {
          punto1: "Disponible 24/7, de día o de noche",
          punto2: "Sin apps que instalar, ni para ti ni para tus clientes",
          punto3: "Funciona bien en cualquier celular, con poco internet",
        },
      },
      agendaOrdenada: {
        titulo: "Tu agenda ordenada, en el computador y en el celular",
        texto:
          'Cada profesional tiene su propia columna. En el celular, abre "Hoy" y ve el día completo de un vistazo.',
        puntos: {
          punto1: "Vista semana y vista día en el computador",
          punto2: 'La vista "Hoy" en el celular, para usar con una mano',
          punto3: "Reservas manuales y cambios de hora al instante",
        },
      },
      menosInasistencias: {
        titulo: "Menos inasistencias",
        texto:
          "Marca quién llegó y quién no vino desde tu celular. Los recordatorios automáticos llegan por correo.",
        puntos: {
          punto1: "Llegó y No vino con un toque",
          punto2: "Recordatorios por correo antes de la hora",
          punto3: "Historial de inasistencias por cliente",
        },
      },
      precioUnico: {
        titulo: "Un precio para todo tu local",
        texto:
          "Pagas un solo precio por tu negocio, agregues el equipo que agregues. Sin cobro por persona ni por reserva.",
        puntos: {
          punto1: "Sin cobro por cada profesional que sumas",
          punto2: "Sin comisión por reserva",
          punto3: "Plan Gratis para partir con un profesional",
        },
      },
    },
    /** Rubros que pasan en bucle sobre el hero de la portada (WP-hemsida):
     * "Para cualquier negocio que trabaje con horas". El detalle de cada
     * rubro vive en `SITIO_RUBROS_MARQUEE`, fuera de `Trad`. */
    marquee: {
      titulo: "Para cualquier negocio que trabaje con horas",
      aria: "Ejemplos de rubros que reservan hora",
    },
    /** Sección que explica Horas flash en la portada (WP-hemsida): `mock`
     * son las etiquetas cortas de la maqueta animada (no textos que recibe
     * un cliente real; esos viven en `plantillasWhatsapp.listaEsperaOferta`
     * y similares). */
    flash: {
      etiqueta: "Horas flash",
      titulo: "Vende tus horas libres antes de perderlas",
      texto:
        "Cuando te queda una hora libre a último minuto, la ofreces con descuento a tus clientes. La primera persona en reservar se la queda.",
      puntos: {
        punto1: "Tú eliges el descuento y por cuánto tiempo dura",
        punto2: "Se las avisamos por correo a tus clientes",
        punto3: "Apenas alguien reserva, se cierra para los demás",
      },
      mock: {
        horaLibre: (p: { hora: string }): string => `Hora libre ${p.hora}`,
        descuento: (p: { pct: number }): string => `−${p.pct}%`,
        notificacion: (p: { n: number }): string =>
          `Aviso enviado a ${p.n} ${p.n === 1 ? "cliente" : "clientes"}`,
        reservada: "¡Reservada!",
      },
      /** Variante de `mock.reservada` con el nombre del cliente que tomó la
       * hora (WP-hemsida, exploración "sida-v1-bento.dc.html"): mismo texto
       * de maqueta, no un mensaje real a un cliente. */
      reservadaPor: (p: { nombre: string }): string =>
        `¡Reservada por ${p.nombre}!`,
    },
    /** Etiquetas cortas de las cuatro etapas de la maqueta animada del flujo
     * de reserva en la portada (WP-hemsida), las mismas que ve un cliente
     * real en `/[slug]` (ver `reserva.pasos` y `reserva.confirmacion`). */
    flujo: {
      etiqueta: "Reserva en línea",
      titulo: "Reservar toma menos de un minuto",
      texto: "Así ve tu cliente el proceso completo, de principio a fin.",
      pasos: {
        servicio: "Elige el servicio",
        hora: "Elige la hora",
        datos: "Escribe sus datos",
        confirmada: "¡Confirmada!",
      },
    },
    /** Sección "Cambio sin dolor" (importación con IA, WP-66) de la portada. */
    migracion: {
      etiqueta: "Cambio sin dolor",
      titulo: "¿Ya tienes otra agenda? Te cambias en minutos",
      texto:
        "Pega el link de tu página de reservas actual. Leemos tus servicios, precios, horarios, equipo y perfil; tú revisas y lo importas con un clic. No necesitamos datos de tus clientes ni contraseñas, y funciona con los sistemas de reserva más usados.",
      pasos: {
        pegar: "Pega el link",
        leer: "Lo leemos por ti",
        revisar: "Revisa e importa",
      },
      visual: {
        link: "tubarberia.ejemplo.cl",
        leyendo: "Leyendo tu página…",
        listo: "Listo para importar",
        item1: "Corte de pelo",
        item2: "Corte y barba",
        item3: "Arreglo de barba",
      },
      cta: "Cámbiate gratis",
    },
    /** Título de la sección con todas las funcionalidades en un vistazo
     * (bento grid) de la portada (WP-hemsida). No reemplaza
     * `funcionalidades.hero` de abajo, que sigue igual. */
    bento: {
      titulo: "Todo lo que necesitas para llenar tu agenda",
      subtitulo:
        "Un vistazo rápido a todo lo que trae tu agenda, del link de reservas al día a día.",
    },
    /** "Empieza gratis. Planes pagados desde $9.990 al mes.": `precio` llega
     * ya formateado desde `src/lib/format/` (regla dura 5). */
    precioDesde: (p: { precio: string }): string =>
      `Empieza gratis. Planes pagados desde ${p.precio} al mes.`,
    verFuncionalidades: "Ver todas las funcionalidades",
  },
  /** Franja de conversión final de la portada (CTA band, WP-hemsida): trae
   * una foto de fondo, por eso necesita su propio alt de accesibilidad. */
  cta: {
    fondoAlt: "Un barbero revisando su celular entre clientes, en su local.",
  },
  funcionalidades: {
    meta: {
      titulo: (p: { nombre: string }): string =>
        `Funcionalidades — ${p.nombre}`,
      descripcion: (p: { nombre: string }): string =>
        `Todo lo que incluye ${p.nombre}: link de reservas, agenda por profesional, Hoy en el celular y recordatorios por correo.`,
    },
    hero: {
      titulo: "Todo lo que necesitas para llenar tu agenda",
      texto:
        "Desde tu link de reservas hasta la agenda del día a día, pensado para un local con uno o varios profesionales.",
    },
    /** Etiqueta sobre cada sección de `SITIO_FUNCIONALIDADES` con
     * `proximamente: true`. */
    proximamenteBadge: SITIO_PROXIMAMENTE,
    cta: {
      titulo: "¿Lista para ordenar tu agenda?",
      boton: SITIO_CTA,
    },
  },
  precios: {
    meta: {
      titulo: (p: { nombre: string }): string => `Precios — ${p.nombre}`,
      descripcion: (p: { nombre: string }): string =>
        `Precios de ${p.nombre} en CLP al mes, un solo precio por local. 30 días de prueba en los planes pagados, sin permanencia.`,
    },
    hero: {
      titulo: "Un precio para todo tu local",
      texto: landing.precios.subtitulo,
    },
    /** Insignia sobre la tarjeta de plan recomendada de la tabla de precios
     * (WP-hemsida, exploración "sida-v1-bento.dc.html"). */
    masElegido: "Más elegido",
    compararTitulo: "Compara los planes",
    fundador: landing.precios.fundador,
    /** Textos cortos extra para darle más vida a la página de Precios
     * (arreglo `copywriter-es-cl`): un contador de "cuánto cuesta por
     * profesional" (1 a 10), la lista de cosas que nunca se cobran, y un
     * link corto hacia `ventajas` (comparación honesta). */
    extra: {
      /** Chile: sin pago online todavía (Mercado Pago llega después), solo la garantía de cero comisión. */
      pagoOnline: "No cobramos comisión por tus reservas.",
      raknare: {
        titulo: "Cuánto cuesta por profesional",
        texto: (p: { n: number }): string =>
          `Con ${p.n} ${p.n === 1 ? "profesional" : "profesionales"} en tu equipo, sigues pagando el mismo precio de tu plan.`,
        sufijo: "profesionales en tu equipo",
      },
      ingaAvgifter: {
        titulo: "Sin sorpresas en la cuenta",
        items: {
          a: "Sin cobro por reserva",
          b: "Sin costo de instalación",
          c: "Sin permanencia",
          d: "Cancela cuando quieras",
        },
      },
      jamfor: {
        texto: "¿Quieres ver cómo nos comparamos con otras opciones?",
        cta: "Ver la comparación",
      },
    },
    faq: {
      iva: {
        pregunta: "¿Los precios incluyen IVA?",
        respuesta:
          "No. Los precios que ves son netos; el IVA se agrega al momento de pagar.",
      },
      cambiarPlan: {
        pregunta: "¿Puedo cambiar de plan cuando quiera?",
        respuesta:
          "Sí. Subes o bajas de plan cuando quieras, sin costo extra ni permanencia.",
      },
      masWhatsapp: {
        pregunta: "¿Qué pasa si se me acaba el WhatsApp incluido?",
        respuesta:
          "Hoy los recordatorios salen por correo y no tienen tope. Cuando lleguen los avisos por WhatsApp, podrás sumar un paquete extra o subir de plan.",
      },
      permanencia: {
        pregunta: landing.preguntas.items.permanencia.pregunta,
        respuesta: landing.preguntas.items.permanencia.respuesta,
      },
      fundador: {
        pregunta: "¿Qué es el plan Fundador?",
        respuesta:
          "Los primeros negocios que se suman pagan la mitad de su plan para siempre.",
      },
    },
  },
  /** Página propia de Horas flash (venta de último minuto de horas libres,
   * F13 de MVP_SPEC.md). Hoy el aviso a los clientes va por correo; el aviso
   * por WhatsApp llega próximamente (mismo criterio que
   * `SITIO_FUNCIONALIDADES.recordatorios`). */
  flashPagina: {
    meta: {
      titulo: (p: { nombre: string }): string => `Horas flash — ${p.nombre}`,
      descripcion: (p: { nombre: string }): string =>
        `Vende tus horas libres con descuento antes de perderlas, con ${p.nombre}. Tú eliges el descuento y cuánto dura.`,
    },
    hero: {
      etiqueta: "Horas flash",
      titulo: "Vende tus horas libres antes de perderlas",
      texto:
        "Cuando te queda una hora libre a último minuto, la ofreces con descuento a tus clientes. La primera persona en reservar se la queda.",
      cta: SITIO_CTA,
    },
    comoFunciona: {
      titulo: "Cómo funciona",
      pasos: {
        uno: {
          titulo: "Marca la hora libre",
          texto: "Elige la hora que quedó libre y el descuento, con un clic.",
        },
        dos: {
          titulo: "Avisamos a tus clientes",
          texto:
            "Les llega un correo con la oferta y el link para reservar al tiro.",
        },
        tres: {
          titulo: "Se cierra apenas alguien reserva",
          texto:
            "La primera persona en reservar se la queda; a los demás les avisamos que ya se ocupó.",
        },
      },
    },
    beneficios: {
      titulo: "Por qué te conviene",
      items: {
        a: {
          titulo: "Recupera horas que se iban a perder",
          texto:
            "Cada hora libre que vendes con descuento es plata que antes se perdía.",
        },
        b: {
          titulo: "Tú decides el descuento",
          texto: "Eliges el porcentaje y cuánto dura la oferta, hora por hora.",
        },
        c: {
          titulo: "Por correo, con WhatsApp en camino",
          texto:
            "Hoy avisamos por correo a tus clientes; los avisos por WhatsApp llegan próximamente.",
        },
        d: {
          titulo: "Se cierra sola",
          texto:
            "Apenas alguien reserva, la oferta desaparece para los demás. Sin dobles reservas.",
        },
      },
    },
    ejemplo: {
      titulo: "Un ejemplo",
      texto:
        "Una hora libre de $15.000 con un 20% de descuento se vende en $12.000, en vez de quedar en $0.",
    },
    faq: {
      titulo: "Preguntas frecuentes",
      items: {
        a: {
          pregunta: "¿Cuánto tiempo dura una hora flash?",
          respuesta:
            "Tú decides: puede durar unos minutos o hasta que llegue la hora de la cita.",
        },
        b: {
          pregunta: "¿Mis clientes reciben la oferta por WhatsApp?",
          respuesta:
            "Por ahora la reciben por correo. Los avisos por WhatsApp llegan próximamente.",
        },
        c: {
          pregunta: "¿Qué pasa si nadie reserva la hora flash?",
          respuesta:
            "No pasa nada: la hora queda libre igual que antes, sin costo ni compromiso.",
        },
      },
    },
    cta: {
      titulo: "¿Lista para vender tus horas libres?",
      texto: "Crea tu cuenta gratis y activa tu primera hora flash en minutos.",
      boton: SITIO_CTA,
    },
  },
  /** Página propia "Por qué elegirnos": seis ventajas concretas (nada de
   * promesas sin fuente, GUIA §11) más una comparación honesta contra la
   * otra opción del mercado, con fuente y fecha en `comparacion.nota`. El
   * detalle fila por fila vive en `SITIO_COMPARACION`, fuera de `Trad`
   * (mismo motivo que `SITIO_PRECIOS_TABLA`). */
  ventajas: {
    meta: {
      titulo: (p: { nombre: string }): string =>
        `Por qué elegirnos — ${p.nombre}`,
      descripcion: (p: { nombre: string }): string =>
        `Seis razones concretas para elegir ${p.nombre}, y una comparación honesta con AgendaPro.`,
    },
    hero: {
      etiqueta: "Por qué elegirnos",
      titulo: "Seis razones para elegir una agenda hecha para tu negocio",
      texto:
        "Sin letra chica: acá tienes lo que de verdad incluye tu plan, y una comparación honesta con la otra opción que probablemente estás mirando.",
    },
    items: {
      a: {
        titulo: "Sin comisión por reserva",
        texto:
          "Pagas tu plan mensual y nada más. No te cobramos un porcentaje por cada hora que reservan tus clientes.",
      },
      b: {
        titulo: "Un precio para todo tu negocio",
        texto:
          "El precio no sube porque sumes profesionales a tu equipo: pagas un plan, no una cuota por persona.",
      },
      c: {
        titulo: "Tu propio link de reservas",
        texto:
          "Una página con tu marca donde tus clientes reservan solos, lista para compartir en Instagram o WhatsApp.",
      },
      d: {
        titulo: "Horas flash",
        texto:
          "Vende tus horas libres con descuento antes de perderlas, en vez de dejarlas vacías.",
      },
      e: {
        titulo: "Lista de espera automática",
        texto:
          "Si alguien cancela, avisamos a quien está esperando y esa hora se ocupa sola.",
      },
      f: {
        titulo: "Soporte de personas reales",
        texto:
          "Te respondemos por WhatsApp, en español de Chile, sin mesa de ayuda automática.",
      },
    },
    comparacion: {
      titulo: "Así nos diferenciamos de AgendaPro",
      texto:
        "AgendaPro es probablemente la otra opción que estás mirando. Aquí tienes los hechos, lado a lado.",
      /** Fuente y fecha de los datos de `SITIO_COMPARACION` (afuera de
       * `Trad`): sin esto, cualquier número de la competencia es una
       * afirmación sin respaldo. */
      nota: "Precios según la página de precios de AgendaPro (agendapro.com/cl/planes), revisados el 29 de septiembre de 2026.",
      /** Una sola frase honesta: dónde la competencia es mejor que nosotros
       * hoy (petición explícita del encargo, no opcional). */
      honestidad:
        "AgendaPro es más fuerte en caja/POS, control de inventario y equipos grandes: si necesitas eso hoy, vale la pena considerarlo.",
    },
    /** Lista corta de diferencias frente a la competencia (encargo
     * `copywriter-es-cl`, complementa `comparacion` con una mirada positiva,
     * sin números). */
    diferencias: {
      titulo: "Así nos diferenciamos",
      items: {
        a: {
          titulo: "Tus clientes, no un marketplace",
          texto:
            "Compartes tu propio link de reservas: tus clientes ven solo tu negocio, nunca una lista de competidores.",
        },
        b: {
          titulo: "Sin comisiones ni cobros ocultos",
          texto:
            "Pagas tu plan mensual y nada más. Nunca te cobramos un porcentaje por reserva.",
        },
        c: {
          titulo: "Horas flash llenan los espacios vacíos",
          texto:
            "Vende tus horas libres con descuento a último minuto, en vez de dejarlas sin usar.",
        },
        d: {
          titulo: "Preguntas pensadas para tu rubro",
          texto:
            "El formulario de reserva hace las preguntas correctas para barberías, peluquerías, estética o kinesiología, sin nada de más.",
        },
      },
    },
    cta: {
      titulo: "¿Lista para probarlo sin compromiso?",
      boton: SITIO_CTA,
    },
  },
  /** Índice de la sección "Para quién" (el detalle de cada rubro vive en
   * `SITIO_PARA_INDUSTRIAS`, fuera de `Trad`). */
  para: {
    titulo: "Para quién es",
    subtitulo: "Elige tu rubro para ver ejemplos pensados para ti.",
    /** Título sobre los servicios de ejemplo de
     * `SitioParaIndustria.servicios` en la página de cada rubro
     * (WP-hemsida). */
    serviciosTitulo: "Servicios de ejemplo",
  },
  preguntas: {
    meta: {
      titulo: (p: { nombre: string }): string =>
        `Preguntas frecuentes — ${p.nombre}`,
      descripcion: (p: { nombre: string }): string =>
        `Respuestas sobre cómo empezar, cómo reservan tus clientes, precios y cómo cuidamos tus datos en ${p.nombre}.`,
    },
    hero: {
      titulo: "Preguntas frecuentes",
      texto: "Si no encuentras tu respuesta acá, escríbenos por WhatsApp.",
    },
    grupos: {
      empezar: {
        titulo: "Empezar",
        preguntas: {
          instalar: {
            pregunta: landing.preguntas.items.instalar.pregunta,
            respuesta: landing.preguntas.items.instalar.respuesta,
          },
          cuantoDemora: {
            pregunta: "¿Cuánto me demoro en configurarlo?",
            respuesta:
              "Menos de 10 minutos con los pasos guiados: servicios, equipo, horarios y tu link de reservas.",
          },
          ayudaConfig: {
            pregunta: landing.preguntas.items.ayudaConfig.pregunta,
            respuesta: landing.preguntas.items.ayudaConfig.respuesta,
          },
        },
      },
      reservas: {
        titulo: "Reservas",
        preguntas: {
          comoReservan: {
            pregunta: landing.preguntas.items.comoReservan.pregunta,
            respuesta: landing.preguntas.items.comoReservan.respuesta,
          },
          noLlego: {
            pregunta: landing.preguntas.items.noLlego.pregunta,
            respuesta: landing.preguntas.items.noLlego.respuesta,
          },
          cambiarHora: {
            pregunta: "¿Mis clientes pueden cambiar o cancelar su hora solos?",
            respuesta:
              "Próximamente. Por ahora, tú puedes moverla o cancelarla desde tu agenda.",
          },
        },
      },
      pagos: {
        titulo: "Pagos y precios",
        preguntas: {
          permanencia: {
            pregunta: landing.preguntas.items.permanencia.pregunta,
            respuesta: landing.preguntas.items.permanencia.respuesta,
          },
          iva: {
            pregunta: "¿Los precios incluyen IVA?",
            respuesta:
              "No. Los precios que ves son netos; el IVA se agrega al momento de pagar.",
          },
          abono: {
            pregunta: "¿Quién recibe la plata del abono?",
            respuesta:
              "Llega directo a tu propia cuenta de Mercado Pago. Nunca pasa por nosotros.",
          },
        },
      },
      datos: {
        titulo: "Datos y seguridad",
        preguntas: {
          datos: {
            pregunta: landing.preguntas.items.datos.pregunta,
            respuesta: landing.preguntas.items.datos.respuesta,
          },
          consentimiento: {
            pregunta: "¿Piden permiso a mis clientes para escribirles?",
            respuesta:
              "Sí. Antes de reservar aceptan los términos, y el aviso de marketing nunca viene marcado por defecto.",
          },
          dondeViven: {
            pregunta: "¿Dónde se guardan mis datos?",
            respuesta:
              "En servidores en la nube, con acceso protegido para que solo tú y tu equipo vean la información de tu negocio.",
          },
        },
      },
    },
  },
  contacto: {
    meta: {
      titulo: (p: { nombre: string }): string => `Contacto — ${p.nombre}`,
      descripcion: (p: { nombre: string }): string =>
        `Escríbenos por WhatsApp o correo y te ayudamos a poner tu negocio en línea con ${p.nombre}.`,
    },
    hero: {
      titulo: "Hablemos",
      texto: "Escríbenos y te ayudamos a poner tu negocio en línea.",
    },
    whatsapp: {
      titulo: "Escríbenos por WhatsApp",
      texto: "Respondemos tus preguntas y te ayudamos a armar tu agenda.",
      boton: "Abrir WhatsApp",
    },
    correo: {
      titulo: "Escríbenos por correo",
      texto: "Cuéntanos sobre tu negocio y te contactamos a la brevedad.",
      boton: "Enviar correo",
    },
    onboarding: {
      titulo: "Te lo dejamos listo",
      texto:
        "Si tu negocio está en Providencia o Ñuñoa, vamos a dejarte la agenda configurada en persona, en 15 a 20 minutos.",
    },
  },
  /** Recomendación a un servicio externo, no parte del producto: la tarjeta
   * de sellos digital la ofrece Stampello (stampello.se), una empresa
   * aparte. No es una funcionalidad de `SITIO_FUNCIONALIDADES` ni de
   * `PLANES_LANDING` (ver el reemplazo de `abono` en `sv-SE.ts` para el
   * motivo). */
  partner: {
    stampello: {
      etiqueta: "Recomendado",
      titulo: "Tarjeta de sellos digital con Stampello",
      texto:
        "Premia a tus clientes frecuentes con una tarjeta de sellos digital. Stampello es un servicio externo, pensado para negocios como el tuyo.",
      cta: "Conocer Stampello",
      url: "https://stampello.se",
      /** Mockup de la tarjeta de wallet (WP-fixar-sv): recreación con nuestros tokens
       * (nunca el naranjo de Stampello), no el producto real. */
      tarjeta: {
        sellosEtiqueta: "SELLOS",
        premioEtiqueta: (p: { n: number }): string => `${p.n} SELLOS DAN`,
      },
    },
  },
} as const satisfies Trad;

/** Una sección de la página Funcionalidades. No vive dentro de `sitio`
 * porque `proximamente` es `boolean` y `puntos` es un arreglo: `Trad` no
 * admite ninguno de los dos (mismo motivo que `PlanLanding`). */
export interface SitioFuncionalidadSeccion {
  readonly id: string;
  readonly etiqueta: string;
  readonly titulo: string;
  readonly texto: string;
  readonly puntos: readonly [string, string, string];
  readonly proximamente: boolean;
}

/** Orden: lo que ya existe en el producto primero (F5–F3b), lo planeado
 * después (fase 2 de MVP_SPEC.md), cada uno marcado con `proximamente`. */
export const SITIO_FUNCIONALIDADES: readonly SitioFuncionalidadSeccion[] = [
  {
    id: "link-reservas",
    etiqueta: "Reservas online",
    titulo: "Tu link de reservas, listo para compartir",
    texto:
      "Cada negocio tiene su propia página de reservas. Tus clientes eligen servicio, profesional y hora, y quedan confirmados al tiro, sin llamadas ni conversar por WhatsApp uno a uno.",
    puntos: [
      "Página con tu marca, en tu propio link",
      'Elige servicio, profesional o "Cualquiera", día y hora',
      "Funciona bien en cualquier celular, con poco internet",
    ],
    proximamente: false,
  },
  {
    id: "agenda",
    etiqueta: "Para tu día a día",
    titulo: "Una agenda ordenada por profesional",
    texto:
      "Mira la semana completa o un día, con una columna para cada profesional. Lo que reservan tus clientes aparece solo, sin que tengas que anotarlo.",
    puntos: [
      "Vista semana y vista día",
      "Una columna por profesional",
      "Los horarios se calculan solos: buffers, horarios y personal",
    ],
    proximamente: false,
  },
  {
    id: "hoy",
    etiqueta: "Desde tu celular",
    titulo: "El día de hoy, en tu bolsillo",
    texto:
      'Abre "Hoy" en tu celular y ve las horas del día, marca quién llegó y quién no vino, sin entrar al computador.',
    puntos: [
      "Lista del día ordenada por hora",
      "Botones Llegó y No vino",
      "Pensada para usar con una mano",
    ],
    proximamente: false,
  },
  {
    id: "reservas-manuales",
    etiqueta: "Control total",
    titulo: "Agrega y mueve horas tú mismo",
    texto:
      "Registra un cliente que llega sin reserva, cambia una hora de lugar o cancélala, todo desde la misma agenda.",
    puntos: [
      "Reservas manuales para clientes sin cita previa",
      "Mueve una hora a otro día o profesional en segundos",
      "Cancela una reserva cuando haga falta",
    ],
    proximamente: false,
  },
  {
    id: "ajustes",
    etiqueta: "Configuración",
    titulo: "Todo tu negocio, en un solo lugar",
    texto:
      "Configura tus servicios, tu equipo, tus horarios y tus reglas de reserva. Los cambios se reflejan al tiro en tu página de reservas.",
    puntos: [
      "Servicios: nombre, duración, precio y buffer",
      "Profesionales: horarios propios y qué servicios hacen",
      "Horarios y reglas del negocio, con anticipación mínima y máxima",
    ],
    proximamente: false,
  },
  {
    id: "recordatorios",
    etiqueta: "Menos inasistencias",
    titulo: "Recordatorios automáticos por correo",
    texto:
      "Menos olvidos: tus clientes reciben un recordatorio antes de su hora, con un link para ver, mover o cancelar.",
    puntos: [
      "Confirmación apenas reservan",
      "Recordatorio antes de la hora, con la fecha exacta",
      "Link para mover o cancelar la hora",
    ],
    proximamente: false,
  },
  {
    id: "lista-espera",
    etiqueta: "Lista de espera",
    titulo: "Cuando alguien cancela, esa hora se ocupa sola",
    texto:
      "Si un día está lleno, tus clientes se anotan en la lista de espera. Apenas se libera una hora, les avisamos automáticamente.",
    puntos: [
      "Se anotan por servicio y día",
      "Aviso automático apenas hay una cancelación",
      "La primera persona en responder se queda con la hora",
    ],
    proximamente: false,
  },
  {
    id: "abono",
    etiqueta: SITIO_PROXIMAMENTE,
    titulo: "Pide un abono al reservar",
    texto:
      "Reduce las inasistencias pidiendo un abono al momento de reservar. La plata llega directo a tu propia cuenta de Mercado Pago.",
    puntos: [
      "Tú decides el monto o el porcentaje",
      "El dinero es siempre tuyo, no lo tocamos",
      "La reserva se confirma solo con el abono pagado",
    ],
    proximamente: true,
  },
  {
    id: "fichas-clientes",
    etiqueta: "Fichas",
    titulo: "Historial de cada cliente, a mano",
    texto:
      "Cuántas veces ha venido, si ha faltado antes y tus propias notas, todo en una ficha por cliente.",
    puntos: [
      "Historial de visitas e inasistencias",
      "Notas privadas de tu equipo",
      "Búsqueda rápida por nombre o teléfono",
    ],
    proximamente: false,
  },
  {
    id: "reportes",
    etiqueta: "Caja e informes",
    titulo: "Cuánto vendiste y cómo te fue",
    texto:
      "Ingresos del día, la semana y el mes, más estadísticas de ocupación, clientes nuevos y recurrentes e inasistencias.",
    puntos: [
      "Ingresos por día, semana y mes",
      "Ocupación por profesional",
      "Clientes nuevos y recurrentes, tendencia de inasistencias",
    ],
    proximamente: false,
  },
];

/** Una fila de la tabla comparativa de Precios. No vive dentro de `sitio`
 * porque es un objeto con cuatro valores por fila, no una hoja de `Trad`. */
export interface SitioPrecioFila {
  readonly funcion: string;
  readonly valores: {
    readonly gratis: string;
    readonly emprende: string;
    readonly equipo: string;
    readonly local: string;
  };
}

/** Mismo contenido que `PLANES_LANDING`, en formato de tabla comparativa. */
export const SITIO_PRECIOS_TABLA: readonly SitioPrecioFila[] = [
  {
    funcion: "Profesionales",
    valores: {
      gratis: "1",
      emprende: "1",
      equipo: "Hasta 3",
      local: "Hasta 10",
    },
  },
  {
    funcion: "Recordatorios",
    valores: {
      gratis: "Por correo",
      emprende: "Por correo",
      equipo: "Por correo",
      local: "Por correo",
    },
  },
  {
    funcion: "Lista de espera",
    valores: { gratis: "—", emprende: "✓", equipo: "✓", local: "✓" },
  },
  {
    funcion: "Abono con Mercado Pago (próximamente)",
    valores: { gratis: "—", emprende: "✓", equipo: "✓", local: "✓" },
  },
  {
    funcion: "Horas flash",
    valores: { gratis: "—", emprende: "—", equipo: "✓", local: "✓" },
  },
  {
    funcion: "Te echamos de menos",
    valores: { gratis: "—", emprende: "—", equipo: "✓", local: "✓" },
  },
  {
    funcion: "Informes",
    valores: { gratis: "—", emprende: "—", equipo: "✓", local: "✓" },
  },
  {
    funcion: "Soporte",
    valores: {
      gratis: "Por correo",
      emprende: "Por WhatsApp",
      equipo: "Por WhatsApp",
      local: "Prioritario",
    },
  },
];

/** Una fila de la tabla comparativa de la página `ventajas` (comparación
 * honesta contra un competidor). No vive dentro de `sitio` porque trae un
 * arreglo (`valores`, un valor por competidor de `SitioComparacion.
 * competidores`, mismo orden): `Trad` no admite arreglos. */
export interface SitioComparacionFila {
  readonly aspecto: string;
  readonly nosotros: string;
  readonly valores: readonly string[];
}

/** Contenido de `sitio.ventajas.comparacion` (WP-hemsida/GTM: "una fila,
 * una fuente citada"). Solo hechos verificables con fuente y fecha
 * (`sitio.ventajas.comparacion.nota`): si un dato no está confirmado en la
 * página de precios del competidor, esa fila se omite en vez de suponer un
 * número o decir "no especificado". */
export interface SitioComparacion {
  readonly competidores: readonly string[];
  readonly filas: readonly SitioComparacionFila[];
}

/** Comparación contra AgendaPro (la otra opción visible en Chile), con los
 * datos de `agendapro.com/cl/planes` revisados el 29 de septiembre de 2026
 * (ver `sitio.ventajas.comparacion.nota`). */
export const SITIO_COMPARACION: SitioComparacion = {
  competidores: ["AgendaPro"],
  filas: [
    {
      aspecto: "Precio desde",
      nosotros: "$0 (plan Gratis)",
      valores: ["$15.900 + IVA al mes (plan Individual)"],
    },
    {
      aspecto: "Perfiles incluidos en el precio",
      nosotros: "1 a 10 profesionales, según tu plan",
      valores: ["1 profesional en el plan Individual"],
    },
    {
      aspecto: "Pago online",
      nosotros: "Abono con Mercado Pago, próximamente",
      valores: ["2,99% + IVA + $100 por transacción"],
    },
    {
      aspecto: "Caja/POS",
      nosotros: "No tenemos",
      valores: ["Complemento aparte, desde $60.000 + IVA al mes"],
    },
    {
      aspecto: "Recordatorios por WhatsApp",
      nosotros:
        "Por correo incluido; WhatsApp próximamente en los planes pagados",
      valores: [
        "Incluidos, entre 50 y 200 confirmaciones al mes según el plan",
      ],
    },
  ],
};

/** Contenido de la página "Para quién" de un rubro. No vive dentro de
 * `sitio` porque `servicios` trae `minutos` (número) y varios campos son
 * arreglos: `Trad` no admite ninguno de los dos. */
export interface SitioParaIndustria {
  readonly id: "barberias" | "peluquerias" | "estetica" | "kinesiologia";
  readonly nombre: string;
  readonly meta: {
    readonly titulo: (p: { nombre: string }) => string;
    readonly descripcion: (p: { nombre: string }) => string;
  };
  readonly hero: { readonly titulo: string; readonly texto: string };
  readonly beneficios: readonly [string, string, string];
  readonly servicios: readonly {
    readonly nombre: string;
    readonly minutos: number;
  }[];
  readonly faq: readonly {
    readonly pregunta: string;
    readonly respuesta: string;
  }[];
  readonly cta: string;
}

export const SITIO_PARA_INDUSTRIAS: readonly SitioParaIndustria[] = [
  {
    id: "barberias",
    nombre: SITIO_INDUSTRIA.barberias,
    meta: {
      titulo: (p) => `Barberías — ${p.nombre}`,
      descripcion: (p) =>
        `Reservas online para barberías con ${p.nombre}: agenda por barbero, reservas manuales y tu propio link de reservas.`,
    },
    hero: {
      titulo: "Reservas para barberías, sin llamadas de ida y vuelta",
      texto:
        "Tus clientes reservan su corte o su perfilado de barba solos, desde tu link. Tú ves tu día ordenado, con o sin cita previa.",
    },
    beneficios: [
      "Agenda por barbero, cada uno con su propio horario",
      "Reservas manuales para los que llegan sin cita",
      "Marca Llegó o No vino desde tu celular",
    ],
    servicios: [
      { nombre: "Corte de pelo", minutos: 30 },
      { nombre: "Arreglo de barba", minutos: 20 },
      { nombre: "Corte + barba", minutos: 45 },
    ],
    faq: [
      {
        pregunta: "¿Puedo tener varios barberos en la misma agenda?",
        respuesta:
          "Sí. Cada barbero tiene su propio horario y sus propios servicios.",
      },
      {
        pregunta: "¿Sirve si trabajo solo, sin local?",
        respuesta:
          "Sí. El plan Gratis es para un profesional y ya incluye tu link de reservas.",
      },
    ],
    cta: SITIO_CTA,
  },
  {
    id: "peluquerias",
    nombre: SITIO_INDUSTRIA.peluquerias,
    meta: {
      titulo: (p) => `Peluquerías — ${p.nombre}`,
      descripcion: (p) =>
        `Reservas online para peluquerías con ${p.nombre}: servicios con su duración real y agenda por estilista.`,
    },
    hero: {
      titulo: "Tu peluquería, con la agenda al día",
      texto:
        "Corte, color, tratamientos: cada servicio con su duración real, para que la agenda no se te desordene.",
    },
    beneficios: [
      "Servicios con la duración que corresponde a cada uno",
      "Agenda por estilista, con sus propios horarios",
      "Tu link de reservas para compartir en Instagram",
    ],
    servicios: [
      { nombre: "Corte de dama", minutos: 45 },
      { nombre: "Color completo", minutos: 120 },
      { nombre: "Tratamiento capilar", minutos: 40 },
      { nombre: "Peinado", minutos: 30 },
    ],
    faq: [
      {
        pregunta: "¿Puedo poner servicios largos, como color?",
        respuesta:
          "Sí. Cada servicio tiene su propia duración, y la agenda respeta ese tiempo.",
      },
      {
        pregunta: "¿Mis clientas pueden elegir con qué estilista atenderse?",
        respuesta: 'Sí, o pueden elegir "Cualquiera" si no tienen preferencia.',
      },
    ],
    cta: SITIO_CTA,
  },
  {
    id: "estetica",
    nombre: SITIO_INDUSTRIA.estetica,
    meta: {
      titulo: (p) => `Estética y uñas — ${p.nombre}`,
      descripcion: (p) =>
        `Reservas online para estética y uñas con ${p.nombre}: agenda por profesional y buffer entre citas.`,
    },
    hero: {
      titulo: "Estética y uñas, reservado sin mensajes de ida y vuelta",
      texto:
        "Tus clientas reservan manicure, pedicure o un tratamiento facial desde tu link, sin escribirte por WhatsApp una por una.",
    },
    beneficios: [
      "Agenda por profesional, con buffer entre citas",
      "Nombres de servicio neutrales, pensados para tu rubro",
      "Reservas manuales para tus clientas frecuentes",
    ],
    servicios: [
      { nombre: "Manicure", minutos: 45 },
      { nombre: "Pedicure", minutos: 50 },
      { nombre: "Tratamiento facial", minutos: 60 },
    ],
    faq: [
      {
        pregunta: "¿Puedo dejar tiempo entre una cita y otra?",
        respuesta:
          "Sí, con el buffer de cada servicio, que se suma solo al calcular las horas disponibles.",
      },
      {
        pregunta: "¿Puedo tener más de un box o profesional?",
        respuesta:
          "Sí. Cada profesional tiene su propia agenda y sus propios servicios.",
      },
    ],
    cta: SITIO_CTA,
  },
  {
    id: "kinesiologia",
    nombre: SITIO_INDUSTRIA.kinesiologia,
    meta: {
      titulo: (p) => `Kinesiología — ${p.nombre}`,
      descripcion: (p) =>
        `Reservas online para kinesiología y masajes con ${p.nombre}: nombres de servicio neutrales y agenda por profesional.`,
    },
    hero: {
      titulo: "Kinesiología y masajes, con tus horas ordenadas",
      texto:
        "Tus pacientes reservan una sesión desde tu link. Tú decides qué nombre usar para cada servicio, sin detalles clínicos.",
    },
    beneficios: [
      "Nombres de servicio neutrales, sin datos de salud",
      "Agenda por profesional, con la duración real de cada sesión",
      "Notas privadas, sin campos que inviten a anotar datos de salud",
    ],
    servicios: [
      { nombre: "Sesión de kinesiología", minutos: 45 },
      { nombre: "Sesión (60 min)", minutos: 60 },
      { nombre: "Masaje descontracturante", minutos: 50 },
    ],
    faq: [
      {
        pregunta: "¿Puedo escribir el diagnóstico del paciente en el servicio?",
        respuesta:
          'No te lo recomendamos: usa un nombre general, como "Sesión de kinesiología", y guarda el detalle clínico en tu propia ficha, fuera del sistema.',
      },
      {
        pregunta: "¿Quién puede ver las notas de una reserva?",
        respuesta:
          "Solo tú y tu equipo. Te pedimos no anotar datos de salud ahí tampoco.",
      },
    ],
    cta: SITIO_CTA,
  },
];

// ---------------------------------------------------------------------------
// SITIO_RUBROS_MARQUEE: rubros que pasan en bucle sobre el hero de la
// portada (WP-hemsida). No vive dentro de `sitio` porque es un arreglo de
// pares emoji/nombre, no una hoja de `Trad` (mismo motivo que las listas de
// arriba). El emoji es parte del diseño de esta franja, no texto de
// producto: por eso este arreglo, a diferencia del resto de
// `es-CL.sitio.test.ts`, no pasa por `REGLAS_DE_TONO` (que prohíbe emoji en
// `sitio`).
// ---------------------------------------------------------------------------

export const SITIO_RUBROS_MARQUEE: readonly {
  readonly emoji: string;
  readonly nombre: string;
}[] = [
  { emoji: "💈", nombre: "Barbería" },
  { emoji: "✂️", nombre: "Peluquería" },
  { emoji: "💅", nombre: "Uñas" },
  { emoji: "👁️", nombre: "Pestañas" },
  { emoji: "✏️", nombre: "Cejas" },
  { emoji: "🧴", nombre: "Cuidado de la piel" },
  { emoji: "💆", nombre: "Masajes" },
  { emoji: "🦴", nombre: "Kinesiología" },
  { emoji: "🦵", nombre: "Fisioterapia" },
  { emoji: "🧠", nombre: "Psicología" },
  { emoji: "🥦", nombre: "Nutrición" },
  { emoji: "🏋️", nombre: "Entrenamiento personal" },
  { emoji: "🧘", nombre: "Yoga" },
  { emoji: "🤸", nombre: "Pilates" },
  { emoji: "🖋️", nombre: "Tatuajes" },
  { emoji: "💎", nombre: "Piercing" },
  { emoji: "🐶", nombre: "Peluquería canina" },
  { emoji: "🐾", nombre: "Veterinaria" },
  { emoji: "🦷", nombre: "Odontología" },
  { emoji: "📷", nombre: "Fotografía" },
  { emoji: "📚", nombre: "Clases particulares" },
  { emoji: "🧖", nombre: "Spa" },
  { emoji: "💄", nombre: "Maquillaje" },
  { emoji: "🦶", nombre: "Podología" },
];

// ---------------------------------------------------------------------------
// home: nueva portada "Foto-historia" (WP-71). Misma forma que `home` en
// sv-SE.ts. En Chile todavía no hay pago online al reservar (Mercado Pago
// viene después): nada de tarjetas ni comisiones por pago. El nombre del
// producto nunca se escribe acá (regla dura 10).
// ---------------------------------------------------------------------------

const TARIFA = {
  valor: "$0",
  texto: "de comisión por reserva. Nunca cobramos por tus reservas.",
  textoLargo:
    "de comisión por cada reserva que recibes. Pagas tu plan mensual y nada más – nunca un porcentaje por reserva.",
  faq: "No. Pagas tu plan mensual y no cobramos comisión por ninguna reserva que recibas.",
} as const;

const HOME_CONFIANZA = [
  { id: "pago", texto: "Cuenta gratis, sin tarjeta" },
  { id: "datos", texto: "Datos protegidos" },
  { id: "soporte", texto: "Soporte en español" },
] as const;

export const home = {
  tarifa: TARIFA,
  confianza: HOME_CONFIANZA,
  demo: {
    nombre: "Estudio Brisa",
    rubro: "Peluquería y barbería · Providencia, Santiago",
    zona: "Providencia",
    nota: "4,9",
    resenas: "128",
    logoAlt: "Logo de Estudio Brisa",
    servicios: [
      { nombre: "Corte de pelo", duracion: "45 min", precio: "$15.000" },
      { nombre: "Color + corte", duracion: "2 h", precio: "$45.000" },
      { nombre: "Barba y fade", duracion: "30 min", precio: "$12.000" },
      { nombre: "Perfilado de cejas", duracion: "20 min", precio: "$8.000" },
    ],
    flash: "Hoy 16:30 · −25 %",
    cita: "“Justo el corte que quería.”",
    autor: "Sara L. · Verificada",
    equipoMas: "+2",
    reservar: "Reservar hora",
    boka: "Reservar",
  },
  hero: {
    fotoAlt: "Mujer en bata y toalla toma té en una sala de tratamientos",
    prefijo: "El sistema de reservas para",
    industrias: [
      "peluquerías",
      "barberías",
      "salones de uñas",
      "esteticistas",
      "masajistas",
      "entrenadores",
      "tatuadores",
      "peluquerías caninas",
    ],
    tituloLinea1: "Tu propia página de reservas.",
    tituloPre: "Lista en",
    tituloMarca: "5 minutos.",
    texto:
      "Deja que tus clientes reserven a cualquier hora. Los recordatorios, las reseñas y las horas flash se hacen solos.",
    emailLabel: "Tu correo",
    emailPlaceholder: "Tu correo electrónico",
    cta: "Crear cuenta gratis",
    marqueeAria: (p: { nombre: string }): string => `Esto incluye ${p.nombre}`,
    cardA: [
      {
        eyebrow: "NUEVA RESERVA",
        title: "Elisa · Tinte, jue 14:30",
        chip: "Confirmada",
      },
      {
        eyebrow: "NUEVA RESERVA",
        title: "Amir · Barba, vie 10:00",
        chip: "Confirmada",
      },
      {
        eyebrow: "RESERVADA A LAS 23:14",
        title: "Sara · Gelish, sáb 12:00",
        chip: "Mientras dormías",
      },
      {
        eyebrow: "NUEVA RESERVA",
        title: "Jorge · Masaje 50 min",
        chip: "Confirmada",
      },
    ],
    cardB: [
      { big: "4,9", sub: "reseñas verificadas" },
      { big: "+3", sub: "reseñas nuevas hoy" },
      { big: "5,0", sub: "“¡Vuelvo seguro!” – Sara L." },
    ],
    cardC: [
      {
        eyebrow: "HORA FLASH",
        title: "Hoy 16:30 · −25 %",
        sub: "Enviada a 12 en lista de espera",
      },
      {
        eyebrow: "HORA FLASH",
        title: "Hoy 16:30 · ¡reservada!",
        sub: "María la tomó en 4 minutos",
      },
      {
        eyebrow: "HORA FLASH",
        title: "Mañana 09:15 · −30 %",
        sub: "Un hueco vacío se llenó",
      },
      {
        eyebrow: "LISTA DE ESPERA",
        title: "Sábado lleno",
        sub: "3 esperan una anulación",
      },
    ],
    usps: [
      {
        id: "reserva",
        titulo: "Reservas online 24/7",
        texto: "Tus clientes reservan solos, incluso a las 23:00.",
      },
      {
        id: "pago",
        titulo: "Tu link de reservas",
        texto: "Un solo link para Instagram y WhatsApp.",
      },
      {
        id: "resenas",
        titulo: "Reseñas verificadas",
        texto: "Solo clientes reales pueden opinar.",
      },
      {
        id: "flash",
        titulo: "Horas flash",
        texto: "Llena huecos con un descuento en un clic.",
      },
      {
        id: "espera",
        titulo: "Lista de espera",
        texto: "Una hora anulada pasa al siguiente de la lista.",
      },
      {
        id: "recordatorios",
        titulo: "Recordatorios",
        texto: "Menos plantones, todo automático por WhatsApp.",
      },
      {
        id: "flytt",
        titulo: "Cambio sin dolor",
        texto: "Traemos tus datos desde tu sistema anterior.",
      },
      {
        id: "pagina",
        titulo: "Página propia",
        texto: "Fotos, equipo y redes sociales.",
      },
      {
        id: "volver",
        titulo: "Te echamos de menos",
        texto: "Reactiva a clientes que no vuelven hace tiempo.",
      },
      {
        id: "caja",
        titulo: "Caja e informes",
        texto: "Ingresos y ocupación al instante.",
      },
      {
        id: "equipo",
        titulo: "Agenda por profesional",
        texto: "Horarios propios para cada persona del equipo.",
      },
      {
        id: "clientes",
        titulo: "Ficha de clientes",
        texto: "El historial de cada cliente a mano.",
      },
    ],
  },
  flytt: {
    etiqueta: "CAMBIO SIN DOLOR",
    tituloPre: "Cambia de sistema sin",
    tituloMarca: "partir de cero.",
    texto:
      "¿Ya tienes una página de reservas en otro lado? Pega el link y traemos tus servicios, precios, horarios y equipo por ti.",
    pasos: [
      { titulo: "Pega el link", texto: "De tu página de reservas actual" },
      { titulo: "Leemos todo", texto: "Listo en un par de minutos" },
      {
        titulo: "Elige qué quieres traer",
        texto: "Tú apruebas todo antes de que se guarde",
      },
      {
        titulo: "Listo, ya estás en marcha",
        texto: "Tu nueva página de reservas está lista",
      },
    ],
    cta: "Traer mi página gratis",
    nota: "Sin contraseñas · Sin datos de clientes",
    ventana: (p: { nombre: string }): string => `Importar a ${p.nombre}`,
    pasoDe: (p: { n: number }): string => `Paso ${p.n} de 4`,
    linkLabel: "Link de tu página de reservas actual",
    urlEjemplo: "https://www.tureserva.cl/estudio-brisa",
    hamta: "Traer",
    pegado: "Link pegado",
    compat: "Funciona con los sistemas de reservas más comunes.",
    leyendo: "Estamos leyendo tu página …",
    hallazgos: [
      { at: 0.18, label: "Servicios y precios", count: "8" },
      { at: 0.38, label: "Horarios", count: "lun–sáb" },
      { at: 0.58, label: "Equipo", count: "4" },
      { at: 0.78, label: "Perfil y redes sociales", count: "✓" },
    ],
    elegir: "Elige qué quieres traer",
    opciones: [
      { at: 0.1, label: "Servicios y precios", count: "8" },
      { at: 0.25, label: "Categorías", count: "3" },
      { at: 0.4, label: "Horarios", count: "lun–sáb" },
      { at: 0.55, label: "Equipo", count: "4" },
      { at: 0.7, label: "Descripción y redes sociales", count: "" },
    ],
    importar: "Importar lo elegido",
    listo: "¡Listo, ya estás en marcha!",
    omdomen: "reseñas",
  },
  showcase: {
    etiqueta: "TU PÁGINA DE RESERVAS",
    tituloPre: "Linda desde",
    tituloMarca: "el primer día.",
    texto:
      "Fotos, servicios, equipo, reseñas y redes sociales en tu propio link. Tus clientes reservan en menos de un minuto, desde el celular o el computador.",
    chips: [
      "Tu propio link",
      "Instagram, TikTok y Facebook",
      "Horas flash a la vista",
      "Reseñas de clientes reales",
    ],
    cta: "Ver la página de ejemplo",
    tabs: ["Servicios", "Equipo", "Reseñas"],
    omdomenRad: (p: { n: string; zona: string }): string =>
      `${p.n} reseñas verificadas · ${p.zona}`,
    team: "NUESTRO EQUIPO",
    redes: ["Instagram", "TikTok"],
  },
  bento: {
    etiqueta: "FUNCIONES",
    tituloPre: "Todo lo que llena tu agenda.",
    tituloMarca: "Nada de más.",
    texto:
      "Todo viene incluido desde el inicio. Pagas por más profesionales y por los recordatorios, nunca por funciones.",
    grande: {
      etiqueta: "RECORDATORIOS",
      titulo: "Menos plantones.",
      texto:
        "Tus clientes reciben un recordatorio por WhatsApp antes de su hora, sin que tú hagas nada.",
      ejemploLinea: "Corte de pelo · jue 14:30",
      ejemploValor: "Mañana 14:30",
      ejemploEstado: "Confirmó",
      cajaEtiqueta: "Recordatorio",
      cajaValor: "24 h",
      cajaTexto: "antes de cada hora, automático por WhatsApp.",
    },
    resenas: {
      etiqueta: "RESEÑAS VERIFICADAS",
      nota: "4,9",
      texto:
        "Solo clientes con una reserva realizada pueden opinar. Tú respondes en público y las reseñas se ven en tu página.",
    },
    flash: {
      etiqueta: "HORAS FLASH Y LISTA DE ESPERA",
      chip: "Hoy 16:30 · −25 %",
      texto:
        "Una anulación se vuelve una nueva reserva: la lista de espera recibe el aviso al tiro y los huecos se llenan con descuento.",
    },
    pequenas: [
      {
        etiqueta: "TU LINK DE RESERVAS",
        titulo: "Un link para todo",
        texto: "Compártelo en Instagram, WhatsApp o Google.",
      },
      {
        etiqueta: "CAJA E INFORMES",
        titulo: "Tus números claros",
        texto: "Ingresos, ocupación e informes en un solo lugar.",
      },
      {
        etiqueta: "TE ECHAMOS DE MENOS",
        titulo: "Clientes que vuelven",
        texto: "Un aviso automático a quienes llevan tiempo sin reservar.",
      },
    ],
  },
  como: {
    etiqueta: "ASÍ RESERVAN TUS CLIENTES",
    tituloPre: "Reservado en",
    tituloMarca: "menos de un minuto.",
    texto:
      "Sin apps, sin cuentas, sin llamadas. El cliente abre tu link – desde Instagram, Google o WhatsApp – y listo.",
    pasos: [
      { titulo: "Elige el servicio", texto: "Con foto, precio y duración" },
      { titulo: "Elige la hora", texto: "Solo horas realmente disponibles" },
      {
        titulo: "Pone sus datos",
        texto: "Nombre y celular – sin crear cuenta",
      },
      {
        titulo: "Reservado",
        texto: "Confirmación al tiro por WhatsApp y correo",
      },
    ],
    movil: {
      paso: "PASO 3 DE 4",
      titulo: "Tus datos",
      resumenTop: "Corte de pelo · jue 16 oct",
      resumen: "14:30 con Ida · $15.000",
      nombreLabel: "Nombre",
      nombre: "Elisa Fuentes",
      telLabel: "Celular",
      tel: "+56 9 1234 5678",
      nota: "Te enviamos una confirmación y un recordatorio el día antes.",
      boton: "Reservar mi hora",
      confirmada: "Confirmación enviada",
    },
  },
  para: {
    etiqueta: "PARA QUIÉN",
    tituloPre: "Para todos los que",
    tituloMarca: "trabajan con horas.",
    texto:
      "Desde una peluquera independiente hasta una clínica con varios profesionales. El mismo sistema simple, adaptado a tu rubro.",
    rubros: [
      { id: "frisor", label: "Peluquería" },
      { id: "barberare", label: "Barbería" },
      { id: "naglar", label: "Uñas" },
      { id: "fransar", label: "Pestañas y cejas" },
      { id: "hudvard", label: "Cuidado de la piel" },
      { id: "massage", label: "Masajes" },
      { id: "naprapat", label: "Kinesiología" },
      { id: "yoga", label: "Yoga y pilates" },
      { id: "tatuering", label: "Tatuajes" },
      { id: "hundtrim", label: "Peluquería canina" },
      { id: "pt", label: "Entrenamiento personal" },
      { id: "makeup", label: "Maquillaje" },
    ],
  },
  precios: {
    etiqueta: "PRECIOS",
    tituloPre: "Precios simples.",
    tituloMarca: "Sin comisión.",
    mes: "/mes",
    nota: {
      valor: TARIFA.valor,
      texto: TARIFA.textoLargo,
    },
    fundador: {
      valor: "½",
      negrita: "Plan Fundador:",
      texto: "los primeros negocios que se suman pagan la mitad para siempre.",
    },
  },
  faq: {
    etiqueta: "PREGUNTAS",
    titulo: "Bueno saber.",
    texto:
      "¿No encuentras la respuesta? Escríbenos, te respondemos en español.",
    items: [
      { pregunta: "¿Cobran comisión por reserva?", respuesta: TARIFA.faq },
      {
        pregunta: "¿Cómo me cambio desde mi sistema actual?",
        respuesta:
          "Pega el link de tu página de reservas actual y leemos tus servicios, precios, horarios y equipo. Tú revisas e importas: toma un par de minutos.",
      },
      {
        pregunta: "¿Dónde se guardan mis datos y los de mis clientes?",
        respuesta:
          "Tus datos están protegidos y puedes exportarlos o borrarlos cuando quieras. Tus clientes también pueden pedir sus datos.",
      },
      {
        pregunta: "¿Hay permanencia?",
        respuesta: "No. Puedes cambiar de plan o cancelar cuando quieras.",
      },
      {
        pregunta: "¿Cómo funcionan las reseñas?",
        respuesta:
          "Después de cada reserva realizada, el cliente recibe un link y puede calificar la visita. Solo clientes reales pueden opinar y tú puedes responder en público.",
      },
      {
        pregunta: "¿Tengo que instalar algo?",
        respuesta:
          "No. Todo funciona en el navegador, en el celular y en el computador.",
      },
      {
        pregunta: "¿Me ayudan a partir?",
        respuesta:
          "Sí. Con la importación estás en marcha en minutos, y siempre puedes escribirnos en español.",
      },
    ],
  },
  cta: {
    tituloPre: "¿Listo para llenar",
    tituloMarca: "tu agenda?",
    texto:
      "Crea tu página de reservas en cinco minutos – gratis para una persona, sin tarjeta.",
  },
  footer: {
    producto: "Producto",
    rubros: "Rubros",
    empresa: "Empresa",
    contacto: "Contacto",
    flytt: "Cambio sin dolor",
    flash: "Horas flash",
    ejemplo: "Página de ejemplo",
    partnerEtiqueta: "PARTNER",
    partnerTexto: "tarjeta de sellos digital para tus clientes frecuentes",
    pie: (p: { anio: number; nombre: string }): string =>
      `© ${p.anio} ${p.nombre}`,
  },
};
