import { describe, expect, it } from "vitest";

import { smsLengthInfo } from "./gsm7";

describe("smsLengthInfo", () => {
  it("texto GSM-7 corto: 1 segmento, sin aviso", () => {
    const info = smsLengthInfo("Tu hora en Barberia Norte quedo confirmada.");
    expect(info.encoding).toBe("gsm7");
    expect(info.segments).toBe(1);
    expect(info.warning).toBeNull();
  });

  it("con tilde (í/ó/ú): fuerza UCS-2", () => {
    const info = smsLengthInfo("Tu código para entrar es 482913.");
    expect(info.encoding).toBe("ucs2");
  });

  it("é/à sí están en GSM-7", () => {
    const info = smsLengthInfo("Café à la carte");
    expect(info.encoding).toBe("gsm7");
  });

  it("sueco (å/ä/ö) está en GSM-7", () => {
    const info = smsLengthInfo(
      "Din tid hos Klipp & Skägg är bekräftad på Götgatan.",
    );
    expect(info.encoding).toBe("gsm7");
  });

  it("> 160 caracteres: avisa", () => {
    const info = smsLengthInfo("a".repeat(161));
    expect(info.warning).not.toBeNull();
    expect(info.warning).toContain("161");
  });

  it("<= 160 caracteres GSM-7: sin aviso, 1 segmento", () => {
    const info = smsLengthInfo("a".repeat(160));
    expect(info.warning).toBeNull();
    expect(info.segments).toBe(1);
  });

  it("161 caracteres GSM-7: 2 segmentos (153 por segmento)", () => {
    const info = smsLengthInfo("a".repeat(161));
    expect(info.encoding).toBe("gsm7");
    expect(info.segments).toBe(2);
  });

  it("71 caracteres UCS-2: 2 segmentos (67 por segmento)", () => {
    const info = smsLengthInfo("á".repeat(71));
    expect(info.encoding).toBe("ucs2");
    expect(info.segments).toBe(2);
  });

  it("texto vacío: 0 segmentos", () => {
    expect(smsLengthInfo("").segments).toBe(0);
  });
});
