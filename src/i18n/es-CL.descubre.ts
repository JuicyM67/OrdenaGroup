/**
 * WP-68 (D-056): marketplace "Descubre" (ofertas cerca de ti, mapa, página de
 * oferta). En CL la sección está oculta hasta que exista Mercado Pago (decisión
 * del dueño 2026-10-10); estos textos mantienen la paridad de tipos con
 * `sv-SE.descubre.ts`. Archivo propio (como `es-CL.visita.ts`) para que no
 * entren en el chunk de i18n de la página de reservas. TODO_COPY: revisión de
 * copywriter-es-cl. La marca entra siempre como `{ marca }`.
 */

export const descubre = {
  meta: {
    titulo: "Ofertas de belleza y bienestar cerca de ti",
    descripcion:
      "Ofertas y horas libres en peluquerías, barberías, uñas, masajes y estética, con reseñas verificadas de clientes reales.",
    categoria: (p: { categoria: string }): string =>
      `Ofertas de ${p.categoria.toLowerCase()} cerca de ti`,
    categoriaCiudad: (p: { categoria: string; ciudad: string }): string =>
      `Ofertas de ${p.categoria.toLowerCase()} en ${p.ciudad}`,
    categoriaDescripcion: (p: { categoria: string }): string =>
      `Ofertas de ${p.categoria.toLowerCase()} con reseñas verificadas. Compara precios y reserva cerca de ti.`,
    mapa: "Mapa de ofertas",
    oferta: (p: { titulo: string; negocio: string }): string =>
      `${p.titulo} en ${p.negocio}`,
  },
  nav: {
    descubre: "Descubre",
    descubreMenu: "Descubre ofertas",
    descubreTexto: "Ofertas y horas flash cerca de ti",
    lista: "Lista",
    mapa: "Mapa",
    paraNegocios: "Para negocios",
    inicio: "Inicio",
    vistas: "Vista",
  },
  hero: {
    titulo: "Belleza y bienestar,",
    destacado: "más barato cerca de ti",
    tituloCorto: "Ofertas",
    destacadoCorto: "cerca de ti",
    bajada:
      "Ofertas y horas libres de salones con reseñas verificadas de clientes reales.",
    foto: "Sillón de peluquería con luz natural",
  },
  buscar: {
    label: "Buscar",
    placeholder: "Tratamiento, salón o comuna",
    boton: "Buscar",
    limpiar: "Borrar búsqueda",
  },
  ubicacion: {
    miPosicion: "Mi ubicación",
    cercaDeTi: "Cerca de ti",
    todas: "Todas las comunas",
    elegir: "Elegir comuna",
    cargando: "Buscando tu ubicación…",
    denegada: "No pudimos obtener tu ubicación. Elige una comuna.",
    quitar: "Dejar de usar mi ubicación",
    nota: "Tu ubicación se queda en tu navegador (aprox. 1 km) y se borra en 30 minutos.",
  },
  categorias: {
    label: "Categorías",
    todas: "Todas",
    nombres: {
      har: "Pelo",
      naglar: "Uñas",
      massage: "Masajes",
      hudvard: "Estética",
      fransar: "Pestañas y cejas",
      ovrigt: "Otros",
    },
    total: (p: { n: number }): string =>
      p.n === 1 ? "1 oferta" : `${p.n} ofertas`,
  },
  flash: {
    titulo: "Horas flash hoy",
    verTodas: "Ver todas",
    label: "Horas flash de hoy",
    precioAntes: "Antes",
  },
  lista: {
    tituloCerca: "Populares cerca de ti",
    titulo: "Ofertas",
    resultados: (p: { n: number }): string =>
      p.n === 1 ? "1 oferta" : `${p.n} ofertas`,
    resultadosKm: (p: { n: number; km: number }): string =>
      `${p.n === 1 ? "1 oferta" : `${p.n} ofertas`} a menos de ${p.km} km`,
    vacioTitulo: "Todavía no hay ofertas aquí",
    vacioTexto: "Prueba otra categoría, otra comuna o borra los filtros.",
    ver: "Ver",
    anterior: "Anterior",
    siguiente: "Siguiente",
    pagina: (p: { n: number; total: number }): string =>
      `Página ${p.n} de ${p.total}`,
    ranking:
      "Orden: más cerca primero (si compartes tu ubicación), luego las más nuevas. Todas las reseñas vienen de reservas realizadas.",
  },
  filtros: {
    titulo: "Filtros",
    distancia: "Distancia",
    distanciaSinPosicion: "Comparte tu ubicación para filtrar por distancia.",
    km: (p: { km: number }): string => `${p.km} km`,
    mostrar: "Mostrar",
    soloFlash: "Solo horas flash hoy",
    rating: "Nota 4,5 o más",
    ordenar: "Ordenar",
    ordenes: {
      near: "Más cerca primero",
      new: "Más nuevas",
      price: "Menor precio",
      discount: "Mayor descuento",
    },
    aplicar: "Ver resultados",
    limpiar: "Borrar filtros",
    abrir: "Filtros",
  },
  tarjeta: {
    descuento: (p: { pct: number }): string => `−${p.pct} %`,
    flash: (p: { hora: string }): string => `Hora flash ${p.hora}`,
    resenas: (p: { n: number }): string => `(${p.n})`,
    km: (p: { km: string }): string => `${p.km} km`,
    precioAntes: "Precio normal",
    precioOferta: "Precio oferta",
    nota: (p: { nota: string }): string => `Nota ${p.nota} de 5`,
  },
  oferta: {
    volver: "Volver",
    ahorra: (p: { pct: number }): string => `Ahorra ${p.pct} %`,
    eyebrow: (p: { categoria: string }): string => `${p.categoria} · Oferta`,
    verificadas: (p: { n: number }): string =>
      p.n === 1 ? "1 reseña verificada" : `${p.n} reseñas verificadas`,
    incluye: "Qué incluye",
    comoFunciona: "Cómo funciona",
    pasos: ["Compra el vale", "Elige hora ahora o después", "Ven y disfruta"],
    validez: (p: { meses: number }): string => `Válido por ${p.meses} meses.`,
    duracion: (p: { duracion: string }): string =>
      `Duración aprox. ${p.duracion}.`,
    condiciones: "Condiciones",
    resenas: "Reseñas",
    verificada: "Reserva verificada",
    respuesta: "Respuesta del salón:",
    vendidoPor: "Lo vende",
    proximamente: "Compra disponible pronto",
    proximamenteTexto:
      "Muy pronto podrás comprar esta oferta aquí y elegir hora al tiro. Mientras tanto puedes reservar en el salón a precio normal.",
    verHoras: "Ver horas libres",
    masDe: (p: { negocio: string }): string => `Más ofertas de ${p.negocio}`,
    precioNormal: "Precio normal",
    mapa: "© OpenStreetMap",
  },
  mapa: {
    titulo: "Mapa",
    buscarEn: (p: { zona: string }): string => `Buscar en ${p.zona}`,
    buscarCerca: "Buscar cerca de ti",
    aqui: (p: { n: number }): string =>
      p.n === 1 ? "1 oferta aquí" : `${p.n} ofertas aquí`,
    verLista: "Ver lista",
    hoy: "Hoy",
    cargando: "Cargando el mapa…",
    error: "No pudimos cargar el mapa. Prueba la lista.",
    atribucion: "© OpenStreetMap · OpenFreeMap",
    tuPosicion: "Tu ubicación",
    sinUbicacion: (p: { n: number }): string =>
      p.n === 1
        ? "1 oferta sin ubicación en el mapa"
        : `${p.n} ofertas sin ubicación en el mapa`,
  },
  tabs: {
    label: "Menú",
    descubre: "Descubre",
    mapa: "Mapa",
    negocios: "Negocios",
    reservas: "Reservas",
    perfil: "Perfil",
  },
  migas: {
    label: "Estás aquí",
    inicio: "Inicio",
  },
} as const;
