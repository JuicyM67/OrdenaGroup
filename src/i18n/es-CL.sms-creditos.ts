/**
 * WP-76 (D-053): créditos SMS en Ajustes → Plan. Solo SE en v1; en CL no se
 * muestran (paridad de tipos, textos cortos y neutros). Archivo propio (como
 * `es-CL.visita.ts`) para que estos textos no entren en el chunk de i18n que
 * carga la página de reservas.
 */
import type { Trad } from "./index";

export const smsCreditos = {
  titulo: "SMS",
  intro:
    "Los recordatorios usan primero los SMS del plan y luego tus créditos.",
  planChip: (p: { plan: string }): string => `Plan: ${p.plan}`,
  incluidos: (p: { mes: string }): string => `Incluidos en el plan · ${p.mes}`,
  incluidosCorto: "En el plan",
  deMax: (p: { max: string }): string => `de ${p.max} SMS`,
  deMaxCorto: (p: { max: string }): string => ` / ${p.max}`,
  sinLimite: "Sin límite en tu plan",
  sinSmsEnPlan:
    "Tu plan no incluye SMS. Con créditos, los recordatorios salen por SMS.",
  medidor: "SMS usados del plan",
  recarga: (p: { fecha: string }): string => `Se renuevan el ${p.fecha}`,
  creditos: "Créditos",
  quedan: "SMS disponibles",
  vence: (p: { fecha: string }): string =>
    `Los más antiguos vencen el ${p.fecha}`,
  segmento:
    "1 SMS = 160 caracteres. Los mensajes más largos cuentan como varios.",
  aviso: {
    fuerte: (p: { usado: string; max: string; mes: string }): string =>
      `Usaste ${p.usado} de ${p.max} SMS en ${p.mes}.`,
    conCreditos: "Cuando se acaben, los recordatorios siguen con tus créditos.",
    sinCreditos: "Cuando se acaben, los recordatorios salen por correo.",
    corto: (p: { usado: string; max: string; mes: string }): string =>
      `${p.usado} de ${p.max} SMS usados en ${p.mes}.`,
    cortoConCreditos: "Luego siguen tus créditos.",
    cortoSinCreditos: "Luego salen por correo.",
    agotado:
      "Se acabaron tus SMS y créditos. Los recordatorios salen por correo.",
  },
  comprar: {
    titulo: "Cargar SMS",
    sub: "Válidos por 12 meses.",
    subCorto: "Válidos por 12 meses · 160 caracteres por SMS",
    leyenda: "Elige un paquete",
    paquete: (p: { n: string }): string => `${p.n} SMS`,
    porSms: (p: { precio: string }): string => `${p.precio}/SMS`,
    ahorro: (p: { monto: string }): string => `Ahorras ${p.monto}`,
    neto: "Precio sin IVA",
    netoCorto: "Sin IVA",
    iva: "IVA",
    total: "Total",
    pagar: (p: { monto: string }): string => `Pagar ${p.monto}`,
    seguro: "Pago seguro con tarjeta. El comprobante llega a tu correo.",
    seguroCorto: "Pago seguro con tarjeta",
  },
  confirmar: {
    titulo: "Confirma tu compra",
    ivaParte: "IVA incluido",
    validoHasta: "Válidos hasta",
    texto:
      "Te llevamos a la página de pago. Los créditos se suman apenas se confirme el pago.",
    ir: "Ir a pagar",
    cancelar: "Cancelar",
  },
  listo: {
    titulo: (p: { n: string }): string => `¡Listo! Se sumaron ${p.n} SMS`,
    texto: (p: { saldo: string }): string =>
      `Ahora tienes ${p.saldo} créditos. El comprobante llegó a tu correo.`,
    cajaTitulo: "Úsalos para llenar tu agenda",
    cajaTexto: "Envía una oferta a quienes no reservan hace tiempo.",
    ahoraNo: "Ahora no",
  },
  procesando: {
    titulo: "Estamos procesando el pago",
    texto:
      "Los créditos se suman apenas se confirme el pago. Recarga la página en un rato.",
    ok: "Entendido",
  },
  cancelado: "El pago se canceló. No se cobró nada.",
  marketing: {
    eyebrow: "Llena los huecos de tu agenda",
    titulo: "Un SMS a tus clientes puede llenarte la tarde",
    paso1Fuerte: "Elige a quién.",
    paso1: "Por ejemplo, clientes que no vienen hace 6 semanas.",
    paso2Fuerte: "Escribe una oferta corta.",
    paso2: "Suma tus horas flash para que reserven directo.",
    paso3Fuerte: "Envía o programa.",
    paso3: "Ves cuántos SMS cuesta antes de enviar.",
    ejemploLabel: "Ejemplo:",
    ejemplo: (p: { link: string }): string =>
      `"¡Hola Ana! Tengo horas libres el jueves con 20 % de descuento. Reserva aquí: ${p.link}"`,
    ejemploCosto: "· 1 SMS",
    cta: "Enviar SMS de marketing",
    alcance: (p: { n: string }): string =>
      `Tienes ${p.n} créditos, alcanzan para ${p.n} clientes.`,
  },
  historial: {
    titulo: "Historial",
    fecha: "Fecha",
    evento: "Movimiento",
    creditos: "Créditos",
    recibo: "Comprobante",
    compra: (p: { n: string; monto: string }): string =>
      `Compraste ${p.n} SMS · ${p.monto} con IVA`,
    compraCorta: (p: { n: string }): string => `Compraste ${p.n} SMS`,
    uso: "Recordatorios fuera del plan",
    ver: "Ver",
    vacio: "Aún no tienes compras.",
    verTodo: "Ver todo",
    estado: {
      reembolsado: "Reembolsado",
      reembolsoParcial: "Reembolso parcial",
      expirado: "Vencido",
    },
  },
  errores: {
    sms_credits_unavailable: "La compra de SMS no está disponible.",
    sms_credits_invalid_package: "Elige uno de los paquetes.",
    forbidden: "Solo el dueño puede comprar SMS.",
    rate_limited:
      "Intentaste muchas veces. Espera un rato y vuelve a intentar.",
    failed: "No pudimos abrir el pago. Inténtalo de nuevo.",
    unauthorized: "Vuelve a iniciar sesión.",
  },
  campana: {
    cuota80: "Usaste el 80 % de tus SMS del mes",
    agotados: "Se acabaron tus SMS: los recordatorios salen por correo",
    cta: "Cargar SMS",
  },
} as const satisfies Trad;
