import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { email, plantillasWhatsapp, whatsappSesion } from "./es-CL";
import type { Plantilla } from "./es-CL";

const DOC_PATH = path.resolve(
  process.cwd(),
  "docs/content/whatsapp-templates.md",
);
const DOC = fs.readFileSync(DOC_PATH, "utf8");

const PLANTILLAS = Object.values(plantillasWhatsapp) as readonly Plantilla[];

const PALABRAS_DE_VENTA = /\b(descuento|oferta|gratis|promo)\b/i;
const SIMBOLO_PORCENTAJE = /%/;
const DIAS_RELATIVOS = /\b(mañana|hoy|pasado mañana)\b/i;

function variablesEnOrden(body: string): number[] {
  const encontradas = [...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) =>
    Number(m[1]),
  );
  return encontradas;
}

describe("plantillas de WhatsApp (Meta, fase 1)", () => {
  it("hay exactamente seis plantillas, todas UTILITY y en español", () => {
    expect(PLANTILLAS).toHaveLength(6);
    for (const plantilla of PLANTILLAS) {
      expect(plantilla.categoria, plantilla.nombre).toBe("UTILITY");
      expect(plantilla.idioma, plantilla.nombre).toBe("es");
    }
  });

  it("los nombres son los fijos de INTEGRATIONS.md §1", () => {
    const nombres = PLANTILLAS.map((p) => p.nombre).sort();
    expect(nombres).toEqual(
      [
        "lista_espera_oferta",
        "lista_espera_tomada",
        "recordatorio_24h",
        "reserva_cancelada",
        "reserva_confirmada",
        "reserva_movida",
      ].sort(),
    );
  });

  for (const plantilla of PLANTILLAS) {
    describe(plantilla.nombre, () => {
      it("el body mide entre 1 y 1024 caracteres (idealmente ≤ 300)", () => {
        expect(plantilla.body.length).toBeGreaterThan(0);
        expect(plantilla.body.length).toBeLessThanOrEqual(1024);
      });

      it("el body no empieza ni termina con una variable", () => {
        expect(plantilla.body.trimStart().startsWith("{{")).toBe(false);
        expect(plantilla.body.trimEnd().endsWith("}}")).toBe(false);
      });

      it("nunca hay dos variables una junto a la otra", () => {
        expect(plantilla.body).not.toMatch(/\{\{\d+\}\}\s*\{\{\d+\}\}/);
      });

      it("las variables del body están numeradas 1…n sin saltos", () => {
        const enBody = variablesEnOrden(plantilla.body);
        const esperado = plantilla.variables.map((v) => v.numero);
        expect(enBody).toEqual(esperado);
        expect(esperado).toEqual(
          Array.from({ length: esperado.length }, (_, i) => i + 1),
        );
      });

      it("cada variable tiene un ejemplo sin salto de línea", () => {
        for (const variable of plantilla.variables) {
          expect(
            variable.ejemplo.length,
            `#${variable.numero}`,
          ).toBeGreaterThan(0);
          expect(variable.ejemplo, `#${variable.numero}`).not.toMatch(/[\r\n]/);
        }
      });

      it("no hay palabras de venta ni el símbolo % en el body", () => {
        expect(PALABRAS_DE_VENTA.test(plantilla.body)).toBe(false);
        expect(SIMBOLO_PORCENTAJE.test(plantilla.body)).toBe(false);
      });

      it("el nombre del negocio (variable 1) está en la primera oración", () => {
        const primeraVariable = plantilla.variables[0];
        expect(primeraVariable?.significado).toMatch(/negocio/i);
        const primeraOracion = plantilla.body.split(".")[0] ?? "";
        expect(primeraOracion).toContain("{{1}}");
      });

      it("no menciona el nombre de la plataforma", () => {
        expect(plantilla.body).not.toMatch(/\bllena\b/i);
      });

      it("footer ≤ 60 caracteres si existe", () => {
        if (plantilla.footer !== null) {
          expect(plantilla.footer.length).toBeLessThanOrEqual(60);
        }
      });

      it("los botones respetan los límites de Meta", () => {
        for (const boton of plantilla.botones) {
          expect(boton.texto.length, boton.texto).toBeLessThanOrEqual(25);
          if (boton.tipo === "URL") {
            expect(boton.sufijo.ejemplo.length).toBeGreaterThan(0);
            expect(boton.sufijo.ejemplo).not.toMatch(/[\r\n]/);
          }
        }
      });

      it("tiene una nota que explica por qué es utility", () => {
        expect(plantilla.nota.length).toBeGreaterThan(0);
      });

      it("está sincronizada con docs/content/whatsapp-templates.md", () => {
        expect(DOC, `falta el nombre ${plantilla.nombre}`).toContain(
          `\`${plantilla.nombre}\``,
        );
        expect(
          DOC,
          `el body de ${plantilla.nombre} no está igual en el documento`,
        ).toContain(plantilla.body);
        for (const boton of plantilla.botones) {
          expect(
            DOC,
            `falta el botón "${boton.texto}" de ${plantilla.nombre}`,
          ).toContain(boton.texto);
        }
        for (const variable of plantilla.variables) {
          expect(
            DOC,
            `falta el ejemplo "${variable.ejemplo}" de ${plantilla.nombre}`,
          ).toContain(variable.ejemplo);
        }
      });
    });
  }

  it("recordatorio_24h nunca usa un día relativo (R7: horario de verano)", () => {
    const recordatorio = plantillasWhatsapp.recordatorio24h;
    expect(DIAS_RELATIVOS.test(recordatorio.body)).toBe(false);
  });

  it("los quick reply son exactamente los textos fijos de INTEGRATIONS.md", () => {
    const textosQuickReply = PLANTILLAS.flatMap((p) =>
      p.botones.filter((b) => b.tipo === "QUICK_REPLY").map((b) => b.texto),
    );
    expect(textosQuickReply.sort()).toEqual(
      ["Confirmo", "Necesito cambiar", "No, gracias", "Sí, la quiero"].sort(),
    );
  });

  it("las tres plantillas con botón URL están marcadas como pendientes de dominio (D-001)", () => {
    const conUrl = PLANTILLAS.filter((p) =>
      p.botones.some((b) => b.tipo === "URL"),
    );
    expect(conUrl.map((p) => p.nombre).sort()).toEqual(
      ["reserva_cancelada", "reserva_confirmada", "reserva_movida"].sort(),
    );
    for (const plantilla of conUrl) {
      for (const boton of plantilla.botones) {
        if (boton.tipo === "URL") {
          expect(boton.dominioPendiente, plantilla.nombre).toBe(true);
        }
      }
    }
  });

  it("el documento no incluye otras plantillas además de estas seis", () => {
    const nombresEnCodigo = new Set(PLANTILLAS.map((p) => p.nombre));
    // Las plantillas de fase 2 (marketing) y de autenticación no viven en
    // este documento: si alguien las agrega acá por error, esta prueba debe
    // fallar. Buscamos encabezados de nivel 2 con nombre entre backticks.
    const encabezados = [...DOC.matchAll(/^## \d+\. `([a-z0-9_]+)`/gm)].map(
      (m) => m[1],
    );
    for (const nombre of encabezados) {
      expect(nombresEnCodigo.has(nombre ?? ""), nombre).toBe(true);
    }
    expect(encabezados).toHaveLength(nombresEnCodigo.size);
  });
});

describe("mensajes de sesión (whatsappSesion)", () => {
  const muestras: string[] = [
    whatsappSesion.confirmo,
    whatsappSesion.necesitoCambiar({ linkGestion: "https://x.cl/r/abc123" }),
    whatsappSesion.listaEsperaConfirmada({
      servicio: "Corte + barba",
      fecha: "vie 2 oct",
      hora: "15:00",
    }),
    whatsappSesion.listaEsperaYaTomada,
    whatsappSesion.listaEsperaNoGracias,
    whatsappSesion.listaEsperaExpirada,
    whatsappSesion.noEntendido({ telefonoNegocio: "+56 9 1234 5678" }),
  ];

  it("cada mensaje mide 300 caracteres o menos", () => {
    for (const texto of muestras) {
      expect(texto.length, texto).toBeLessThanOrEqual(300);
    }
  });

  it("ningún mensaje usa un giro prohibido (usted, voseo, slang, anglicismos, emoji)", () => {
    const prohibido = [
      /\busted(es)?\b/i,
      /\b(podés|tenés|querés|sabés|reservá|elegí)\b/i,
      /\bpo\b/i,
      /\bwena\b/i,
      /\bbooking\b/i,
      /\bcheck-?in\b/i,
      /\p{Extended_Pictographic}/u,
    ];
    for (const texto of muestras) {
      for (const regex of prohibido) {
        expect(regex.test(texto), `${regex}: "${texto}"`).toBe(false);
      }
    }
  });

  it("ningún mensaje menciona el nombre de la plataforma", () => {
    for (const texto of muestras) {
      expect(/\bllena\b/i.test(texto), texto).toBe(false);
    }
  });
});

describe("correo (respaldo de WhatsApp, F7)", () => {
  const EMAIL_DOC = fs.readFileSync(
    path.resolve(process.cwd(), "docs/content/email-templates.md"),
    "utf8",
  );

  it("las cuatro notificaciones tienen asunto y cuerpo", () => {
    const eventos = [
      "reservaConfirmada",
      "recordatorio24h",
      "reservaCancelada",
      "reservaMovida",
    ] as const;
    for (const evento of eventos) {
      expect(typeof email[evento].asunto).toBe("function");
      expect(typeof email[evento].cuerpo).toBe("function");
    }
  });

  it("la confirmación incluye la política de cancelación (SERNAC)", () => {
    const cuerpo = email.reservaConfirmada.cuerpo({
      cliente: "Joaquín",
      negocio: "Barbería Norte",
      servicio: "Corte + barba",
      fecha: "vie 2 oct",
      hora: "15:00",
      profesional: "Diego",
      horasCancelacion: 4,
      linkGestion: "https://x.cl/r/abc123",
    });
    expect(cuerpo).toContain("4 h");
    expect(cuerpo).toContain("cancelarla");
  });

  it("el documento de correo no está vacío y menciona los cuatro eventos", () => {
    expect(EMAIL_DOC).toContain("Reserva confirmada");
    expect(EMAIL_DOC).toContain("Recordatorio 24");
    expect(EMAIL_DOC).toContain("Reserva cancelada");
    expect(EMAIL_DOC).toContain("Reserva movida");
  });
});
