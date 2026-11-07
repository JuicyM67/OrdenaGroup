/**
 * WP-68 (D-055): marketplace "Descubre" (ofertas cerca de ti, mapa, página de
 * oferta). En CL se reserva a precio de oferta y se paga en el local (D-060;
 * antes la sección estaba oculta hasta que exista Mercado Pago, decisión
 * del dueño 2026-10-10). Archivo propio (como `es-CL.visita.ts`) para que no
 * entren en el chunk de i18n de la página de reservas. TODO_COPY: revisión de
 * copywriter-es-cl. La marca entra siempre como `{ marca }`.
 *
 * WP-85 (D-070): Descubre es además un catálogo de negocios con 16 categorías
 * (pestañas Negocios · Ofertas · Horas flash).
 */

const ofertas = (n: number): string => (n === 1 ? "1 oferta" : `${n} ofertas`);

const negocios = (n: number): string =>
  n === 1 ? "1 negocio" : `${n} negocios`;

const horasFlash = (n: number): string =>
  n === 1 ? "1 hora flash" : `${n} horas flash`;

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
    descubreMenu: "Descubre negocios y ofertas",
    descubreTexto: "Negocios, ofertas y horas flash cerca de ti",
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
    /** "Uñas en {comuna}": preposición antes de la comuna destacada. */
    en: "en",
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
    // WP-85 (D-070): 16 categorías, los mismos nombres que los rubros
    // (`negocio.rubros`).
    nombres: {
      har: "Peluquería",
      barberare: "Barbería",
      naglar: "Uñas",
      fransar: "Pestañas y cejas",
      hudvard: "Estética",
      skonhet: "Maquillaje y depilación",
      massage: "Masajes",
      spa: "Spa",
      halsa: "Kinesiología y salud",
      holistiskt: "Terapias holísticas",
      traning: "Entrenamiento y yoga",
      tatuering: "Tatuajes y piercing",
      djur: "Mascotas",
      stad: "Limpieza y hogar",
      fordon: "Autos",
      ovrigt: "Otros",
    },
    total: (p: { n: number }): string => ofertas(p.n),
    totalNegocios: (p: { n: number }): string => negocios(p.n),
  },
  flash: {
    titulo: "Horas flash hoy",
    verTodas: "Ver todas",
    label: "Horas flash de hoy",
    precioAntes: "Antes",
  },
  // WP-85 (D-070): Descubre como catálogo de negocios: pestañas, tarjetas de
  // negocio y páginas por comuna.
  pestanas: {
    label: "Ver",
    negocios: "Negocios",
    ofertas: "Ofertas",
    flash: "Horas flash",
  },
  negociosMeta: {
    titulo: "Encuentra y reserva negocios cerca de ti",
    descripcion:
      "Peluquerías, barberías, uñas, masajes, estética, limpieza y mucho más: reserva directo en negocios cerca de ti, con reseñas verificadas.",
    categoria: (p: { categoria: string }): string =>
      `${p.categoria} cerca de ti: reserva online`,
    categoriaCiudad: (p: { categoria: string; ciudad: string }): string =>
      `${p.categoria} en ${p.ciudad}: reserva online`,
    categoriaDescripcion: (p: { categoria: string }): string =>
      `Negocios de ${p.categoria.toLowerCase()} cerca de ti. Compara reseñas y reserva tu hora online.`,
    ofertas: "Ofertas cerca de ti",
    flash: "Horas flash hoy: horas libres a menor precio",
  },
  negociosHero: {
    buscar: "¿Qué quieres reservar? Ej: corte, masaje, limpieza",
    titulo: "Encuentra y reserva",
    destacado: "cerca de ti",
    bajada:
      "Negocios con horas libres y reseñas verificadas de clientes reales.",
    /** "Peluquería en {comuna}". */
    en: "en",
    /** "Peluquería cerca de {comuna}" (menos negocios que el mínimo). */
    cerca: "cerca de",
  },
  negociosLista: {
    titulo: "Negocios",
    tituloCerca: "Negocios cerca de ti",
    resultados: (p: { n: number }): string => negocios(p.n),
    resultadosKm: (p: { n: number; km: number }): string =>
      `${negocios(p.n)} a menos de ${p.km} km`,
    vacioTitulo: "Todavía no hay negocios aquí",
    vacioTexto:
      "Descubre crece a medida que se suman negocios nuevos. Prueba otra categoría u otra comuna.",
    cerca: (p: { comuna: string }): string =>
      `Todavía no hay tantos negocios en ${p.comuna}, así que te mostramos los más cercanos.`,
    ranking:
      "Orden: más cerca primero si compartes tu ubicación; si no, primero los negocios con horas flash y ofertas. Todas las reseñas vienen de reservas realizadas.",
  },
  negocioTarjeta: {
    aDomicilioEn: (p: { comunas: string }): string =>
      `Atiende a domicilio en ${p.comunas}`,
    aDomicilio: "Atiende a domicilio",
    oferta: "Oferta",
    ofertas: (p: { n: number }): string => ofertas(p.n),
    nuevo: "Nuevo en Descubre",
  },
  creciendo: {
    titulo: "Descubre crece cada semana",
    texto:
      "Todo el tiempo se suman negocios nuevos, así que pronto vas a ver más cerca de ti.",
    recomendar: "¿Falta tu negocio favorito? Recomiéndalo",
    paraNegocios: "¿Tienes un negocio? Aparece aquí gratis",
  },
  flashLista: {
    titulo: "Horas flash hoy",
    bajada:
      "Horas libres de hoy a menor precio. La hora queda tuya cuando la confirmas.",
    resultados: (p: { n: number }): string => horasFlash(p.n),
    vacioTitulo: "No quedan horas flash hoy",
    vacioTexto:
      "Los negocios publican horas flash cuando les queda un espacio libre. Vuelve más tarde o mira todos los negocios.",
    verNegocios: "Ver todos los negocios",
  },
  lista: {
    tituloCerca: "Populares cerca de ti",
    titulo: "Ofertas",
    resultados: (p: { n: number }): string => ofertas(p.n),
    resultadosKm: (p: { n: number; km: number }): string =>
      `${ofertas(p.n)} a menos de ${p.km} km`,
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
      rating: "Mejor nota",
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
    /** D-060: reservar a precio de oferta y pagar en el local (sin pago online). */
    enLocal: "Pagas en el local",
    enLocalTexto:
      "Reserva tu hora y paga el precio de oferta directo en el local. Sin pago online.",
    reservarOferta: "Reservar a precio de oferta",
    pasosLocal: ["Elige tu hora", "Ven al local", "Paga el precio de oferta"],
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
