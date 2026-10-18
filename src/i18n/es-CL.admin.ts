/**
 * WP-80 (D-061): textos nuevos del panel de plataforma (`/admin`):
 * administradores y "Facturación manual". Archivo propio para que no entren
 * en el chunk de i18n de la página de reservas. El resto de `/admin` sigue
 * con texto fijo en sueco (WP-36). TODO_COPY: revisión de copywriter-es-cl.
 */
import type { Trad } from "./index";

export const adminPanel = {
  nav: {
    administradores: "Administradores",
  },
  administradores: {
    titulo: "Administradores",
    intro:
      "Las personas que pueden entrar a este panel. Cada una debe activar la verificación en dos pasos antes de usarlo.",
    correo: "Correo",
    desde: "Desde",
    verificacion: "Verificación en dos pasos",
    mfaActiva: "Activa",
    mfaPendiente: "Pendiente",
    mfaDesconocida: "—",
    tu: "Tú",
    quitar: "Quitar",
    cancelar: "Cancelar",
    quitarTitulo: "¿Quitar a este administrador?",
    quitarTexto:
      "Deja de tener acceso al panel de inmediato. Su cuenta no se borra.",
    agregarTitulo: "Agregar administrador",
    agregarAyuda:
      "Si el correo ya tiene cuenta, se agrega altiro. Si no, creamos la cuenta. En ambos casos le enviamos un enlace para entrar.",
    agregar: "Agregar",
    agregando: "Agregando…",
    agregado: "Listo, agregamos al administrador y le enviamos el enlace.",
    agregadoSinCorreo:
      "Listo, agregamos al administrador, pero no pudimos enviar el correo. Pídele que entre desde la página de inicio de sesión.",
    errores: {
      invalid_email: "Revisa el correo.",
      already_admin: "Esa persona ya es administradora.",
      create_user_failed: "No pudimos crear la cuenta. Intenta de nuevo.",
      cannot_remove_self: "No puedes quitarte a ti mismo.",
      last_admin: "Tiene que quedar al menos un administrador.",
      not_found: "Ese administrador ya no está en la lista.",
      desconocido: "Algo salió mal. Intenta de nuevo.",
    },
  },
  facturacion: {
    manual: "Facturación manual",
    manualAyuda:
      "Se factura fuera del programa. El plan lo manejas desde acá y el negocio no ve opciones para comprar o cambiar de plan.",
    nota: "Nota interna (opcional)",
    notaAyuda: (p: { max: number }): string =>
      `Solo la ve el equipo de la plataforma. Máximo ${p.max} caracteres.`,
    guardar: "Guardar facturación",
    guardando: "Guardando…",
    guardado: "Guardado.",
    filtro: "Facturación",
    todos: "Todos",
    etiqueta: "Manual",
    planBloqueado:
      "Facturación manual: el plan solo se cambia desde este panel.",
    errores: {
      note_too_long: "La nota es demasiado larga.",
      not_found: "No encontramos el negocio.",
      invalid_input: "Revisa los datos.",
      desconocido: "Algo salió mal. Intenta de nuevo.",
    },
  },
} as const satisfies Trad;
