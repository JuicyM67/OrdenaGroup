import { describe, expect, it } from "vitest";

import { importSelectionSchema } from "@/lib/validation/import";
import { ajustesServiceInputSchema } from "@/server/owner/ajustes-schemas";

import { extractionSchema } from "./extraction-schema";
import { fakeExtraction } from "./fixtures";
import { IMPORT_ALLOWED_DOMAINS, importUrlSchema } from "./platforms";
import { toPreview } from "./preview";

describe("importUrlSchema (allowlist)", () => {
  it.each([
    ["https://www.fresha.com/a/barberia-santiago-abc", "fresha"],
    ["fresha.com/a/x", "fresha"],
    ["https://booksy.com/es-cl/1234_barberia", "booksy"],
    ["https://elroble.agendapro.com/cl", "agendapro"],
    ["https://reservo.cl/elroble#tab", "reservo"],
  ])("godtar %s", (raw, key) => {
    const r = importUrlSchema.safeParse(raw);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.platform.key).toBe(key);
      expect(r.data.url.startsWith("https://")).toBe(true);
      expect(r.data.url.includes("#")).toBe(false);
    }
  });

  it.each([
    ["http://www.fresha.com/a/x", "import.url_invalid"],
    ["https://user:pw@fresha.com/x", "import.url_invalid"],
    ["https://fresha.com:8443/x", "import.url_invalid"],
    ["inte en länk med mellanslag", "import.url_invalid"],
    ["", "import.url_invalid"],
    ["https://example.com/salong", "import.platform_unsupported"],
    ["https://reservo.cl.evil.com/x", "import.platform_unsupported"],
    ["https://evilreservo.cl/x", "import.platform_unsupported"],
    // Svenska plattformar finns inte längre i listan (D-062).
    ["https://www.bokadirekt.se/places/x", "import.platform_unsupported"],
    ["https://127.0.0.1/x", "import.platform_unsupported"],
  ])("avvisar %s", (raw, code) => {
    const r = importUrlSchema.safeParse(raw);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe(code);
  });

  it("allowed_domains är rena värdnamn", () => {
    for (const d of IMPORT_ALLOWED_DOMAINS) {
      expect(d).toMatch(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/);
    }
  });
});

describe("toPreview (extraktion → förhandsgranskning → import)", () => {
  it("fixturerna följer extraktionsschemat", () => {
    expect(extractionSchema.safeParse(fakeExtraction()).success).toBe(true);
  });

  it("sanerar, kompletterar veckan och markerar dubbletter", () => {
    const e = fakeExtraction();
    e.services.push({ ...e.services[1]!, name: "  corte fade " });
    e.services.push({
      name: "Asesoría de estilo",
      description: "Conversamos sobre el corte que quieres.",
      durationMin: null,
      price: null,
      priceFrom: false,
      category: null,
    });
    e.images.logoUrl = "https://elroble.example/logo.png";
    e.hours = [
      { weekday: 1, open: true, start: "09:00", end: "18:00" },
      { weekday: 2, open: true, start: "18:00", end: "09:00" },
      { weekday: 9, open: true, start: "09:00", end: "18:00" },
    ];
    const p = toPreview(e, "AgendaPro", {
      services: ["CORTE CLÁSICO"],
      staff: ["nico"],
    });
    expect(p.platformName).toBe("AgendaPro");
    expect(
      p.services.filter((s) => s.name.toLowerCase() === "corte fade"),
    ).toHaveLength(1);
    expect(p.services.find((s) => s.name === "Corte clásico")?.exists).toBe(
      true,
    );
    expect(p.staff.find((s) => s.name === "Nico")?.exists).toBe(true);
    expect(p.hours).toHaveLength(7);
    expect(p.hours[0]).toEqual({
      weekday: 1,
      open: true,
      start: "09:00",
      end: "18:00",
    });
    expect(p.hours[1]?.open).toBe(false);
    const asesoria = p.services.find((s) => s.name === "Asesoría de estilo");
    expect(asesoria?.durationMin).toBe("");
    expect(asesoria?.price).toBe("");
    expect(p.categories).toContain("Barba");
    expect(p.profile.category).toBe("barberia");
    expect(p.images.logoUrl).toMatch(/^https:/);
  });

  it("en förvald tjänst passerar urvalsschemat och Ajustes tjänsteschema", () => {
    const p = toPreview(fakeExtraction(), null);
    const sel = importSelectionSchema.parse({
      profile: { about: p.profile.about, instagram: p.profile.instagram },
      hours: p.hours,
      services: p.services.map((s) => ({
        name: s.name,
        description: s.description,
        durationMin: s.durationMin,
        price: s.price,
        category: s.category,
      })),
      staff: p.staff.map((s) => ({ name: s.name, title: s.title })),
    });
    for (const s of sel.services) {
      const r = ajustesServiceInputSchema.safeParse({
        name: s.name,
        durationMin: s.durationMin,
        priceClp: s.price,
        bufferAfterMin: 0,
        description: s.description,
      });
      expect(r.success, s.name).toBe(true);
    }
  });
});
