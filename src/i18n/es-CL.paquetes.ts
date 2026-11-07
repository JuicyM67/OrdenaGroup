/**
 * Paquetes de sesiones (WP-86, D-072): plantillas en Ajustes, venta en la
 * ficha del cliente o en Caja, "Usar paquete" en la agenda y en Caja, y lo
 * que ve el cliente en su link de la reserva. Se paga en el local (efectivo,
 * transferencia o tarjeta); no hay pago online. Archivo propio para que estos
 * textos no entren al chunk de la página de reservas, salvo `publico`.
 * TODO_COPY: revisión de copywriter-es-cl.
 */
import type { Trad } from "./index";

export const paquetes = {
  pestana: "Paquetes",
  ajustes: {
    titulo: "Paquetes de sesiones",
    intro:
      "Crea paquetes que tus clientes pagan por adelantado, como “10 sesiones de kinesiología”. Los vendes en tu local y cada vez que vienen se descuenta una sesión.",
    nuevo: "Nuevo paquete",
    editar: "Editar paquete",
    vacio: "Todavía no tienes paquetes.",
    nombreLabel: "Nombre",
    nombreAyuda: "Por ejemplo: Pack 5 masajes.",
    serviciosLabel: "Servicios incluidos",
    serviciosAyuda:
      "Elige uno o más. El paquete sirve para cualquiera de ellos.",
    sesionesLabel: "Número de sesiones",
    precioLabel: "Precio del paquete",
    vigenciaLabel: "Vence a los (días)",
    vigenciaAyuda: "Déjalo vacío si el paquete no vence.",
    mostrarPublico: "Mostrar en tu página de reservas",
    mostrarPublicoAyuda:
      "Tus clientes ven que el servicio también viene en paquete. Lo compran en tu local.",
    activo: "Activo",
    inactivo: "Inactivo",
    activar: "Activar",
    desactivar: "Desactivar",
    guardado: "Paquete guardado.",
    resumen: (p: { sesiones: number; precio: string }): string =>
      `${p.sesiones} ${p.sesiones === 1 ? "sesión" : "sesiones"} · ${p.precio}`,
    venceEnDias: (p: { dias: number }): string =>
      `Vence a los ${p.dias} ${p.dias === 1 ? "día" : "días"}`,
    sinVencimiento: "No vence",
    publico: "En tu página",
  },
  vender: {
    cta: "Vender paquete",
    titulo: "Vender paquete",
    descripcion:
      "Registra un paquete que el cliente te pagó en el local. Queda en la caja de hoy.",
    clienteLabel: "Cliente",
    buscarLabel: "Buscar cliente",
    buscarAyuda: "Escribe el nombre o el teléfono.",
    sinResultados: "No encontramos clientes con ese nombre o teléfono.",
    cambiarCliente: "Cambiar",
    paqueteLabel: "Paquete",
    metodoLabel: "¿Cómo te pagó?",
    total: (p: { monto: string }): string => `Total: ${p.monto}`,
    confirmar: "Registrar venta",
    vendido: "Paquete vendido.",
    sinPlantillas:
      "Todavía no tienes paquetes activos. Créalos en Ajustes → Paquetes.",
    irAjustes: "Ir a Ajustes",
  },
  cliente: {
    titulo: "Paquetes",
    vacio: "Este cliente no tiene paquetes.",
    quedan: (p: { n: number; total: number }): string =>
      `Quedan ${p.n} de ${p.total} ${p.total === 1 ? "sesión" : "sesiones"}`,
    vence: (p: { fecha: string }): string => `Vence el ${p.fecha}`,
    sinVencimiento: "No vence",
    vencido: "Vencido",
    agotado: "Sin sesiones",
    anulado: "Anulado",
    activo: "Activo",
    vendidoEl: (p: { fecha: string; metodo: string; monto: string }): string =>
      `Vendido el ${p.fecha} · ${p.metodo} · ${p.monto}`,
    vendidoElSinMonto: (p: { fecha: string }): string =>
      `Vendido el ${p.fecha}`,
    usoEl: (p: { fecha: string; servicio: string }): string =>
      `${p.fecha} · ${p.servicio}`,
    usoNoVino: "No vino",
    usoDevuelto: "Sesión devuelta",
    anular: "Anular venta",
    anularTitulo: "¿Anular la venta de este paquete?",
    anularCuerpo:
      "Se quita de la caja de hoy. Solo puedes anularla el mismo día y si no se ha usado ninguna sesión.",
  },
  usar: {
    cta: "Usar paquete",
    ctaNoVino: "Descontar sesión del paquete",
    ayudaNoVino: "No vino. Tú decides si se descuenta la sesión del paquete.",
    disponible: (p: { nombre: string; n: number }): string =>
      `${p.nombre} · ${p.n === 1 ? "queda 1 sesión" : `quedan ${p.n} sesiones`}`,
    pagadaConPaquete: "Pagada con paquete",
    quedanTras: (p: { n: number }): string =>
      p.n === 1 ? "Queda 1 sesión" : `Quedan ${p.n} sesiones`,
    devolver: "Devolver sesión",
    devolverTitulo: "¿Devolver la sesión al paquete?",
    devolverCuerpo: "La hora queda sin pagar y el paquete recupera la sesión.",
  },
  caja: {
    vendidos: "Paquetes vendidos",
    vendidosCount: (p: { n: number }): string =>
      `${p.n} ${p.n === 1 ? "paquete vendido" : "paquetes vendidos"}`,
    incluidoEnCobrado: "Incluido en lo cobrado.",
  },
  errores: {
    plan_locked:
      "Tu plan no incluye paquetes. Revisa los planes para activarlos.",
    forbidden: "No tienes permiso para hacer esto.",
    not_found: "No encontramos ese paquete.",
    invalid: "Revisa los datos del paquete.",
    sin_servicios: "Elige al menos un servicio.",
    template_inactive: "Ese paquete ya no está activo.",
    customer_anonymized: "Ese cliente ya no existe.",
    no_sessions: "Al paquete no le quedan sesiones.",
    expired: "El paquete ya venció.",
    service_not_included: "Este servicio no está incluido en el paquete.",
    wrong_customer: "El paquete es de otro cliente.",
    booking_status: "Esta hora todavía no se puede descontar del paquete.",
    already_used: "Esta hora ya se descontó de un paquete.",
    already_paid: "Esta hora ya está pagada.",
    same_day_required: "Solo puedes anularla el mismo día de la venta.",
    in_use: "No puedes anular un paquete que ya tiene sesiones usadas.",
  },
  /** `/r/[token]`: el cliente ve sus paquetes con este negocio. */
  gestion: {
    titulo: "Tus paquetes",
    quedan: (p: { n: number; total: number }): string =>
      `Quedan ${p.n} de ${p.total} ${p.total === 1 ? "sesión" : "sesiones"}`,
    vence: (p: { fecha: string }): string => `Vence el ${p.fecha}`,
    ayuda: "Cada vez que vienes se descuenta una sesión.",
  },
  /** Página de reservas `/[slug]` (una línea por servicio). */
  publico: {
    disponible: (p: { n: number; precio: string }): string =>
      `Disponible en pack de ${p.n} ${p.n === 1 ? "sesión" : "sesiones"} · ${p.precio} (se compra en el local)`,
  },
} as const satisfies Trad;
