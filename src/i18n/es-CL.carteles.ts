/**
 * Pestaña "QR" de Ajustes (WP-95, D-079): carteles para imprimir. Un cartel de
 * reservas (A3, A4, A5) y un mini cartel para que los clientes creen su cuenta.
 * WP-96 (D-080): editor con plantillas, tipografías, colores y textos propios.
 * El nombre del producto y el dominio llegan como `marca`/`dominio` (desde
 * `brand`), nunca se escriben acá.
 * TODO_COPY: revisión de copywriter-es-cl.
 */
import type { Trad } from "./index";

export const carteles = {
  pestana: "QR",
  titulo: "Carteles con tu QR",
  intro:
    "Diseña tu cartel para el mesón o la vitrina: elige plantilla, tipografía, colores y textos. Tus clientes escanean el código con la cámara del celular.",
  reservas: {
    titulo: "Cartel de reservas",
    ayuda: "Lleva directo a tu página de reservas.",
  },
  cuenta: {
    titulo: "Mini cartel: crea tu cuenta",
    ayuda:
      "Invita a tus clientes a crear su cuenta gratis: ven sus horas, cancelan solos y vuelven a reservar más rápido.",
  },
  opciones: {
    tamano: "Tamaño",
  },
  editor: {
    carteles: "Cartel",
    plantilla: "Plantilla",
    tipografia: "Tipografía",
    grosor: "Grosor",
    colores: "Colores",
    textos: "Textos",
    titulo: "Título",
    subtitulo: "Texto",
    contador: (p: { n: number; max: number }): string => `${p.n}/${p.max}`,
    usarSugerido: "Usar texto sugerido",
    mostrarLogo: "Mostrar logo",
    guardar: "Guardar diseño",
    guardando: "Guardando…",
    guardado: "Diseño guardado",
    sinGuardar: "Cambios sin guardar",
    restablecer: "Volver al diseño original",
    error: "No pudimos guardar el diseño. Intenta de nuevo.",
    sinPermiso: "No tienes permiso para cambiar los carteles.",
    muestra: "Aa",
  },
  plantillas: {
    clasico: "Clásico",
    centrado: "Centrado",
    marco: "Marco",
    foto: "Banda",
  },
  fuentes: {
    moderna: "Moderna",
    fina: "Fina",
    elegante: "Elegante",
    clasica: "Clásica",
    manuscrita: "Manuscrita",
    redonda: "Redonda",
  },
  grosores: {
    fino: "Fino",
    normal: "Normal",
    marcado: "Marcado",
  },
  paletas: {
    claro: "Claro",
    oscuro: "Oscuro",
    lima: "Lima",
    nude: "Nude",
    rosa: "Rosa empolvado",
    salvia: "Salvia",
    marfil: "Marfil y oro",
    "negro-oro": "Negro y oro",
    lavanda: "Lavanda",
    cielo: "Cielo",
  },
  tamanos: {
    a3: "A3",
    a4: "A4",
    a5: "A5",
    a6x4: "A6 · 4 por hoja A4",
  },
  vistaPrevia: "Vista previa",
  descargar: "Descargar PDF",
  ayudaPdf:
    'Guardamos tu diseño y se abre la ventana de impresión: elige "Guardar como PDF" o imprime directo, en tamaño real y sin márgenes.',
  imprimir: {
    titulo: "Tu cartel",
    boton: "Imprimir o guardar como PDF",
    volver: "Volver",
    ayuda:
      'En la ventana de impresión elige el destino "Guardar como PDF" o tu impresora, tamaño real (100 %) y sin márgenes. Activa "Gráficos de fondo" si los colores no aparecen.',
  },
  /** Textos que van impresos en los carteles. */
  hoja: {
    reservasTitulo: "Reserva tu hora aquí",
    reservasTexto: "Escanea el código con la cámara de tu celular.",
    oEntra: "o entra a",
    cuentaEyebrow: (p: { negocio: string }): string =>
      `Tus reservas en ${p.negocio}, siempre a mano`,
    cuentaTitulo: "Crea tu cuenta gratis",
    cuentaTexto: "Escanea y entra con tu correo. Sin contraseña.",
    esquina: "Crea tu cuenta hoy",
    qrAlt: "Código QR",
  },
} as const satisfies Trad;
