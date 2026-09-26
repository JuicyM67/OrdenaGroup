import { afterEach, describe, expect, it } from "vitest";

import {
  addLocalDays,
  formatTimeRange,
  fromLocal,
  fromLocalStrict,
  localDayLengthHours,
  localDayRange,
  minutesBetween,
  parseInstant,
  parseTimeZone,
  SANTIAGO,
  toWallClock,
  utcOffsetMinutes,
  type LocalDate,
  type LocalTime,
  type TimeZone,
} from "./dates";
import { SANTIAGO_DST_TRANSITIONS } from "./__fixtures__/santiago-dst";

const d = (s: string) => s as LocalDate;
const t = (s: string) => s as LocalTime;
const utc = (s: string): Date => {
  const r = parseInstant(s);
  if (!r.ok) throw new Error(`fixture: ${s}`);
  return r.value;
};
const iso = (x: Date) => x.toISOString().replace(".000Z", "Z");
const tz = (s: string): TimeZone => {
  const r = parseTimeZone(s);
  if (!r.ok) throw new Error(`fixture: ${s}`);
  return r.value;
};
const MIN = 60_000;
const HOUR = 60 * MIN;

describe("dagar med 25 och 23 timmar", () => {
  it("2026-04-04 (slut på sommartid) har 25 h", () => {
    const r = localDayRange(d("2026-04-04"), SANTIAGO);
    expect(iso(r.start)).toBe("2026-04-04T03:00:00Z");
    expect(iso(r.end)).toBe("2026-04-05T04:00:00Z");
    expect(localDayLengthHours(d("2026-04-04"), SANTIAGO)).toBe(25);
    expect(localDayLengthHours(d("2026-04-05"), SANTIAGO)).toBe(24);
  });

  it("2026-09-06 (start på sommartid) har 23 h och börjar 01:00", () => {
    const r = localDayRange(d("2026-09-06"), SANTIAGO);
    expect(iso(r.start)).toBe("2026-09-06T04:00:00Z");
    expect(toWallClock(r.start, SANTIAGO).time).toBe("01:00");
    expect(iso(r.end)).toBe("2026-09-07T03:00:00Z");
    expect(localDayLengthHours(d("2026-09-06"), SANTIAGO)).toBe(23);
  });

  it("2026-09-05 har 24 h", () => {
    const r = localDayRange(d("2026-09-05"), SANTIAGO);
    expect(iso(r.start)).toBe("2026-09-05T04:00:00Z");
    expect(iso(r.end)).toBe("2026-09-06T04:00:00Z");
    expect(localDayLengthHours(d("2026-09-05"), SANTIAGO)).toBe(24);
  });

  it("2027: 3 apr = 25 h, 5 sep = 23 h", () => {
    expect(localDayLengthHours(d("2027-04-03"), SANTIAGO)).toBe(25);
    expect(localDayLengthHours(d("2027-09-05"), SANTIAGO)).toBe(23);
    expect(iso(localDayRange(d("2027-04-03"), SANTIAGO).end)).toBe(
      "2027-04-04T04:00:00Z",
    );
    expect(iso(localDayRange(d("2027-09-05"), SANTIAGO).start)).toBe(
      "2027-09-05T04:00:00Z",
    );
  });
});

describe("tvetydig tid (23:00–23:59 två gånger i april)", () => {
  it("compatible = earlier = första förekomsten (−03)", () => {
    expect(iso(fromLocal(d("2026-04-04"), t("23:30"), SANTIAGO))).toBe(
      "2026-04-05T02:30:00Z",
    );
    expect(
      iso(fromLocal(d("2026-04-04"), t("23:30"), SANTIAGO, "earlier")),
    ).toBe("2026-04-05T02:30:00Z");
  });
  it("later = andra förekomsten (−04)", () => {
    expect(iso(fromLocal(d("2026-04-04"), t("23:30"), SANTIAGO, "later"))).toBe(
      "2026-04-05T03:30:00Z",
    );
  });
  it("fromLocalStrict → ambiguous_local_time", () => {
    expect(fromLocalStrict(d("2026-04-04"), t("23:30"), SANTIAGO)).toEqual({
      ok: false,
      error: "ambiguous_local_time",
    });
    expect(fromLocalStrict(d("2026-04-04"), t("23:00"), SANTIAGO)).toEqual({
      ok: false,
      error: "ambiguous_local_time",
    });
    expect(fromLocalStrict(d("2026-04-04"), t("22:59"), SANTIAGO).ok).toBe(
      true,
    );
  });
  it("24:00 på den långa dagen = nästa dags 00:00, entydig", () => {
    expect(iso(fromLocal(d("2026-04-04"), t("24:00"), SANTIAGO))).toBe(
      "2026-04-05T04:00:00Z",
    );
  });
});

describe("tid som inte finns (00:00–00:59 i september)", () => {
  it("compatible = later = flyttas fram med glappet", () => {
    expect(iso(fromLocal(d("2026-09-06"), t("00:30"), SANTIAGO))).toBe(
      "2026-09-06T04:30:00Z",
    );
    expect(iso(fromLocal(d("2026-09-06"), t("00:30"), SANTIAGO, "later"))).toBe(
      "2026-09-06T04:30:00Z",
    );
    expect(iso(fromLocal(d("2026-09-06"), t("00:00"), SANTIAGO))).toBe(
      "2026-09-06T04:00:00Z",
    );
  });
  it("earlier = bakåt (lör 23:30 −04)", () => {
    expect(
      iso(fromLocal(d("2026-09-06"), t("00:30"), SANTIAGO, "earlier")),
    ).toBe("2026-09-06T03:30:00Z");
    expect(
      toWallClock(
        fromLocal(d("2026-09-06"), t("00:30"), SANTIAGO, "earlier"),
        SANTIAGO,
      ),
    ).toMatchObject({ date: "2026-09-05", time: "23:30", weekday: 6 });
  });
  it("fromLocalStrict → nonexistent_local_time", () => {
    expect(fromLocalStrict(d("2026-09-06"), t("00:30"), SANTIAGO)).toEqual({
      ok: false,
      error: "nonexistent_local_time",
    });
    const r = fromLocalStrict(d("2026-09-06"), t("01:00"), SANTIAGO);
    expect(r.ok && iso(r.value)).toBe("2026-09-06T04:00:00Z");
  });
  it("24:00 dagen före bytet = nästa dags början", () => {
    expect(iso(fromLocal(d("2026-09-05"), t("24:00"), SANTIAGO))).toBe(
      "2026-09-06T04:00:00Z",
    );
    expect(fromLocalStrict(d("2026-09-05"), t("24:00"), SANTIAGO)).toEqual({
      ok: false,
      error: "nonexistent_local_time",
    });
  });
});

describe("gränser runt bytet", () => {
  it("september", () => {
    expect(toWallClock(utc("2026-09-06T03:59:59Z"), SANTIAGO)).toEqual({
      date: "2026-09-05",
      time: "23:59",
      weekday: 6,
      offsetMinutes: -240,
    });
    expect(toWallClock(utc("2026-09-06T04:00:00Z"), SANTIAGO)).toEqual({
      date: "2026-09-06",
      time: "01:00",
      weekday: 7,
      offsetMinutes: -180,
    });
  });
  it("april", () => {
    expect(toWallClock(utc("2026-04-05T02:59:00Z"), SANTIAGO)).toEqual({
      date: "2026-04-04",
      time: "23:59",
      weekday: 6,
      offsetMinutes: -180,
    });
    expect(toWallClock(utc("2026-04-05T03:00:00Z"), SANTIAGO)).toEqual({
      date: "2026-04-04",
      time: "23:00",
      weekday: 6,
      offsetMinutes: -240,
    });
  });
});

describe("öppettider påverkas inte av bytet", () => {
  it.each([
    ["2026-09-06", "2026-09-06T13:00:00Z"],
    ["2026-09-05", "2026-09-05T14:00:00Z"],
    ["2026-04-04", "2026-04-04T13:00:00Z"],
    ["2026-04-05", "2026-04-05T14:00:00Z"],
  ])("10:00 den %s = %s", (date, expected) => {
    expect(iso(fromLocal(d(date), t("10:00"), SANTIAGO))).toBe(expected);
  });
});

describe("bokning över bytet (dokumenterar beteendet, visning beslutas i WP-10/UI)", () => {
  it("september: 60 min från 23:30 slutar 01:30", () => {
    const start = fromLocal(d("2026-09-05"), t("23:30"), SANTIAGO);
    const end = new Date(start.getTime() + 60 * MIN);
    expect(minutesBetween(start, end)).toBe(60);
    expect(formatTimeRange(start, end, SANTIAGO)).toBe("23:30 – 01:30");
  });
  it("april: 60 min från 23:30 visas 23:30 – 23:30", () => {
    const start = fromLocal(d("2026-04-04"), t("23:30"), SANTIAGO);
    const end = new Date(start.getTime() + 60 * MIN);
    expect(minutesBetween(start, end)).toBe(60);
    expect(formatTimeRange(start, end, SANTIAGO)).toBe("23:30 – 23:30");
  });
  it("april: 30 min från 23:45 visas 23:45 – 23:15", () => {
    const start = fromLocal(d("2026-04-04"), t("23:45"), SANTIAGO);
    const end = new Date(start.getTime() + 30 * MIN);
    expect(formatTimeRange(start, end, SANTIAGO)).toBe("23:45 – 23:15");
  });
});

describe("fixturtabellen 2020–2030", () => {
  it.each(SANTIAGO_DST_TRANSITIONS.map((x) => [x.kind, x.utc, x] as const))(
    "%s %s",
    (_kind, _utc, x) => {
      const at = utc(x.utc);
      expect(utcOffsetMinutes(new Date(at.getTime() - 1), SANTIAGO)).toBe(
        x.offsetBeforeMinutes,
      );
      expect(utcOffsetMinutes(at, SANTIAGO)).toBe(x.offsetAfterMinutes);
      expect(localDayLengthHours(d(x.localDate), SANTIAGO)).toBe(
        x.localDayLengthHours,
      );
      const inside = fromLocalStrict(
        d(x.affectedLocal.date),
        t(x.affectedLocal.from),
        SANTIAGO,
      );
      expect(inside).toEqual({
        ok: false,
        error:
          x.kind === "end" ? "ambiguous_local_time" : "nonexistent_local_time",
      });
    },
  );
});

describe("uttömmande rundtur", () => {
  function roundTrip(instant: Date, zone: TimeZone) {
    const w = toWallClock(instant, zone);
    const first = fromLocal(w.date, w.time, zone, "compatible");
    if (first.getTime() === instant.getTime()) return true;
    // Andra förekomsten i överlappet.
    return (
      fromLocal(w.date, w.time, zone, "later").getTime() === instant.getTime()
    );
  }

  it("varje hel timme 2020-01-01–2030-12-31 (UTC)", () => {
    const from = utc("2020-01-01T00:00:00Z").getTime();
    const to = utc("2030-12-31T23:00:00Z").getTime();
    let n = 0;
    const failures: string[] = [];
    for (let ms = from; ms <= to; ms += HOUR) {
      const instant = new Date(ms);
      if (!roundTrip(instant, SANTIAGO)) failures.push(iso(instant));
      n++;
    }
    expect(failures).toEqual([]);
    expect(n).toBe(96_432);
  });

  it("varje minut ±3 h runt varje övergång", () => {
    const failures: string[] = [];
    for (const x of SANTIAGO_DST_TRANSITIONS) {
      const at = utc(x.utc).getTime();
      for (let ms = at - 3 * HOUR; ms <= at + 3 * HOUR; ms += MIN) {
        const instant = new Date(ms);
        if (!roundTrip(instant, SANTIAGO)) failures.push(iso(instant));
      }
    }
    expect(failures).toEqual([]);
  });

  it("i överlappet ger compatible första och later andra förekomsten", () => {
    for (const x of SANTIAGO_DST_TRANSITIONS.filter((y) => y.kind === "end")) {
      const at = utc(x.utc).getTime();
      for (let m = 0; m < 60; m++) {
        const first = new Date(at - HOUR + m * MIN);
        const second = new Date(at + m * MIN);
        const w1 = toWallClock(first, SANTIAGO);
        const w2 = toWallClock(second, SANTIAGO);
        expect(w1.date).toBe(w2.date);
        expect(w1.time).toBe(w2.time);
        expect(fromLocal(w1.date, w1.time, SANTIAGO).getTime()).toBe(
          first.getTime(),
        );
        expect(fromLocal(w1.date, w1.time, SANTIAGO, "later").getTime()).toBe(
          second.getTime(),
        );
      }
    }
  });

  // Oberoende orakel: en annan Intl-väg (timeZoneName "longOffset").
  // date-fns-tz 3.2.0 duger inte som orakel: getTimezoneOffset(tz, date)
  // tolkar `date` som lokal väggtid, och formatInTimeZone ger fel väggtid
  // när den hamnar i ett sommartidsglapp i värdens tidszon (t.ex. TZ=Europe/Stockholm
  // 2026-03-29T05:00Z → "03:00" i stället för "02:00" i Santiago).
  it("väggtid och offset stämmer med Intl longOffset varje hel timme 2020–2030", () => {
    const oracle = new Intl.DateTimeFormat("en-US", {
      timeZone: SANTIAGO,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZoneName: "longOffset",
    });
    const oracleString = (instant: Date) => {
      const p = Object.fromEntries(
        oracle.formatToParts(instant).map((x) => [x.type, x.value]),
      );
      const tzName = (p.timeZoneName ?? "").replace("\u2212", "-");
      return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute} ${tzName}`;
    };
    const from = utc("2020-01-01T00:00:00Z").getTime();
    const to = utc("2030-12-31T23:00:00Z").getTime();
    const failures: string[] = [];
    for (let ms = from; ms <= to; ms += HOUR) {
      const instant = new Date(ms);
      const w = toWallClock(instant, SANTIAGO);
      const sign = w.offsetMinutes < 0 ? "-" : "+";
      const abs = Math.abs(w.offsetMinutes);
      const hh = String(Math.floor(abs / 60)).padStart(2, "0");
      const mm = String(abs % 60).padStart(2, "0");
      const ours = `${w.date} ${w.time} GMT${sign}${hh}:${mm}`;
      const theirs = oracleString(instant);
      if (ours !== theirs)
        failures.push(`${iso(instant)}: ${ours} ≠ ${theirs}`);
    }
    expect(failures).toEqual([]);
  });
});

describe("sammanhängande dagar 2020–2030", () => {
  it("end = nästa dags start, 23/24/25 h och exakt två avvikande dagar per år", () => {
    const odd = new Map<number, Record<string, number>>();
    let day = d("2020-01-01");
    let range = localDayRange(day, SANTIAGO);
    while (day <= "2030-12-31") {
      const next = addLocalDays(day, 1);
      const nextRange = localDayRange(next, SANTIAGO);
      expect(range.end.getTime()).toBe(nextRange.start.getTime());
      const hours = (range.end.getTime() - range.start.getTime()) / HOUR;
      expect([23, 24, 25]).toContain(hours);
      if (hours !== 24) {
        const year = Number(day.slice(0, 4));
        odd.set(year, { ...odd.get(year), [day]: hours });
      }
      day = next;
      range = nextRange;
    }
    for (let y = 2020; y <= 2030; y++) {
      expect(Object.keys(odd.get(y) ?? {})).toHaveLength(2);
    }
    expect(odd.get(2026)).toEqual({ "2026-04-04": 25, "2026-09-06": 23 });
    expect(odd.get(2027)).toEqual({ "2027-04-03": 25, "2027-09-05": 23 });
  });
});

describe("oberoende av värdens tidszon", () => {
  const original = process.env.TZ;
  afterEach(() => {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  });

  function coreCases() {
    return {
      dayApr: localDayRange(d("2026-04-04"), SANTIAGO),
      daySep: localDayRange(d("2026-09-06"), SANTIAGO),
      ambiguous: fromLocal(d("2026-04-04"), t("23:30"), SANTIAGO).toISOString(),
      ambiguousLater: fromLocal(
        d("2026-04-04"),
        t("23:30"),
        SANTIAGO,
        "later",
      ).toISOString(),
      gap: fromLocal(d("2026-09-06"), t("00:30"), SANTIAGO).toISOString(),
      wall: toWallClock(utc("2026-09-06T04:00:00Z"), SANTIAGO),
      wallApr: toWallClock(utc("2026-04-05T03:00:00Z"), SANTIAGO),
      range: formatTimeRange(
        utc("2026-10-02T14:30:00Z"),
        utc("2026-10-02T15:05:00Z"),
        SANTIAGO,
      ),
    };
  }

  it("UTC, America/Santiago, Asia/Tokyo och America/Los_Angeles ger samma svar", () => {
    const results = [
      "UTC",
      "America/Santiago",
      "Asia/Tokyo",
      "America/Los_Angeles",
    ].map((hostTz) => {
      process.env.TZ = hostTz;
      return JSON.stringify(coreCases());
    });
    expect(new Set(results).size).toBe(1);
    expect(JSON.parse(results[0] ?? "{}")).toMatchObject({
      ambiguous: "2026-04-05T02:30:00.000Z",
      gap: "2026-09-06T04:30:00.000Z",
      range: "11:30 – 12:05",
    });
  });
});

describe("andra zoner (parametern används)", () => {
  it("America/Punta_Arenas har ingen sommartid (−03 året runt)", () => {
    const pa = tz("America/Punta_Arenas");
    expect(utcOffsetMinutes(utc("2026-07-01T12:00:00Z"), pa)).toBe(-180);
    expect(utcOffsetMinutes(utc("2026-01-15T12:00:00Z"), pa)).toBe(-180);
    expect(localDayLengthHours(d("2026-09-06"), pa)).toBe(24);
  });
  it("Pacific/Easter: −360 vinter, −300 sommar", () => {
    const easter = tz("Pacific/Easter");
    expect(utcOffsetMinutes(utc("2026-07-01T12:00:00Z"), easter)).toBe(-360);
    expect(utcOffsetMinutes(utc("2026-01-15T12:00:00Z"), easter)).toBe(-300);
  });
  it("UTC har inga glapp", () => {
    const u = tz("UTC");
    expect(iso(fromLocal(d("2026-09-06"), t("00:30"), u))).toBe(
      "2026-09-06T00:30:00Z",
    );
  });
});
