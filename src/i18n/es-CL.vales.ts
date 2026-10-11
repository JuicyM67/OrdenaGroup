/**
 * Vales (WP-69, D-057): compra en la página de la oferta, "Mis vales" en la
 * cuenta, reserva con vale y la lista del negocio en Caja. En CL todo está
 * oculto (marketplace oculto hasta Mercado Pago) — solo paridad de tipos.
 * TODO_COPY: revisión de copywriter-es-cl.
 *
 * Archivo propio para que estos textos no entren en el chunk de la página de
 * reservas (`/[slug]`, D-039).
 */
export const vales = {
  compra: {
    comprar: "Comprar y elegir hora",
    comprarCorto: "Comprar",
    ingresar: "Ingresa para comprar",
    texto:
      "Pagas con tarjeta. El vale queda en tu cuenta y eliges la hora cuando quieras.",
    vendido: (p: { negocio: string }): string =>
      `Lo vende ${p.negocio}. El pago va directo al negocio.`,
    arrepentimiento: "14 días para arrepentirte si no lo usaste.",
    agotado: "Agotado",
    error: "No pudimos abrir el pago. Inténtalo de nuevo.",
    cancelado: "Cancelaste el pago. No se cobró nada.",
    noDisponible: "Esta oferta ya no se puede comprar.",
  },
  cuenta: {
    meta: "Mis vales",
    titulo: "Mis vales",
    verTodos: (p: { n: number }): string => `Todos (${p.n})`,
    vacio:
      "Aún no tienes vales. Encuentra ofertas cerca tuyo y compra con tarjeta.",
    explorar: "Ver ofertas",
    activos: "Para usar",
    anteriores: "Usados y vencidos",
    validoHasta: (p: { fecha: string }): string => `válido hasta ${p.fecha}`,
    valor: (p: { valor: string }): string => `Valor ${p.valor}`,
    reservar: "Elegir hora",
    reservado: (p: { fecha: string }): string => `Reservado · ${p.fecha}`,
    arrepentirse: "Arrepentirme de la compra",
    arrepentirseConfirmar:
      "Te devolvemos todo el pago a tu tarjeta. El vale deja de valer.",
    arrepentido: "Listo. Te devolvimos el pago.",
    errorArrepentirse:
      "No pudimos devolver el pago. Inténtalo de nuevo o contacta al negocio.",
    compraLista: "¡Listo! Tu vale está en tu cuenta.",
    compraPendiente:
      "Estamos confirmando tu pago. El vale aparece acá en un momento.",
    codigoAria: "Código del vale",
    estados: {
      active: "Activo",
      reserved: "Reservado",
      redeemed: "Usado",
      refunded: "Devuelto",
      expired: "Vencido",
      disputed: "En revisión",
    },
    menu: "Mis vales",
  },
  reserva: {
    aviso: (p: { codigo: string }): string => `Pagado con vale · ${p.codigo}`,
    avisoTexto: "Elige una hora antes de que venza el vale. No pagas nada más.",
  },
  caja: {
    titulo: "Vales vendidos",
    enlace: "Vales",
    vendidos: "Vendidos",
    ingresos: "Ventas",
    usados: "Usados",
    pendientes: "Por usar",
    vacio: "Todavía no vendes vales.",
    columnas: {
      oferta: "Oferta",
      comprado: "Comprado",
      estado: "Estado",
      valor: "Valor",
    },
    hora: (p: { fecha: string }): string => `Hora: ${p.fecha}`,
    nota: "Los vales se pagan al comprarlos y cuentan como venta ese día. La hora reservada con vale no tiene nada por cobrar.",
  },
} as const;
