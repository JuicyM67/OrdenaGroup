import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * WP-16 steg 2: `kickOutbox` triggar `processOutbox` via `after()` och
 * sväljer felet när den anropas utanför en request (ingen `after()`-scope).
 */
const processOutboxMock = vi.fn(async () => ({
  claimed: 0,
  sent: 0,
  cancelled: 0,
  queued: 0,
  dead: 0,
}));
vi.mock("./worker", () => ({
  processOutbox: (...args: unknown[]) =>
    (processOutboxMock as (...a: unknown[]) => unknown)(...args),
}));

const afterMock = vi.fn();
vi.mock("next/server", () => ({ after: (fn: () => void) => afterMock(fn) }));

const { kickOutbox } = await import("./kick");

beforeEach(() => {
  processOutboxMock.mockClear();
  afterMock.mockReset();
});

describe("kickOutbox", () => {
  it("i en request: schemalägger processOutbox({ limit: 10 }) via after()", async () => {
    afterMock.mockImplementation((fn: () => void) => fn());
    await kickOutbox();
    expect(afterMock).toHaveBeenCalledOnce();
    expect(processOutboxMock).toHaveBeenCalledExactlyOnceWith({ limit: 10 });
  });

  it("utanför en request (after() kastar): sväljs, kastar aldrig vidare", async () => {
    afterMock.mockImplementation(() => {
      throw new Error("`after` was called outside a request scope");
    });
    await expect(kickOutbox()).resolves.toBeUndefined();
    expect(processOutboxMock).not.toHaveBeenCalled();
  });

  it("om processOutbox() själv skulle avvisas: fångas inuti after(), stör inte anroparen", async () => {
    processOutboxMock.mockRejectedValueOnce(new Error("boom"));
    afterMock.mockImplementation((fn: () => void) => fn());
    await expect(kickOutbox()).resolves.toBeUndefined();
  });
});
