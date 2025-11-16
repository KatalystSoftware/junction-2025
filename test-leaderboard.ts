/**
 * Test script for leaderboard features
 */

import { leaderboardService } from "./src/mastra/persistence/leaderboard-service.ts";
import { initializeChallenges } from "./src/mastra/game/challenge-manager.ts";
import type { AdvisorState } from "./src/mastra/types/game-types.ts";

async function testLeaderboard() {
  console.log("🧪 Testing Leaderboard System...\n");

  try {
    // 1. Initialize database
    console.log("1️⃣ Initializing database...");
    await leaderboardService.initialize();
    console.log("✅ Database initialized\n");

    // 2. Initialize challenges
    console.log("2️⃣ Creating challenges...");
    await initializeChallenges();
    console.log("✅ Challenges created\n");

    // 3. Create test advisor
    console.log("3️⃣ Creating test advisor...");
    const testAdvisor: AdvisorState = {
      advisorId: "test-advisor-1",
      reputation: 75,
      skillLevel: 6,
      specializations: ["budgeting", "debt_management"],
      topicsExpertise: {
        budgeting: 7,
        saving: 5,
        debt_management: 8,
        investing: 3,
        loans: 4,
        insurance: 2,
        retirement: 2,
        emergency_fund: 5,
        credit_score: 4,
        scam_awareness: 3,
      },
      sessionHistory: [
        {
          sessionId: "s1",
          characterId: "c1",
          characterName: "Test Character",
          scenarioId: "sc1",
          timestamp: new Date().toISOString(),
          playerAdvice: ["Good advice"],
          characterReactions: ["Thank you!"],
          adviceQualityScore: 8,
          topicsCovered: ["budgeting"],
          followUpScheduled: false,
          outcomeRevealed: true,
          duration: 1,
        },
      ],
      totalClientsHelped: 25,
      activeClients: [],
      activeThreads: {},
      godBossRelationship: 7,
      learningMaterials: [],
      totalSessions: 40,
      lastReviewSession: 30,
      hasCompletedOnboarding: true,
      currentStreak: 3,
      lastStreakCheckSession: 40,
      advisorCoins: 5000,
      lifetimeSavingsGenerated: 15000,
      lifetimeDebtCleared: 8000,
      currentGoal: null,
      achievementsUnlocked: ["first_client", "skill_3", "reputation_50"],
      careerTier: 3,
    };

    await leaderboardService.upsertLeaderboardEntry(testAdvisor, "Test Advisor");
    console.log("✅ Test advisor created\n");

    // 4. Get career tiers
    console.log("4️⃣ Fetching career tiers...");
    const tiers = await leaderboardService.getCareerTiers();
    console.log(`✅ Found ${tiers.length} career tiers:`);
    tiers.forEach((tier) => {
      console.log(`   ${tier.tierEmoji} ${tier.tierName} - Min Rep: ${tier.minReputation}`);
    });
    console.log();

    // 5. Calculate advisor tier
    console.log("5️⃣ Calculating advisor tier...");
    const advisorTier = await leaderboardService.calculateAdvisorTier(testAdvisor);
    console.log(
      `✅ Test advisor tier: ${advisorTier.tierEmoji} ${advisorTier.tierName}\n`
    );

    // 6. Get next tier progress
    console.log("6️⃣ Checking next tier progress...");
    const progress = await leaderboardService.getNextTierProgress(testAdvisor);
    console.log(`✅ Current: ${progress.currentTier.tierName}`);
    if (progress.nextTier) {
      console.log(`   Next: ${progress.nextTier.tierName}`);
      console.log(`   Progress: ${Object.entries(progress.progress).map(([k, v]) => `${k}=${Math.round(v * 100)}%`).join(", ")}`);
    } else {
      console.log("   Maximum tier reached!");
    }
    console.log();

    // 7. Get active challenges
    console.log("7️⃣ Fetching active challenges...");
    const challenges = await leaderboardService.getActiveChallenges();
    console.log(`✅ Found ${challenges.length} active challenges:`);
    challenges.forEach((c) => {
      console.log(
        `   ${c.badgeEmoji} ${c.challengeName} (${c.challengeType}) - ${c.targetValue} ${c.metricType}`
      );
    });
    console.log();

    // 8. Get leaderboard
    console.log("8️⃣ Fetching global leaderboard...");
    const leaderboard = await leaderboardService.getLeaderboard("global", 10);
    console.log(
      `✅ Leaderboard (${leaderboard.totalParticipants} participants):`
    );
    leaderboard.entries.forEach((entry) => {
      console.log(
        `   #${entry.globalRank || "?"} ${entry.advisorName} - Rep: ${entry.reputation}, Skill: ${entry.skillLevel}`
      );
    });
    console.log();

    // 9. Recalculate rankings
    console.log("9️⃣ Recalculating rankings...");
    await leaderboardService.recalculateRankings();
    console.log("✅ Rankings recalculated\n");

    console.log("🎉 All tests passed!\n");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    await leaderboardService.close();
  }
}

// Run tests
testLeaderboard().catch(console.error);
