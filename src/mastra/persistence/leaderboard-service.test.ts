import { describe, expect, test } from "@jest/globals";

describe("leaderboard-service global score", () => {
  test("higher savings produce higher global score even with lower reputation", async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ||
      "postgres://user:pass@localhost:5432/test_leaderboard";

    const { leaderboardService } = await import("./leaderboard-service.ts");
    const service: any = leaderboardService;

    const lowSavingsHighRep = service.calculateGlobalScore(
      90, // reputation
      8, // skill
      8, // advice quality
      10_000, // savings
      0, // debt cleared
      5, // achievements
    );

    const highSavingsLowRep = service.calculateGlobalScore(
      40,
      3,
      6,
      40_000,
      0,
      1,
    );

    expect(highSavingsLowRep).toBeGreaterThan(lowSavingsHighRep);
  });
}

