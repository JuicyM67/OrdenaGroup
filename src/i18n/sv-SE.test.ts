import { describe, expect, it } from "vitest";

import { allBrandNames } from "@/config/brand";

import { svSE } from "./sv-SE";

/** Leaf-texten och var i objektet den lever, för felmeddelanden som pekar
 * direkt på källan. */
interface Hoja {
  path: string;
  texto: string;
}

/** Proxyn returnerar samma exempelsträng för vilken egenskap en funktion än
 * läser (`p.nombre`, `p.n`, `p.precio`…): den ger alltid ett giltigt,
 * icke-tomt resultat oavsett funktionens parameterform. Alla funktioner i
 * `svSE` (som i `es-CL.ts`) tar ett enda objekt med namngivna parametrar
 * (GUIA §4), så en enda generisk dummy räcker för alla. */
const EXEMPEL = "Exempel";
const DUMMY_PARAM: Record<string, string> = new Proxy(
  {} as Record<string, string>,
  { get: () => EXEMPEL },
);

function samlaHojor(varde: unknown, path: string, ut: Hoja[]): void {
  if (typeof varde === "string") {
    ut.push({ path, texto: varde });
    return;
  }
  if (typeof varde === "function") {
    const fn = varde as (p: Record<string, string>) => unknown;
    const resultat: unknown = fn(DUMMY_PARAM);
    if (typeof resultat === "string") {
      ut.push({ path: `${path}()`, texto: resultat });
    }
    return;
  }
  if (Array.isArray(varde)) {
    varde.forEach((v, i) => samlaHojor(v, `${path}[${i}]`, ut));
    return;
  }
  if (varde !== null && typeof varde === "object") {
    for (const [k, v] of Object.entries(varde)) {
      samlaHojor(v, path ? `${path}.${k}` : k, ut);
    }
  }
  // number/boolean (t.ex. `minutos`, `proximamente`) ignoreras: inga
  // textregler gäller dem.
}

const HOJOR: Hoja[] = [];
samlaHojor(svSE, "svSE", HOJOR);

describe("sv-SE: inga tomma hoppor", () => {
  it("har minst en hylla att kontrollera", () => {
    expect(HOJOR.length).toBeGreaterThan(50);
  });

  it("ingen textsträng är tom", () => {
    const tomma = HOJOR.filter((h) => h.texto.trim().length === 0).map(
      (h) => h.path,
    );
    expect(tomma).toEqual([]);
  });
});

describe("sv-SE: inga varumärkesnamn", () => {
  const monster = allBrandNames.map(
    (n) => new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
  );

  it("ingen text nämner något av namnen i src/config/brand.ts (hård regel 10)", () => {
    const traffar = HOJOR.filter((h) =>
      monster.some((m) => m.test(h.texto)),
    ).map((h) => h.path);
    expect(traffar).toEqual([]);
  });
});

/** `\b`-gränser för ord/fraser av bokstäver (så att t.ex. "RUT" inte träffar
 * "rutan", ett helt vanligt svenskt ord): annars gäller en enkel delsträng,
 * som för "$". */
function forbjudetMonster(ord: string): RegExp {
  const escaped = ord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const bokstavsfras = /^[\w ]+$/.test(ord);
  return new RegExp(bokstavsfras ? `\\b${escaped}\\b` : escaped, "i");
}

describe("sv-SE: förbjudna ord (D-026/D-027/D-028: fel marknad eller fel kanal)", () => {
  const FORBJUDNA = [
    "WhatsApp",
    "Mercado Pago",
    "Flow",
    "abono",
    "CLP",
    "RUT",
    "Santiago",
    "$",
  ];

  it.each(FORBJUDNA)("ingen text innehåller %s", (ord) => {
    const monster = forbjudetMonster(ord);
    // Tekniska id:n (samma som es-CL) visas aldrig och räknas inte.
    const traffar = HOJOR.filter(
      (h) => !h.path.endsWith(".id") && monster.test(h.texto),
    ).map(
      (h) => h.path,
    );
    expect(traffar).toEqual([]);
  });
});

describe("sv-SE: planerna har samma id:n som es-CL (kontrakt mot pricing.ts)", () => {
  it("PLANES har exakt gratis/emprende/equipo/local, i den ordningen", () => {
    expect(svSE.PLANES.map((p) => p.id)).toEqual([
      "gratis",
      "emprende",
      "equipo",
      "local",
    ]);
  });
});

describe("sv-SE: SITIO_PARA_INDUSTRIAS har samma id:n som es-CL", () => {
  it("samma fyra branscher, i samma ordning", () => {
    expect(svSE.SITIO_PARA_INDUSTRIAS.map((i) => i.id)).toEqual([
      "barberias",
      "peluquerias",
      "estetica",
      "kinesiologia",
    ]);
  });
});

describe("sv-SE: SITIO_FUNCIONALIDADES har samma id:n som es-CL", () => {
  it("samma tio id:n, i samma ordning (kontrakt mot funcionalidades/page.tsx: ICONS/PREVIEWS letar upp med dessa nycklar)", () => {
    expect(svSE.SITIO_FUNCIONALIDADES.map((s) => s.id)).toEqual([
      "link-reservas",
      "agenda",
      "hoy",
      "reservas-manuales",
      "ajustes",
      "recordatorios",
      "lista-espera",
      "abono",
      "fichas-clientes",
      "reportes",
    ]);
  });
});
