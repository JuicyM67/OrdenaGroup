import { describe, expect, it } from "vitest";

import { allBrandNames } from "@/config/brand";

import * as EsCl from "./es-CL";
import * as SvApp from "./sv-SE.app";

/** Leaf-texten och var i objektet den lever, för felmeddelanden som pekar
 * direkt på källan. */
interface Hoja {
  path: string;
  texto: string;
}

/** Samma trick som `sv-SE.test.ts`: en enda dummy räcker eftersom alla
 * funktioner i `sv-SE.app.ts` (som i `es-CL.ts`) tar ett enda objekt med
 * namngivna parametrar. */
const EXEMPEL = "Exempel";
const DUMMY_PARAM: Record<string, string> = new Proxy(
  {} as Record<string, string>,
  { get: () => EXEMPEL },
);

/** Nycklar vars VÄRDE är en teknisk kod (Meta-mallnamn/DB-kolumnpekare),
 * inte text som visas för en användare: `plantillasWhatsapp.*.nombre`,
 * `.categoria`, `.idioma` och `variables[].fuente`. Jämförs mot sista
 * segmentet i sökvägen. */
const TEKNISKA_NYCKLAR = new Set(["nombre", "categoria", "idioma", "fuente"]);

function sistaSegment(path: string): string {
  const utanIndex = path.replace(/\[\d+\]/g, "");
  const delar = utanIndex.split(".");
  return delar[delar.length - 1] ?? "";
}

function arTekniskKod(path: string): boolean {
  if (path.endsWith(".id")) return true;
  // CAJA_METODOS_MANUALES: lista med DB-koder ("cash", "card_terminal",
  // "transfer"), inte text för en användare.
  if (path.startsWith("SvApp.CAJA_METODOS_MANUALES")) return true;
  return TEKNISKA_NYCKLAR.has(sistaSegment(path));
}

function samlaHojor(varde: unknown, path: string, ut: Hoja[]): void {
  if (arTekniskKod(path)) return;
  if (typeof varde === "string") {
    ut.push({ path, texto: varde });
    return;
  }
  if (typeof varde === "function") {
    const fn = varde as (p: Record<string, string>) => unknown;
    // Funktioner som tar listor (t.ex. `intervalos`) klarar inte dummy-proxyn; de
    // täcks av typkontrollen mot es-CL i stället.
    let resultat: unknown;
    try {
      resultat = fn(DUMMY_PARAM);
    } catch {
      return;
    }
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
  // number/boolean ignoreras: inga textregler gäller dem.
}

const HOJOR: Hoja[] = [];
for (const [nyckel, varde] of Object.entries(SvApp)) {
  samlaHojor(varde, `SvApp.${nyckel}`, HOJOR);
}

describe("sv-SE.app: samma exporter som es-CL (kontrakt WP-M2)", () => {
  it("har exakt samma exportnamn som es-CL.ts (värde-exporter, Object.keys vid körning)", () => {
    expect(Object.keys(SvApp).sort()).toEqual(Object.keys(EsCl).sort());
  });
});

describe("sv-SE.app: inga tomma löv", () => {
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

describe("sv-SE.app: inga varumärkesnamn", () => {
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
 * "rutan"): annars gäller en enkel delsträng, som för "$". */
function forbjudetMonster(ord: string): RegExp {
  const escaped = ord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const bokstavsfras = /^[\w ]+$/.test(ord);
  return new RegExp(bokstavsfras ? `\\b${escaped}\\b` : escaped, "i");
}

describe("sv-SE.app: förbjudna ord (D-025/D-026/D-027/D-028: fel marknad eller fel kanal)", () => {
  const FORBJUDNA = [
    "WhatsApp",
    "Mercado Pago",
    "Flow",
    "abono",
    "pesos",
    "CLP",
    "RUT",
    "Santiago",
    "$",
  ];

  it.each(FORBJUDNA)("ingen text innehåller %s", (ord) => {
    const monster = forbjudetMonster(ord);
    const traffar = HOJOR.filter((h) => monster.test(h.texto)).map(
      (h) => h.path,
    );
    expect(traffar).toEqual([]);
  });
});

describe("sv-SE.app: koderna för telefonfel finns i båda markörerna", () => {
  it("errores.reserva.telefono har wrong_country bredvid not_chilean", () => {
    expect(SvApp.errores.reserva.telefono.wrong_country.length).toBeGreaterThan(
      0,
    );
    expect(SvApp.errores.reserva.telefono.not_chilean.length).toBeGreaterThan(
      0,
    );
  });

  it("validacion.telefonoNegocio y .telefonoCliente tienen wrong_country", () => {
    expect(
      SvApp.validacion.telefonoNegocio.wrong_country.length,
    ).toBeGreaterThan(0);
    expect(
      SvApp.validacion.telefonoCliente.wrong_country.length,
    ).toBeGreaterThan(0);
  });
});

describe("sv-SE.app: plantillasWhatsapp är sms utan knappar (D-028)", () => {
  it("ingen mall har knappar", () => {
    for (const [nombre, plantilla] of Object.entries(
      SvApp.plantillasWhatsapp,
    )) {
      expect(plantilla.botones, nombre).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------
// sms: varje meddelande ryms i ett enda sms (≤ 160 tecken). Långa, realistiska
// exempelvärden (längre företags-/tjänste-/kundnamn än en vanlig dummy), så
// att en mall som bara funkar med korta namn inte kommer igenom.
// ---------------------------------------------------------------------------

const EXEMPEL_SMS = {
  negocio: "Salong Nord och Söder",
  servicio: "Klippning och skäggtrimning",
  fecha: "fredag 2 oktober",
  hora: "15:00",
  link: "https://exempel.se/r/aB3xQ9Lm2P7k",
  cliente: "Erik Johansson",
  minutos: 15,
  pct: 20,
  codigo: "482913",
} as const;

describe("sv-SE.app: sms ryms i 160 tecken", () => {
  const meddelanden: Array<[string, string]> = [
    ["reservaConfirmada", SvApp.sms.reservaConfirmada({ ...EXEMPEL_SMS })],
    ["recordatorio", SvApp.sms.recordatorio({ ...EXEMPEL_SMS })],
    ["recordatorioHoy", SvApp.sms.recordatorioHoy({ ...EXEMPEL_SMS })],
    ["reservaMovida", SvApp.sms.reservaMovida({ ...EXEMPEL_SMS })],
    ["reservaCancelada", SvApp.sms.reservaCancelada({ ...EXEMPEL_SMS })],
    ["listaEsperaCupo", SvApp.sms.listaEsperaCupo({ ...EXEMPEL_SMS })],
    ["horaFlash", SvApp.sms.horaFlash({ ...EXEMPEL_SMS })],
    ["nuevaReservaDueno", SvApp.sms.nuevaReservaDueno({ ...EXEMPEL_SMS })],
    [
      "codigoAcceso",
      SvApp.sms.codigoAcceso({ codigo: EXEMPEL_SMS.codigo }),
    ],
  ];

  it.each(meddelanden)("%s ryms i 160 tecken", (_namn, text) => {
    expect(text.length).toBeLessThanOrEqual(160);
  });

  it("pie (avslutsraden) är kort", () => {
    expect(SvApp.sms.pie.length).toBeLessThanOrEqual(60);
  });
});
