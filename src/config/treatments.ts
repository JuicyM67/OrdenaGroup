// Behandlingslistan (WP-85, D-070, port av SE:s D-073): nivå 2 under Descubres 16
// huvudkategorier. Egna ord (vanliga chilenska söktermer, utan accenter i sökorden).
// Används för kategoriförslagen i Ajustes (`suggestCategories`), sökningens förslag
// ("¿Qué quieres reservar?") och senare egna behandlingssidor. Inga texter i UI:t
// kommer härifrån utom behandlingsnamnen själva. Sökorden väljs så att den längsta
// frasen vinner: "limpieza facial" (Estética) före "limpieza" (Limpieza y hogar),
// "masaje de manos" (Uñas) före "masaje" (Masajes).
import type { MarketplaceCategoryId } from "./marketplace";

export type Treatment = {
  /** Stabil slug (senare `/descubre/<behandling>/<comuna>`). */
  readonly slug: string;
  readonly name: string;
  readonly category: MarketplaceCategoryId;
  /** Normaliserade ordstammar som matchar i början av ett ord (se `normalize`). */
  readonly keywords: readonly string[];
};

/** [namn, ...extra sökord]. Namnet blir alltid ett sökord. */
type Row = readonly [string, ...string[]];

const ROWS: Readonly<Partial<Record<MarketplaceCategoryId, readonly Row[]>>> = {
  har: [
    ["Corte de pelo", "corte", "corte de cabello"],
    ["Corte dama", "corte mujer"],
    ["Corte hombre", "corte varon"],
    ["Corte infantil", "corte nino", "corte nina"],
    ["Chasquilla", "flequillo"],
    ["Color", "tintura", "tinte", "coloracion", "retoque de raiz"],
    ["Mechas", "reflejos", "visos"],
    ["Balayage"],
    ["Babylights"],
    ["Matiz", "matizado"],
    ["Decoloración", "decolorar"],
    ["Permanente", "ondulado permanente"],
    ["Alisado", "alisado permanente", "keratina", "alisado brasileno"],
    ["Botox capilar"],
    ["Olaplex"],
    ["Extensiones de pelo", "extensiones de cabello"],
    ["Peinado", "peinado de novia", "peinado de fiesta"],
    ["Brushing", "secado", "lavado y brushing", "lavado de pelo"],
    [
      "Tratamiento capilar",
      "hidratacion capilar",
      "nutricion capilar",
      "ampolla",
    ],
    ["Tratamiento de cuero cabelludo", "cuero cabelludo"],
    ["Ondas", "rulos"],
    ["Peluquería", "peluquero", "peluquera", "estilista"],
  ],
  barberare: [
    ["Perfilado de barba", "perfilado", "barba"],
    ["Corte de barba", "arreglo de barba"],
    ["Afeitado", "afeitado clasico", "afeitado con navaja", "toalla caliente"],
    ["Degradado", "fade", "skin fade", "low fade", "taper"],
    ["Corte y barba", "corte barba"],
    ["Tinte de barba", "color de barba"],
    ["Barbería", "barbero", "barber"],
  ],
  naglar: [
    ["Manicure", "manicura"],
    ["Pedicure", "pedicura"],
    [
      "Esmaltado permanente",
      "esmalte permanente",
      "semipermanente",
      "esmaltado en gel",
    ],
    ["Esmaltado tradicional", "esmaltado"],
    ["Uñas acrílicas", "acrilicas", "acrilico"],
    ["Uñas de gel", "unas esculpidas", "polygel", "soft gel"],
    ["Kapping", "capping", "bano de gel"],
    ["Manicure francesa", "francesa"],
    ["Nail art", "decoracion de unas", "diseno de unas"],
    ["Retiro de esmalte", "retiro de acrilico", "retiro de gel"],
    ["Mantención de uñas", "mantencion de acrilico", "mantencion de unas"],
    ["Masaje de manos", "masaje de manos y pies"],
    ["Pedicure spa", "manicure spa"],
    ["Uñas", "unas"],
  ],
  fransar: [
    [
      "Extensiones de pestañas",
      "extensiones clasicas",
      "pelo a pelo",
      "pestanas",
    ],
    ["Volumen ruso", "mega volumen", "pestanas volumen"],
    ["Lifting de pestañas", "lash lifting", "lash lift"],
    ["Tinte de pestañas"],
    ["Laminado de cejas", "laminado", "brow lamination"],
    ["Diseño de cejas", "perfilado de cejas", "depilacion de cejas", "cejas"],
    ["Tinte de cejas", "henna", "cejas con henna"],
    ["Depilación con hilo", "threading"],
    ["Microblading"],
    ["Microshading", "powder brows", "cejas efecto polvo"],
  ],
  hudvard: [
    ["Limpieza facial", "limpieza facial profunda", "facial"],
    ["Hidratación facial", "hidratacion"],
    ["Peeling", "peeling quimico", "peeling facial", "exfoliacion facial"],
    ["Microdermoabrasión", "punta de diamante"],
    ["Dermapen", "microneedling", "microagujas"],
    ["Hydrafacial", "hydra facial"],
    ["Radiofrecuencia"],
    ["HIFU"],
    ["Tratamiento de acné", "acne"],
    ["Tratamiento de manchas", "manchas", "despigmentacion"],
    ["Rosácea"],
    ["Dermaplaning"],
    ["Luz LED", "led", "fototerapia"],
    ["Lifting facial"],
    ["Tratamiento reductivo", "reductor", "celulitis", "moldeador"],
    ["Estética", "cosmetologia", "cosmetologa"],
  ],
  skonhet: [
    ["Maquillaje", "make up", "makeup", "maquillaje social"],
    ["Maquillaje de novia", "maquillaje novia"],
    ["Maquillaje de fiesta", "maquillaje de noche"],
    ["Depilación con cera", "cera", "depilacion"],
    ["Depilación láser", "laser", "depilacion definitiva"],
    ["Depilación de rebaje", "rebaje", "brasilera", "bikini"],
    ["Bronceado", "spray tan", "autobronceante"],
    ["IPL"],
    ["Ácido hialurónico", "relleno de labios", "rellenos"],
    ["Botox", "toxina botulinica"],
    ["Skinbooster"],
    [
      "Maquillaje permanente",
      "micropigmentacion",
      "dermopigmentacion",
      "tatuaje cosmetico",
    ],
    ["Labios efecto acuarela", "lip blush", "micropigmentacion de labios"],
    ["Delineado permanente", "eyeliner"],
    ["Blanqueamiento dental"],
  ],
  massage: [
    ["Masaje relajante", "masaje", "masajes", "relajante"],
    ["Masaje descontracturante", "descontracturante"],
    ["Masaje deportivo"],
    ["Masaje de tejido profundo", "tejido profundo"],
    ["Masaje tailandés", "tailandes", "thai"],
    ["Masaje para embarazadas", "prenatal", "embarazada"],
    ["Piedras calientes", "masaje con piedras", "hot stone"],
    ["Aromaterapia"],
    ["Drenaje linfático", "drenaje", "linfatico"],
    ["Masaje de pies", "masaje podal"],
    ["Masaje facial"],
    ["Ventosas", "ventosaterapia", "cupping"],
    ["Masaje sueco"],
    ["Quiromasaje"],
  ],
  spa: [
    ["Spa", "dia de spa", "circuito spa"],
    ["Spa en pareja", "spa para dos"],
    ["Head spa"],
    ["Envoltura corporal", "envoltura", "fangoterapia", "chocolaterapia"],
    ["Exfoliación corporal", "exfoliacion"],
    ["Sauna"],
    ["Tinajas", "tinaja", "hot tub"],
    ["Hidromasaje", "jacuzzi"],
  ],
  halsa: [
    ["Kinesiología", "kinesiologo", "kinesiologa", "kine"],
    ["Rehabilitación", "rehab"],
    ["Fisioterapia", "fisioterapeuta"],
    ["Quiropraxia", "quiropractico"],
    ["Osteopatía", "osteopata"],
    ["Acupuntura"],
    ["Podología", "podologa", "podologo"],
    ["Nutricionista", "nutricion", "consulta nutricional"],
    ["Psicología", "psicologo", "psicologa", "psicoterapia"],
    ["Fonoaudiología", "fonoaudiologo", "fonoaudiologa"],
    ["Terapia ocupacional"],
    ["Matrona"],
    ["Masaje terapéutico", "masaje kinesico"],
    ["Examen visual", "optica", "optometria"],
    ["Dentista", "odontologia", "odontologo", "odontologa"],
  ],
  holistiskt: [
    ["Reiki"],
    ["Biomagnetismo", "par biomagnetico"],
    ["Reflexología", "reflexologia podal"],
    ["Flores de Bach", "terapia floral"],
    ["Constelaciones familiares", "constelaciones"],
    ["Tarot", "lectura de tarot"],
    ["Registros akáshicos"],
    ["Meditación", "mindfulness"],
    ["Cuencos tibetanos", "bano de sonido", "sonoterapia"],
    ["Ayurveda"],
    ["Coaching", "coach"],
    ["Hipnosis", "hipnoterapia"],
    ["Respiración consciente", "breathwork"],
    ["Sanación energética", "sanacion"],
    ["Acupresión", "digitopuntura"],
    ["Terapias holísticas", "holistica", "holistico"],
  ],
  traning: [
    [
      "Entrenamiento personal",
      "personal trainer",
      "entrenador",
      "entrenadora",
      "pt",
    ],
    ["Yoga", "hatha", "vinyasa", "yin yoga", "yoga prenatal"],
    ["Pilates", "pilates reformer", "reformer"],
    ["Clases grupales", "clase grupal"],
    ["Entrenamiento funcional", "funcional"],
    ["Plan de entrenamiento", "rutina"],
    ["Running", "running coach", "trote"],
    ["Crossfit"],
    ["Baile", "zumba", "clase de baile"],
    ["Elongación", "stretching"],
    ["Boxeo"],
    ["Calistenia"],
    ["Entrenamiento"],
  ],
  tatuering: [
    ["Tatuaje", "tatuajes", "tattoo", "tatuar"],
    ["Remoción de tatuajes", "remocion de tatuaje", "borrado de tatuaje"],
    ["Piercing", "perforacion"],
    ["Perforación de orejas", "aros", "perforacion de lobulo"],
    ["Cover up", "coverup"],
    ["Retoque de tatuaje"],
  ],
  djur: [
    ["Peluquería canina", "peluqueria de mascotas", "grooming"],
    ["Baño de mascotas", "bano de perro", "bano canino"],
    ["Corte de uñas a mascotas", "corte de unas perro", "corte de unas gato"],
    ["Deslanado", "corte de pelo perro", "corte perro"],
    ["Peluquería felina", "gato", "gatos"],
    ["Guardería canina", "guarderia", "paseo de perros", "paseador"],
    [
      "Adiestramiento canino",
      "adiestramiento",
      "adiestrador",
      "educacion canina",
    ],
    ["Veterinaria", "veterinario", "vacunacion mascota"],
    ["Mascotas", "mascota", "perro", "perros"],
  ],
  stad: [
    ["Limpieza de hogar", "limpieza", "aseo", "aseo de hogar"],
    ["Limpieza post mudanza"],
    ["Limpieza de oficinas", "oficinas"],
    ["Limpieza post obra", "post obra"],
    ["Limpieza de vidrios", "vidrios", "ventanas"],
    [
      "Limpieza de alfombras",
      "alfombras",
      "tapices",
      "lavado de tapiz",
      "limpieza de sillones",
    ],
    ["Mudanzas", "mudanza", "flete", "fletes"],
    ["Jardinería", "jardin", "corte de pasto", "pasto"],
    ["Lavado de paneles solares", "paneles solares"],
    ["Hidrolavado", "lavado a presion"],
    ["Gasfitería", "gasfiter"],
    ["Electricista"],
    ["Control de plagas", "fumigacion", "sanitizacion"],
    ["Planchado"],
    ["Asesora del hogar", "nana"],
  ],
  fordon: [
    [
      "Lavado de autos",
      "lavado de auto",
      "lavado de vehiculo",
      "car wash",
      "autolavado",
    ],
    ["Detailing", "detallado", "auto detailing"],
    ["Pulido", "pulido de auto", "encerado"],
    ["Tratamiento cerámico", "ceramico", "proteccion de pintura"],
    ["Limpieza interior de auto", "limpieza interior", "tapiz de auto"],
    [
      "Neumáticos",
      "cambio de neumaticos",
      "vulcanizacion",
      "alineacion",
      "balanceo",
    ],
    ["Mantención de auto", "cambio de aceite", "mecanico", "taller mecanico"],
    ["Polarizado", "laminas de seguridad"],
    ["Desabolladura y pintura", "desabolladura"],
    ["Mantención de bicicletas", "bicicleta", "bicicletas"],
  ],
};

/** Gemener, utan accenter (á/é/ñ blir a/e/n), allt annat än bokstäver/siffror blir mellanslag. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(name: string): string {
  return normalize(name).replace(/ /g, "-");
}

export const TREATMENTS: readonly Treatment[] = (
  Object.entries(ROWS) as [MarketplaceCategoryId, readonly Row[]][]
).flatMap(([category, rows]) =>
  rows.map(([name, ...extra]) => ({
    slug: slugify(name),
    name,
    category,
    keywords: [...new Set([name, ...extra].map(normalize))],
  })),
);

/** Alla (behandling, sökord)-par, längsta sökordet först. */
const BY_LENGTH: readonly { treatment: Treatment; keyword: string }[] =
  TREATMENTS.flatMap((treatment) =>
    treatment.keywords.map((keyword) => ({ treatment, keyword })),
  ).sort((a, b) => b.keyword.length - a.keyword.length);

/** Behandlingarna som en text (tjänstens eller tjänstegruppens namn) nämner.
 * Sökordet måste börja ett ord (så att "handmassage" i en manikyr inte ger
 * Massage, men "Klassisk massage 60 min" gör det). Längsta frasen vinner och
 * dess ord räknas inte igen ("Kosmetisk tatuering" ger Skönhet, inte också
 * Tatuering). */
export function treatmentsIn(text: string): Treatment[] {
  let rest = ` ${normalize(text)} `;
  if (!rest.trim()) return [];
  const found: Treatment[] = [];
  for (const { treatment, keyword } of BY_LENGTH) {
    const i = rest.indexOf(` ${keyword}`);
    if (i === -1) continue;
    if (!found.includes(treatment)) found.push(treatment);
    // Släck ordet/orden som matchade (till nästa mellanslag).
    const endOfWord = rest.indexOf(" ", i + 1 + keyword.length);
    rest = `${rest.slice(0, i)} ${" ".repeat(endOfWord - i - 1)}${rest.slice(endOfWord)}`;
  }
  return found;
}

/** Föreslagna extra kategorier (D-070) ur företagets tjänst- och
 * tjänstegruppnamn: varje kategori som minst en text nämner, utom
 * huvudkategorin och `ovrigt`, i visningsordningen från `order`. Föreslås bara —
 * ägaren bekräftar i Inställningar innan något gäller. */
export function suggestCategories(
  texts: readonly string[],
  main: MarketplaceCategoryId,
  order: readonly MarketplaceCategoryId[],
): MarketplaceCategoryId[] {
  const found = new Set<MarketplaceCategoryId>();
  for (const text of texts) {
    for (const t of treatmentsIn(text)) found.add(t.category);
  }
  found.delete(main);
  found.delete("ovrigt");
  return order.filter((id) => found.has(id));
}
