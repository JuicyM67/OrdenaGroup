import { describe, expect, it } from "vitest";

import { initialsOf } from "./initials";

describe("initialsOf (Avatar)", () => {
  it.each([
    ["Camila R.", "CR"],
    ["Barbería Norte", "BN"],
    ["camila rojas", "CR"],
    ["María José Pérez", "MP"],
    ["  Diego   Soto  ", "DS"],
    ["Ana\tMaría\nLópez", "AL"],
  ])("%j → %s", (name, expected) => {
    expect(initialsOf(name)).toBe(expected);
  });

  it("behåller accenter och ñ som versaler", () => {
    expect(initialsOf("álvaro ñuñez")).toBe("ÁÑ");
    expect(initialsOf("Óscar Úbeda")).toBe("ÓÚ");
  });

  it("NFD-indata (kombinerande accent) ger samma resultat som NFC", () => {
    const nfd = "Álvaro Ñuñez";
    expect(initialsOf(nfd)).toBe("ÁÑ");
    expect(initialsOf(nfd).normalize("NFC")).toBe(initialsOf(nfd));
  });

  it("hoppar över partiklar (de, del, la, los, y) när det finns andra ord", () => {
    expect(initialsOf("Barbería de la Esquina")).toBe("BE");
    expect(initialsOf("Peluquería del Sol")).toBe("PS");
    expect(initialsOf("Juan de")).toBe("JD");
  });

  it("ett ord ger en bokstav", () => {
    expect(initialsOf("Diego")).toBe("D");
    expect(initialsOf("ñandú")).toBe("Ñ");
  });

  it("ignorerar skiljetecken och siffror i början av ord", () => {
    expect(initialsOf("«Barbería» Norte")).toBe("BN");
    expect(initialsOf("Studio 54 Spa")).toBe("SS");
    expect(initialsOf("O'Higgins Peluquería")).toBe("OP");
  });

  it("bindestreck räknas som ett ord", () => {
    expect(initialsOf("Ana-María Soto")).toBe("AS");
  });

  it("tomt, bara blanksteg eller inga bokstäver ger tom sträng", () => {
    expect(initialsOf("")).toBe("");
    expect(initialsOf("   ")).toBe("");
    expect(initialsOf("123 · !!")).toBe("");
  });

  it("högst två tecken (bokstäver)", () => {
    expect([...initialsOf("Uno Dos Tres Cuatro").normalize("NFC")].length).toBe(
      2,
    );
  });
});
