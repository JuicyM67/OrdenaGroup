/** Erbjudanden (WP-70, D-056), svenska. Samma form som `es-CL.ofertas.ts`;
 * egen fil så att texterna inte hamnar i bokningssidans i18n-chunk. */
import type { ofertas as EsOfertas } from "./es-CL.ofertas";

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

export const ofertas: Widen<typeof EsOfertas> = {
  titulo: "Erbjudanden",
  nav: "Erbjudanden",
  subtitulo: "Sälj en tjänst som värdebevis och nå nya kunder i Upptäck.",
  nueva: "Nytt erbjudande",
  vacio: {
    titulo: "Nå nya kunder med ett erbjudande",
    texto:
      "Ett erbjudande är en av dina tjänster till ett lägre pris. Kunderna hittar det i Upptäck, köper ett värdebevis och bokar en tid hos dig.",
    pasos: {
      uno: "Välj en tjänst och sätt ett pris",
      dos: "Publicera när det är klart",
      tres: "Kunderna köper och bokar sin tid",
    },
    cta: "Skapa ditt första erbjudande",
    sinServicios: "Lägg först till en aktiv tjänst i Inställningar → Tjänster.",
    irServicios: "Gå till Tjänster",
  },
  lista: {
    titulo: "Dina erbjudanden",
    vendidos: (p: { n: number }): string => `${p.n} sålda`,
    vendidosDe: (p: { n: number; total: number }): string =>
      `${p.n} av ${p.total} sålda`,
    sinVentana: "Säljs tills vidare",
    ventana: (p: { desde: string; hasta: string }): string =>
      `${p.desde} – ${p.hasta}`,
    desde: (p: { fecha: string }): string => `Från ${p.fecha}`,
    hasta: (p: { fecha: string }): string => `Till och med ${p.fecha}`,
  },
  estado: {
    draft: "Utkast",
    published: "Publicerat",
    paused: "Pausat",
    ended: "Avslutat",
  },
  editor: {
    tituloNueva: "Nytt erbjudande",
    tituloEditar: "Redigera erbjudande",
    servicio: "Tjänst",
    servicioPlaceholder: "Välj tjänst",
    titulo: "Rubrik",
    tituloPlaceholder: "Klippning + inpackning + styling",
    descripcion: "Beskrivning",
    descripcionPlaceholder: "Berätta vad kunden får uppleva.",
    incluye: "Det här ingår",
    incluyePlaceholder: "T.ex. Konsultation och tvätt",
    agregarFila: "Lägg till rad",
    quitarFila: "Ta bort rad",
    condiciones: "Villkor",
    condicionesPlaceholder:
      "Gäller nya och befintliga kunder. Fri avbokning upp till 24 h före.",
    categoria: "Kategori",
    precio: "Erbjudandepris",
    precioOrdinario: (p: { precio: string }): string =>
      `Ordinarie pris ${p.precio}`,
    precioMinimo: (p: { precio: string }): string =>
      `Lägsta pris senaste 30 dagarna: ${p.precio}`,
    descuento: (p: { pct: number }): string => `${p.pct} % rabatt`,
    precioAyuda:
      "Rabatten räknas mot tjänstens lägsta pris de senaste 30 dagarna.",
    cantidad: "Antal att sälja",
    cantidadAyuda: "Lämna tomt för obegränsat.",
    ventanaDesde: "Säljs från",
    ventanaHasta: "Säljs till och med",
    limpiar: "Ta bort datum",
    validez: "Värdebevisets giltighet",
    meses: (p: { n: number }): string => `${p.n} månader`,
    imagen: "Bild",
    imagenAyuda: "JPG, PNG eller WebP, högst 5 MB.",
    subirImagen: "Ladda upp bild",
    cambiarImagen: "Byt bild",
    quitarImagen: "Ta bort bild",
    subiendo: "Laddar upp …",
    guardar: "Spara",
    guardando: "Sparar …",
    cancelar: "Avbryt",
    publicar: "Publicera",
    pausar: "Pausa",
    reanudar: "Publicera igen",
    verPublica: "Förhandsvisa",
    vistaPrevia: "Så ser kortet ut i Upptäck",
    soloDueno:
      "Bara ägaren kan publicera. Spara som utkast så publicerar ägaren.",
    publicadaSoloDueno: "Erbjudandet är publicerat. Bara ägaren kan ändra det.",
    guardado: "Sparat",
    precioBloqueado:
      "Medan erbjudandet visas, och 30 dagar efter, kan tjänstens pris inte höjas.",
  },
  errores: {
    "offers.service_required": "Välj en aktiv tjänst.",
    "offers.title_empty": "Skriv en rubrik.",
    "offers.title_too_long": "Rubriken får vara högst 80 tecken.",
    "offers.text_too_long": "Högst 1 000 tecken.",
    "offers.include_too_long": "Varje rad får vara högst 80 tecken.",
    "offers.includes_too_many": "Du kan lägga till högst 6 rader.",
    "offers.category_invalid": "Välj en kategori.",
    "offers.price_invalid": "Skriv ett giltigt pris.",
    "offers.price_not_below":
      "Erbjudandepriset måste vara lägre än tjänstens lägsta pris de senaste 30 dagarna.",
    "offers.price_raised_recently":
      "Tjänstens pris har höjts de senaste 30 dagarna. Du kan publicera när priset har gällt i 30 dagar.",
    "offers.service_price_locked":
      "Priset kan inte höjas medan tjänsten har ett publicerat erbjudande, och inte heller 30 dagar efter att erbjudandet avslutats. Det är prisinformationslagens regel om lägsta pris.",
    "offers.quantity_invalid": "Skriv ett antal mellan 1 och 10 000.",
    "offers.quantity_below_sold":
      "Antalet kan inte vara lägre än det som redan sålts.",
    "offers.date_invalid": "Välj ett giltigt datum.",
    "offers.sale_window_invalid":
      "Slutdatumet måste vara samma dag som eller efter startdatumet.",
    "offers.valid_months_invalid": "Välj giltighet.",
    "offers.image_type_invalid": "Ladda upp en bild i JPG, PNG eller WebP.",
    "offers.image_too_large": "Bilden får vara högst 5 MB.",
    "offers.image_missing": "Bilden hann inte laddas upp. Försök igen.",
    "offers.image_invalid": "Vi kunde inte spara bilden. Prova en annan.",
    "offers.upload_failed": "Vi kunde inte ladda upp bilden. Försök igen.",
    "offers.not_found": "Vi hittar inte erbjudandet. Ladda om sidan.",
    "offers.published_owner_only":
      "Erbjudandet är publicerat. Bara ägaren kan ändra det.",
    "offers.service_locked":
      "Tjänsten kan inte bytas på ett publicerat erbjudande – skapa ett nytt.",
    "offers.image_in_use":
      "Bilden används redan i ett annat erbjudande. Ladda upp en ny.",
    "offers.publish_owner_only": "Bara ägaren kan publicera.",
    plan_locked:
      "Din plan har inte erbjudanden. Se planerna för att låsa upp dem.",
    forbidden: "Du har inte behörighet att göra det här.",
    unauthorized: "Du har loggats ut. Logga in igen.",
    desconocido: "Något gick fel. Försök igen.",
  },
};
