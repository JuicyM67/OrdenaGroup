/**
 * Inloggningstexter. Inloggningssidorna importerar härifrån i stället för
 * `acceso`/`comun` direkt. Namngivna importer (inte `import * as`) så att
 * bundlern kan rensa bort resten av es-CL.
 */
import {
  acceso as accesoEs,
  comun,
  invitacionNegocio as invitacionNegocioEs,
} from "./es-CL";

export type AccesoCopy = typeof accesoEs;

export const acceso: AccesoCopy = accesoEs;

export const algoSalioMal: string = comun.algoSalioMal;

export const invitacionNegocio = invitacionNegocioEs;
