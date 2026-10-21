/**
 * Recorrido guiado (WP-72): página de reservas del negocio de ejemplo y
 * demo de la vista del dueño. Texto en chileno (tú). TODO_COPY: revisión de
 * copywriter-es-cl (el equipo de desarrollo escribió una primera versión).
 * El nombre del producto entra siempre como `{ nombre }`.
 */
export const visita = {
  comun: {
    saltar: "Saltar",
    atras: "Atrás",
    siguiente: "Siguiente",
    reiniciar: "Ver el recorrido otra vez",
    progreso: "Avance del recorrido",
    contador: (p: { n: number; total: number }): string =>
      `PASO ${p.n} DE ${p.total}`,
  },
  rubros: {
    etiqueta: "Elige tu rubro",
    items: [
      { id: "peluqueria", label: "Peluquería", slug: "tu-peluqueria" },
      { id: "barberia", label: "Barbería", slug: "tu-barberia" },
      { id: "unas", label: "Uñas", slug: "tu-estudio-de-unas" },
      { id: "estetica", label: "Estética", slug: "tu-centro" },
      { id: "otro", label: "Otro", slug: "tu-negocio" },
    ],
  },
  cliente: {
    bienvenida: {
      aria: "Bienvenida a la demo",
      titulo: "Así puede verse tu página",
      texto:
        "Este es un negocio de ejemplo. Te mostramos todo en 40 segundos: elige tu rubro y adaptamos los ejemplos.",
      empezar: "Muéstrame",
      saltar: "Mirar por mi cuenta",
    },
    pasos: {
      servicios: {
        titulo: "Tus servicios",
        texto:
          "Cada servicio se despliega con descripción, duración, precio y quién lo hace, así tu cliente sabe justo qué está reservando. Los creas en unos minutos o los importas desde tu sistema anterior.",
        corto: "Precio, duración y descripción: tu cliente elige directo.",
        chips: ["Descripción", "Precio y duración", "Quién lo hace"],
      },
      equipo: {
        titulo: "Tu equipo",
        texto:
          "Cada persona tiene su perfil y su horario. Tu cliente puede elegir con quién, o dejar que el sistema busque la primera hora libre.",
        corto: "Cada persona del equipo tiene perfil y horario propios.",
        chips: ["Horarios propios", "Cuentas del equipo"],
      },
      flash: {
        titulo: "Horas flash",
        texto:
          "¿Se liberó una hora? Ofrécela con descuento: la lista de espera se entera al tiro y el hueco se llena.",
        corto:
          "Ofrece una hora libre con descuento: la lista de espera se entera al tiro.",
        chips: ["Lista de espera", "Descuento a tu gusto"],
      },
      resenas: {
        titulo: "Reseñas verificadas",
        texto:
          "Después de cada visita le pedimos una reseña al cliente. Solo opinan clientes reales, así que la nota es confiable.",
        corto: "Solo clientes reales pueden dejar reseña.",
        chips: ["Solo clientes reales", "Puedes responder"],
      },
      reservar: {
        titulo: "Reservado en un minuto",
        texto:
          "Tu cliente elige la hora y deja su nombre y número. La confirmación y el recordatorio salen solos: tú no tienes que mover un dedo.",
        corto:
          "Elige la hora y deja su nombre: la confirmación y el recordatorio salen solos.",
        chips: ["Confirmación al tiro", "Recordatorio antes"],
      },
    },
    final: {
      aria: "¿Seamos buddies?",
      etiqueta: "Tu página · lista en 5 min",
      live: "Live",
      titulo: "¿Seamos buddies?",
      texto:
        "Te armamos tu propia página de reservas en cinco minutos, o en dos si vienes de otro sistema. Gratis para una persona.",
      corto:
        "Tu propia página de reservas en cinco minutos. Gratis para una persona.",
      cta: "Sí, crear mi página",
      seguir: "Seguir mirando",
      negocio: "Ver cómo se ve para ti como dueña o dueño",
    },
  },
  negocio: {
    aria: "Bienvenida a la vista del negocio",
    nombre: "Estudio Brisa",
    plan: "Plan Equipo",
    volver: "Volver al inicio",
    nav: [
      "Hoy",
      "Agenda",
      "Clientes",
      "Caja",
      "Horas flash",
      "Reseñas",
      "Ajustes",
    ],
    navMenu: "Menú",
    agenda: "Agenda",
    semana: "Semana 42 · 13–17 oct",
    dia: "Miércoles 15 oct",
    nuevaReserva: "+ Nueva reserva",
    campanaAria: "Solicitudes pendientes",
    dias: ["Lun 13", "Mar 14", "Mié 15", "Jue 16", "Vie 17"],
    flashLibre: "Hora flash 16:30",
    flashLibreSub: "−25 % · 12 en lista",
    flashTomada: "Hora flash · ¡reservada!",
    flashTomadaSub: "Maja, desde la lista de espera",
    servicios: {
      barba: "Barba",
      corte: "Corte",
      corteHombre: "Corte hombre",
      color: "Color",
      esmaltado: "Esmaltado",
      fade: "Fade",
      lash: "Lash lift",
      mechas: "Mechas",
      masaje: "Masaje",
      facial: "Facial",
    },
    campana: {
      titulo: "Esperan por ti (2)",
      uno: "Sara L. quiere reservar Esmaltado · sáb 12:00",
      confirmar: "Confirmar",
      rechazar: "Rechazar",
      dos: "Jonás K. quiere cancelar jue 10:00 ·",
      aprobar: "¿Aprobar?",
    },
    resenas: {
      titulo: "Reseñas",
      nota: "4,9 · 3 nuevas",
      cita: "“¡Justo el corte que quería!” – Sara L.",
      responder: "Responder",
    },
    caja: {
      titulo: "Caja y ocupación",
      periodo: "esta semana",
      ingresos: "$184.000",
      ingresosEtiqueta: "ingresos",
      ocupacion: "86 %",
      ocupacionEtiqueta: "reservado",
      graficoAria: "Ocupación por día",
    },
    hoy: {
      titulo: "Hoy",
      filas: [
        { hora: "10:00", texto: "Amir · Barba", estado: "Pagada" },
        { hora: "13:00", texto: "Elin · Color", estado: "Paga en el local" },
        { hora: "16:30", texto: "Hora flash", estado: "−25 %" },
      ],
    },
    pasos: {
      semana: {
        titulo: "Toda la semana de un vistazo",
        texto:
          "Todas las reservas de todo el equipo en un solo lugar. Haz clic para mover una hora, ver quién ya pagó y agregar reservas propias.",
        chips: ["Todo el equipo", "Computador y celular"],
      },
      solicitudes: {
        titulo: "Solicitudes y cancelaciones",
        texto:
          "Tú decides: confirma o rechaza nuevas reservas y cancelaciones con un clic. Tu cliente recibe la respuesta al tiro.",
        chips: ["Aviso en el celular", "Mensaje al cliente"],
      },
      flash: {
        titulo: "Las horas flash llenan los huecos",
        texto:
          "¿Se liberó una hora? Ofrécela con descuento: la lista de espera recibe un aviso y reserva quien llegue primero.",
        chips: ["Descuento a tu gusto", "Lista de espera"],
      },
      resenas: {
        titulo: "Reseñas que venden por ti",
        texto:
          "Después de cada visita le pedimos una reseña al cliente. Responde desde aquí mismo: la nota se ve en tu página.",
        chips: ["Solo clientes reales", "Respuesta pública"],
      },
      caja: {
        titulo: "Caja y estadísticas",
        texto:
          "Mira ingresos, ocupación y quién es tu mejor cliente, sin Excel.",
        chips: ["Informes", "Ficha de clientes"],
      },
    },
    bienvenida: {
      titulo: "Así se ve para ti",
      texto: (p: { negocio: string; nombre: string }): string =>
        `Esta es la vista de ${p.negocio} en ${p.nombre}: la agenda, los pagos y las reseñas. Te mostramos lo más importante en un minuto.`,
      empezar: "Muéstrame",
      saltar: "Mirar por mi cuenta",
    },
    final: {
      aria: "¿Seamos buddies?",
      etiqueta: "Lista en 5 minutos",
      titulo: "¿Seamos buddies?",
      texto:
        "Tu propia agenda en cinco minutos: gratis para una persona y sin tarjeta. Si ya tienes un sistema, te pasamos todo.",
      cta: "Sí, crear mi agenda",
      seguir: "Ver más",
    },
    meta: {
      titulo: (p: { nombre: string }): string =>
        `Así se ve ${p.nombre} para ti, dueña o dueño del negocio`,
      descripcion: (p: { nombre: string }): string =>
        `Recorre una demo de ${p.nombre}: agenda, pagos, reseñas y horas flash.`,
    },
    enlaceInicio: "Ver cómo se ve para ti como dueña o dueño",
  },
} as const;
