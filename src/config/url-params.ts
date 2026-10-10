// Query-parametrar, värden och ankare i publika adresser, per marknad (samma mönster som
// `routes.ts`). CL behåller de spanska namnen; SE får svenska så att adressfältet inte
// visar spanska ord. Servern läser BÅDA varianterna (`readParam`) så att gamla spanska
// länkar fortsätter fungera på SE.
import { market } from "./brand";

type Dict = Record<string, string>;

/** Parameternamn: CL-namn -> SE-namn. */
const SE_PARAMS: Dict = {
  paso: "steg",
  resenas: "omdomen",
  pago: "betalning",
};

/** Värden: CL-värde -> SE-värde (gäller alla parametrar). */
const SE_VALUES: Dict = {
  datos: "uppgifter",
  cancelado: "avbruten",
  liberada: "frigjord",
};

/** Ankare (hash utan `#`): CL-id -> SE-id. */
const SE_ANCHORS: Dict = {
  resenas: "omdomen",
  "resenas-movil": "omdomen-mobil",
  "como-funciona": "sa-funkar-det",
  "para-quien": "for-vem",
  precios: "priser",
  preguntas: "fragor",
  comparar: "jamfor",
  "horas-flash": "flashtider",
  "link-reservas": "bokningslank",
  agenda: "kalender",
  hoy: "idag",
  "reservas-manuales": "manuella-bokningar",
  ajustes: "installningar",
  recordatorios: "paminnelser",
  "lista-espera": "vantelista",
  abono: "abonnemang",
  "fichas-clientes": "kundkort",
  reportes: "rapporter",
  "migracion-facil": "enkel-flytt",
};

const reverse = (d: Dict): Dict =>
  Object.fromEntries(Object.entries(d).map(([k, v]) => [v, k]));
const SE_VALUES_REV = reverse(SE_VALUES);

/** Parameternamn i den här installationens marknad. */
export function param(name: string): string {
  return market === "SE" ? (SE_PARAMS[name] ?? name) : name;
}

/** Parametervärde i den här installationens marknad. */
export function paramValue(value: string): string {
  return market === "SE" ? (SE_VALUES[value] ?? value) : value;
}

/** Ankar-id (utan `#`) i den här installationens marknad. */
export function anchor(id: string): string {
  return market === "SE" ? (SE_ANCHORS[id] ?? id) : id;
}

/** Läser en parameter (CL-namn) ur `searchParams`, accepterar både CL- och SE-namnet.
 * Värdet returneras normaliserat till CL-värdet. */
export function readParam(
  sp: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const raw = sp[name] ?? sp[SE_PARAMS[name] ?? name];
  if (typeof raw !== "string") return undefined;
  return SE_VALUES_REV[raw] ?? raw;
}

/** Bygger `?namn=värde` (båda översatta). */
export function queryString(name: string, value: string | number): string {
  return `?${param(name)}=${typeof value === "string" ? paramValue(value) : value}`;
}
