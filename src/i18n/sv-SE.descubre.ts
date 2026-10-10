/** Marknadsplatsen "Upptäck" (WP-68, D-056), svenska. Samma form som
 * `es-CL.descubre.ts`; egen fil så att texterna inte hamnar i bokningssidans
 * i18n-chunk. */
import type { descubre as EsDescubre } from "./es-CL.descubre";

type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends (...args: infer A) => infer R
        ? (...args: A) => Widen<R>
        : T extends readonly (infer U)[]
          ? readonly Widen<U>[]
          : T extends object
            ? { readonly [K in keyof T]: Widen<T[K]> }
            : T;

const erbjudanden = (n: number): string =>
  n === 1 ? "1 erbjudande" : `${n} erbjudanden`;

export const descubre: Widen<typeof EsDescubre> = {
  meta: {
    titulo: "Erbjudanden på skönhet och hälsa nära dig",
    descripcion:
      "Erbjudanden och lediga tider hos frisörer, barberare, nagelstudior, massörer och hudterapeuter – med verifierade recensioner från riktiga kunder.",
    categoria: (p: { categoria: string }): string =>
      `Erbjudanden på ${p.categoria.toLowerCase()} nära dig`,
    categoriaCiudad: (p: { categoria: string; ciudad: string }): string =>
      `Erbjudanden på ${p.categoria.toLowerCase()} på ${p.ciudad}`,
    categoriaDescripcion: (p: { categoria: string }): string =>
      `Erbjudanden på ${p.categoria.toLowerCase()} med verifierade recensioner. Jämför priser och boka nära dig.`,
    mapa: "Karta över erbjudanden",
    oferta: (p: { titulo: string; negocio: string }): string =>
      `${p.titulo} hos ${p.negocio}`,
  },
  nav: {
    descubre: "Upptäck",
    descubreMenu: "Upptäck erbjudanden",
    descubreTexto: "Erbjudanden och blixttider nära dig",
    lista: "Lista",
    mapa: "Karta",
    paraNegocios: "För företag",
    inicio: "Start",
    vistas: "Visning",
  },
  hero: {
    titulo: "Skönhet och hälsa,",
    destacado: "billigare nära dig",
    tituloCorto: "Erbjudanden",
    destacadoCorto: "nära dig",
    bajada:
      "Erbjudanden och lediga tider från salonger med verifierade recensioner.",
    foto: "Frisörstol i dagsljus",
  },
  buscar: {
    label: "Sök",
    placeholder: "Behandling, salong eller stad",
    boton: "Sök",
    limpiar: "Rensa sökningen",
  },
  ubicacion: {
    miPosicion: "Min position",
    cercaDeTi: "Nära dig",
    todas: "Alla orter",
    elegir: "Välj ort",
    cargando: "Hämtar din position…",
    denegada: "Vi kunde inte hämta din position. Välj ort i stället.",
    quitar: "Sluta använda min position",
    nota: "Din position stannar i webbläsaren (ca 1 km noggrannhet) och glöms efter 30 minuter.",
  },
  categorias: {
    label: "Kategorier",
    todas: "Alla",
    nombres: {
      har: "Hår",
      naglar: "Naglar",
      massage: "Massage",
      hudvard: "Hudvård",
      fransar: "Fransar & bryn",
      ovrigt: "Övrigt",
    },
    total: (p: { n: number }): string => erbjudanden(p.n),
  },
  flash: {
    titulo: "Blixttider idag",
    verTodas: "Visa alla",
    label: "Dagens blixttider",
    precioAntes: "Tidigare pris",
  },
  lista: {
    tituloCerca: "Populärt nära dig",
    titulo: "Erbjudanden",
    resultados: (p: { n: number }): string => erbjudanden(p.n),
    resultadosKm: (p: { n: number; km: number }): string =>
      `${erbjudanden(p.n)} inom ${p.km} km`,
    vacioTitulo: "Inga erbjudanden här än",
    vacioTexto: "Prova en annan kategori, en annan ort eller rensa filtren.",
    ver: "Visa",
    anterior: "Föregående",
    siguiente: "Nästa",
    pagina: (p: { n: number; total: number }): string =>
      `Sida ${p.n} av ${p.total}`,
    ranking:
      "Så sorterar vi: närmast först (om du delar din position), sedan nyast. Alla recensioner kommer från genomförda bokningar.",
  },
  filtros: {
    titulo: "Filter",
    distancia: "Avstånd",
    distanciaSinPosicion: "Dela din position för att filtrera på avstånd.",
    km: (p: { km: number }): string => `${p.km} km`,
    mostrar: "Visa",
    soloFlash: "Bara blixttider idag",
    rating: "Betyg 4,5 eller högre",
    ordenar: "Sortera",
    ordenes: {
      near: "Närmast först",
      new: "Nyast",
      price: "Lägst pris",
      discount: "Störst rabatt",
    },
    aplicar: "Visa resultat",
    limpiar: "Rensa filter",
    abrir: "Filter",
  },
  tarjeta: {
    descuento: (p: { pct: number }): string => `−${p.pct} %`,
    flash: (p: { hora: string }): string => `Blixttid ${p.hora}`,
    resenas: (p: { n: number }): string => `(${p.n})`,
    km: (p: { km: string }): string => `${p.km} km`,
    precioAntes: "Ordinarie pris",
    precioOferta: "Erbjudandepris",
    nota: (p: { nota: string }): string => `Betyg ${p.nota} av 5`,
  },
  oferta: {
    volver: "Tillbaka",
    ahorra: (p: { pct: number }): string => `Spara ${p.pct} %`,
    eyebrow: (p: { categoria: string }): string =>
      `${p.categoria} · Erbjudande`,
    verificadas: (p: { n: number }): string =>
      p.n === 1 ? "1 verifierad recension" : `${p.n} verifierade recensioner`,
    incluye: "Det här ingår",
    comoFunciona: "Så funkar det",
    pasos: [
      "Köp värdebeviset",
      "Välj tid direkt eller senare",
      "Kom in och njut",
    ],
    validez: (p: { meses: number }): string => `Giltigt i ${p.meses} månader.`,
    duracion: (p: { duracion: string }): string => `Tar ca ${p.duracion}.`,
    condiciones: "Villkor",
    resenas: "Recensioner",
    verificada: "Verifierad bokning",
    respuesta: "Svar från salongen:",
    vendidoPor: "Säljs av",
    proximamente: "Köpet öppnar snart",
    proximamenteTexto:
      "Snart kan du köpa erbjudandet här och välja tid direkt. Till dess kan du boka hos salongen till ordinarie pris.",
    verHoras: "Se lediga tider",
    masDe: (p: { negocio: string }): string =>
      `Fler erbjudanden från ${p.negocio}`,
    precioNormal: "Ordinarie pris",
    mapa: "© OpenStreetMap",
  },
  mapa: {
    titulo: "Karta",
    buscarEn: (p: { zona: string }): string => `Sök på ${p.zona}`,
    buscarCerca: "Sök nära dig",
    aqui: (p: { n: number }): string => `${erbjudanden(p.n)} här`,
    verLista: "Visa lista",
    hoy: "Idag",
    cargando: "Laddar kartan…",
    error: "Kartan kunde inte laddas. Prova listan.",
    atribucion: "© OpenStreetMap · OpenFreeMap",
    tuPosicion: "Din position",
    sinUbicacion: (p: { n: number }): string =>
      `${erbjudanden(p.n)} saknar plats på kartan`,
  },
  tabs: {
    label: "Meny",
    descubre: "Upptäck",
    mapa: "Karta",
    negocios: "Företag",
  },
  migas: {
    label: "Du är här",
    inicio: "Start",
  },
};
