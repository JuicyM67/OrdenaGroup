import { describe, expect, it } from "vitest";

import { intersect, normalize, subtract, type Interval } from "./intervals";

const i = (start: number, end: number): Interval => ({ start, end });

describe("normalize", () => {
  it("tom lista", () => {
    expect(normalize([])).toEqual([]);
  });
  it("sorterar, slår ihop överlapp och kant mot kant, tar bort tomma", () => {
    expect(
      normalize([i(50, 60), i(10, 20), i(15, 30), i(30, 35), i(40, 40)]),
    ).toEqual([i(10, 35), i(50, 60)]);
  });
  it("inneslutning", () => {
    expect(normalize([i(0, 100), i(10, 20)])).toEqual([i(0, 100)]);
  });
  it("muterar inte indata", () => {
    const a = [i(5, 6), i(1, 2)];
    normalize(a);
    expect(a).toEqual([i(5, 6), i(1, 2)]);
  });
});

describe("intersect", () => {
  it("tomma listor", () => {
    expect(intersect([], [i(0, 10)])).toEqual([]);
    expect(intersect([i(0, 10)], [])).toEqual([]);
  });
  it("kant mot kant överlappar inte (halvöppet, som tstzrange)", () => {
    expect(intersect([i(0, 35)], [i(35, 60)])).toEqual([]);
  });
  it("delvis överlapp och inneslutning", () => {
    expect(intersect([i(0, 50)], [i(25, 100)])).toEqual([i(25, 50)]);
    expect(intersect([i(0, 100)], [i(10, 20), i(30, 40)])).toEqual([
      i(10, 20),
      i(30, 40),
    ]);
  });
  it("osorterad indata", () => {
    expect(intersect([i(60, 90), i(0, 30)], [i(20, 70)])).toEqual([
      i(20, 30),
      i(60, 70),
    ]);
  });
});

describe("subtract", () => {
  it("tomma listor", () => {
    expect(subtract([], [i(0, 10)])).toEqual([]);
    expect(subtract([i(0, 10)], [])).toEqual([i(0, 10)]);
  });
  it("flera hål", () => {
    expect(subtract([i(0, 100)], [i(10, 20), i(50, 60)])).toEqual([
      i(0, 10),
      i(20, 50),
      i(60, 100),
    ]);
  });
  it("kant mot kant tar inget", () => {
    expect(subtract([i(35, 60)], [i(0, 35)])).toEqual([i(35, 60)]);
  });
  it("hål som täcker allt, början eller slutet", () => {
    expect(subtract([i(10, 20)], [i(0, 30)])).toEqual([]);
    expect(subtract([i(10, 20)], [i(0, 15)])).toEqual([i(15, 20)]);
    expect(subtract([i(10, 20)], [i(15, 25)])).toEqual([i(10, 15)]);
  });
  it("osorterad och överlappande indata", () => {
    expect(
      subtract([i(50, 100), i(0, 40)], [i(30, 60), i(35, 55), i(90, 95)]),
    ).toEqual([i(0, 30), i(60, 90), i(95, 100)]);
  });
});
