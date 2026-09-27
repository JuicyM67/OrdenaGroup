// Se DESIGN.md §7 "StatTile" och docs/tasks/plans/WP-11.md §4 steg 5/R3. SVG 96×60: en
// mjuk kurva (Catmull-Rom → kubiska Bézier-segment, samma kurvtyp som referensens
// handritade "S") byggd ur `revenueSeries`, inte en handritad path. Dekorativ (`aria-hidden`)
// — siffran ("$486.000") står redan i StatTile:s text.
const WIDTH = 96;
const HEIGHT = 60;
const X_START = 2;
const X_END = 94;
const Y_TOP = 10;
const Y_BASE = 50;

type Point = { x: number; y: number };

function buildPoints(values: readonly number[]): Point[] {
  const n = values.length;
  if (n === 0) return [];
  if (n === 1) return [{ x: X_START, y: Y_BASE }];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v, i) => ({
    x: X_START + ((X_END - X_START) * i) / (n - 1),
    y: Y_BASE - ((v - min) / range) * (Y_BASE - Y_TOP),
  }));
}

/** Uniform Catmull-Rom, konverterad till kubiska Bézier-segment (tension 1/6). */
function smoothLinePath(points: readonly Point[]): string {
  if (points.length === 0) return "";
  const first = points[0]!;
  if (points.length === 1) return `M${first.x},${first.y}`;
  let d = `M${first.x},${first.y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export type SparklineProps = {
  values: readonly number[];
  className?: string;
};

export function Sparkline({ values, className }: SparklineProps) {
  const points = buildPoints(values);
  const line = smoothLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  const fill =
    first && last ? `${line} L${last.x},${HEIGHT} L${first.x},${HEIGHT} Z` : "";

  return (
    <svg
      aria-hidden="true"
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={className}
    >
      {fill ? <path d={fill} className="fill-lilac-50" /> : null}
      <path
        d={line}
        fill="none"
        className="stroke-violet"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </svg>
  );
}
