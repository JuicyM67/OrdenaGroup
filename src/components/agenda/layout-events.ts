// Rena funktioner, ingen React. Se docs/tasks/plans/WP-12.md steg 2/FRÅGA 3.
import type { StaffId, TimeOffKind } from "./types";

// ---------------------------------------------------------------------------
// Lanes: överlappande händelser i samma kolumn delas i lika breda spår.
// ---------------------------------------------------------------------------

export type LaneInput = {
  readonly id: string;
  readonly start: Date;
  readonly end: Date;
};
export type LaneResult = {
  readonly id: string;
  readonly lane: number;
  readonly lanes: number;
};

/**
 * Klassisk "meeting rooms"-packning: sorterar på starttid, återanvänder ett spår så fort
 * det är fritt (`slut ≤ nästa start`, alltså ingen ny lane när ett block slutar exakt när
 * nästa börjar). `lanes` är antalet spår som faktiskt användes i den sammanhängande klustern
 * (inte det globala maxet), så en ensam bokning aldrig krymps av en klunga långt bort i tiden.
 */
export function layoutLanes(events: readonly LaneInput[]): LaneResult[] {
  const sorted = [...events].sort(
    (a, b) =>
      a.start.getTime() - b.start.getTime() ||
      a.end.getTime() - b.end.getTime(),
  );

  const result: LaneResult[] = [];
  let cluster: { id: string; lane: number }[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = Number.NEGATIVE_INFINITY;

  function flush() {
    if (cluster.length === 0) return;
    const lanes = cluster.reduce((max, e) => Math.max(max, e.lane + 1), 0);
    for (const e of cluster) result.push({ id: e.id, lane: e.lane, lanes });
    cluster = [];
    laneEnds = [];
    clusterEnd = Number.NEGATIVE_INFINITY;
  }

  for (const ev of sorted) {
    const startMs = ev.start.getTime();
    const endMs = ev.end.getTime();
    if (cluster.length > 0 && startMs >= clusterEnd) flush();

    let lane = laneEnds.findIndex((end) => end <= startMs);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(endMs);
    } else {
      laneEnds[lane] = endMs;
    }
    cluster.push({ id: ev.id, lane });
    clusterEnd = Math.max(clusterEnd, endMs);
  }
  flush();
  return result;
}

// ---------------------------------------------------------------------------
// Gemensamma block: samma intervall för ALLA synliga profesionales (t.ex. lunch)
// slås ihop till ett block i veckovyn.
// ---------------------------------------------------------------------------

export type MergeableBlock = {
  readonly staffId: StaffId;
  readonly start: Date;
  readonly end: Date;
  readonly kind: TimeOffKind;
};

export type MergedBlock = {
  /** Stabil nyckel för rendering: staffIds + intervall. */
  readonly key: string;
  readonly staffIds: readonly StaffId[];
  readonly start: Date;
  readonly end: Date;
  readonly kind: TimeOffKind;
};

export function mergeCommonBlocks(
  blocks: readonly MergeableBlock[],
  visibleStaffIds: readonly StaffId[],
): MergedBlock[] {
  const visible = blocks.filter((b) => visibleStaffIds.includes(b.staffId));
  const groups = new Map<string, MergeableBlock[]>();
  for (const b of visible) {
    const key = `${b.start.getTime()}|${b.end.getTime()}|${b.kind}`;
    const arr = groups.get(key);
    if (arr) arr.push(b);
    else groups.set(key, [b]);
  }

  const result: MergedBlock[] = [];
  for (const arr of groups.values()) {
    const staffIds = arr.map((b) => b.staffId);
    const coversAll =
      visibleStaffIds.length > 0 &&
      visibleStaffIds.every((id) => staffIds.includes(id));
    if (coversAll) {
      const first = arr[0] as MergeableBlock;
      result.push({
        key: `${staffIds.join(",")}:${first.start.toISOString()}`,
        staffIds,
        start: first.start,
        end: first.end,
        kind: first.kind,
      });
    } else {
      for (const b of arr) {
        result.push({
          key: `${b.staffId}:${b.start.toISOString()}`,
          staffIds: [b.staffId],
          start: b.start,
          end: b.end,
          kind: b.kind,
        });
      }
    }
  }
  return result;
}
