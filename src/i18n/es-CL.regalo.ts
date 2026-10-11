/**
 * Tarjetas de regalo (WP-77, D-058): compra en `/<slug>/tarjeta-regalo`,
 * correos al comprador y al destinatario, página de la tarjeta, "Mis tarjetas
 * de regalo" en la cuenta, Caja → Tarjetas de regalo y el ajuste. En CL todo
 * está oculto (Mercado Pago más adelante) — solo paridad de tipos.
 * TODO_COPY: revisión de copywriter-es-cl.
 *
 * Archivo propio para que estos textos no entren en el chunk de la página de
 * reservas (`/[slug]`, D-039).
 */
export const regalo = {
  compra: {
    meta: (p: { negocio: string }): string =>
      `Tarjeta de regalo · ${p.negocio}`,
    eyebrow: "Tarjeta de regalo",
    titulo: (p: { negocio: string }): string =>
      `Regala un momento en ${p.negocio}`,
    bajada:
      "Sirve para todos los servicios durante 24 meses. Se envía al tiro o el día que elijas.",
    volver: (p: { negocio: string }): string => `Volver a ${p.negocio}`,
    volverCorto: "Volver",
    pasos: {
      monto: "1. Monto",
      diseno: "2. Diseño",
      paraQuien: "3. ¿Para quién?",
    },
    pasosCortos: {
      monto: "Monto",
      diseno: "Diseño",
      paraQuien: "¿Para quién?",
    },
    otro: "Otro",
    otroLabel: (p: { min: string; max: string }): string =>
      `Monto a elección (${p.min}–${p.max})`,
    temas: { lime: "Lima", lilac: "Lila", photo: "Foto" },
    campos: {
      destinatario: "Nombre de quien la recibe",
      destinatarioEmail: "Correo de quien la recibe",
      destinatarioEmailAyuda: "Si lo dejas vacío, la tarjeta te llega a ti.",
      saludo: "Saludo (opcional)",
      saludoCorto: "Saludo",
      saludoAyuda: "Hasta 300 caracteres, sin links.",
      de: "De parte de",
      enviar: "Enviar el",
      enviarAyuda:
        "Vacío = al tiro después del pago. Si no, a las 08:00 ese día.",
      tuEmail: "Tu correo (para la boleta)",
      tuEmailCorto: "Tu correo (boleta)",
    },
    terminos:
      "Leí las condiciones: la tarjeta sirve 24 meses para todos los servicios, se puede usar varias veces hasta agotar el monto y no se cambia por efectivo. Tienes 14 días para arrepentirte si no la usaste.",
    tarjeta: {
      etiqueta: "Tarjeta de regalo",
      para: (p: { nombre: string }): string => `Para ${p.nombre}`,
      validoHasta: (p: { fecha: string }): string => `Válida hasta ${p.fecha}`,
    },
    resumen: {
      envio: "Se envía",
      ahora: "Al tiro",
      aPagar: "A pagar",
      pagar: (p: { monto: string }): string => `Pagar ${p.monto}`,
      stripe: "Tarjeta y Apple Pay con Stripe",
      arrepentimiento: "14 días para arrepentirte",
      notaMovil:
        "Tarjeta y Apple Pay con Stripe · 14 días para arrepentirte · Válida 24 meses",
    },
    vendidoPor: (p: { negocio: string }): string =>
      `La vende ${p.negocio}. El pago va directo al negocio.`,
    cancelado: "Cancelaste el pago. No se cobró nada.",
    noDisponible: "Las tarjetas de regalo no están disponibles acá por ahora.",
    errores: {
      amount: "Elige un monto entre $100 y $5.000.",
      theme: "Elige un diseño.",
      name: "Escribe un nombre (máximo 80 caracteres).",
      email: "Revisa el correo.",
      greeting: "El saludo puede tener hasta 300 caracteres.",
      greeting_url: "El saludo no puede tener links.",
      date: "Elige un día entre hoy y 90 días más.",
      terms: "Acepta las condiciones para seguir.",
      unavailable: "Las tarjetas de regalo no están disponibles ahora.",
      invalid: "Revisa el monto y el día de envío.",
      rate_limited: "Demasiados intentos. Espera un rato y vuelve a intentar.",
      failed: "No pudimos abrir el pago. Inténtalo de nuevo.",
    },
    enlacePerfil: "Comprar tarjeta de regalo",
  },
  listo: {
    meta: "Tarjeta de regalo lista",
    titulo: "¡Listo! La tarjeta de regalo va en camino",
    texto: (p: { nombre: string; fecha: string }): string =>
      `${p.nombre} la recibe por correo el ${p.fecha}. Te mandamos la boleta y una copia de la tarjeta.`,
    textoAhora: (p: { nombre: string }): string =>
      `${p.nombre} la recibe por correo en unos minutos. Te mandamos la boleta y una copia de la tarjeta.`,
    textoTuyo:
      "Te mandamos la tarjeta y la boleta a tu correo. Puedes imprimirla y regalarla en persona.",
    fechaHora: (p: { fecha: string }): string => `${p.fecha} a las 08:00`,
    pendiente:
      "Estamos confirmando tu pago. La tarjeta te llega por correo en un rato.",
    imprimir: "Descargar como PDF",
    otra: "Comprar otra",
  },
  tarjeta: {
    meta: "Tarjeta de regalo",
    saldo: "Saldo",
    valor: "Valor",
    validoHasta: "Válida hasta",
    codigo: "Tu código",
    estado: "Estado",
    de: (p: { nombre: string }): string => `De parte de ${p.nombre}`,
    imprimir: "Imprimir o guardar como PDF",
    reservar: "Reservar con la tarjeta",
    ayuda:
      "Usa el código al reservar en la página del negocio o muéstralo en caja. Puedes usar la tarjeta varias veces hasta agotar el monto.",
    noEncontrada: "Este link ya no sirve.",
    arrepentirse: "Arrepentirme de la compra",
    arrepentirseTexto:
      "Te devolvemos todo a tu tarjeta. La tarjeta de regalo deja de servir y no se envía.",
    arrepentido: "Listo. La plata va de vuelta a tu tarjeta.",
    errorArrepentirse:
      "No se pudo hacer la devolución. Inténtalo de nuevo o escribe al negocio.",
    moms: "Tarjeta de regalo: el IVA se declara cuando se usa.",
  },
  estados: {
    active: "Activa",
    refunding: "En devolución",
    refunded: "Devuelta",
    expired: "Vencida",
    disputed: "Bloqueada",
    depleted: "Usada",
    parcial: "Usada en parte",
  },
  cuenta: {
    meta: "Mis tarjetas de regalo",
    titulo: "Mis tarjetas de regalo",
    menu: "Mis tarjetas de regalo",
    vacio: "Todavía no compras tarjetas de regalo.",
    saldo: (p: { saldo: string; valor: string }): string =>
      `${p.saldo} de ${p.valor}`,
    para: (p: { nombre: string }): string => `Para ${p.nombre}`,
    enviada: (p: { fecha: string }): string => `Enviada el ${p.fecha}`,
    programada: (p: { fecha: string }): string => `Se envía el ${p.fecha}`,
    validoHasta: (p: { fecha: string }): string => `válida hasta ${p.fecha}`,
    ver: "Ver e imprimir",
    arrepentirse: "Arrepentirme de la compra",
    arrepentido: "Listo. La plata va de vuelta a tu tarjeta.",
    errorArrepentirse:
      "No se pudo hacer la devolución. Inténtalo de nuevo o escribe al negocio.",
    codigoAria: "Código de la tarjeta de regalo",
  },
  caja: {
    enlace: "Tarjetas de regalo",
    titulo: "Tarjetas de regalo",
    canjear: "Usar tarjeta de regalo",
    codigo: "Código",
    buscar: "Buscar",
    saldo: "Saldo",
    validoHasta: "Válida hasta",
    estado: "Estado",
    para: (p: { nombre: string }): string => `Para ${p.nombre}`,
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
    vendidoAno: "Vendido este año",
    pendiente: "Por usar",
    usado: "Usado",
    vencido: "Vencido",
    nota: "Las tarjetas de regalo son vales multiuso: el IVA se declara cuando se usan, no cuando se venden. La boleta lo indica sola.",
    notaDeuda:
      "Las tarjetas vendidas son una deuda con tus clientes, no una venta. Cuando se usan cuentan como pago de la reserva.",
    lista: "Todas las tarjetas de regalo",
    vacio: "Todavía no vendes tarjetas de regalo.",
    comprada: (p: { fecha: string }): string => `Comprada el ${p.fecha}`,
    vence: (p: { fecha: string }): string => `vence el ${p.fecha}`,
    errores: {
      invalid: "Ese código no existe en tu negocio.",
      expired: "La tarjeta de regalo está vencida.",
      frozen: "La tarjeta está bloqueada (devolución o disputa).",
      empty: "El saldo no alcanza.",
      invalid_amount: "El monto no calza con el saldo o con la reserva.",
      invalid_booking: "Esa reserva no se puede pagar.",
      forbidden: "No tienes permiso para usar tarjetas de regalo.",
      rate_limited: "Demasiados intentos. Espera un rato.",
    },
    recibo: (p: { ultimos: string }): string =>
      `Tarjeta de regalo ···${p.ultimos}`,
  },
  ajustes: {
    titulo: "Tarjetas de regalo",
    texto:
      "Vende tarjetas de regalo en tu página de reservas. El cliente paga con tarjeta y la plata llega a tu cuenta Stripe (comisión 1 %). Sirven para todos tus servicios durante 24 meses.",
    toggle: "Vender tarjetas de regalo",
    guardar: "Guardar",
    guardado: "Guardado.",
    requiereStripe: "Primero conecta Stripe.",
    verPagina: "Ver la página de compra",
    error: "No se pudo guardar. Inténtalo de nuevo.",
  },
  reserva: {
    pregunta: "¿Tienes una tarjeta de regalo?",
    codigo: "Código de la tarjeta de regalo",
    ayuda: "El saldo se descuenta del precio. El resto lo pagas en el local.",
    errores: {
      gift_card_invalid:
        "Ese código no sirve acá. Revísalo y vuelve a intentar.",
      gift_card_empty: "La tarjeta de regalo no tiene saldo.",
      gift_card_rate_limited: "Demasiados intentos. Espera un rato.",
    },
    aviso: (p: { pagado: string; resto: string; saldo: string }): string =>
      `Pagado con tarjeta de regalo: ${p.pagado} · por pagar: ${p.resto} · saldo: ${p.saldo}`,
  },
  email: {
    kvitto: {
      asunto: (p: { negocio: string }): string =>
        `Boleta: tarjeta de regalo en ${p.negocio}`,
      preheader: (p: { negocio: string }): string =>
        `Tu tarjeta de regalo en ${p.negocio} está lista.`,
      titulo: "¡Gracias! La tarjeta de regalo va en camino",
      texto: (p: { nombre: string; cuando: string }): string =>
        `${p.nombre} recibe la tarjeta por correo ${p.cuando}.`,
      textoTuyo: "La tarjeta es para ti: abre el link para verla e imprimirla.",
      ahora: "en unos minutos",
      el: (p: { fecha: string }): string => `el ${p.fecha} a las 08:00`,
      valor: "Valor",
      codigo: "Código",
      para: "Para",
      validoHasta: "Válida hasta",
      vendidoPor: "La vende",
      moms: "Tarjeta de regalo (vale multiuso): el IVA se declara cuando se usa.",
      arrepentimiento:
        "Tienes 14 días para arrepentirte mientras no la uses: abre el link y elige “Arrepentirme de la compra”.",
      cta: "Ver la tarjeta de regalo",
    },
    leverans: {
      asunto: (p: { de: string; negocio: string }): string =>
        `${p.de} te regaló una tarjeta de regalo en ${p.negocio}`,
      preheader: (p: { negocio: string }): string =>
        `Úsala en todos los servicios de ${p.negocio}.`,
      titulo: (p: { nombre: string; de: string }): string =>
        `${p.nombre}, ¡${p.de} te regaló una tarjeta de regalo!`,
      etiqueta: "Tarjeta de regalo",
      validoHasta: (p: { fecha: string }): string =>
        `Sirve para todos los servicios hasta el ${p.fecha}`,
      codigo: "Tu código",
      cta: "Reservar con la tarjeta",
      ayuda: (p: { negocio: string }): string =>
        `Usa el código al reservar en ${p.negocio} o muéstralo en caja. Puedes usarla varias veces hasta agotar el monto. El saldo lo ves siempre en el link de abajo.`,
      saldo: "Ver saldo e imprimir",
    },
  },
} as const;
