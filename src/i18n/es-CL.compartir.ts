/**
 * "Comparte tu link" (WP-89, D-075): pestaña de Ajustes con el link de
 * reservas, el código QR y guías cortas para ponerlo en Instagram, Google,
 * WhatsApp Business, Facebook y TikTok. Los nombres de menú entre comillas son
 * los de cada plataforma (español latinoamericano, revisados en sus centros de
 * ayuda en noviembre de 2026); pueden cambiar sin aviso. El nombre del
 * producto llega como `marca` (desde `brand.name`), nunca se escribe acá.
 * Archivo propio para que estos textos no entren a otros chunks.
 * TODO_COPY: revisión de copywriter-es-cl.
 */
import type { Trad } from "./index";

export const compartir = {
  pestana: "Comparte tu link",
  titulo: "Comparte tu link de reservas",
  intro:
    "Tus clientes te encuentran en Instagram, Google y WhatsApp. Pon tu link de reservas en cada uno para que reserven sin escribirte.",
  link: {
    titulo: "Tu link de reservas",
    copiar: "Copiar link",
    copiado: "Link copiado",
    errorCopiar: "No pudimos copiar el link. Cópialo manualmente.",
    abrir: "Ver mi página de reservas",
  },
  qr: {
    titulo: "Código QR",
    ayuda:
      "Imprímelo y déjalo en el mesón o en la vitrina: tus clientes lo escanean con la cámara del celular y reservan en segundos.",
    descargar: "Descargar PNG",
    /** Texto alternativo de la imagen del QR. */
    alt: "Código QR de tu link de reservas",
    /** Nombre del archivo descargado (sin extensión). */
    archivo: (p: { slug: string }): string => `qr-reservas-${p.slug}`,
  },
  guias: {
    titulo: "Paso a paso por canal",
    etiqueta: "Canal",
    aviso:
      "Las apps cambian sus menús seguido. Si algo no te aparece igual, busca una opción con un nombre parecido.",
    linkCanal: "Tu link para este canal",
    /** Explica el `?utm_source=` del final del link de cada canal. */
    linkCanalAyuda:
      "Lleva al final el nombre del canal. Tus clientes ven la misma página de reservas.",
    copiarLinkCanal: "Copiar link",
    linkCanalCopiado: "Link copiado",
  },
  canales: {
    instagram: {
      nombre: "Instagram",
      pasos: {
        uno: 'Abre Instagram en tu celular, ve a tu perfil y toca "Editar perfil".',
        dos: 'Toca "Enlaces" y después "Agregar enlace externo".',
        tres: 'Pega tu link y ponle un título, por ejemplo "Reserva tu hora".',
        cuatro:
          "Guarda. Si tienes varios enlaces, deja el de reservas primero: es el que se ve en tu perfil sin tocar nada.",
      },
      nota: (p: { marca: string }): string =>
        `El botón de acción "Reservar" de Instagram solo funciona con las apps asociadas de Meta, y ${p.marca} todavía no está en esa lista. Por eso tu link va en la biografía. Recuérdalo en tus historias y publicaciones: "Reserva en el link de mi perfil".`,
    },
    google: {
      nombre: "Google y Maps",
      pasos: {
        uno: "Busca tu negocio en Google con la cuenta que administra tu Perfil de Negocio.",
        dos: 'Selecciona "Reserva". En Google Maps, toca "Editar perfil" y elige la opción de reservas.',
        tres: 'Selecciona "Agregar vínculo" y pega tu link.',
        cuatro:
          'Selecciona "Guardar". Google revisa el vínculo antes de mostrarlo en tu perfil.',
      },
      nota: 'Tu perfil tiene que estar verificado para agregar vínculos. Si ya tienes otros vínculos de reserva, marca el tuyo con "Establecer vínculo preferido".',
    },
    whatsapp: {
      nombre: "WhatsApp Business",
      pasos: {
        uno: 'Abre WhatsApp Business, ve a la pestaña "Herramientas" y toca "Perfil".',
        dos: 'Toca "Sitio web", pega tu link y toca "Guardar".',
        tres: 'En "Herramientas", toca "Respuestas rápidas", toca + y pega el mensaje de abajo. En "Acceso directo", escribe por ejemplo "reservar".',
        cuatro:
          "Cuando alguien te pida hora, escribe / en el chat y elige tu respuesta rápida.",
      },
      nota: 'También puedes pegar el link en tu mensaje de ausencia ("Herramientas" > "Mensaje de ausencia"), para que te reserven aunque no alcances a contestar.',
      mensajeTitulo: "Mensaje para tu respuesta rápida",
      copiarMensaje: "Copiar mensaje",
      mensajeCopiado: "Mensaje copiado",
    },
    facebook: {
      nombre: "Facebook",
      pasos: {
        uno: "Entra a tu página de Facebook (toca tu foto de perfil y elige tu página).",
        dos: 'En tu página, abre las opciones y elige "Agregar botón de acción" (o "Editar botón de acción" si ya tienes uno).',
        tres: "Elige el botón para reservar y, cuando te pida un sitio web, pega tu link.",
        cuatro: "Guarda. Tu página puede tener un solo botón de acción.",
      },
      nota: "Si tu página no te ofrece el botón para reservar, elige otro botón que abra un sitio web y pega ahí tu link.",
    },
    tiktok: {
      nombre: "TikTok",
      pasos: {
        uno: 'Abre TikTok, ve a tu perfil y toca "Editar perfil".',
        dos: 'Toca "Sitio web" y pega tu link.',
        tres: 'Toca "Guardar". Tu link queda debajo de tu biografía.',
        cuatro:
          'En tus videos, invita a reservar: "Reserva en el link de mi perfil".',
      },
      nota: "TikTok muestra el sitio web en el perfil a cuentas con al menos 1.000 seguidores o a cuentas de empresa verificadas. Si todavía no te aparece la opción, comparte tu link en Instagram y WhatsApp mientras tanto.",
    },
  },
  /** Link a esta pestaña desde la tarjeta "Tu link de reservas" (Inicio,
   * Ajustes → Tu negocio) y desde el último paso del onboarding. */
  enlaceGuia: "Cómo ponerlo en Instagram, Google y más",
  /** Página pública `/funcionalidades/comparte-tu-link` (SEO). Usa los mismos
   * pasos de `canales`. */
  guiaPublica: {
    meta: {
      titulo: "Cómo poner tu link de reservas en Instagram, Google y WhatsApp",
      descripcion:
        "Paso a paso para agregar tu link de reservas en Instagram, Google Maps, WhatsApp Business, Facebook y TikTok, y recibir reservas las 24 horas.",
    },
    titulo: "Pon tu link de reservas donde te buscan tus clientes",
    intro:
      "Tus clientes te encuentran en Instagram, Google Maps y WhatsApp. Con tu link de reservas en cada uno, reservan solos, a cualquier hora, sin escribirte.",
    indice: "Elige un canal",
    pasosTitulo: (p: { canal: string }): string => `Tu link en ${p.canal}`,
    qr: {
      titulo: "Y en tu local, un código QR",
      texto: (p: { marca: string }): string =>
        `En ${p.marca} descargas el código QR de tu link para imprimirlo y dejarlo en el mesón o en la vitrina.`,
    },
    cta: {
      titulo: "¿Todavía no tienes tu link de reservas?",
      texto: "Crea tu agenda gratis y comparte tu link hoy mismo.",
      boton: "Crear mi agenda",
    },
  },
} as const satisfies Trad;
