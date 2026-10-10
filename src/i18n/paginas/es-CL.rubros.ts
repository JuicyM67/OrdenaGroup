// Textos de las páginas por rubro, español de Chile (tú), WP-75. Cada rubro tiene sus propios
// problemas del día a día, sus propios servicios de ejemplo y su propio texto (único para SEO,
// no solo un cambio de nombre). Precios en pesos chilenos enteros y solo de ejemplo: cada
// negocio los ajusta en su propia lista de servicios.
import type { PaginasCopy } from "./types";

const CTA = "Crear mi agenda gratis";
const CIERRE = "Sí, crear mi página";

export const rubros: PaginasCopy["rubros"] = {
  frisor: {
    nombre: "Peluquería",
    fotoAlt: "Peluquera riza el pelo de una clienta",
    meta: {
      titulo: "Sistema de reservas para peluquerías",
      descripcion:
        "Reservas online para peluquerías con servicios listos de corte, color y mechas. Tus clientes reservan solos y tú te dedicas a cortar. Empieza gratis.",
    },
    hero: {
      pre: "Sistema de reservas para",
      marca: "peluquerías.",
      texto:
        "Servicios listos de corte, color y mechas. Tus clientes reservan solos, tú te dedicas a cortar.",
      cta: "Crear mi peluquería gratis",
    },
    problemas: {
      pre: "El día a día en una peluquería,",
      marca: "sin enredos.",
      items: [
        {
          problema: "Clientes que no llegan",
          solucion: "Recordatorios y reglas claras para cambiar la hora",
        },
        {
          problema: "El teléfono suena en pleno corte",
          solucion: "Tus clientes reservan solos, a toda hora",
        },
        {
          problema: "Espacios vacíos en la agenda",
          solucion: "Horas flash y lista de espera los llenan",
        },
      ],
    },
    servicios: {
      pre: "Lista para reservar",
      marca: "desde el primer día.",
      texto:
        "Te sugerimos servicios con descripción, duración y precio que calzan con una peluquería. Ajústalos o importa los tuyos.",
      items: [
        {
          nombre: "Corte dama",
          minutos: 45,
          precio: 18000,
          descripcion: "Consulta, lavado, corte y secado.",
        },
        {
          nombre: "Color + corte",
          minutos: 120,
          precio: 48000,
          descripcion:
            "Color completo o matiz según tu tipo de pelo, con corte incluido.",
        },
        {
          nombre: "Corte infantil",
          minutos: 30,
          precio: 9000,
          descripcion: "Para niños de hasta 12 años.",
        },
      ],
    },
    cierre: {
      texto:
        "La página de reservas de tu peluquería en cinco minutos. Gratis para una persona.",
      boton: CIERRE,
    },
  },

  barberare: {
    nombre: "Barbería",
    fotoAlt: "Barbero perfila la barba de un cliente",
    meta: {
      titulo: "Sistema de reservas para barberías",
      descripcion:
        "Sistema de reservas para barberías: horas cortas, clientes sin reserva y una fila ordenada. Tus clientes reservan corte y barba solos.",
    },
    hero: {
      pre: "Sistema de reservas para",
      marca: "barberías.",
      texto:
        "Horas cortas, fila apretada y clientes fieles que quieren su sillón de siempre. Tu página de reservas lo ordena por ti.",
      cta: CTA,
    },
    problemas: {
      pre: "El sillón lleno,",
      marca: "no el teléfono.",
      items: [
        {
          problema: "Clientes fieles que reservan siempre la misma hora",
          solucion: "Te eligen a ti y la hora en la página, sin llamar",
        },
        {
          problema: "Los que llegan sin reserva desordenan el día",
          solucion: "Agrégalos a mano en la agenda en segundos",
        },
        {
          problema: "El cliente se olvida de su hora",
          solucion: "Recordatorio automático con link para cambiarla",
        },
      ],
    },
    servicios: {
      pre: "Tus horas más pedidas,",
      marca: "ya cargadas.",
      texto:
        "Servicios cortos con la duración justa, para que la fila avance sin huecos. Cambia precios y tiempos a tu medida.",
      items: [
        {
          nombre: "Corte de pelo",
          minutos: 30,
          precio: 12000,
          descripcion: "Máquina o tijera, lavado y peinado.",
        },
        {
          nombre: "Perfilado de barba",
          minutos: 20,
          precio: 8000,
          descripcion:
            "Diseño y perfilado de la barba, con toalla caliente al final.",
        },
        {
          nombre: "Corte + barba",
          minutos: 45,
          precio: 18000,
          descripcion:
            "El paquete completo en una sola reserva, para que no tengas que reservar dos veces.",
        },
      ],
    },
    cierre: {
      texto:
        "Tu propio link de reservas para Instagram en cinco minutos. Gratis para una persona.",
      boton: CIERRE,
    },
  },

  naglar: {
    nombre: "Uñas",
    fotoAlt: "Manos con uñas bien cuidadas",
    meta: {
      titulo: "Sistema de reservas para salones de uñas",
      descripcion:
        "Reservas online para manicuristas con servicios listos de gel, acrílico y manicure. Reservas y recordatorios se manejan solos mientras tú trabajas.",
    },
    hero: {
      pre: "Sistema de reservas para",
      marca: "salones de uñas.",
      texto:
        "Gel, acrílico y manicure con la duración correcta. Tus clientas reservan solas mientras tú tienes las manos ocupadas.",
      cta: CTA,
    },
    problemas: {
      pre: "Manos llenas de gel,",
      marca: "no de teléfono.",
      items: [
        {
          problema: "No puedes contestar en plena sesión",
          solucion: "La clienta reserva sola y recibe confirmación al tiro",
        },
        {
          problema: "La mantención se reserva muy tarde",
          solucion: "Los avisos de Te echamos de menos la invitan a volver",
        },
        {
          problema: "Cada servicio dura distinto",
          solucion: "Cada servicio tiene su duración y su margen",
        },
      ],
    },
    servicios: {
      pre: "Los servicios que",
      marca: "de verdad vendes.",
      texto:
        "Servicios listos con duración y precio para un salón de uñas. Agrega después tus diseños de nail art.",
      items: [
        {
          nombre: "Esmaltado en gel",
          minutos: 60,
          precio: 15000,
          descripcion: "Preparación y color que dura semanas.",
        },
        {
          nombre: "Uñas acrílicas nuevas",
          minutos: 120,
          precio: 32000,
          descripcion: "Uñas nuevas con el largo y la forma que prefieras.",
        },
        {
          nombre: "Mantención de acrílico",
          minutos: 90,
          precio: 24000,
          descripcion: "Rellena lo que creció y renueva el color.",
        },
      ],
    },
    cierre: {
      texto:
        "Tu página de reservas con tus fotos, lista en cinco minutos. Gratis para una persona.",
      boton: CIERRE,
    },
  },

  fransar: {
    nombre: "Pestañas y cejas",
    fotoAlt: "Especialista trabaja en las pestañas de una clienta",
    meta: {
      titulo: "Sistema de reservas para pestañas y cejas",
      descripcion:
        "Sistema de reservas para extensionistas de pestañas y especialistas en cejas: horas largas, retoques claros y recordatorios que bajan las inasistencias.",
    },
    hero: {
      pre: "Sistema de reservas para",
      marca: "pestañas y cejas.",
      texto:
        "Los trabajos largos y precisos necesitan que la clienta llegue. Los recordatorios y las reglas claras ayudan a que lo haga.",
      cta: CTA,
    },
    problemas: {
      pre: "Calma en la sala,",
      marca: "orden en la agenda.",
      items: [
        {
          problema: "Una clienta que no llega te quita dos horas del día",
          solucion: "Recordatorio antes de la hora y reglas para cancelar",
        },
        {
          problema: "El retoque hay que reservarlo en pocas semanas",
          solucion:
            "La clienta reserva la siguiente hora desde su confirmación",
        },
        {
          problema: "Necesitas tiempo para preparar entre clientas",
          solucion:
            "Margen después de cada servicio para que alcances a cambiar",
        },
      ],
    },
    servicios: {
      pre: "De la primera vez al",
      marca: "retoque.",
      texto:
        "Extensiones, retoques y servicios de cejas con duraciones realistas. Ajusta según tu técnica.",
      items: [
        {
          nombre: "Extensiones clásicas",
          minutos: 120,
          precio: 35000,
          descripcion:
            "Una extensión por pestaña natural para un resultado discreto.",
        },
        {
          nombre: "Retoque a las 3 semanas",
          minutos: 75,
          precio: 22000,
          descripcion: "Rellena donde las pestañas crecieron.",
        },
        {
          nombre: "Laminado de cejas",
          minutos: 60,
          precio: 20000,
          descripcion: "Da forma y fija las cejas para un efecto más lleno.",
        },
      ],
    },
    cierre: {
      texto:
        "Una página de reservas que va con tu estilo, lista en cinco minutos. Gratis para una persona.",
      boton: CIERRE,
    },
  },

  hudvard: {
    nombre: "Estética",
    fotoAlt: "Tratamiento facial con mascarilla",
    meta: {
      titulo: "Sistema de reservas para estética y cosmetología",
      descripcion:
        "Sistema de reservas para esteticistas y centros de belleza. Tus clientas reservan el tratamiento y la hora solas, con recordatorios y la agenda en orden.",
    },
    hero: {
      pre: "Sistema de reservas para",
      marca: "estética.",
      texto:
        "Limpiezas faciales, depilación y tratamientos corporales en una página de reservas que explica cada tratamiento.",
      cta: CTA,
    },
    problemas: {
      pre: "Calma en la cabina,",
      marca: "orden en el día.",
      items: [
        {
          problema: "Las clientas dudan qué tratamiento elegir",
          solucion: "Cada servicio tiene su descripción en la página",
        },
        {
          problema: "Las cancelaciones tardías dejan huecos",
          solucion: "La lista de espera ofrece la hora al siguiente al tiro",
        },
        {
          problema: "La cabina necesita limpieza entre clientas",
          solucion: "Margen después de cada servicio para un horario realista",
        },
      ],
    },
    servicios: {
      pre: "Los tratamientos que",
      marca: "buscan tus clientas.",
      texto:
        "Tratamientos listos con descripción, duración y precio. Cambia nombres y contenido para que calcen con tus productos.",
      items: [
        {
          nombre: "Limpieza facial profunda",
          minutos: 60,
          precio: 28000,
          descripcion:
            "Limpieza, exfoliación, mascarilla y masaje adaptado a tu piel.",
        },
        {
          nombre: "Hidratación facial",
          minutos: 75,
          precio: 38000,
          descripcion:
            "Hidratación intensa con luminosidad que se nota al tiro.",
        },
        {
          nombre: "Depilación piernas",
          minutos: 45,
          precio: 16000,
          descripcion: "Piernas completas con cera suave.",
        },
      ],
    },
    cierre: {
      texto:
        "Una página tranquila para tu centro, lista en cinco minutos. Gratis para una persona.",
      boton: CIERRE,
    },
  },

  massage: {
    nombre: "Masajes",
    fotoAlt: "Mujer recibe un masaje con piedras calientes",
    meta: {
      titulo: "Sistema de reservas para masajistas",
      descripcion:
        "Sistema de reservas para masoterapeutas con servicios listos de masaje relajante y descontracturante. Página propia y recordatorios automáticos.",
    },
    hero: {
      pre: "Sistema de reservas para",
      marca: "masajistas.",
      texto:
        "Tus clientes eligen el masaje y la duración solos. Tú no tienes que contestar mensajes en pleno trabajo.",
      cta: CTA,
    },
    problemas: {
      pre: "Las manos en el cliente,",
      marca: "no en el celular.",
      items: [
        {
          problema: "No puedes contestar mientras das un masaje",
          solucion: "La página de reservas responde por ti, a toda hora",
        },
        {
          problema: "Los clientes eligen mal la duración",
          solucion: "Cada masaje con varias duraciones y una descripción clara",
        },
        {
          problema: "Los clientes se olvidan de volver",
          solucion: "Los avisos de Te echamos de menos los invitan a reservar",
        },
      ],
    },
    servicios: {
      pre: "De una sesión corta a un",
      marca: "tratamiento largo.",
      texto:
        "Servicios de masaje listos en distintas duraciones. Tú decides cuáles ofrecer y a qué precio.",
      items: [
        {
          nombre: "Masaje relajante",
          minutos: 60,
          precio: 28000,
          descripcion:
            "Movimientos largos y suaves que sueltan la tensión y bajan el estrés.",
        },
        {
          nombre: "Masaje descontracturante",
          minutos: 60,
          precio: 32000,
          descripcion: "Trabajo en tensiones de cuello, hombros y espalda.",
        },
        {
          nombre: "Masaje express de cuello",
          minutos: 30,
          precio: 16000,
          descripcion: "Un alivio rápido para cuello y hombros.",
        },
      ],
    },
    cierre: {
      texto:
        "Tu propia página de reservas lista para compartir en cinco minutos. Gratis para una persona.",
      boton: CIERRE,
    },
  },

  naprapat: {
    nombre: "Kinesiología",
    fotoAlt: "Kinesiólogo ayuda a un paciente a estirar",
    meta: {
      titulo: "Sistema de reservas para kinesiólogos y fisioterapeutas",
      descripcion:
        "Sistema de reservas para kinesiólogos: primera consulta y controles, recordatorios y una agenda ordenada. Empieza gratis.",
    },
    hero: {
      pre: "Sistema de reservas para",
      marca: "kinesiólogos.",
      texto:
        "Primeras consultas, controles y series de sesiones en una agenda donde el paciente reserva la duración correcta.",
      cta: CTA,
    },
    problemas: {
      pre: "Los pacientes primero,",
      marca: "no el papeleo.",
      items: [
        {
          problema: "La primera consulta dura más que un control",
          solucion:
            "Cada servicio tiene su duración, así se reserva la hora correcta",
        },
        {
          problema: "Los pacientes cancelan tarde",
          solucion: "Recordatorios y una lista de espera que llena la hora",
        },
        {
          problema: "Quieres saber más del paciente antes de la visita",
          solucion: "Preguntas propias en el formulario de reserva",
        },
      ],
    },
    servicios: {
      pre: "Las consultas que ya",
      marca: "ofreces.",
      texto:
        "Primera consulta y controles con duraciones y precios razonables. Ajusta a cómo trabaja tu centro.",
      items: [
        {
          nombre: "Primera consulta",
          minutos: 60,
          precio: 30000,
          descripcion:
            "Evaluación, examen y tratamiento, con un plan para seguir.",
        },
        {
          nombre: "Control",
          minutos: 30,
          precio: 20000,
          descripcion: "Seguimiento y tratamiento para quien ya es paciente.",
        },
        {
          nombre: "Atención de urgencia",
          minutos: 30,
          precio: 25000,
          descripcion: "Para dolores agudos que necesitan atención rápida.",
        },
      ],
    },
    cierre: {
      texto:
        "Una página de reservas para tu consulta, lista en cinco minutos. Gratis para una persona.",
      boton: CIERRE,
    },
  },

  yoga: {
    nombre: "Yoga y pilates",
    fotoAlt: "Instructora de yoga guía una clase en un estudio luminoso",
    meta: {
      titulo: "Sistema de reservas para yoga y pilates",
      descripcion:
        "Sistema de reservas para instructores de yoga y pilates con clases privadas y clases de prueba. Página propia, recordatorios y una agenda clara.",
    },
    hero: {
      pre: "Sistema de reservas para",
      marca: "yoga y pilates.",
      texto:
        "Clases privadas y de prueba que se reservan solas. Tú te enfocas en el mat, no en el correo.",
      cta: CTA,
    },
    problemas: {
      pre: "Calma en el mat,",
      marca: "calma en el chat.",
      items: [
        {
          problema: "Las inscripciones llegan por mensaje, DM y correo",
          solucion: "Un solo link de reservas que junta todo",
        },
        {
          problema: "Alumnos que se pierden la clase",
          solucion: "Recordatorio antes de la clase con link para cancelar",
        },
        {
          problema: "Ofreces clases de prueba y planes más largos",
          solucion: "Servicios distintos con duración y precio propios",
        },
      ],
    },
    servicios: {
      pre: "Clases listas para",
      marca: "reservar.",
      texto:
        "Ejemplos de clases privadas con distinta duración. Ajusta a tu estudio y a tu estilo.",
      items: [
        {
          nombre: "Clase privada de yoga",
          minutos: 60,
          precio: 22000,
          descripcion:
            "Una clase armada según tus metas, tu nivel y tu cuerpo.",
        },
        {
          nombre: "Clase privada de pilates",
          minutos: 55,
          precio: 25000,
          descripcion: "Foco en fuerza profunda, equilibrio y postura.",
        },
        {
          nombre: "Clase de prueba",
          minutos: 45,
          precio: 10000,
          descripcion:
            "Una primera clase para probar antes de decidir si sigues.",
        },
      ],
    },
    cierre: {
      texto:
        "Tu página de reservas lista para compartir en cinco minutos. Gratis para una persona.",
      boton: CIERRE,
    },
  },

  tatuering: {
    nombre: "Tatuajes",
    fotoAlt: "Tatuador tatúa un brazo en su estudio",
    meta: {
      titulo: "Sistema de reservas para tatuadores",
      descripcion:
        "Sistema de reservas para tatuadores: consultas y sesiones largas con agenda clara y recordatorios. Menos sesiones perdidas.",
    },
    hero: {
      pre: "Sistema de reservas para",
      marca: "tatuadores.",
      texto:
        "Primero la consulta y después la sesión larga. Horarios y reglas claras para que solo quienes van en serio ocupen tu agenda.",
      cta: CTA,
    },
    problemas: {
      pre: "Más tiempo con la máquina,",
      marca: "menos en el DM.",
      items: [
        {
          problema: "Se pierden días completos cuando el cliente no llega",
          solucion: "Recordatorios y reglas de cuánto antes se puede cancelar",
        },
        {
          problema: "Quieres una consulta antes de la sesión",
          solucion: "Consulta y tatuaje como dos servicios distintos",
        },
        {
          problema: "Te preguntan precio y duración en cada DM",
          solucion: "Servicios con duración y precio en la página de reservas",
        },
      ],
    },
    servicios: {
      pre: "Del boceto al",
      marca: "tatuaje terminado.",
      texto:
        "Consulta y sesiones de distinta duración. Pon tus propios precios, por hora o por diseño.",
      items: [
        {
          nombre: "Consulta",
          minutos: 30,
          precio: 10000,
          descripcion:
            "Revisamos tu idea, el lugar y el tamaño antes de reservar la sesión.",
        },
        {
          nombre: "Tatuaje pequeño",
          minutos: 90,
          precio: 60000,
          descripcion: "Diseños pequeños que caben en una sesión corta.",
        },
        {
          nombre: "Sesión de día completo",
          minutos: 360,
          precio: 220000,
          descripcion: "Una sesión larga para diseños grandes, con pausas.",
        },
      ],
    },
    cierre: {
      texto:
        "Una página de reservas que muestra tu trabajo, lista en cinco minutos. Gratis para una persona.",
      boton: CIERRE,
    },
  },

  hundtrim: {
    nombre: "Peluquería canina",
    fotoAlt: "Peluquera canina arregla el pelo de un caniche",
    meta: {
      titulo: "Sistema de reservas para peluquería canina",
      descripcion:
        "Sistema de reservas para peluquerías caninas. Tus clientes reservan según el tamaño y el pelo de su perro, y tú tienes la hora justa reservada. Empieza gratis.",
    },
    hero: {
      pre: "Sistema de reservas para",
      marca: "peluquería canina.",
      texto:
        "Perros chicos y grandes, pelajes distintos y duraciones distintas. Cada servicio tiene su tiempo para que la agenda se sostenga.",
      cta: CTA,
    },
    problemas: {
      pre: "Más perros en el salón,",
      marca: "menos llamadas.",
      items: [
        {
          problema: "Un perro grande demora el doble",
          solucion: "Servicios por tamaño, con su duración y su precio",
        },
        {
          problema: "Los dueños se olvidan de la hora",
          solucion: "Recordatorio antes de la visita con link para cambiarla",
        },
        {
          problema: "Necesitas lavar y secar entre perro y perro",
          solucion: "Margen después de cada servicio",
        },
      ],
    },
    servicios: {
      pre: "El tratamiento del perro,",
      marca: "bien explicado.",
      texto:
        "Servicios listos según el tamaño y las necesidades del perro. Ajusta tiempos y precios a tu local.",
      items: [
        {
          nombre: "Corte perro pequeño",
          minutos: 60,
          precio: 18000,
          descripcion: "Baño, secado y corte para perros de hasta 10 kg.",
        },
        {
          nombre: "Corte perro grande",
          minutos: 120,
          precio: 35000,
          descripcion: "Baño, secado y corte para perros de más de 25 kg.",
        },
        {
          nombre: "Corte de uñas",
          minutos: 15,
          precio: 5000,
          descripcion: "Corte rápido de uñas, sin complicaciones.",
        },
      ],
    },
    cierre: {
      texto:
        "Una página de reservas que los dueños encuentran al tiro, lista en cinco minutos. Gratis para una persona.",
      boton: CIERRE,
    },
  },

  pt: {
    nombre: "Entrenamiento personal",
    fotoAlt: "Entrenador personal guía a un cliente con una barra",
    meta: {
      titulo: "Sistema de reservas para entrenadores personales",
      descripcion:
        "Sistema de reservas para entrenadores personales: clase de prueba, sesiones individuales y seguimiento. Tus alumnos reservan solos, tú entrenas.",
    },
    hero: {
      pre: "Sistema de reservas para",
      marca: "entrenadores personales.",
      texto:
        "Clase de prueba, sesiones individuales y controles que reserva el alumno. Tú pones el tiempo en entrenar.",
      cta: CTA,
    },
    problemas: {
      pre: "Más entrenamiento,",
      marca: "menos coordinación.",
      items: [
        {
          problema: "Los alumnos te escriben por todos los canales",
          solucion: "Un solo link de reservas para todos",
        },
        {
          problema: "Las cancelaciones tardías se comen tus ingresos",
          solucion: "Reglas de cuánto antes se puede cancelar la sesión",
        },
        {
          problema: "Entrenas en horarios muy distintos",
          solucion:
            "Horarios propios y una agenda clara, también en el celular",
        },
      ],
    },
    servicios: {
      pre: "Las sesiones que tus alumnos",
      marca: "más reservan.",
      texto:
        "Servicios listos para clase de prueba y entrenamiento individual. Ajusta duración y precio a tu método.",
      items: [
        {
          nombre: "Clase de prueba",
          minutos: 45,
          precio: 8000,
          descripcion:
            "Una primera sesión para hablar de metas y probar el entrenamiento.",
        },
        {
          nombre: "Sesión individual",
          minutos: 60,
          precio: 20000,
          descripcion: "Plan personalizado según tus metas y tu nivel.",
        },
        {
          nombre: "Control de progreso",
          minutos: 30,
          precio: 12000,
          descripcion: "Revisamos tu avance y ajustamos el plan.",
        },
      ],
    },
    cierre: {
      texto:
        "Una página de reservas que tus alumnos pueden guardar, lista en cinco minutos. Gratis para una persona.",
      boton: CIERRE,
    },
  },

  makeup: {
    nombre: "Maquillaje",
    fotoAlt: "Maquilladora aplica maquillaje de ojos",
    meta: {
      titulo: "Sistema de reservas para maquilladoras",
      descripcion:
        "Sistema de reservas para maquilladoras: novias, fiestas y pruebas de maquillaje. Tus clientas reservan solas y reciben confirmación y recordatorio.",
    },
    hero: {
      pre: "Sistema de reservas para",
      marca: "maquilladoras.",
      texto:
        "Prueba de maquillaje, maquillaje de fiesta y de novia en una página de reservas con horas y precios claros.",
      cta: CTA,
    },
    problemas: {
      pre: "Reservado con tiempo,",
      marca: "tranquila el gran día.",
      items: [
        {
          problema:
            "Matrimonios y fiestas se reservan con meses de anticipación",
          solucion:
            "La clienta reserva en la agenda y recibe confirmación al tiro",
        },
        {
          problema: "La clienta olvida la hora antes de un día importante",
          solucion: "Recordatorio con fecha y hora, y link para cambiarla",
        },
        {
          problema: "Las clientas quieren probar antes",
          solucion:
            "La prueba de maquillaje como servicio propio, con su duración",
        },
      ],
    },
    servicios: {
      pre: "De la prueba al",
      marca: "gran día.",
      texto:
        "Servicios listos para distintas ocasiones. Ajusta duración, precio y traslados según cómo trabajes.",
      items: [
        {
          nombre: "Prueba de maquillaje",
          minutos: 60,
          precio: 25000,
          descripcion: "Probamos el look con calma antes de tu día importante.",
        },
        {
          nombre: "Maquillaje de fiesta",
          minutos: 60,
          precio: 30000,
          descripcion: "Un maquillaje completo que dura toda la noche.",
        },
        {
          nombre: "Maquillaje de novia",
          minutos: 90,
          precio: 60000,
          descripcion: "Maquillaje pensado para el matrimonio y las fotos.",
        },
      ],
    },
    cierre: {
      texto:
        "Una página de reservas que muestra tu portafolio, lista en cinco minutos. Gratis para una persona.",
      boton: CIERRE,
    },
  },
};
