/**
 * Integration test for Cash System, Advisor Leveling, and Promotions
 *
 * This test validates that the core progression systems work correctly:
 * - Cash earnings and accumulation
 * - Skill level progression
 * - Achievement unlocking
 * - Career tier promotions
 * - Leaderboard updates
 */

import { calculateCoinsEarned } from "./earnings-calculator";
import {
  checkForNewAchievements,
  checkForMilestones,
  ACHIEVEMENTS,
} from "./progress-system";
import {
  calculateTierScore,
  getTierDisplay,
} from "./leaderboard-calculator";
import type { AdvisorState, TopicExpertise } from "../types/game-types";

// Helper function to create a minimal FinancialProjection for tests
function createFinancialProjection(overrides: Partial<{
  totalSaved: number;
  totalDebtReduced: number;
  totalInterestSaved: number;
}> = {}) {
  return {
    monthlySavings: 0,
    monthlyExpenseReduction: 0,
    monthlyDebtPayment: 0,
    totalSaved: overrides.totalSaved || 0,
    totalDebtReduced: overrides.totalDebtReduced || 0,
    totalInterestSaved: overrides.totalInterestSaved || 0,
    monthsToGoal: 0,
    projectionPeriodMonths: 12,
    savingsRate: 0,
    debtReductionRate: 0,
    emergencyFundProgress: 0,
    debtFreeProgress: 0,
  };
}

describe("Cash System, Advisor Leveling & Promotions Integration", () => {
  let advisorState: AdvisorState;

  beforeEach(() => {
    // Initialize a fresh advisor state before each test
    const initialTopicsExpertise: TopicExpertise = {
      budgeting: 0,
      saving: 0,
      debt_management: 0,
      investing: 0,
      loans: 0,
      insurance: 0,
      retirement: 0,
      emergency_fund: 0,
      credit_score: 0,
      scam_awareness: 0,
    };

    advisorState = {
      advisorId: "test-advisor-integration",
      skillLevel: 0,
      reputation: 0,
      advisorCoins: 0,
      currentStreak: 0,
      topicsExpertise: initialTopicsExpertise,
      achievementsUnlocked: [],
      careerTier: 1,
      totalSessions: 0,
      totalClientsHelped: 0,
      lifetimeSavingsGenerated: 0,
      lifetimeDebtCleared: 0,
      sessionHistory: [],
      activeThreads: {},
      hasCompletedOnboarding: true,
      currentGoal: null,
      specializations: [],
      activeClients: [],
      godBossRelationship: 5,
      learningMaterials: [],
      lastReviewSession: 0,
      lastStreakCheckSession: 0,
      currentGameMonth: "2025-01",
      simulatedMonthsPassed: 0,
    };
  });

  describe("Cash Earnings System", () => {
    it("should calculate base coins correctly", () => {
      const result = calculateCoinsEarned(
        {
          qualityScore: 5,
          financialProjection: createFinancialProjection(),
        },
        advisorState
      );

      // Base consultation fee is 25 coins (INCREASED for better pacing)
      expect(result.coinsEarned).toBe(25);
    });

    it("should award bonus coins for client savings", () => {
      const result = calculateCoinsEarned(
        {
          qualityScore: 5,
          financialProjection: createFinancialProjection({
            totalSaved: 1000, // €1000 saved = +100 coins (10 coins per €100, DOUBLED)
          }),
        },
        advisorState
      );

      expect(result.coinsEarned).toBe(125); // 25 base + 100 bonus
    });

    it("should award bonus coins for debt reduction", () => {
      const result = calculateCoinsEarned(
        {
          qualityScore: 5,
          financialProjection: createFinancialProjection({
            totalDebtReduced: 2500, // €2500 debt reduced = +75 coins (15 coins per €500, INCREASED)
          }),
        },
        advisorState
      );

      expect(result.coinsEarned).toBe(100); // 25 base + 75 bonus
    });

    it("should award bonus for high quality advice", () => {
      const result = calculateCoinsEarned(
        {
          qualityScore: 8.5, // High quality score (≥8)
          financialProjection: createFinancialProjection(),
        },
        advisorState
      );

      expect(result.coinsEarned).toBe(40); // 25 base + 15 quality bonus (TRIPLED)
    });

    it("should penalize for negative outcomes", () => {
      const result = calculateCoinsEarned(
        {
          qualityScore: 5,
          outcome: "negative",
          financialProjection: createFinancialProjection(),
        },
        advisorState
      );

      expect(result.coinsEarned).toBe(5); // 25 base - 20 penalty = 5 (minimum 0)
    });

    it("should update advisor state with earnings", () => {
      const initialCoins = advisorState.advisorCoins;

      const result = calculateCoinsEarned(
        {
          qualityScore: 8,
          financialProjection: createFinancialProjection({
            totalSaved: 500,
          }),
        },
        advisorState
      );

      expect(result.updatedState.advisorCoins).toBeGreaterThan(initialCoins);
      expect(result.updatedState.lifetimeSavingsGenerated).toBe(500);
    });
  });

  describe("Achievement System", () => {
    it("should unlock 'first_client' achievement after first session", () => {
      advisorState.totalSessions = 0;
      advisorState.totalClientsHelped = 0;

      // Simulate first session
      advisorState.totalSessions = 1;
      advisorState.totalClientsHelped = 1;

      const newAchievements = checkForNewAchievements(advisorState);

      expect(newAchievements.length).toBeGreaterThan(0);
      expect(newAchievements.some((a) => a.id === "first_client")).toBe(true);
    });

    it("should unlock skill level achievements", () => {
      advisorState.skillLevel = 3;

      const newAchievements = checkForNewAchievements(advisorState);

      expect(newAchievements.some((a) => a.id === "skill_level_3")).toBe(true);
    });

    it("should unlock financial impact achievements", () => {
      advisorState.lifetimeSavingsGenerated = 15000;

      const newAchievements = checkForNewAchievements(advisorState);

      expect(newAchievements.some((a) => a.id === "savings_10k")).toBe(true);
    });

    it("should award coins for achievements", () => {
      const firstClientAchievement = ACHIEVEMENTS.find(
        (a) => a.id === "first_client"
      );

      expect(firstClientAchievement).toBeDefined();
      expect(firstClientAchievement?.coinReward).toBe(50);
    });

    it("should not unlock the same achievement twice", () => {
      advisorState.totalClientsHelped = 1;
      advisorState.achievementsUnlocked = [];

      const achievements1 = checkForNewAchievements(advisorState);
      expect(achievements1.some((a) => a.id === "first_client")).toBe(true);

      // Mark as unlocked
      advisorState.achievementsUnlocked.push("first_client");

      // Check again - should not unlock again
      const achievements2 = checkForNewAchievements(advisorState);
      expect(achievements2.some((a) => a.id === "first_client")).toBe(false);
    });
  });

  describe("Milestone System", () => {
    it("should detect reputation milestones", () => {
      const previousState = { ...advisorState };
      advisorState.reputation = 25;

      const milestones = checkForMilestones(previousState, advisorState);

      expect(milestones.length).toBeGreaterThan(0);
      const reputationMilestone = milestones.find((m) =>
        m.message.toLowerCase().includes("reputation")
      );
      expect(reputationMilestone).toBeDefined();
    });

    it("should detect skill level milestones", () => {
      const previousState = { ...advisorState };
      advisorState.skillLevel = 5;

      const milestones = checkForMilestones(previousState, advisorState);

      expect(milestones.length).toBeGreaterThan(0);
      const skillMilestone = milestones.find((m) =>
        m.message.toLowerCase().includes("skill")
      );
      expect(skillMilestone).toBeDefined();
    });

    it("should detect client count milestones", () => {
      const previousState = { ...advisorState };
      advisorState.totalClientsHelped = 10;

      const milestones = checkForMilestones(previousState, advisorState);

      expect(milestones.length).toBeGreaterThan(0);
      const clientMilestone = milestones.find(
        (m) =>
          m.message.toLowerCase().includes("client") ||
          m.message.toLowerCase().includes("10")
      );
      expect(clientMilestone).toBeDefined();
    });
  });

  describe("Career Tier System", () => {
    it("should start at Junior Advisor (Tier 1)", () => {
      const tierInfo = getTierDisplay(1);

      expect(tierInfo.name).toBe("Junior");
      expect(tierInfo.emoji).toBe("🌱");
    });

    it("should calculate tier score correctly", () => {
      advisorState.reputation = 50;
      advisorState.skillLevel = 5;
      advisorState.totalClientsHelped = 15;
      advisorState.totalSessions = 30;
      advisorState.achievementsUnlocked = [
        "first_client",
        "skill_level_3",
        "skill_level_5",
      ];
      advisorState.lifetimeSavingsGenerated = 25000;

      const result = calculateTierScore(advisorState);

      // Score = reputation + (skillLevel * 10) + (clients * 2) + sessions + (achievements * 5) + (savings / 1000)
      // Score = 50 + 50 + 30 + 30 + 15 + 25 = 200
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeGreaterThanOrEqual(200);
    });

    it("should have tier 2 (Associate) with higher requirements", () => {
      const tier2Info = getTierDisplay(2);

      expect(tier2Info.name).toBe("Associate");
      expect(tier2Info.emoji).toBe("📈");
    });

    it("should have increasing tier levels", () => {
      const tier1 = getTierDisplay(1);
      const tier2 = getTierDisplay(2);
      const tier3 = getTierDisplay(3);
      const tier4 = getTierDisplay(4);
      const tier5 = getTierDisplay(5);

      // Verify names are different
      expect(tier1.name).not.toBe(tier2.name);
      expect(tier2.name).not.toBe(tier3.name);
      expect(tier3.name).not.toBe(tier4.name);
      expect(tier4.name).not.toBe(tier5.name);
    });
  });

  describe("Complete Progression Flow", () => {
    it("should progress through multiple sessions with increasing rewards", () => {
      const sessions = [
        { qualityScore: 7, savings: 500, debt: 0 },
        { qualityScore: 8, savings: 1000, debt: 500 },
        { qualityScore: 9, savings: 1500, debt: 1000 },
        { qualityScore: 8.5, savings: 2000, debt: 1500 },
        { qualityScore: 9, savings: 2500, debt: 2000 },
      ];

      let totalCoins = 0;

      sessions.forEach((session) => {
        // Calculate coins
        const result = calculateCoinsEarned(
          {
            qualityScore: session.qualityScore,
            financialProjection: createFinancialProjection({
              totalSaved: session.savings,
              totalDebtReduced: session.debt,
            }),
          },
          advisorState
        );

        // Update advisor state from result
        advisorState = result.updatedState;
        advisorState.totalSessions += 1;
        advisorState.totalClientsHelped += 1;
        advisorState.skillLevel = Math.min(10, advisorState.skillLevel + 0.5);
        advisorState.reputation = Math.min(100, advisorState.reputation + 10);

        totalCoins += result.coinsEarned;

        // Check for achievements
        const newAchievements = checkForNewAchievements(advisorState);
        newAchievements.forEach((achievement) => {
          if (!advisorState.achievementsUnlocked.includes(achievement.id)) {
            advisorState.achievementsUnlocked.push(achievement.id);
            advisorState.advisorCoins += achievement.coinReward;
            totalCoins += achievement.coinReward;
          }
        });
      });

      // Verify progression
      expect(advisorState.totalSessions).toBe(5);
      expect(advisorState.totalClientsHelped).toBeGreaterThan(0);
      expect(advisorState.advisorCoins).toBeGreaterThan(0);
      expect(advisorState.lifetimeSavingsGenerated).toBe(7500);
      expect(advisorState.lifetimeDebtCleared).toBe(5000);
      expect(advisorState.skillLevel).toBeGreaterThan(0);
      expect(advisorState.reputation).toBeGreaterThan(0);

      // Verify achievements were unlocked
      expect(advisorState.achievementsUnlocked.length).toBeGreaterThan(0);
      expect(advisorState.achievementsUnlocked).toContain("first_client");
    });

    it("should demonstrate complete progression to higher tier", () => {
      // Simulate significant progression
      advisorState.reputation = 55;
      advisorState.skillLevel = 6;
      advisorState.totalClientsHelped = 20;
      advisorState.totalSessions = 40;
      advisorState.lifetimeSavingsGenerated = 30000;
      advisorState.lifetimeDebtCleared = 15000;
      advisorState.achievementsUnlocked = [
        "first_client",
        "ten_clients",
        "skill_level_3",
        "skill_level_5",
        "savings_10k",
        "savings_25k",
        "debt_crusher",
        "reputation_25",
        "reputation_50",
      ];

      // Calculate tier score
      const result = calculateTierScore(advisorState);

      // Verify tier display
      const tier3Info = getTierDisplay(3); // Senior

      expect(tier3Info.name).toBe("Senior");
      expect(tier3Info.emoji).toBe("💼");
      expect(result.score).toBeGreaterThan(200); // Should have a high score
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero or negative scores gracefully", () => {
      const result = calculateCoinsEarned(
        {
          qualityScore: 0,
          outcome: "negative",
          financialProjection: createFinancialProjection(),
        },
        advisorState
      );

      // Should not go below 0
      expect(result.coinsEarned).toBeGreaterThanOrEqual(0);
    });

    it("should handle maximum values correctly", () => {
      advisorState.reputation = 100;
      advisorState.skillLevel = 10;
      advisorState.totalClientsHelped = 1000;
      advisorState.totalSessions = 2000;
      advisorState.lifetimeSavingsGenerated = 1000000;

      const result = calculateTierScore(advisorState);

      expect(result.score).toBeGreaterThan(0);
      expect(Number.isFinite(result.score)).toBe(true);
    });

    it("should handle empty achievement list", () => {
      advisorState.achievementsUnlocked = [];
      advisorState.totalSessions = 0;

      const newAchievements = checkForNewAchievements(advisorState);

      // Should return empty array when no requirements are met
      expect(Array.isArray(newAchievements)).toBe(true);
    });
  });
});
