/**
 * Ficha de atención y consentimiento informado (WP-88, D-074).
 *
 * `consentimientoInformado` es lo que ve el cliente (Reserva en `/[slug]`, su
 * reserva en `/r/[token]` y el enlace para firmar en el local, `/r/firma/[token]`).
 * `fichaAtencion` es la app del negocio (la pestaña Ficha del cliente y Ajustes →
 * Ficha). Archivo propio para que los textos del panel no entren al chunk de la
 * página de reservas. Nunca se manda el contenido de la ficha por correo ni por
 * WhatsApp. TODO_COPY: revisión de copywriter-es-cl y del abogado (los textos de
 * los consentimientos los escribe cada negocio).
 */
import type { Trad } from "./index";

export const consentimientoInformado = {
  /** Casilla obligatoria en Reserva, una por consentimiento del servicio. */
  acepto: (p: { titulo: string }): string =>
    `Leí y acepto el consentimiento informado "${p.titulo}".`,
  ver: "Ver consentimiento",
  ocultar: "Ocultar",
  requerido:
    "Para reservar este servicio tienes que aceptar el consentimiento.",
  /** En `/r/[token]` y en el enlace del local. */
  pendientesTitulo: "Consentimiento informado",
  pendientesAyuda: (p: { negocio: string }): string =>
    `${p.negocio} te pide leer y aceptar este consentimiento antes de tu atención.`,
  ctaAceptar: "Aceptar consentimiento",
  aceptado: "Listo, quedó registrado que aceptaste el consentimiento.",
  error: "No pudimos registrar tu respuesta. Intenta de nuevo.",
  desactualizado:
    "El negocio cambió el texto del consentimiento. Recarga la página y léelo de nuevo.",
  firma: {
    titulo: "Consentimiento informado",
    linkVencido: "Este enlace ya no es válido. Pide uno nuevo en el local.",
    yaAceptado: "Ya aceptaste este consentimiento. Puedes devolver el equipo.",
  },
} as const satisfies Trad;

export const fichaAtencion = {
  pestana: "Ficha",
  titulo: "Ficha de atención",
  ctaAbrir: "Ver ficha",
  aviso:
    "Información sensible: solo la ven el dueño y las personas con permiso de ficha. No se envía por correo ni por WhatsApp.",
  sinPermiso:
    "No tienes permiso para ver la ficha de los clientes. Pídeselo al dueño del negocio.",
  campos: {
    titulo: "Datos importantes",
    allergies: "Alergias",
    contraindications: "Contraindicaciones",
    observations: "Observaciones",
    placeholder: "Sin información",
    ctaGuardar: "Guardar datos",
    guardado: "Datos guardados.",
    actualizado: (p: { fecha: string }): string => `Actualizado el ${p.fecha}`,
    sinCampos:
      "Activa alergias, contraindicaciones u observaciones en Ajustes → Ficha.",
  },
  notas: {
    titulo: "Notas de atención",
    vacio: "Todavía no hay notas para este cliente.",
    nueva: "Nueva nota",
    placeholder: "Qué se hizo, cómo respondió el cliente, qué sigue…",
    reserva: "Reserva (opcional)",
    sinReserva: "Sin reserva",
    ctaAgregar: "Agregar nota",
    ctaEliminar: "Eliminar",
    eliminarTitulo: "¿Eliminar esta nota?",
    eliminarCuerpo: "La nota se borra para siempre.",
    eliminarSi: "Sí, eliminar",
    eliminarNo: "No, mantener",
    autorDesconocido: "Equipo del negocio",
    porAutor: (p: { autor: string }): string => `Por ${p.autor}`,
    demasiadoLarga: "La nota puede tener hasta 4000 caracteres.",
    vacia: "Escribe la nota.",
  },
  consentimientos: {
    titulo: "Consentimientos",
    vacio:
      "Este negocio todavía no tiene consentimientos. Créalos en Ajustes → Ficha.",
    aceptado: (p: { fecha: string }): string => `Aceptado el ${p.fecha}`,
    version: (p: { version: string }): string => `Versión ${p.version}`,
    versionAnterior:
      "Aceptó una versión anterior. Pídele que acepte la versión actual.",
    pendiente: "Sin aceptar",
    archivado: "Archivado",
    origen: {
      booking: "Al reservar",
      manage_link: "En su enlace de la reserva",
      in_person: "En el local",
    },
    ctaFirmarLocal: "Firmar en el local",
    linkTitulo: "Enlace para firmar",
    linkAyuda:
      "Abre este enlace en el celular del cliente o en un equipo del local. Sirve una vez y vence en 2 horas.",
    ctaCopiar: "Copiar enlace",
    copiado: "Copiado",
    ctaAbrirAqui: "Abrir en este equipo",
  },
  bloqueado: "La ficha de atención viene en el plan Emprende.",
  errores: {
    forbidden: "No tienes permiso para hacer esto.",
    unauthorized: "No tienes permiso para hacer esto.",
    not_found: "No encontramos este cliente.",
    plan_locked: "Tu plan no incluye la ficha de atención.",
    invalid_input: "Revisa los datos e intenta de nuevo.",
    unexpected: "Algo salió mal. Intenta de nuevo.",
  },
  ajustes: {
    pestana: "Ficha",
    titulo: "Ficha y consentimientos",
    intro:
      "La ficha guarda notas de atención y datos importantes de cada cliente. Los consentimientos los acepta el cliente al reservar, en el enlace de su reserva o en el local.",
    camposTitulo: "Datos fijos de la ficha",
    camposAyuda: "Elige qué datos quieres anotar de cada cliente.",
    ctaGuardarCampos: "Guardar",
    camposGuardados: "Guardado.",
    plantillasTitulo: "Consentimientos informados",
    plantillasAyuda:
      "Escribe el texto con tus palabras o con el de tu abogado. Cada cambio crea una versión nueva: los clientes que aceptaron una versión anterior siguen registrados con esa versión.",
    plantillasVacio: "Todavía no tienes consentimientos.",
    ctaNueva: "Nuevo consentimiento",
    ctaEditar: "Editar",
    tituloLabel: "Título",
    tituloPlaceholder: "Por ejemplo: Depilación láser",
    textoLabel: "Texto del consentimiento",
    textoPlaceholder:
      "Describe el tratamiento, sus riesgos, cuidados y contraindicaciones.",
    serviciosLabel: "Servicios que lo piden al reservar",
    serviciosVacio: "Todavía no tienes servicios.",
    activoLabel: "Activo",
    activoAyuda: "Si lo desactivas, ya no se pide en las reservas nuevas.",
    ctaGuardar: "Guardar consentimiento",
    ctaCancelar: "Cancelar",
    guardado: "Consentimiento guardado.",
    servicios: (p: { n: number }): string =>
      p.n === 0
        ? "Sin servicios"
        : p.n === 1
          ? "1 servicio"
          : `${p.n} servicios`,
    archivado: "Inactivo",
    errorTitulo: "Escribe un título de hasta 120 caracteres.",
    errorTexto: "Escribe el texto del consentimiento.",
    errorLimite: "Llegaste al máximo de 30 consentimientos.",
  },
} as const satisfies Trad;
