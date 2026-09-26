import { describe, expect, it } from "vitest";

import { cn } from "./cn";

describe("cn", () => {
  it("behåller text-13 och text-ink (font-size och text-color är olika grupper)", () => {
    expect(cn("text-13", "text-ink")).toBe("text-13 text-ink");
  });

  it("slår ihop text-13 och text-15 till text-15 (samma grupp, font-size)", () => {
    expect(cn("text-13", "text-15")).toBe("text-15");
  });

  it("slår ihop rounded-card och rounded-tile till rounded-tile (samma grupp, radie)", () => {
    expect(cn("rounded-card", "rounded-tile")).toBe("rounded-tile");
  });

  it("slår ihop bg-surface/45 och bg-ink till bg-ink (opacitetsmodifierare påverkar inte gruppen)", () => {
    expect(cn("bg-surface/45", "bg-ink")).toBe("bg-ink");
  });

  it("slår ihop tracking-display och tracking-caps till tracking-caps", () => {
    expect(cn("tracking-display", "tracking-caps")).toBe("tracking-caps");
  });

  it("tar bort falsy-värden och slår ihop strängar från flera argument", () => {
    expect(cn("a", false, undefined, null, "b", 0 && "c")).toBe("a b");
  });

  it("slår ihop bg-agenda och bg-closed-stripes till bg-closed-stripes (samma grupp, bg-image)", () => {
    expect(cn("bg-agenda", "bg-closed-stripes")).toBe("bg-closed-stripes");
  });

  it("bg-image (bg-agenda) och bg-color (bg-ink) är olika grupper och behålls båda", () => {
    expect(cn("bg-agenda", "bg-ink")).toBe("bg-agenda bg-ink");
  });

  it("slår ihop shadow-popover med Tailwinds inbyggda shadow-none", () => {
    expect(cn("shadow-popover", "shadow-none")).toBe("shadow-none");
  });

  it("radie per sida (rounded-t-*) hanteras som en egen grupp, skild från rounded", () => {
    expect(cn("rounded-card", "rounded-t-tile")).toBe(
      "rounded-card rounded-t-tile",
    );
    expect(cn("rounded-t-card", "rounded-t-tile")).toBe("rounded-t-tile");
  });

  it("radie per hörn (rounded-tl-*) slås ihop inom samma hörn", () => {
    expect(cn("rounded-tl-panel", "rounded-tl-badge")).toBe("rounded-tl-badge");
  });
});
