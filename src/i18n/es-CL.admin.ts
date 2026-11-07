/**
 * WP-80 (D-061): textos nuevos del panel de plataforma (`/admin`):
 * administradores y "Facturación manual". WP-84 (D-069): menú, lista de
 * negocios como tarjetas, "Rubro y ubicación", "Borrar ahora" e importación.
 * Archivo propio para que no entren en el chunk de i18n de la página de
 * reservas. El resto de `/admin` sigue con texto fijo en sueco (WP-36).
 * TODO_COPY: revisión de copywriter-es-cl.
 */
import type { Trad } from "./index";

export const adminPanel = {
  nav: {
    administradores: "Administradores",
    // WP-84: menú de íconos del panel rehecho.
    label: "Admin",
    negocios: "Negocios",
    resenas: "Reseñas",
    registro: "Registro",
    nuevo: "Nuevo negocio",
    volver: "Todos los negocios",
  },
  // WP-84: la lista de negocios como tarjetas.
  lista: {
    titulo: "Negocios",
    cantidad: (p: { n: number }): string =>
      p.n === 1 ? "1 negocio" : `${p.n} negocios`,
    buscar: "Busca por nombre, link o correo del dueño",
    buscarBoton: "Buscar",
    plan: "Plan",
    status: "Estado",
    facturacion: "Facturación",
    todos: "Todos",
    activo: "Activo",
    congelado: "Congelado",
    borrar: "Eliminación pedida",
    /** WP-83 (D-068): el dueño eligió un plan pagado al registrarse. */
    quierePlan: (p: { plan: string }): string => `Quiere ${p.plan}`,
    vacio: "Ningún negocio coincide.",
    abrir: (p: { nombre: string }): string => `Abrir ${p.nombre}`,
    sinDueno: "Sin dueño",
    descubre: "Descubre",
    listo: "Listo",
    faltan: (p: { n: number }): string =>
      p.n === 1 ? "Falta 1" : `Faltan ${p.n}`,
    puntoOk: "listo",
    puntoFalta: "falta",
    puntos: {
      imagen: "Imagen",
      lugar: "Dirección",
      servicios: "Servicios",
    },
  },
  detalle: {
    verPagina: "Abrir página de reservas",
  },
  // WP-84: "Rubro y ubicación" en /admin/negocios/[id].
  ubicacion: {
    titulo: "Rubro y ubicación",
    intro:
      "Ayuda al negocio a corregir su rubro, comuna o dirección. Los cambios quedan en el registro.",
    guardar: "Guardar",
    guardado: "Guardado.",
    error: "No pudimos guardar. Revisa los campos.",
    borrador:
      "El negocio todavía no termina su configuración inicial. El dueño completa estos datos (y puede importar) al terminarla.",
  },
  // WP-84: borrar un negocio altiro (cuentas de prueba, duplicados).
  borrar: {
    boton: "Borrar ahora",
    titulo: "Borrar el negocio altiro",
    texto:
      "Se borra todo para siempre: reservas, clientes, servicios, equipo, imágenes y la cuenta del dueño (si no pertenece a otro negocio). No se puede deshacer.",
    confirmar: (p: { slug: string }): string =>
      `Escribe ${p.slug} para confirmar`,
    borrar: "Borrar para siempre",
    cancelar: "Cancelar",
    borrando: "Borrando…",
    errores: {
      confirm_mismatch: "El link no coincide. Escríbelo tal cual.",
      not_found: "El negocio ya no existe.",
      desconocido: "No pudimos borrarlo. Intenta de nuevo.",
    },
  },
  // WP-84: la importación por un negocio que no puede hacerla solo.
  importar: {
    titulo: "Importar desde otro sistema de reservas",
    intro:
      "Pega el link de la página de reservas anterior del negocio (o el texto), elige qué traer e importa. Los servicios y el equipo que ya existen no se duplican, y el horario solo se trae si el negocio todavía no tiene uno. La importación queda en el registro.",
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
