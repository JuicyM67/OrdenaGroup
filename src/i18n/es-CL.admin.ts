/**
 * WP-80 (D-061): textos nuevos del panel de plataforma (`/admin`):
 * administradores y "Facturación manual". WP-84 (D-069): menú, lista de
 * negocios como tarjetas, "Rubro y ubicación", "Borrar ahora" e importación.
 * Archivo propio para que no entren en el chunk de i18n de la página de
 * reservas. También los textos que WP-36 dejó fijos en sueco (detalle del
 * negocio, reseñas, registro, verificación en dos pasos, invitar), ahora en
 * es-CL: todo `/admin` sale de este archivo.
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
    /** La plataforma ocultó el negocio en Descubre (`marketplace_hidden`). */
    ocultoDescubre: "Oculto en Descubre",
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
    miembros: "Miembros",
    sinCorreo: "(sin correo)",
    /** `memberships.role`; un rol desconocido se muestra tal cual. */
    roles: {
      owner: "Dueño",
      admin: "Administrador",
      staff: "Personal",
    },
    reservas: "Reservas",
    equipo: "Equipo",
    cuentas: "Cuentas",
    estado: "Estado",
    eliminacionPedida: (p: { fecha: string }): string =>
      `Eliminación pedida el ${p.fecha}`,
    congelar: {
      boton: "Congelar",
      titulo: "¿Congelar el negocio?",
      texto:
        "La página de reservas deja de estar disponible hasta que lo descongeles.",
    },
    descongelar: {
      boton: "Descongelar",
      titulo: "¿Descongelar el negocio?",
      texto: "La página de reservas vuelve a estar disponible.",
    },
    pedirEliminacion: {
      boton: "Pedir eliminación",
      titulo: "¿Pedir la eliminación del negocio?",
      texto:
        "La página de reservas se cierra altiro. El negocio se borra para siempre en 30 días, salvo que deshagas la eliminación antes.",
    },
    deshacerEliminacion: {
      boton: "Deshacer eliminación",
      titulo: "¿Deshacer la eliminación?",
      texto: "La cuenta vuelve al estado que tenía antes.",
    },
    // Ocultar negocios de prueba o demo del catálogo Descubre
    // (`marketplace_hidden`). El dueño no puede cambiarlo.
    descubre: {
      titulo: "Descubre",
      visible: "Visible en Descubre.",
      oculto:
        "Oculto en Descubre. El dueño ve que su negocio está oculto y no puede cambiarlo.",
      noListado: "El dueño eligió no aparecer en Descubre.",
      incompleto:
        "Todavía no aparece: al perfil le falta imagen, dirección o servicios.",
      congelado: "No aparece mientras el negocio esté congelado.",
      ocultar: {
        boton: "Ocultar de Descubre",
        titulo: "¿Ocultar el negocio de Descubre?",
        texto:
          "Deja de aparecer en el catálogo, aunque el dueño lo tenga activado. Su página de reservas sigue funcionando.",
      },
      mostrar: {
        boton: "Mostrar en Descubre",
        titulo: "¿Mostrar el negocio en Descubre?",
        texto:
          "Vuelve a aparecer en el catálogo si el dueño lo tiene activado y el perfil está completo.",
      },
    },
    plan: "Plan",
    ultimaActividad: "Última actividad",
    sinReservas: "Todavía no hay reservas.",
    registro: "Registro",
  },
  // Acciones de soporte por miembro (enlace para entrar, cambiar correo).
  miembro: {
    enviarEnlace: "Enviar enlace para entrar",
    enviando: "Enviando…",
    enlaceEnviado: "Enlace enviado.",
    cambiarCorreo: "Cambiar correo",
    correoNuevo: "Correo nuevo",
    guardar: "Guardar",
    guardando: "Guardando…",
  },
  // WP-105 (D-079): modo soporte en el panel del negocio.
  soporte: {
    abrir: "Abrir como soporte",
    ayuda:
      "Entras al panel del negocio por 60 minutos y puedes cambiar lo mismo que una persona del equipo con todos los permisos. Plan, facturación, equipo, fichas y eliminación quedan cerrados. El inicio y el término quedan en el registro.",
    banner: (p: { nombre: string; hora: string }): string =>
      `Modo soporte: ${p.nombre}, hasta las ${p.hora}`,
    salir: "Salir",
    errores: {
      already_member:
        "Ya eres miembro de este negocio. Entra a su panel como siempre.",
      not_found: "Este negocio ya no existe.",
    },
  },
  // Cambiar plan (y fecha de término opcional) en el detalle del negocio.
  plan: {
    plan: "Plan",
    personal: "Personal acordado (por defecto 10)",
    hasta: "Gratis o de prueba hasta (opcional)",
    guardar: "Guardar plan",
    guardando: "Guardando…",
  },
  // /admin/nuevo: invitar a alguien a crear un negocio.
  invitar: {
    nombre: "Nombre del negocio",
    correo: "Correo del dueño",
    plan: "Plan",
    hasta: "Gratis o de prueba hasta (opcional)",
    enviar: "Enviar invitación",
    enviando: "Enviando…",
    enviada: (p: { correo: string }): string =>
      `Invitación enviada a ${p.correo}.`,
    otra: "Invitar a otro",
  },
  // Botón de confirmación genérico (congelar, ocultar reseña, etc.).
  confirmar: {
    cancelar: "Cancelar",
  },
  /** Códigos de error de las acciones del panel → texto. */
  errores: {
    invalid_input: "Revisa los datos.",
    invalid_email: "Revisa el correo.",
    invalid_name: "Escribe el nombre del negocio.",
    note_too_long: "La nota es demasiado larga.",
    not_found: "No lo encontramos. Recarga la página.",
    already_frozen: "El negocio ya está congelado.",
    not_frozen: "El negocio no está congelado.",
    deletion_pending: "Primero deshaz la eliminación.",
    already_requested: "La eliminación ya estaba pedida.",
    not_requested: "No hay una eliminación pedida.",
    onboarding_draft: "El negocio todavía no termina su configuración inicial.",
    generate_link_failed: "No pudimos crear el enlace. Intenta de nuevo.",
    send_failed: "No pudimos enviar el correo. Intenta de nuevo.",
    update_failed:
      "No pudimos cambiar el correo. Puede que otra cuenta ya lo use.",
    desconocido: "Algo salió mal. Intenta de nuevo.",
  },
  // /admin/resenas: reseñas reportadas y ocultas.
  resenas: {
    reportadas: "Reportadas",
    ocultas: "Ocultas",
    vacio: "Nada que revisar.",
    anonimo: "Anónimo",
    sinTexto: "(sin texto)",
    respuesta: "Respuesta:",
    reportada: (p: { fecha: string }): string => `Reportada el ${p.fecha}`,
    reportadaSinFecha: "Reportada",
    motivos: {
      offensive: "Lenguaje ofensivo",
      false: "Información falsa",
      personal_data: "Datos personales",
      not_customer: "No fue su cliente",
      other: "Otro motivo",
    },
    ocultar: {
      boton: "Ocultar",
      titulo: "¿Ocultar la reseña?",
      texto:
        "Desaparece de la página del negocio y del promedio. Se puede restaurar.",
    },
    restaurar: {
      boton: "Restaurar",
      titulo: "¿Restaurar la reseña?",
      texto: "Vuelve a verse en la página del negocio.",
    },
    descartar: {
      boton: "Descartar reporte",
      titulo: "¿Descartar el reporte?",
      texto: "La reseña se mantiene y el reporte se cierra.",
      confirmar: "Descartar",
    },
  },
  // /admin/actividad y el registro del detalle: `admin_audit_log` legible.
  registro: {
    verNegocio: "Ver negocio",
    vacio: "Todavía no hay acciones.",
    /** `admin_audit_log.action`; una acción desconocida se muestra tal cual. */
    acciones: {
      set_plan: "Cambió el plan",
      set_billing_mode: "Cambió la facturación",
      freeze: "Congeló el negocio",
      unfreeze: "Descongeló el negocio",
      request_deletion: "Pidió eliminar el negocio",
      cancel_deletion: "Deshizo la eliminación",
      delete_now: "Borró el negocio",
      send_login_link: "Envió un enlace para entrar",
      change_email: "Cambió el correo de una cuenta",
      invite_business: "Invitó a un negocio nuevo",
      add_admin: "Agregó un administrador",
      remove_admin: "Quitó a un administrador",
      business_place: "Cambió rubro y ubicación",
      import: "Importó datos de otro sistema",
      review_hide: "Ocultó una reseña",
      review_restore: "Restauró una reseña",
      set_marketplace_hidden: "Cambió la visibilidad en Descubre",
      support_start: "Entró como soporte",
      support_end: "Salió del modo soporte",
    },
    /** `set_marketplace_hidden` según `details.hidden`. */
    descubreOculto: "Ocultó de Descubre",
    descubreVisible: "Mostró en Descubre",
    /** Claves de `details`; una clave desconocida se muestra tal cual. */
    campos: {
      plan: "Plan",
      custom_limits: "Límites acordados",
      staff_acordado: "Personal acordado",
      billing_mode: "Facturación",
      slug: "Link",
      rubro: "Rubro",
      comuna: "Comuna",
      address: "Dirección",
      services: "Servicios",
      staff: "Equipo",
      categories: "Categorías",
      profile: "Datos del perfil",
      hours: "Horario",
      until: "Hasta",
      reason: "Motivo",
    },
    /** WP-105: `support_end.details.reason`. */
    motivosSoporte: {
      ended: "Salió",
      expired: "Se acabó el tiempo",
      switched: "Abrió otro negocio",
    },
    modos: {
      app: "En la app",
      manual: "Manual",
    },
    sinFecha: "Sin fecha de término",
    hasta: (p: { fecha: string }): string => `Hasta el ${p.fecha}`,
    conNota: "Con nota interna",
    sinNota: "Sin nota interna",
    cuentaNueva: "Cuenta nueva",
    cuentaExistente: "Cuenta existente",
    cambios: (p: { campos: string }): string => `Cambios: ${p.campos}`,
    sinCambios: "Sin cambios",
    si: "Sí",
    no: "No",
  },
  // /admin/mfa: verificación en dos pasos (TOTP).
  mfa: {
    titulo: "Verificación en dos pasos",
    /** Nombre del factor en Supabase (`friendlyName`). */
    nombreFactor: (p: { marca: string }): string => `Admin ${p.marca}`,
    cargando: "Cargando…",
    errorNivel: "No pudimos leer tu nivel de verificación. Recarga la página.",
    errorFactores:
      "No pudimos leer tus métodos de verificación. Recarga la página.",
    errorRegistro: "No pudimos empezar la activación. Recarga la página.",
    escanear:
      "Escanea el código QR con tu app de autenticación (por ejemplo, Google Authenticator o 1Password).",
    qrAlt: "Código QR para la verificación en dos pasos",
    manual: (p: { secreto: string }): string =>
      `¿No puedes escanearlo? Ingresa este código a mano: ${p.secreto}`,
    escribeCodigo: "Escribe el código de tu app de autenticación.",
    codigo: "Código",
    verificar: "Verificar",
    verificando: "Verificando…",
    codigoIncorrecto: "El código no es correcto. Intenta de nuevo.",
    errorVerificar: "No pudimos verificar el código. Intenta de nuevo.",
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
