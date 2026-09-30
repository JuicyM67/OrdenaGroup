/**
 * Inloggningstexter per marknad (D-025/D-026). Inloggningssidorna importerar härifrån i
 * stället för `acceso`/`comun` direkt, så att marknad SE får svenska. Namngivna
 * importer (inte `import * as`) så att bundlern kan rensa bort resten av es-CL.
 */
import { market } from "@/config/brand";

import {
  acceso as accesoEs,
  comun,
  invitacionNegocio as invitacionNegocioEs,
} from "./es-CL";
import {
  acceso as accesoSv,
  algoSalioMal as algoSalioMalSv,
  invitacionNegocio as invitacionNegocioSv,
  type AccesoCopy,
} from "./sv-SE.auth";

export const acceso: AccesoCopy = market === "SE" ? accesoSv : accesoEs;

export const algoSalioMal: string =
  market === "SE" ? algoSalioMalSv : comun.algoSalioMal;

export const invitacionNegocio =
  market === "SE" ? invitacionNegocioSv : invitacionNegocioEs;
