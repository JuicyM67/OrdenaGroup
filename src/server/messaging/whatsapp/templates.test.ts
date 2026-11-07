import { describe, expect, it } from "vitest";

import { plantillasWhatsapp } from "@/i18n";

import { META_TEMPLATE_NAMES, type MetaTemplateName } from "./config";
import {
  buildTemplate,
  firstName,
  OUTBOX_TO_META,
  parseButtonPayload,
  sanitizeParam,
  type WhatsAppTemplateParams,
} from "./templates";

/**
 * Kontraktet (docs/content/whatsapp-templates.md / `plantillasWhatsapp`):
 * varje mall byggs med kontraktets EXEMPELVÄRDEN, och body-parametrarna
 * måste komma i exakt samma ordning som variablerna `{{1}}`, `{{2}}`…
 * Knapparna måste ha samma typer och ordning som i kontraktet.
 */

const CONTRACT = Object.values(plantillasWhatsapp);

function contractFor(name: MetaTemplateName) {
  const p = CONTRACT.find((x) => x.nombre === name);
  if (!p) throw new Error(`saknas i kontraktet: ${name}`);
  return p;
}

/** Varje mall med kontraktets exempel som indata. */
const EXAMPLES: { [N in MetaTemplateName]: WhatsAppTemplateParams[N] } = {
  reserva_confirmada: {
    negocio: "Barbería Norte",
    cliente: "Joaquín",
    servicio: "Corte + barba",
    fecha: "viernes 2 de octubre",
    hora: "15:00",
    profesional: "Diego",
    horasCancelacion: 4,
    token: "q3Zr8Kx1VbN0pT7wYc2LmA9sHd4GfJ6eRu5iOk-_XyW",
  },
  recordatorio_24h: {
    negocio: "Barbería Norte",
    cliente: "Joaquín",
    servicio: "Corte + barba",
    fecha: "viernes 2 de octubre",
    hora: "15:00",
  },
  reserva_cancelada: {
    negocio: "Barbería Norte",
    cliente: "Joaquín",
    fecha: "viernes 2 de octubre",
    hora: "15:00",
    slug: "barberia-norte",
  },
  reserva_movida: {
    negocio: "Barbería Norte",
    cliente: "Joaquín",
    fecha: "sábado 3 de octubre",
    hora: "11:30",
    profesional: "Diego",
    token: "q3Zr8Kx1VbN0pT7wYc2LmA9sHd4GfJ6eRu5iOk-_XyW",
  },
  lista_espera_oferta: {
    negocio: "Barbería Norte",
    cliente: "Joaquín",
    servicio: "Corte + barba",
    fecha: "viernes 2 de octubre",
    hora: "15:00",
    minutos: 15,
    startMs: Date.parse("2026-10-02T18:00:00Z"),
    offeredMs: Date.parse("2026-10-01T12:00:00Z"),
  },
  lista_espera_tomada: {
    negocio: "Barbería Norte",
    cliente: "Joaquín",
    fecha: "sábado 3 de octubre",
  },
};

function build(name: MetaTemplateName) {
  return buildTemplate(name, EXAMPLES[name] as never);
}

describe("mallkontraktet (parameterordning, språk, knappar)", () => {
  it("de sex Meta-namnen är exakt kontraktets", () => {
    expect([...META_TEMPLATE_NAMES].sort()).toEqual(
      CONTRACT.map((p) => p.nombre).sort(),
    );
    expect(Object.values(OUTBOX_TO_META).sort()).toEqual(
      [...META_TEMPLATE_NAMES].sort(),
    );
  });

  it.each([...META_TEMPLATE_NAMES])(
    "%s: body-parametrarna = kontraktets variabler i ordning",
    (name) => {
      const contract = contractFor(name);
      const msg = build(name);
      expect(msg.name).toBe(name);
      expect(msg.language).toEqual({ code: "es" });
      expect(contract.idioma).toBe("es");
      const bodyComp = msg.components.find((c) => c.type === "body");
      expect(bodyComp).toBeDefined();
      const values = bodyComp!.parameters.map((p) =>
        "text" in p ? p.text : "",
      );
      // Antalet {{n}} i body = antalet parametrar.
      const placeholders = contract.body.match(/\{\{\d+\}\}/g) ?? [];
      expect(values).toHaveLength(placeholders.length);
      expect(values).toEqual(contract.variables.map((v) => v.ejemplo));
      // Förhandsvisningen (body med parametrarna insatta) har inga hål kvar.
      let preview: string = contract.body;
      values.forEach((v, i) => {
        preview = preview.replace(`{{${i + 1}}}`, v);
      });
      expect(preview).not.toMatch(/\{\{\d+\}\}/);
    },
  );

  it.each([...META_TEMPLATE_NAMES])(
    "%s: knapparna har kontraktets typer och ordning",
    (name) => {
      const contract = contractFor(name);
      const buttons = build(name).components.filter((c) => c.type === "button");
      expect(buttons).toHaveLength(contract.botones.length);
      contract.botones.forEach((b, i) => {
        const comp = buttons[i]!;
        expect(comp.type).toBe("button");
        if (comp.type !== "button") return;
        expect(comp.index).toBe(String(i));
        if (b.tipo === "URL") {
          expect(comp.sub_type).toBe("url");
          expect(comp.parameters).toEqual([
            { type: "text", text: b.sufijo.ejemplo },
          ]);
        } else {
          expect(comp.sub_type).toBe("quick_reply");
        }
      });
    },
  );
});

describe("knapparnas payload", () => {
  it("recordatorio_24h: Confirmo/Necesito cambiar → confirmo/cambiar", () => {
    const [a, b] = build("recordatorio_24h").components.slice(1);
    expect(a).toMatchObject({ parameters: [{ payload: "confirmo" }] });
    expect(b).toMatchObject({ parameters: [{ payload: "cambiar" }] });
    expect(parseButtonPayload("confirmo")).toEqual({ action: "confirmo" });
    expect(parseButtonPayload("cambiar")).toEqual({ action: "cambiar" });
  });

  it("lista_espera_oferta: Sí bär start + erbjudandet, No bär erbjudandet (tur och retur)", () => {
    const [si, no] = build("lista_espera_oferta").components.slice(1);
    const siPayload =
      si?.type === "button" && si.sub_type === "quick_reply"
        ? si.parameters[0]!.payload
        : "";
    const noPayload =
      no?.type === "button" && no.sub_type === "quick_reply"
        ? no.parameters[0]!.payload
        : "";
    expect(parseButtonPayload(siPayload)).toEqual({
      action: "si",
      startMs: EXAMPLES.lista_espera_oferta.startMs,
      offeredMs: EXAMPLES.lista_espera_oferta.offeredMs,
    });
    expect(parseButtonPayload(noPayload)).toEqual({
      action: "no",
      offeredMs: EXAMPLES.lista_espera_oferta.offeredMs,
    });
  });

  it.each([
    undefined,
    null,
    42,
    "",
    "Confirmo",
    "si:abc:def",
    "si:1790000000",
    "no:",
    `si:${"9".repeat(80)}`,
    "booking:b0000000-0000-4000-8000-0000000000aa",
  ])("okänd payload %s → null (ignoreras)", (raw) => {
    expect(parseButtonPayload(raw)).toBeNull();
  });
});

describe("parametrarnas form", () => {
  it("radbrytningar/tabbar/många mellanslag tas bort (Metas regler), tomt → -", () => {
    expect(sanitizeParam("Corte\n+\tbarba")).toBe("Corte + barba");
    expect(sanitizeParam("Barbería     Norte")).toBe("Barbería Norte");
    expect(sanitizeParam("   ")).toBe("-");
    expect(sanitizeParam(4)).toBe("4");
    expect(sanitizeParam("x".repeat(2000))).toHaveLength(1000);
  });

  it("förnamn = första ordet av customers.name", () => {
    expect(firstName("Joaquín Pérez Soto")).toBe("Joaquín");
    expect(firstName("  Ana ")).toBe("Ana");
  });
});
