// Textos de las páginas de funcionalidades y rubros, por mercado (D-025, WP-75).
import { market } from "@/config/brand";

import { paginas as clPaginas } from "./es-CL";
import { paginas as sePaginas } from "./sv-SE";
import type { PaginasCopy } from "./types";

export type {
  FuncionTexto,
  MockFila,
  PaginasCopy,
  Pregunta,
  RubroTexto,
} from "./types";

export const paginas: PaginasCopy = market === "SE" ? sePaginas : clPaginas;
