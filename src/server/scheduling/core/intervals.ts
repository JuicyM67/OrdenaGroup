import "server-only";

/** Halvöppet intervall [start, end) i UTC-millisekunder, som tstzrange. */
export type Interval = { start: number; end: number };

/** Sorterar, tar bort tomma och slår ihop överlappande eller kant-mot-kant. */
export function normalize(a: readonly Interval[]): Interval[] {
  const sorted = a
    .filter((x) => x.end > x.start)
    .map((x) => ({ start: x.start, end: x.end }))
    .sort((x, y) => x.start - y.start || x.end - y.end);
  const out: Interval[] = [];
  for (const x of sorted) {
    const last = out[out.length - 1];
    if (last && x.start <= last.end) last.end = Math.max(last.end, x.end);
    else out.push(x);
  }
  return out;
}

export function intersect(
  a: readonly Interval[],
  b: readonly Interval[],
): Interval[] {
  const x = normalize(a);
  const y = normalize(b);
  const out: Interval[] = [];
  let i = 0;
  let j = 0;
  while (i < x.length && j < y.length) {
    const p = x[i]!;
    const q = y[j]!;
    const start = Math.max(p.start, q.start);
    const end = Math.min(p.end, q.end);
    if (end > start) out.push({ start, end });
    if (p.end < q.end) i++;
    else j++;
  }
  return out;
}

export function subtract(
  a: readonly Interval[],
  cut: readonly Interval[],
): Interval[] {
  const cuts = normalize(cut);
  const out: Interval[] = [];
  for (const x of normalize(a)) {
    let start = x.start;
    for (const c of cuts) {
      if (c.end <= start) continue;
      if (c.start >= x.end) break;
      if (c.start > start) out.push({ start, end: c.start });
      start = Math.max(start, c.end);
      if (start >= x.end) break;
    }
    if (start < x.end) out.push({ start, end: x.end });
  }
  return out;
}
