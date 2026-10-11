/**
 * WP-78 (D-059): pago de la suscripción en Ajustes → Plan y correos al dueño.
 * Solo SE en v1 (Stripe Billing); en CL no se muestra (paridad de tipos,
 * textos cortos y neutros; Flow vendrá después). Archivo propio para que
 * estos textos no entren en el chunk de i18n de la página de reservas.
 */
import type { Trad } from "./index";

export const suscripcion = {
  titulo: "Suscripción",
  planActual: "Tu plan",
  estado: {
    prueba: (p: { fecha: string }): string => `Prueba hasta el ${p.fecha}`,
    activo: "Activa",
    fallido: "El pago falló",
    termina: (p: { fecha: string }): string => `Termina el ${p.fecha}`,
    pendiente: "Pago pendiente",
    piloto: (p: { fecha: string }): string => `Piloto hasta el ${p.fecha}`,
  },
  proximaFactura: (p: { monto: string; fecha: string }): string =>
    `Próximo cobro: ${p.monto} el ${p.fecha}`,
  proximaFacturaSinMonto: (p: { fecha: string }): string =>
    `Próximo cobro el ${p.fecha}`,
  ivaIncluido: "con IVA",
  tarjeta: (p: { marca: string; ultimos: string }): string =>
    `${p.marca} ···· ${p.ultimos}`,
  sinTarjeta: "Sin tarjeta guardada",
  diasPrueba: (p: { n: number }): string =>
    p.n === 1 ? "Te queda 1 día de prueba" : `Te quedan ${p.n} días de prueba`,
  pruebaSinTarjeta: (p: { fecha: string; plan: string }): string =>
    `Agrega una tarjeta antes del ${p.fecha} para seguir con ${p.plan}. Si no, pasas a Gratis: no se borra nada.`,
  cambioPendiente: (p: { plan: string; fecha: string }): string =>
    `Cambias a ${p.plan} el ${p.fecha}.`,
  terminaTexto: (p: { plan: string; fecha: string }): string =>
    `${p.plan} termina el ${p.fecha}. Después tienes Gratis: no se borra nada.`,
  fallidoTexto: (p: { plan: string; fecha: string }): string =>
    `No pudimos cobrar. Actualiza la tarjeta antes del ${p.fecha} para mantener ${p.plan}.`,
  pilotoTexto: (p: { fecha: string }): string =>
    `Tu periodo piloto dura hasta el ${p.fecha}. Elige un plan antes para mantener las funciones.`,
  gratisTexto: (p: { n: number }): string =>
    `Prueba cualquier plan gratis por ${p.n} días, sin tarjeta.`,
  gratisSinPrueba:
    "Elige un plan cuando quieras. Puedes cancelar cuando quieras.",
  custom: "Tu plan lo gestionamos nosotros. Escríbenos si quieres cambiarlo.",
  botones: {
    gestionar: "Gestionar pago",
    agregarTarjeta: "Agregar tarjeta",
    cancelar: "Cancelar suscripción",
    reanudar: "Reanudar",
    elegir: "Elegir",
    actual: "Plan actual",
    mantener: "Mantener",
    contacto: "Contáctanos",
  },
  planes: {
    titulo: "Planes",
    porMes: "/mes",
    sinIva: "+ IVA",
    gratisNota: "Sin costo",
    prueba: (p: { n: number }): string => `${p.n} días gratis, sin tarjeta`,
  },
  dialogo: {
    tituloInicio: (p: { plan: string }): string => `Empezar ${p.plan}`,
    inicioPrueba: (p: { n: number; plan: string }): string =>
      `Prueba ${p.plan} gratis por ${p.n} días. No necesitas tarjeta: agrégala cuando quieras durante la prueba.`,
    inicioSinPrueba: (p: { monto: string }): string =>
      `Pagas ${p.monto} al mes con IVA. Puedes cancelar cuando quieras.`,
    irAlPago: "Continuar",
    tituloCambio: (p: { plan: string }): string => `Cambiar a ${p.plan}`,
    hoy: "A pagar hoy",
    despues: "Después, al mes",
    ivaDe: (p: { monto: string }): string => `IVA incluido: ${p.monto}`,
    subeAhora: "El nuevo plan se activa apenas se confirme el pago.",
    bajaAlFinal: (p: { fecha: string }): string =>
      `El cambio rige desde el ${p.fecha}. Hasta entonces mantienes tu plan actual.`,
    enPrueba:
      "El cambio rige de inmediato. No se cobra nada durante la prueba.",
    confirmar: "Confirmar",
    volver: "Volver",
    calculando: "Calculando…",
    tituloCancelar: (p: { plan: string }): string => `¿Cancelar ${p.plan}?`,
    textoCancelar: (p: { fecha: string }): string =>
      `Mantienes el plan hasta el ${p.fecha}. Después pasas a Gratis. No se borra nada: tus servicios, clientes y reservas siguen ahí.`,
    confirmarCancelar: "Sí, cancelar",
  },
  retorno: {
    listo: (p: { plan: string }): string => `¡Bienvenido a ${p.plan}!`,
    procesando: "Estamos confirmando el pago. Puede tardar un minuto.",
    cancelado: "Cancelaste el pago. No cambió nada.",
  },
  banner: {
    texto: (p: { fecha: string; plan: string }): string =>
      `No pudimos cobrar tu suscripción. Actualiza la tarjeta antes del ${p.fecha} para mantener ${p.plan}.`,
    cta: "Actualizar tarjeta",
  },
  condiciones:
    "Pago mensual por adelantado. Subir de plan se cobra de inmediato (proporcional). Bajar de plan o cancelar rige al final del periodo. No se devuelve el periodo empezado. Bajar de plan no borra datos.",
  marcas: {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    otra: "Tarjeta",
  },
  errores: {
    billing_unavailable: "El pago de planes no está disponible.",
    billing_not_owner: "Solo el dueño puede cambiar el plan.",
    billing_custom_plan:
      "Tu plan lo gestionamos nosotros. Escríbenos para cambiarlo.",
    billing_payment_required: "Primero actualiza tu tarjeta en Gestionar pago.",
    billing_already_subscribed: "Ya tienes una suscripción activa.",
    billing_no_subscription: "No tienes una suscripción activa.",
    billing_invalid_plan: "Elige uno de los planes.",
    billing_same_plan: "Ya tienes ese plan.",
    rate_limited:
      "Intentaste muchas veces. Espera un rato y vuelve a intentar.",
    failed: "No pudimos completar el cambio. Inténtalo de nuevo.",
    unauthorized: "Vuelve a iniciar sesión.",
  },
  email: {
    abonnemangBetalningMisslyckades: {
      asunto: "No pudimos cobrar tu suscripción",
      preheader: "Actualiza tu tarjeta para mantener tu plan.",
      titulo: "El pago falló",
      texto: (p: { plan: string; fecha: string }): string =>
        `No pudimos cobrar tu plan ${p.plan}. Actualiza la tarjeta antes del ${p.fecha} y mantienes todo como está.`,
      ayuda:
        "Si no se paga, pasas a Gratis. No se borra nada: tus servicios, clientes y reservas siguen ahí.",
      cta: "Actualizar tarjeta",
      ctaFactura: "Confirmar el pago",
    },
    abonnemangNedgraderat: {
      asunto: "Tu negocio pasó al plan Gratis",
      preheader: "No se borró nada. Puedes volver a un plan cuando quieras.",
      titulo: "Ahora tienes Gratis",
      texto: (p: { plan: string; motivo: string }): string =>
        p.motivo === "trial"
          ? `Tu prueba de ${p.plan} terminó sin tarjeta, así que pasaste a Gratis.`
          : p.motivo === "payment"
            ? `No pudimos cobrar tu plan ${p.plan}, así que pasaste a Gratis.`
            : p.motivo === "pilot"
              ? `Tu periodo piloto con ${p.plan} terminó, así que pasaste a Gratis.`
              : `Tu suscripción a ${p.plan} terminó, así que pasaste a Gratis.`,
      ayuda:
        "No se borró nada. Las funciones del plan quedan bloqueadas hasta que elijas un plan otra vez.",
      cta: "Ver planes",
    },
    abonnemangPilotSlutar: {
      asunto: (p: { dias: number }): string =>
        p.dias <= 3
          ? "Tu periodo piloto termina en pocos días"
          : "Tu periodo piloto termina en dos semanas",
      preheader: "Elige un plan para mantener las funciones.",
      titulo: "Tu periodo piloto está por terminar",
      texto: (p: { fecha: string }): string =>
        `Tu periodo piloto termina el ${p.fecha}. Después pasas a Gratis, salvo que elijas un plan.`,
      ayuda:
        "Al pasar a Gratis no se borra nada. Puedes probar un plan gratis por 14 días, sin tarjeta.",
      cta: "Elegir plan",
    },
  },
} as const satisfies Trad;
