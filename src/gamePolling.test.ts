import { shouldPollForUpdates } from "./gamePolling";

describe("shouldPollForUpdates", () => {
  it("returns false when polling is inactive", () => {
    expect(
      shouldPollForUpdates(
        { lastCheckAt: null, isActive: false },
        Date.now(),
      ),
    ).toBe(false);
  });

  it("returns true on first active check", () => {
    expect(
      shouldPollForUpdates(
        { lastCheckAt: null, isActive: true },
        Date.now(),
      ),
    ).toBe(true);
  });

  it("returns false when interval has not passed", () => {
    const now = 10_000;
    const lastCheckAt = now - 5_000;

    expect(
      shouldPollForUpdates(
        { lastCheckAt, isActive: true },
        now,
        10_000,
      ),
    ).toBe(false);
  });

  it("returns true when interval has passed", () => {
    const now = 20_000;
    const lastCheckAt = now - 10_000;

    expect(
      shouldPollForUpdates(
        { lastCheckAt, isActive: true },
        now,
        10_000,
      ),
    ).toBe(true);
  });
});

