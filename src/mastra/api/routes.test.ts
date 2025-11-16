import { toClientSafeAdvisorState } from "./routes.ts";
import type { AdvisorState } from "../types/game-types.ts";

describe("toClientSafeAdvisorState", () => {
  test("includes advisorId from server state", () => {
    const advisorState: AdvisorState = {
      advisorId: "test-advisor-123",
      advisorName: "Test Advisor",
      reputation: 70,
      skillLevel: 1,
      specializations: [],
      topicsExpertise: {} as any,
      sessionHistory: [],
      totalClientsHelped: 0,
      activeClients: [],
      activeThreads: {},
      godBossRelationship: 5,
      learningMaterials: [],
      totalSessions: 0,
      lastReviewSession: 0,
      hasCompletedOnboarding: false,
      currentStreak: 0,
      lastStreakCheckSession: 0,
      advisorCoins: 0,
      lifetimeSavingsGenerated: 0,
      lifetimeDebtCleared: 0,
      currentGoal: null,
      achievementsUnlocked: [],
      careerTier: 1,
      currentGameMonth: "2025-01",
      simulatedMonthsPassed: 0,
      isFired: false,
      fireReason: undefined,
      criticalInterventionsForcedThrough: 0,
      financialImpactHistory: [],
    };

    const clientState = toClientSafeAdvisorState(advisorState);

    expect(clientState.advisorId).toBe("test-advisor-123");
    expect(clientState.advisorName).toBe("Test Advisor");
  });
});

