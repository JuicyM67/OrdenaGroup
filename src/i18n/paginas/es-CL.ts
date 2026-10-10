// Textos del megamenú y de las páginas de funcionalidades y rubros, español de Chile (tú), WP-75.
// El nombre de la marca nunca se escribe acá (regla 10): las páginas lo agregan desde `brand`.
import { funciones } from "./es-CL.funciones";
import { rubros } from "./es-CL.rubros";
import type { PaginasCopy } from "./types";

export const paginas: PaginasCopy = {
  nav: {
    funciones: "Funcionalidades",
    rubros: "Rubros",
    precios: "Precios",
    ejemplo: "Página de ejemplo",
    menuFunciones: {
      titulo: "FUNCIONALIDADES",
      verTodas: "Ver todas las funcionalidades",
      migracion: {
        etiqueta: "CAMBIO SIN DOLOR",
        titulo: "Cambia de sistema en dos minutos",
        texto: "Pega tu link, nosotros movemos el resto",
      },
      ejemplo: {
        titulo: "Ver la página de ejemplo",
        texto: "Una página de reservas real para recorrer",
      },
    },
    menuRubros: {
      etiqueta: "RUBROS",
      titulo: "Hecho para quienes trabajan con horas.",
      texto:
        "Servicios listos, el lenguaje correcto y funciones que calzan con tu rubro.",
      todas: "Todos los rubros",
    },
    abrirMenu: "Abrir el menú",
    cerrarMenu: "Cerrar el menú",
    crearGratis: "Crear mi agenda gratis",
    entrar: "Entrar",
  },
  comunes: {
    migas: "Migas de pan",
    inicio: "Inicio",
    crearGratis: "Empieza gratis",
    verEjemplo: "Ver la página de ejemplo",
    faqEtiqueta: "PREGUNTAS",
    faqTitulo: "Bueno saber.",
    masFunciones: "Más funcionalidades",
    masRubros: "Más rubros",
    rubroEtiqueta: "PARA",
    serviciosEtiqueta: "SERVICIOS LISTOS",
    comoEtiqueta: "ASÍ FUNCIONA",
    equipo: ["I", "J"],
    cta: {
      pre: "¿Nos hacemos",
      marca: "amigos?",
      texto:
        "Tu propia página de reservas en cinco minutos. Gratis para una persona.",
      boton: "Sí, crear mi página",
    },
  },
  indiceFunciones: {
    meta: {
      titulo: "Funcionalidades de reservas, recordatorios y agenda",
      descripcion:
        "Todo lo que necesitas para recibir reservas: reservas online, reseñas, lista de espera, recordatorios, agenda y caja. Mira qué incluye.",
    },
    etiqueta: "FUNCIONALIDADES",
    hero: {
      pre: "Todo lo necesario para",
      marca: "una agenda llena.",
      texto:
        "Reservas, recordatorios, lista de espera y caja en un sistema simple. Elige una funcionalidad para ver cómo funciona.",
    },
    fotoAlt: "Esteticista realiza un tratamiento",
    detalleTitulo: "Más sobre las funcionalidades",
  },
  indiceRubros: {
    meta: {
      titulo: "Sistema de reservas para tu rubro",
      descripcion:
        "Sistema de reservas para peluquerías, barberías, uñas, pestañas, estética, masajes, kinesiología, yoga, tatuajes, peluquería canina, entrenadores y maquillaje.",
    },
    etiqueta: "RUBROS",
    hero: {
      pre: "Un sistema de reservas para",
      marca: "tu rubro.",
      texto:
        "Servicios listos, el lenguaje correcto y funciones que calzan con cómo trabajas. Elige tu rubro para ver cómo se ve.",
    },
    fotoAlt: "Peluquera riza el pelo de una clienta",
    rejilla: { pre: "Encuentra", marca: "tu rubro." },
  },
  funciones,
  rubros,
};
