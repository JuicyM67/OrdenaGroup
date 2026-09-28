import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { allBrandNames, brand, parseMarket } from "./brand";

const currentFile = fileURLToPath(import.meta.url);

describe("brand", () => {
  it("has non-empty name and tagline", () => {
    expect(brand.name.length).toBeGreaterThan(0);
    expect(brand.tagline.length).toBeGreaterThan(0);
  });

  it("has domain and supportWhatsapp as null or string", () => {
    expect(brand.domain === null || typeof brand.domain === "string").toBe(
      true,
    );
    expect(
      brand.supportWhatsapp === null ||
        typeof brand.supportWhatsapp === "string",
    ).toBe(true);
  });
});

describe("parseMarket", () => {
  it("defaults to CL and accepts SE", () => {
    expect(parseMarket(undefined)).toBe("CL");
    expect(parseMarket("SE")).toBe("SE");
  });
});

describe("name isolation (hård regel 10)", () => {
  const srcRoot = path.resolve(path.dirname(currentFile), "..");
  const brandFile = path.resolve(path.dirname(currentFile), "brand.ts");
  const namePatterns = allBrandNames.map(
    (n) => new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
  );

  function collectFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...collectFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }
    return files;
  }

  it("does not mention any brand name outside brand.ts", () => {
    const offenders: string[] = [];
    for (const file of collectFiles(srcRoot)) {
      if (file === brandFile || file === currentFile) continue;
      const content = fs.readFileSync(file, "utf8");
      if (namePatterns.some((p) => p.test(content))) {
        offenders.push(path.relative(srcRoot, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
