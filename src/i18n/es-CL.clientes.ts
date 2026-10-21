/**
 * "Para clientes" (landing de la cuenta de cliente) y selector de ingreso del header.
 * Se muestra junto con Descubre (D-060). Archivo propio para que no entren en el chunk de i18n de la página de reservas. TODO_COPY: revisión de
 * copywriter-es-cl. La marca entra siempre como `{ nombre }`.
 */
export const paraClientes = {
  meta: {
    titulo: "Crea tu cuenta gratis para tus reservas",
    descripcion: (p: { nombre: string }): string =>
      `Junta todas tus reservas, salones favoritos, ofertas y vales en una cuenta gratis de ${p.nombre}. Cambia o cancela con un clic.`,
    migas: "Para clientes",
    inicio: "Inicio",
  },
  nav: {
    label: "Para clientes",
    texto: "Junta tus reservas gratis",
    entrarLabel: "Elige cómo ingresar",
    soyCliente: "Soy cliente",
    soyClienteTexto: "Mira y gestiona tus reservas",
    tengoNegocio: "Tengo un negocio",
    tengoNegocioTexto: "Entra a tu agenda",
  },
  hero: {
    foto: "Cliente reservando una hora desde el celular",
    etiqueta: "Para quienes reservan",
    pre: "Todas tus reservas.",
    marca: "En un solo lugar.",
    texto:
      "Crea una cuenta gratis y junta horas, salones favoritos, ofertas y vales. Cambia o cancela con un clic.",
    emailLabel: "Tu correo",
    emailPlaceholder: "Tu correo",
    cta: "Crear cuenta gratis",
    confianza: [
      { id: "gratis", texto: "Siempre gratis" },
      { id: "sinClave", texto: "Sin contraseña: un enlace en tu correo" },
      { id: "datos", texto: "Tus datos, protegidos" },
    ],
  },
  tarjetas: {
    proxima: "PRÓXIMA RESERVA",
    dia: "JUE",
    numero: "15",
    servicio: "Corte + peinado",
    detalle: "14:30 · Salón Norte",
    favoritos: "3 salones favoritos",
    favoritosTexto: "Reserva de nuevo con un clic",
    flash: "Hora flash hoy 16:30 · −25 %",
    flashTexto: "Cerca de ti en Descubre",
  },
  funciones: {
    pre: "Todo lo que necesitas como cliente –",
    marca: "totalmente gratis",
    items: [
      {
        id: "reservas",
        titulo: "Todas tus reservas juntas",
        texto: "Mira tus horas próximas y pasadas en todos los salones.",
      },
      {
        id: "cambiar",
        titulo: "Cambia o cancela",
        texto:
          "Modifica tu hora desde la cuenta, sin llamar ni buscar el correo.",
      },
      {
        id: "favoritos",
        titulo: "Salones favoritos",
        texto: "Guarda tus favoritos y reserva el mismo servicio con un clic.",
      },
      {
        id: "ofertas",
        titulo: "Ofertas y horas flash",
        texto: "Encuentra horas con descuento cerca de ti en Descubre.",
      },
      {
        id: "vales",
        titulo: "Vales y regalos",
        texto: "Todos tus códigos y saldos en un solo lugar, listos para usar.",
      },
      {
        id: "resenas",
        titulo: "Reseñas verificadas",
        texto: "Califica tus visitas: solo clientes reales pueden opinar.",
      },
    ],
  },
  pasos: {
    titulo: "Listo en un minuto",
    foto: "Cliente durante un tratamiento",
    cta: "Crear cuenta gratis",
    items: [
      {
        titulo: "Escribe tu correo",
        texto:
          "Te enviamos un enlace para entrar. Sin contraseña que recordar.",
      },
      {
        titulo: "Aparecen tus horas",
        texto:
          "Si ya reservaste con el mismo correo, verás tus reservas de inmediato.",
      },
      {
        titulo: "Reserva más fácil",
        texto:
          "Guarda favoritos, encuentra horas flash cerca y reserva de nuevo con un clic.",
      },
    ],
  },
  faq: {
    titulo: "Preguntas frecuentes",
    items: [
      {
        pregunta: "¿Tiene costo?",
        respuesta: "No. La cuenta es gratis y siempre lo será.",
      },
      {
        pregunta: "¿Necesito cuenta para reservar?",
        respuesta:
          "No, puedes reservar como invitado. Con cuenta tienes todo junto y reservas más rápido.",
      },
      {
        pregunta: "¿Qué salones veo en mi cuenta?",
        respuesta:
          "Todos los salones y clínicas que usan el servicio donde reservaste con el mismo correo.",
      },
      {
        pregunta: "¿Cómo elimino mi cuenta?",
        respuesta:
          "En Privacidad dentro de la cuenta. Ahí también puedes descargar todos tus datos.",
      },
    ],
  },
  cierre: {
    titulo: "Tu próxima hora está a un clic",
    texto: "Crea una cuenta o encuentra un salón cerca de ti.",
    crear: "Crear cuenta gratis",
    descubre: "Descubrir salones",
  },
  banner: {
    titulo: "Junta todas tus reservas en una cuenta",
    texto: "Gratis y sin contraseña. Cambia o cancela con un clic.",
    cta: "Crear cuenta gratis",
  },
};
