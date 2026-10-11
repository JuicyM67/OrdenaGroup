/**
 * Ofertas del negocio (WP-70, D-056): editor en `/app/ofertas` y el error del
 * guardián de precios en Ajustes → Servicios. Archivo propio para que estos
 * textos no entren al chunk de la página de reservas. En CL el editor está
 * oculto (como el marketplace, D-055), pero los textos existen por tipo.
 */
import type { Trad } from "./index";

export const ofertas = {
  titulo: "Ofertas",
  nav: "Ofertas",
  subtitulo: "Vende un servicio como cupón y llega a clientes nuevos.",
  nueva: "Nueva oferta",
  vacio: {
    titulo: "Llega a clientes nuevos con una oferta",
    texto:
      "Una oferta es uno de tus servicios a un precio más bajo. Los clientes la encuentran en Descubre, compran un cupón y reservan contigo.",
    pasos: {
      uno: "Elige un servicio y ponle precio",
      dos: "Publícala cuando esté lista",
      tres: "Los clientes compran y reservan su hora",
    },
    cta: "Crear tu primera oferta",
    sinServicios: "Primero agrega un servicio activo en Ajustes → Servicios.",
    irServicios: "Ir a Servicios",
  },
  lista: {
    titulo: "Tus ofertas",
    vendidos: (p: { n: number }): string =>
      p.n === 1 ? "1 vendida" : `${p.n} vendidas`,
    vendidosDe: (p: { n: number; total: number }): string =>
      `${p.n} de ${p.total} vendidas`,
    sinVentana: "Se vende sin fecha de término",
    ventana: (p: { desde: string; hasta: string }): string =>
      `${p.desde} – ${p.hasta}`,
    desde: (p: { fecha: string }): string => `Desde el ${p.fecha}`,
    hasta: (p: { fecha: string }): string => `Hasta el ${p.fecha}`,
  },
  estado: {
    draft: "Borrador",
    published: "Publicada",
    paused: "En pausa",
    ended: "Terminada",
  },
  editor: {
    tituloNueva: "Nueva oferta",
    tituloEditar: "Editar oferta",
    servicio: "Servicio",
    servicioPlaceholder: "Elige un servicio",
    titulo: "Título",
    tituloPlaceholder: "Corte + lavado + peinado",
    descripcion: "Descripción",
    descripcionPlaceholder: "Cuéntale al cliente qué va a vivir.",
    incluye: "Qué incluye",
    incluyePlaceholder: "Ej.: Lavado y asesoría",
    agregarFila: "Agregar línea",
    quitarFila: "Quitar línea",
    condiciones: "Condiciones",
    condicionesPlaceholder:
      "Válido para clientes nuevos y frecuentes. Cancelación gratis hasta 24 h antes.",
    categoria: "Categoría",
    precio: "Precio de la oferta",
    precioOrdinario: (p: { precio: string }): string =>
      `Precio normal ${p.precio}`,
    precioMinimo: (p: { precio: string }): string =>
      `Precio más bajo de los últimos 30 días: ${p.precio}`,
    descuento: (p: { pct: number }): string => `${p.pct} % de descuento`,
    precioAyuda:
      "El descuento se calcula sobre el precio más bajo de los últimos 30 días.",
    cantidad: "Cupos a la venta",
    cantidadAyuda: "Déjalo vacío para no poner límite.",
    ventanaDesde: "Se vende desde",
    ventanaHasta: "Se vende hasta",
    limpiar: "Quitar fecha",
    validez: "Validez del cupón",
    meses: (p: { n: number }): string => `${p.n} meses`,
    imagen: "Imagen",
    imagenAyuda: "JPG, PNG o WebP, hasta 5 MB.",
    subirImagen: "Subir imagen",
    cambiarImagen: "Cambiar imagen",
    quitarImagen: "Quitar imagen",
    subiendo: "Subiendo…",
    guardar: "Guardar",
    guardando: "Guardando…",
    cancelar: "Cancelar",
    publicar: "Publicar",
    pausar: "Pausar",
    reanudar: "Publicar de nuevo",
    verPublica: "Ver la oferta",
    vistaPrevia: "Así se ve en Descubre",
    soloDueno:
      "Solo el dueño puede publicar. Guárdala como borrador y el dueño la publica.",
    publicadaSoloDueno:
      "Esta oferta está publicada. Solo el dueño puede cambiarla.",
    guardado: "Guardado",
    precioBloqueado:
      "Mientras la oferta esté publicada, y 30 días después, no puedes subir el precio de este servicio.",
  },
  errores: {
    "offers.service_required": "Elige un servicio activo.",
    "offers.title_empty": "Escribe un título.",
    "offers.title_too_long": "El título puede tener hasta 80 caracteres.",
    "offers.text_too_long": "Puede tener hasta 1000 caracteres.",
    "offers.include_too_long": "Cada línea puede tener hasta 80 caracteres.",
    "offers.includes_too_many": "Puedes agregar hasta 6 líneas.",
    "offers.category_invalid": "Elige una categoría.",
    "offers.price_invalid": "Escribe un precio válido.",
    "offers.price_not_below":
      "El precio de la oferta tiene que ser más bajo que el precio más bajo de los últimos 30 días.",
    "offers.price_raised_recently":
      "Subiste el precio del servicio hace menos de 30 días. Podrás publicar cuando el precio lleve 30 días igual.",
    "offers.service_price_locked":
      "No puedes subir el precio mientras el servicio tenga una oferta publicada, ni durante los 30 días después.",
    "offers.quantity_invalid": "Escribe un número entre 1 y 10 000.",
    "offers.quantity_below_sold":
      "No puede ser menor que los cupones ya vendidos.",
    "offers.date_invalid": "Elige una fecha válida.",
    "offers.sale_window_invalid":
      "La fecha de término tiene que ser igual o posterior a la de inicio.",
    "offers.valid_months_invalid": "Elige una validez.",
    "offers.image_type_invalid": "Sube una imagen JPG, PNG o WebP.",
    "offers.image_too_large": "La imagen puede pesar hasta 5 MB.",
    "offers.image_missing":
      "La imagen no alcanzó a subirse. Inténtalo de nuevo.",
    "offers.image_invalid": "No pudimos guardar la imagen. Prueba con otra.",
    "offers.upload_failed": "No pudimos subir la imagen. Inténtalo de nuevo.",
    "offers.not_found": "No encontramos la oferta. Recarga la página.",
    "offers.published_owner_only":
      "Esta oferta está publicada. Solo el dueño puede cambiarla.",
    "offers.publish_owner_only": "Solo el dueño puede publicar.",
    plan_locked:
      "Tu plan no incluye ofertas. Revisa los planes para activarlas.",
    forbidden: "No tienes permiso para hacer esto.",
    unauthorized: "Tu sesión expiró. Vuelve a entrar.",
    desconocido: "Algo salió mal. Inténtalo de nuevo.",
  },
} as const satisfies Trad;
