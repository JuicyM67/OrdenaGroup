/**
 * Tarjetas de regalo (WP-87, D-073): venta en el local desde Caja → Tarjetas
 * de regalo, uso en caja, página de la tarjeta (`/<slug>/tarjeta-regalo/
 * tarjeta`), correos al comprador y a quien la recibe, y la línea en la página
 * de reservas. Sin pago en línea por ahora (Mercado Pago más adelante).
 * Basado en los textos de WP-77 (D-058).
 * TODO_COPY: revisión de copywriter-es-cl.
 *
 * Archivo propio para que estos textos no entren en el chunk de la página de
 * reservas (`/[slug]`, D-039).
 */
import type { Trad } from "./index";

export const regalo = {
  tarjeta: {
    meta: "Tarjeta de regalo",
    etiqueta: "Tarjeta de regalo",
    para: (p: { nombre: string }): string => `Para ${p.nombre}`,
    validaHasta: (p: { fecha: string }): string => `Válida hasta el ${p.fecha}`,
    saldo: "Saldo",
    valor: "Valor",
    validoHasta: "Válida hasta",
    codigo: "Tu código",
    estado: "Estado",
    de: (p: { nombre: string }): string => `De parte de ${p.nombre}`,
    imprimir: "Imprimir o guardar como PDF",
    reservar: "Reservar hora",
    ayuda: (p: { negocio: string }): string =>
      `Muestra el código en el local al pagar. Sirve para todos los servicios de ${p.negocio} y puedes usarla varias veces hasta agotar el saldo. No se cambia por dinero.`,
    noEncontrada: "Este link ya no sirve.",
    demasiados: "Demasiados intentos. Espera un rato y vuelve a intentar.",
  },
  estados: {
    active: "Activa",
    refunding: "En devolución",
    refunded: "Anulada",
    expired: "Vencida",
    disputed: "Bloqueada",
    depleted: "Usada",
    parcial: "Usada en parte",
  },
  perfil: {
    linea: "Regala una tarjeta de regalo · cómprala en el local",
  },
  caja: {
    enlace: "Tarjetas de regalo",
    titulo: "Tarjetas de regalo",
    vender: {
      titulo: "Vender tarjeta de regalo",
      bajada: (p: { meses: number }): string =>
        `El cliente te paga acá en el local. La tarjeta sirve para todos tus servicios durante ${p.meses} meses.`,
      monto: "Monto",
      otro: "Otro monto",
      otroLabel: (p: { min: string; max: string }): string =>
        `Monto a elección (${p.min}–${p.max})`,
      metodo: "Cómo te pagó",
      diseno: "Diseño",
      temas: { lime: "Lima", lilac: "Lila" },
      paraQuien: "¿Para quién es? (opcional)",
      destinatario: "Nombre de quien la recibe",
      destinatarioEmail: "Correo de quien la recibe",
      destinatarioEmailAyuda: "Le enviamos la tarjeta al tiro.",
      saludo: "Saludo",
      saludoAyuda: "Hasta 300 caracteres, sin links.",
      comprador: "Quién la compra (opcional)",
      compradorNombre: "Nombre de quien la compra",
      compradorEmail: "Correo de quien la compra",
      compradorEmailAyuda: "Le enviamos el comprobante con el código.",
      cta: (p: { monto: string }): string => `Registrar venta de ${p.monto}`,
      ctaSinMonto: "Registrar venta",
      listo: (p: { monto: string }): string =>
        `¡Listo! Vendiste una tarjeta de regalo de ${p.monto}.`,
      codigo: "Código",
      verImprimir: "Ver e imprimir la tarjeta",
      correos: "Enviamos la tarjeta por correo.",
      sinCorreo:
        "No ingresaste correos: imprime la tarjeta o anota el código para tu cliente.",
      codigoUnaVez:
        "Por seguridad, el código y el link se muestran solo ahora.",
      otra: "Vender otra",
    },
    canjear: "Usar tarjeta de regalo",
    codigo: "Código",
    buscar: "Buscar",
    saldo: "Saldo",
    validoHasta: "Válida hasta",
    estado: "Estado",
    usarEn: "Usar en",
    sinReserva: "Sin reserva (solo descontar del saldo)",
    reservaOpcion: (p: {
      hora: string;
      servicio: string;
      monto: string;
    }): string => `${p.servicio} · ${p.hora} · ${p.monto}`,
    monto: "Monto a descontar",
    descontar: (p: { monto: string }): string =>
      `Descontar ${p.monto} de la tarjeta`,
    descontarSinMonto: "Descontar de la tarjeta",
    listo: (p: { monto: string; saldo: string }): string =>
      `¡Listo! Se descontaron ${p.monto}. Quedan ${p.saldo} en la tarjeta.`,
    listoReserva: "La reserva quedó marcada como pagada.",
    cifras: "Tarjetas de regalo en números",
    vendidoHoy: "Vendido hoy",
    vendidoAno: "Vendido este año",
    pendiente: "Por usar",
    usado: "Usado",
    vencido: "Vencido",
    porMetodo: (p: { metodo: string; monto: string }): string =>
      `${p.metodo}: ${p.monto}`,
    notaDeuda:
      "Las tarjetas vendidas son un saldo a favor de tus clientes, no una venta: cuentan como pago cuando se usan en una reserva. Consulta con tu contador cómo emitir la boleta.",
    lista: "Todas las tarjetas de regalo",
    vacio: "Todavía no vendes tarjetas de regalo.",
    vendida: (p: { fecha: string }): string => `Vendida el ${p.fecha}`,
    vence: (p: { fecha: string }): string => `vence el ${p.fecha}`,
    anular: "Anular",
    anularTitulo: "¿Anular esta tarjeta de regalo?",
    anularTexto:
      "Solo se puede el mismo día y si no se ha usado. La tarjeta deja de servir; devuélvele la plata a tu cliente en el local.",
    anulada: "Tarjeta anulada.",
    mostrar: {
      titulo: "En tu página de reservas",
      toggle: "Mostrar “Regala una tarjeta de regalo”",
      ayuda:
        "Tus clientes ven que pueden comprar tarjetas de regalo en tu local.",
      guardado: "Guardado.",
    },
    pagarConTarjeta: "¿Paga con tarjeta de regalo?",
    errores: {
      invalid: "Ese código no existe en tu negocio.",
      expired: "La tarjeta de regalo está vencida.",
      frozen: "La tarjeta está anulada o bloqueada.",
      empty: "El saldo no alcanza.",
      invalid_amount: "El monto no calza con el saldo o con la reserva.",
      invalid_booking: "Esa reserva no se puede pagar.",
      forbidden: "No tienes permiso para usar tarjetas de regalo.",
      rate_limited: "Demasiados intentos. Espera un rato.",
      amount: "Elige un monto entre $1.000 y $1.000.000.",
      method: "Elige cómo te pagó.",
      theme: "Elige un diseño.",
      name: "Revisa el nombre (máximo 80 caracteres).",
      email: "Revisa el correo.",
      greeting: "El saludo puede tener hasta 300 caracteres.",
      greeting_url: "El saludo no puede tener links.",
      plan_locked: "Tu plan no incluye vender tarjetas de regalo.",
      unavailable: "Ahora no se pueden vender tarjetas de regalo.",
      not_allowed: "Esta tarjeta ya no se puede anular.",
      same_day_required: "Solo puedes anular una tarjeta el mismo día.",
      not_found: "No encontramos la tarjeta.",
      unexpected: "Algo salió mal. Inténtalo de nuevo.",
    },
  },
  email: {
    comprador: {
      asunto: (p: { negocio: string }): string =>
        `Tu tarjeta de regalo de ${p.negocio}`,
      preheader: (p: { negocio: string }): string =>
        `Comprobante y código de tu tarjeta de regalo en ${p.negocio}.`,
      titulo: "¡Gracias! Acá está tu tarjeta de regalo",
      texto: (p: { negocio: string }): string =>
        `Compraste una tarjeta de regalo en ${p.negocio}. Puedes imprimirla o reenviar este correo a quien se la regales.`,
      textoPara: (p: { negocio: string; nombre: string }): string =>
        `Compraste una tarjeta de regalo en ${p.negocio} para ${p.nombre}.`,
      valor: "Valor",
      codigo: "Código",
      para: "Para",
      validoHasta: "Válida hasta",
      vendidoPor: "La vende",
      nota: "Muéstrala en el local al pagar. Se puede usar varias veces hasta agotar el saldo y no se cambia por dinero.",
      cta: "Ver e imprimir la tarjeta",
    },
    destinatario: {
      asunto: (p: { negocio: string }): string =>
        `Te regalaron una tarjeta de regalo en ${p.negocio}`,
      asuntoDe: (p: { de: string; negocio: string }): string =>
        `${p.de} te regaló una tarjeta de regalo en ${p.negocio}`,
      preheader: (p: { negocio: string }): string =>
        `Úsala en todos los servicios de ${p.negocio}.`,
      titulo: (p: { nombre: string }): string =>
        `${p.nombre}, ¡te regalaron una tarjeta de regalo!`,
      tituloDe: (p: { nombre: string; de: string }): string =>
        `${p.nombre}, ¡${p.de} te regaló una tarjeta de regalo!`,
      tituloSinNombre: "¡Te regalaron una tarjeta de regalo!",
      etiqueta: "Tarjeta de regalo",
      validoHasta: (p: { fecha: string }): string =>
        `Sirve para todos los servicios hasta el ${p.fecha}`,
      codigo: "Tu código",
      cta: "Reservar hora",
      ayuda: (p: { negocio: string }): string =>
        `Reserva en ${p.negocio} y muestra el código en el local al pagar. Puedes usarla varias veces hasta agotar el saldo. El saldo lo ves siempre en el link de abajo.`,
      saldo: "Ver saldo e imprimir",
    },
  },
} as const satisfies Trad;
