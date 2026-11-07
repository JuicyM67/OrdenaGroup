/**
 * Cuentas de clientes (WP-67, D-054): crear cuenta, mi perfil, reservas,
 * favoritos, reseña desde la cuenta y privacidad. Texto en chileno (tú).
 * TODO_COPY: revisión de copywriter-es-cl (el equipo de desarrollo escribió
 * una primera versión). El nombre del producto entra siempre como `{ marca }`.
 *
 * Archivo propio (como `es-CL.visita.ts`) para que estos textos no terminen
 * en el chunk compartido de la página de reservas (`/[slug]`, D-039).
 */
export const cuenta = {
  meta: {
    perfil: "Mi perfil",
    ingresar: "Crea tu cuenta",
    reservas: "Mis reservas",
    favoritos: "Favoritos",
    privacidad: "Privacidad",
    resena: "Deja tu reseña",
  },
  ingresar: {
    cerrar: "Cerrar",
    titulo: "Crea tu cuenta.",
    destacado: "Gratis.",
    texto: "Todas tus reservas y tus negocios favoritos en un solo lugar.",
    beneficios: {
      gestionar: "Cancela tus horas tú mismo",
      historial: "Tu historial de reservas",
      favoritos: "Guarda tus favoritos",
      resenas: "Califica tus visitas",
    },
    google: "Continuar con Google",
    separador: "o con tu correo",
    emailLabel: "Correo",
    emailPlaceholder: "nombre@ejemplo.cl",
    marketing: "Avísame de ofertas cerca de mí (opcional)",
    cta: "Enviar link de acceso",
    enviando: "Enviando…",
    legalAntes: "No necesitas contraseña. Al continuar aceptas los ",
    legalTerminos: "términos",
    legalY: " y la ",
    legalPrivacidad: "política de privacidad",
    legalDespues: ".",
    negocio: "¿Tienes un negocio? Entra aquí",
    googleError: "No pudimos entrar con Google. Prueba con tu correo.",
  },
  enviado: {
    titulo: "Revisa tu correo",
    texto: (p: { email: string }): string =>
      `Te mandamos un código y un link a ${p.email}.`,
    otroCorreo: "Usar otro correo",
  },
  nav: {
    aria: "Menú principal",
    reservas: "Reservas",
    perfil: "Perfil",
    favoritos: "Favoritos",
  },
  perfil: {
    hola: (p: { nombre: string }): string => `¡Hola, ${p.nombre}!`,
    holaSinNombre: "¡Hola!",
    subtitulo: (p: { email: string }): string => p.email,
    proxima: "Próxima reserva",
    verReserva: "Gestionar",
    comoLlegar: "Cómo llegar",
    sinReservasTitulo: "Aún no tienes reservas",
    sinReservasTexto:
      "Cuando reserves con este correo en un negocio que use la agenda, tus horas aparecen aquí.",
    resenaPregunta: (p: { servicio: string; negocio: string }): string =>
      `¿Qué tal tu ${p.servicio} en ${p.negocio}?`,
    resenaTexto: "Califica tu visita, toma 20 segundos",
    favoritosTitulo: "Favoritos",
    favoritosVacio:
      "Toca el corazón en la página de un negocio para guardarlo aquí.",
    verTodos: "Ver todos",
    menuAria: "Cuenta",
    menuReservas: "Historial de reservas",
    menuFavoritos: "Mis favoritos",
    menuPrivacidad: "Privacidad: exportar o eliminar",
    cerrarSesion: "Cerrar sesión",
    negocio: "¿Tienes un negocio? Ir a tu panel",
  },
  estados: {
    requested: "Por confirmar",
    pending_payment: "Pago pendiente",
    confirmed: "Confirmada",
    completed: "Realizada",
    no_show: "No asististe",
    cancelled: "Cancelada",
    cancel_requested: "Cancelación solicitada",
  },
  reservas: {
    titulo: "Mis reservas",
    proximas: "Próximas",
    anteriores: "Anteriores",
    vacioProximas: "No tienes horas por delante.",
    vacioAnteriores: "Aún no tienes visitas anteriores.",
    conProfesional: (p: { profesional: string }): string =>
      `con ${p.profesional}`,
    cancelar: "Cancelar hora",
    solicitarCancelacion: "Pedir cancelación",
    confirmarCancelar: "¿Seguro? Esta acción no se puede deshacer.",
    confirmarSi: "Sí, cancelar",
    confirmarNo: "No, volver",
    cancelada: "Listo, cancelamos tu hora.",
    solicitada: "Le pedimos al negocio que cancele tu hora. Te avisamos.",
    fueraDePlazo: (p: { horas: number }): string =>
      `Solo puedes cancelar hasta ${p.horas} h antes. Escríbele al negocio.`,
    errorCancelar: "No pudimos cancelar tu hora. Inténtalo de nuevo.",
    dejarResena: "Dejar reseña",
    editarResena: "Editar reseña",
    tuResena: (p: { n: number }): string => `Tu reseña: ${p.n} de 5`,
    reservarOtraVez: "Reservar otra vez",
  },
  favoritos: {
    titulo: "Favoritos",
    vacio:
      "Aún no guardas ningún negocio. Toca el corazón en su página para guardarlo.",
    quitar: "Quitar",
    guardar: "Guardar en favoritos",
    guardado: "Guardado en favoritos",
    resenas: (p: { promedio: string; n: number }): string =>
      `★ ${p.promedio} · ${p.n} ${p.n === 1 ? "reseña" : "reseñas"}`,
  },
  resena: {
    titulo: "¿Cómo estuvo tu visita?",
    verificada: "Verificada",
    conProfesional: (p: { profesional: string; fecha: string }): string =>
      `con ${p.profesional} · ${p.fecha}`,
    cerrada:
      "Ya pasaron 7 días desde tu reseña, así que no se puede editar. ¡Gracias por opinar!",
    volver: "Volver a mi perfil",
  },
  privacidad: {
    titulo: "Privacidad",
    texto:
      "Tu cuenta es tuya. Descarga tus datos o elimina la cuenta cuando quieras.",
    marketingTitulo: "Ofertas cerca de ti",
    marketingTexto:
      "Te escribimos solo si lo aceptas. Puedes cambiarlo cuando quieras.",
    marketingLabel: "Quiero recibir ofertas por correo",
    marketingGuardar: "Guardar",
    marketingGuardado: "Listo, guardamos tu preferencia.",
    exportarTitulo: "Descargar mis datos",
    exportarTexto:
      "Un archivo JSON con tu cuenta, tus reservas, favoritos, reseñas y consentimientos.",
    exportarCta: "Descargar",
    eliminarTitulo: "Eliminar mi cuenta",
    eliminarTexto:
      "Borramos tu cuenta, tus favoritos y el vínculo con tus reservas. Tus reseñas quedan sin tu nombre. Las fichas que cada negocio tiene de ti son de ese negocio: pídeles directamente que las borren.",
    eliminarLabel: (p: { palabra: string }): string =>
      `Escribe ${p.palabra} para confirmar`,
    palabra: "ELIMINAR",
    eliminarCta: "Eliminar mi cuenta",
    eliminarError: "Escribe la palabra tal como aparece.",
    eliminada: "Eliminamos tu cuenta.",
    eliminadaNegocio:
      "Eliminamos tu cuenta de cliente. Tu acceso al panel de tu negocio sigue igual.",
    volverInicio: "Volver al inicio",
  },
};
