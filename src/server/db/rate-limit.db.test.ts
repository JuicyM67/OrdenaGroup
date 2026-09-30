import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closePool } from "./pool";
import { hitRateLimit } from "./rate-limit";
import { assertLocalDatabase } from "./testing";

/**
 * `hitRateLimit()` → `private.hit_rate_limit()`
 * (supabase/migrations/20260930130000_rate_limits.sql). Varje test använder
 * ett unikt `subject` (uuid) så att testerna aldrig delar räknare, trots att
 * de kör mot samma delade databas (`fileParallelism: false`).
 */

beforeAll(() => {
  assertLocalDatabase();
});

afterAll(async () => {
  await closePool();
});

describe("hitRateLimit", () => {
  it("tillåter upp till max försök i samma fönster, blockerar därefter", async () => {
    const subject = randomUUID();
    const results: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      results.push(
        await hitRateLimit({
          scope: "test:limit",
          subject,
          windowSeconds: 600,
          max: 3,
        }),
      );
    }
    expect(results).toEqual([true, true, true, false]);
  });

  it("olika scope för samma ämne har oberoende räknare", async () => {
    const subject = randomUUID();
    const a1 = await hitRateLimit({
      scope: "test:scope-a",
      subject,
      windowSeconds: 600,
      max: 1,
    });
    const a2 = await hitRateLimit({
      scope: "test:scope-a",
      subject,
      windowSeconds: 600,
      max: 1,
    });
    const b1 = await hitRateLimit({
      scope: "test:scope-b",
      subject,
      windowSeconds: 600,
      max: 1,
    });
    expect(a1).toBe(true);
    expect(a2).toBe(false);
    expect(b1).toBe(true);
  });

  it("olika ämnen (t.ex. olika IP) har oberoende räknare", async () => {
    const subjectA = randomUUID();
    const subjectB = randomUUID();
    const a = await hitRateLimit({
      scope: "test:subjects",
      subject: subjectA,
      windowSeconds: 600,
      max: 1,
    });
    const b = await hitRateLimit({
      scope: "test:subjects",
      subject: subjectB,
      windowSeconds: 600,
      max: 1,
    });
    expect(a).toBe(true);
    expect(b).toBe(true);
  });

  it("ett nytt (kort) fönster släpper in försök igen", async () => {
    const subject = randomUUID();
    const opts = { scope: "test:window", subject, windowSeconds: 1, max: 1 };
    expect(await hitRateLimit(opts)).toBe(true);
    expect(await hitRateLimit(opts)).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    expect(await hitRateLimit(opts)).toBe(true);
  });
});
