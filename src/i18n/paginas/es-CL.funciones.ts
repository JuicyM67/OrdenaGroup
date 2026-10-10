// Textos de las páginas de funcionalidades, español de Chile (tú), WP-75. El nombre de la
// marca nunca se escribe acá (regla 10). El contenido sigue lo que está construido:
// recordatorios por correo en todos los planes, lista de espera desde Emprende, horas flash
// e informes desde Equipo. No hay página de pagos (todavía no existe cobro online en Chile).
import type { PaginasCopy } from "./types";

export const funciones: PaginasCopy["funciones"] = {
  reservas: {
    nombre: "Reservas online",
    resumen: "Tu propia página de reservas, a toda hora",
    etiqueta: "FUNCIONALIDAD · RESERVAS",
    meta: {
      titulo: "Reservas online para tu negocio",
      descripcion:
        "Dale a tus clientes una página de reservas propia donde eligen servicio, profesional y hora a cualquier hora del día. Sin comisión por reserva. Crea la tuya gratis.",
    },
    fotoAlt: "Clienta en bata toma té en una sala de spa",
    hero: {
      pre: "Una página de reservas que",
      marca: "agenda por ti.",
      texto:
        "Tus clientes eligen servicio, profesional y hora en tu propio link, sin llamadas ni mensajes de ida y vuelta.",
    },
    tarjeta: {
      linea: "Corte dama · jue 14:30",
      valor: "Reservada por Camila",
      estado: "Confirmada al tiro",
    },
    beneficios: [
      {
        titulo: "Abierto las 24 horas",
        texto:
          "Tus clientes reservan cuando les acomoda, incluso cuando duermes o tienes las manos ocupadas.",
      },
      {
        titulo: "Tu página, tu estilo",
        texto:
          "La página muestra tu logo, tus fotos, tus servicios y tu equipo, en un link que es solo tuyo.",
      },
      {
        titulo: "Nunca doble reserva",
        texto:
          "Solo se muestran horas libres. El servidor calcula los espacios, así que dos clientes no pueden tomar la misma hora.",
      },
    ],
    como: {
      pre: "Lista en",
      marca: "tres pasos.",
      pasos: [
        {
          titulo: "Crea tus servicios",
          texto:
            "Nombre, duración y precio. Te sugerimos servicios listos para tu rubro.",
        },
        {
          titulo: "Comparte tu link",
          texto:
            "Ponlo en Instagram, en tu perfil de Google o envíalo por mensaje.",
        },
        {
          titulo: "Recibe reservas",
          texto:
            "Cada reserva aparece en tu agenda y tu cliente recibe una confirmación.",
        },
      ],
      mock: {
        titulo: "Tu página de reservas",
        filas: [
          { k: "Servicio", v: "Corte dama" },
          { k: "Profesional", v: "Cualquiera" },
          { k: "Hora", v: "Jue 14:30", ok: true },
        ],
        boton: "Reservar hora",
      },
    },
    faq: [
      {
        pregunta: "¿Mis clientes necesitan crear una cuenta?",
        respuesta:
          "No. Solo dejan su nombre y datos de contacto al reservar, sin cuenta ni contraseña.",
      },
      {
        pregunta: "¿Cobran algo extra por cada reserva?",
        respuesta: "No. Pagas solo tu plan mensual, sin comisión por reserva.",
      },
      {
        pregunta: "¿Pueden cambiar o cancelar su hora solos?",
        respuesta:
          "Sí, desde el link de la confirmación y dentro de las reglas que tú definas, por ejemplo cuánto antes de la hora pueden cambiarla.",
      },
    ],
  },

  resenas: {
    nombre: "Reseñas verificadas",
    resumen: "Solo reseñan clientes reales",
    etiqueta: "FUNCIONALIDAD · RESEÑAS",
    meta: {
      titulo: "Reseñas verificadas de clientes reales",
      descripcion:
        "Solo pueden reseñar quienes estuvieron contigo, y el promedio aparece en tu página de reservas. Responde en público y reporta reseñas que no corresponden.",
    },
    fotoAlt: "Manos con uñas bien cuidadas",
    hero: {
      pre: "Reseñas en las que",
      marca: "se puede confiar.",
      texto:
        "Solo reseñan clientes que de verdad pasaron por tu negocio, y el promedio se ve en tu página de reservas.",
    },
    tarjeta: {
      linea: "Reseña de Amanda L.",
      valor: "5 de 5 estrellas",
      estado: "Clienta verificada",
    },
    beneficios: [
      {
        titulo: "Una reseña por visita",
        texto:
          "Cada cliente recibe un link personal después de la visita. Sin link no hay reseña, así que no hay notas inventadas.",
      },
      {
        titulo: "Respondes en público",
        texto:
          "Agradece los comentarios buenos o explica tu lado. Reporta las reseñas ofensivas o que no vienen de un cliente.",
      },
      {
        titulo: "Se ven donde importa",
        texto:
          "El promedio y la cantidad aparecen junto a tu nombre en la página de reservas, antes de que alguien reserve.",
      },
    ],
    como: {
      pre: "De la visita a la",
      marca: "reseña.",
      pasos: [
        {
          titulo: "La visita termina",
          texto:
            "Cuando pasa la hora, la reserva cuenta como realizada, salvo que la hayas marcado como No vino.",
        },
        {
          titulo: "El cliente recibe la invitación",
          texto:
            "Le llega un correo con un link personal que sirve por 60 días.",
        },
        {
          titulo: "La reseña se publica",
          texto:
            "La nota de 1 a 5 y un comentario corto aparecen en tu página, con nombre e inicial.",
        },
      ],
      mock: {
        titulo: "Reseñas · Clientes",
        filas: [
          { k: "Promedio", v: "4,9", ok: true },
          { k: "Reseñas nuevas", v: "3" },
        ],
        boton: "Responder reseñas",
      },
    },
    faq: [
      {
        pregunta: "¿Puedo borrar una reseña que no me gusta?",
        respuesta:
          "No, ni tú ni nadie de tu equipo puede borrar o cambiar una reseña. Puedes responder en público y reportarla si es inapropiada, y nosotros la revisamos.",
      },
      {
        pregunta: "¿El cliente puede cambiar su reseña?",
        respuesta: "Sí, durante siete días desde el mismo link.",
      },
      {
        pregunta: "¿Puedo desactivar las invitaciones?",
        respuesta:
          "Sí. En Ajustes → Reglas puedes activar o desactivar el envío de la invitación después de la visita.",
      },
    ],
  },

  horasFlash: {
    nombre: "Horas flash",
    resumen: "Llena los espacios con descuento",
    etiqueta: "FUNCIONALIDAD · HORAS FLASH",
    meta: {
      titulo: "Horas flash: vende tus horas libres con descuento",
      descripcion:
        "Convierte una hora libre de último minuto en una hora flash con descuento. Tus clientes reciben la oferta por correo y la toma quien reserve primero.",
    },
    fotoAlt: "Tres personas hacen yoga en un estudio luminoso",
    hero: {
      pre: "Llena los espacios con",
      marca: "horas flash.",
      texto:
        "Cuando se libera una hora a último minuto, la ofreces con descuento. La toma quien reserve primero.",
    },
    tarjeta: {
      linea: "Hora libre · hoy 16:00",
      valor: "−20 % · $14.400",
      estado: "Enviada a tus clientes",
    },
    beneficios: [
      {
        titulo: "Horas que si no serían $0",
        texto:
          "Una hora libre de $18.000 que vendes con 20 % de descuento te deja $14.400 en vez de nada.",
      },
      {
        titulo: "Tú eliges el descuento",
        texto: "Defines el porcentaje y cuánto dura la oferta, hora por hora.",
      },
      {
        titulo: "Se cierra al tiro",
        texto:
          "Apenas alguien la toma, la oferta desaparece para los demás. Sin dobles reservas.",
      },
    ],
    como: {
      pre: "De hora libre a",
      marca: "reserva.",
      pasos: [
        {
          titulo: "Marca la hora libre",
          texto: "Elige la hora que se liberó y el descuento, con un clic.",
        },
        {
          titulo: "Avisamos a tus clientes",
          texto:
            "Reciben un correo con la oferta y el link para reservar directo.",
        },
        {
          titulo: "La hora se llena",
          texto:
            "Quien reserve primero se queda con la hora; los demás ven que ya no está.",
        },
      ],
      mock: {
        titulo: "Nueva hora flash",
        filas: [
          { k: "Hora", v: "Hoy 16:00" },
          { k: "Descuento", v: "20 %", ok: true },
          { k: "Vale hasta", v: "15:00" },
        ],
        boton: "Enviar hora flash",
      },
    },
    faq: [
      {
        pregunta: "¿Qué plan necesito?",
        respuesta: "Las horas flash vienen desde el plan Equipo.",
      },
      {
        pregunta: "¿Cuánto dura una hora flash?",
        respuesta:
          "Lo decides tú: pueden ser unos minutos o hasta la hora de la visita.",
      },
      {
        pregunta: "¿Qué pasa si nadie la toma?",
        respuesta:
          "Nada especial: la hora sigue libre como antes, sin costo ni compromiso.",
      },
    ],
  },

  listaEspera: {
    nombre: "Lista de espera",
    resumen: "La hora cancelada pasa al siguiente",
    etiqueta: "FUNCIONALIDAD · LISTA DE ESPERA",
    meta: {
      titulo: "Lista de espera: las horas canceladas se llenan solas",
      descripcion:
        "Cuando un día está lleno, tu cliente se anota en la lista de espera y recibe un aviso apenas se libera una hora. Menos espacios vacíos sin esfuerzo.",
    },
    fotoAlt: "Barbero perfila la barba de un cliente",
    hero: {
      pre: "Alguien cancela y",
      marca: "el siguiente toma la hora.",
      texto:
        "Si el día está lleno, tu cliente se anota en la lista de espera y recibe un aviso apenas se libera una hora.",
    },
    tarjeta: {
      linea: "Viernes · día lleno",
      valor: "4 en lista de espera",
      estado: "Hora libre, aviso enviado",
    },
    beneficios: [
      {
        titulo: "Menos espacios vacíos",
        texto:
          "Una cancelación no tiene por qué ser una pérdida. La hora se ofrece al tiro a quien la quiere.",
      },
      {
        titulo: "El cliente se anota solo",
        texto:
          "En un día lleno, elige servicio y día y queda en la lista, sin que tú intervengas.",
      },
      {
        titulo: "Gana quien responde primero",
        texto:
          "La hora no se guarda para nadie. Si responden varios, se la lleva el primero y los demás ven que ya está reservada.",
      },
    ],
    como: {
      pre: "Funciona en",
      marca: "tres pasos.",
      pasos: [
        {
          titulo: "El cliente se anota",
          texto:
            "La inscripción es por servicio y día, en tu página de reservas.",
        },
        {
          titulo: "Se libera una hora",
          texto:
            "Cuando alguien cancela, la lista de espera recibe un aviso automático.",
        },
        {
          titulo: "La hora se reserva",
          texto:
            "El primero que responde se queda con la hora y aparece en tu agenda.",
        },
      ],
      mock: {
        titulo: "Lista de espera · Viernes",
        filas: [
          { k: "Corte dama", v: "2 esperando" },
          { k: "Color", v: "2 esperando" },
          { k: "Hora libre", v: "Aviso enviado", ok: true },
        ],
        boton: "Ver lista de espera",
      },
    },
    faq: [
      {
        pregunta: "¿Qué plan necesito?",
        respuesta: "La lista de espera viene desde el plan Emprende.",
      },
      {
        pregunta: "¿Cómo se entera el cliente?",
        respuesta: "Recibe un aviso automático por correo.",
      },
      {
        pregunta: "¿Tengo que hacer algo cuando se libera una hora?",
        respuesta:
          "No. La cancelación libera la hora y la lista de espera recibe el aviso sola.",
      },
    ],
  },

  recordatorios: {
    nombre: "Recordatorios",
    resumen: "Avisos automáticos, menos inasistencias",
    etiqueta: "FUNCIONALIDAD · RECORDATORIOS",
    meta: {
      titulo: "Recordatorios automáticos por correo",
      descripcion:
        "Tus clientes reciben una confirmación al reservar y un recordatorio antes de la hora, con un link para cambiarla o cancelarla. Menos inasistencias sin trabajo manual.",
    },
    fotoAlt: "Peluquera riza el pelo de una clienta",
    hero: {
      pre: "Tu cliente llega,",
      marca: "sin que tengas que recordárselo.",
      texto:
        "Confirmación al tiro y un recordatorio antes de la hora, con un link para cambiarla o cancelarla.",
    },
    tarjeta: {
      linea: "Recordatorio · mañana 10:00",
      valor: "Enviado por correo",
      estado: "El cliente confirmó",
    },
    beneficios: [
      {
        titulo: "Menos inasistencias",
        texto:
          "Un recordatorio el día antes, con fecha y hora exactas, hace que menos gente se olvide de su hora.",
      },
      {
        titulo: "Cambiar en vez de faltar",
        texto:
          "Cada mensaje trae un link. Si el cliente no alcanza a llegar, cambia la hora él mismo y tú te quedas con un espacio que puedes llenar.",
      },
      {
        titulo: "Correo en todos los planes",
        texto:
          "Los recordatorios por correo vienen en todos los planes, incluido el gratis.",
      },
    ],
    como: {
      pre: "Tú no haces",
      marca: "nada.",
      pasos: [
        {
          titulo: "El cliente reserva",
          texto: "La confirmación sale al tiro, con un link a su reserva.",
        },
        {
          titulo: "Sale el recordatorio",
          texto:
            "El día antes, el cliente recibe un aviso con la fecha y la hora.",
        },
        {
          titulo: "Confirma o cambia",
          texto: "Con el link puede ver, cambiar o cancelar su hora.",
        },
      ],
      mock: {
        titulo: "Recordatorio para Amanda",
        filas: [
          { k: "Corte dama", v: "Jue 14:30" },
          { k: "Canal", v: "Correo" },
          { k: "Estado", v: "Enviado", ok: true },
        ],
        boton: "Ver reserva",
      },
    },
    faq: [
      {
        pregunta: "¿Los recordatorios llegan por WhatsApp?",
        respuesta:
          "Por ahora salen por correo electrónico, en todos los planes.",
      },
      {
        pregunta: "¿El cliente puede responder el recordatorio?",
        respuesta:
          "Usa el link del mensaje para ver, cambiar o cancelar su hora.",
      },
      {
        pregunta: "¿Puedo desactivar los recordatorios?",
        respuesta: "Sí, en Ajustes defines qué mensajes reciben tus clientes.",
      },
    ],
  },

  agenda: {
    nombre: "Agenda y equipo",
    resumen: "El horario de todo tu equipo en un lugar",
    etiqueta: "FUNCIONALIDAD · AGENDA",
    meta: {
      titulo: "Agenda y equipo en un solo lugar",
      descripcion:
        "Vista semanal y diaria con una columna por profesional. Reservas, horarios, espacios y márgenes se calculan solos. La agenda del día también está en tu celular.",
    },
    fotoAlt: "Persona estira al aire libre con ayuda de un terapeuta",
    hero: {
      pre: "El día de todo tu equipo,",
      marca: "en un solo lugar.",
      texto:
        "Una columna por profesional, reservas que aparecen solas y la agenda del día en tu bolsillo.",
    },
    tarjeta: {
      linea: "Hoy · 3 profesionales",
      valor: "9 reservas",
      estado: "Próximo cliente a las 13:15",
    },
    beneficios: [
      {
        titulo: "Una columna por profesional",
        texto:
          "Mira la semana o el día con las horas de cada persona lado a lado, con sus horarios y servicios.",
      },
      {
        titulo: "Hoy en tu celular",
        texto:
          "Abre Hoy, mira quién viene y marca Llegó o No vino con una sola mano.",
      },
      {
        titulo: "Control total",
        texto:
          "Agrega clientes que llegan sin reserva, cambia una hora o cancélala directo en la agenda.",
      },
    ],
    como: {
      pre: "Todo en su",
      marca: "lugar.",
      pasos: [
        {
          titulo: "Arma tu equipo",
          texto:
            "Invita a tus profesionales y define sus horarios y servicios.",
        },
        {
          titulo: "Llegan las reservas",
          texto:
            "Cada reserva cae en la columna correcta, con horarios y márgenes ya considerados.",
        },
        {
          titulo: "Sigue tu día",
          texto:
            "Usa la vista diaria en el computador o Hoy en el celular y marca cómo resultó.",
        },
      ],
      mock: {
        titulo: "Agenda · Jueves",
        filas: [
          { k: "Camila", v: "5 reservas" },
          { k: "Joaquín", v: "4 reservas" },
          { k: "Próximo cliente", v: "13:15", ok: true },
        ],
        boton: "Abrir agenda",
      },
    },
    faq: [
      {
        pregunta: "¿Cuántos profesionales puedo tener?",
        respuesta:
          "Uno en Gratis y Emprende, hasta tres en Equipo y hasta diez en Local.",
      },
      {
        pregunta: "¿El cliente puede reservar con cualquiera del equipo?",
        respuesta:
          "Sí. Elige un profesional en particular o Cualquiera, y el sistema busca una hora libre.",
      },
      {
        pregunta: "¿Puedo crear reservas yo mismo?",
        respuesta:
          "Sí, puedes crear una reserva a mano, moverla a otro día o profesional y cancelarla.",
      },
    ],
  },

  caja: {
    nombre: "Caja e informes",
    resumen: "Ingresos y ocupación",
    etiqueta: "FUNCIONALIDAD · CAJA",
    meta: {
      titulo: "Caja e informes para tu negocio",
      descripcion:
        "Mira lo que ya cobraste y lo que falta por cobrar. Los informes muestran ingresos por semana, ocupación por profesional e inasistencias.",
    },
    fotoAlt: "Mujer recibe un masaje con piedras calientes",
    hero: {
      pre: "Mira lo que tu día",
      marca: "de verdad dejó.",
      texto:
        "La caja junta los cobros y los informes muestran cómo evoluciona tu negocio, sin planillas.",
    },
    tarjeta: {
      linea: "Cobrado hoy",
      valor: "$186.000",
      estado: "2 por cobrar",
    },
    beneficios: [
      {
        titulo: "Los cobros del día",
        texto:
          "Mira lo que ya entró y qué visitas faltan por cobrar, por día, semana o mes.",
      },
      {
        titulo: "Todos los medios de pago",
        texto:
          "Registra efectivo, débito o crédito y transferencia con un toque.",
      },
      {
        titulo: "Informes que muestran patrones",
        texto:
          "Ingresos por semana, ocupación por profesional, clientes nuevos y recurrentes, y la tendencia de inasistencias.",
      },
    ],
    como: {
      pre: "De la visita a los",
      marca: "números.",
      pasos: [
        {
          titulo: "Termina la visita",
          texto: "La reserva queda en Por cobrar apenas está terminada.",
        },
        {
          titulo: "Registra el pago",
          texto:
            "Elige el medio de pago con un toque y la reserva queda pagada.",
        },
        {
          titulo: "Sigue la evolución",
          texto:
            "Abre Informes para ver ingresos, ocupación y clientes en el tiempo.",
        },
      ],
      mock: {
        titulo: "Caja · Hoy",
        filas: [
          { k: "Cobrado", v: "$186.000", ok: true },
          { k: "Por cobrar", v: "$36.000" },
          { k: "Ticket promedio", v: "$31.000" },
        ],
        boton: "Abrir informes",
      },
    },
    faq: [
      {
        pregunta: "¿Qué plan necesito para los informes?",
        respuesta:
          "Los informes vienen desde el plan Equipo. La caja con los cobros del día está para todos.",
      },
      {
        pregunta: "¿Puedo elegir el período?",
        respuesta: "Sí: hoy, semana, mes o un rango de fechas propio.",
      },
      {
        pregunta: "¿Los clientes pagan online?",
        respuesta:
          "Por ahora no: tú registras el pago cuando lo recibes en tu negocio.",
      },
    ],
  },

  migracion: {
    nombre: "Cambio sin dolor",
    resumen: "Pega tu link, nosotros movemos el resto",
    etiqueta: "FUNCIONALIDAD · TRASLADO",
    meta: {
      titulo: "Cambia de sistema de reservas sin dolor",
      descripcion:
        "Pega el link de tu página de reservas actual y leemos tus servicios, tu equipo y los datos de tu negocio. Tú revisas antes de que se guarde algo.",
    },
    fotoAlt: "Tatuador tatúa un brazo",
    hero: {
      pre: "Cambia de sistema en",
      marca: "dos minutos.",
      texto:
        "Pega el link de tu página de reservas actual y leemos tus servicios, tu equipo y tus datos.",
    },
    tarjeta: {
      linea: "Leyendo tu página…",
      valor: "8 servicios · 3 en el equipo",
      estado: "Listo para revisar",
    },
    beneficios: [
      {
        titulo: "No vuelvas a escribir todo",
        texto:
          "El nombre del negocio, los servicios con duración y precio, y los nombres y cargos del equipo se leen de tu página pública.",
      },
      {
        titulo: "Tú revisas primero",
        texto:
          "Ves lo que se encontró y eliges qué importar. Los duplicados se omiten y nada se guarda hasta que confirmes.",
      },
      {
        titulo: "Solo lo que es público",
        texto:
          "Traemos la información pública de tu negocio. Los datos de clientes y las reseñas no se importan.",
      },
    ],
    como: {
      pre: "El traslado toma",
      marca: "unos minutos.",
      pasos: [
        {
          titulo: "Pega el link",
          texto:
            "La dirección de tu página de reservas actual, por ejemplo de AgendaPro o Fresha.",
        },
        {
          titulo: "Revisa lo que encontramos",
          texto: "Elige qué servicios y qué equipo quieres traer.",
        },
        {
          titulo: "Importa",
          texto: "Todo queda en tu nueva agenda, listo para recibir reservas.",
        },
      ],
      mock: {
        titulo: "Traer mi negocio",
        filas: [
          { k: "Link", v: "agendapro.com/…" },
          { k: "Servicios", v: "8 encontrados", ok: true },
          { k: "Equipo", v: "3 encontrados", ok: true },
        ],
        boton: "Importar",
      },
    },
    faq: [
      {
        pregunta: "¿Desde qué sistemas pueden leer?",
        respuesta:
          "Entre otros, AgendaPro, Reservo, Fresha y Booksy. Si el link no funciona, puedes pegar el texto de la página.",
      },
      {
        pregunta: "¿Se traen mis clientes y reservas antiguas?",
        respuesta:
          "No. La importación es de los datos del negocio, los servicios y los nombres del equipo, no de clientes ni historial de reservas.",
      },
      {
        pregunta: "¿Puedo cambiar cosas después de importar?",
        respuesta:
          "Sí. Todo lo importado lo puedes editar como siempre en Ajustes.",
      },
    ],
  },
};
