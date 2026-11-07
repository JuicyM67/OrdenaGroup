/**
 * Widgets para el sitio web del negocio (WP-82, D-067). `panel` es la pestaña
 * del dueño en Ajustes; `visitante` es el texto dentro de los widgets, en el
 * sitio del negocio. El nombre del producto llega como `marca` (desde
 * `brand.name`), nunca se escribe acá. Archivo propio para que estos textos no
 * entren al chunk de la página de reservas. TODO_COPY: revisión de
 * copywriter-es-cl.
 */
import type { Trad } from "./index";

export const widgets = {
  panel: {
    pestana: "Widgets",
    titulo: "Widgets para tu sitio web",
    intro:
      "Muestra tus reseñas y recibe reservas en tu propio sitio web. Copia el código y pégalo donde quieras que aparezca el widget.",
    tipo: {
      etiqueta: "Tipo de widget",
      resenas: {
        nombre: "Reseñas",
        descripcion:
          "Tu nota con estrellas, el promedio y cuántas reseñas tienes.",
      },
      boton: {
        nombre: "Botón",
        descripcion: "Un botón que abre la reserva encima de tu sitio.",
      },
      reserva: {
        nombre: "Reserva",
        descripcion: "Toda la reserva directo en tu sitio.",
      },
    },
    tema: {
      etiqueta: "Tema",
      claro: "Claro",
      oscuro: "Oscuro",
    },
    tamano: {
      etiqueta: "Tamaño",
      pequeno: "Pequeño",
      mediano: "Mediano",
      grande: "Grande",
    },
    textoBoton: {
      etiqueta: "Texto del botón",
      /** id → texto. Los id son los mismos del código del widget. */
      opciones: {
        book: "Reservar",
        book_now: "Reserva ahora",
        book_time: "Reserva tu hora",
      },
    },
    codigo: {
      titulo: "Tu código",
      copiar: "Copiar código",
      copiado: "Copiado",
      errorCopiar: "No se pudo copiar. Selecciona el código y cópialo tú.",
      pasosTitulo: "Cómo se hace",
      pasos: {
        uno: "Copia el código.",
        dos: "Pégalo en tu sitio web, donde quieras que aparezca el widget.",
        tres: "Guarda y vuelve a cargar la página.",
      },
    },
    vistaPrevia: {
      titulo: "Vista previa",
      infoBoton:
        "En tu sitio, el botón abre la reserva encima de la página. Puedes probarlo acá.",
      sinResenas:
        "Tus reseñas se muestran cuando recibas la primera. Mientras tanto, el widget no se ve en tu sitio.",
    },
    ayuda: (p: { marca: string }): string =>
      `El widget siempre muestra una línea pequeña abajo: "Reservas con ${p.marca}".`,
  },
  visitante: {
    resenas: {
      /** Texto accesible de la nota. `promedio` ya viene formateado ("4,8"). */
      aria: (p: { promedio: string; n: number }): string =>
        `Nota ${p.promedio} de 5, ${p.n} ${p.n === 1 ? "reseña" : "reseñas"}`,
      cantidad: (p: { n: number }): string =>
        `${p.n} ${p.n === 1 ? "reseña" : "reseñas"}`,
    },
    /** La línea al final de cada widget. */
    pie: (p: { marca: string }): string => `Reservas con ${p.marca}`,
    boton: {
      book: "Reservar",
      book_now: "Reserva ahora",
      book_time: "Reserva tu hora",
    },
    dialogo: {
      titulo: "Reserva tu hora",
      cerrar: "Cerrar",
    },
    incrustada: {
      titulo: "Reserva tu hora",
      noDisponible: "Esta página de reservas no está disponible por ahora.",
    },
  },
} as const satisfies Trad;
