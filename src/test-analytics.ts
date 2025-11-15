/**
 * Analytics Test Script
 *
 * Test the analytics system with mock data
 */

import type { AdvisorState, ConsultationSession } from "./mastra/types/game-types.ts";
import {
  calculateAnalyticsDashboard,
  calculatePerformanceStats,
  calculateTopicExpertise,
  calculateCharacterAnalytics,
  calculateFinancialImpact,
  generateAnalyticsInsights,
} from "./mastra/analytics/index.ts";

// Create mock advisor state with session history
function createMockAdvisorState(): AdvisorState {
  const sessions: ConsultationSession[] = [];

  // Generate 20 mock sessions
  for (let i = 0; i < 20; i++) {
    const quality = 5 + Math.random() * 5; // 5-10 range
    const timestamp = new Date(Date.now() - (20 - i) * 24 * 60 * 60 * 1000).toISOString();

    sessions.push({
      sessionId: `session-${i}`,
      characterId: `character-${i % 5}`, // 5 different characters
      scenarioId: `scenario-${i}`,
      timestamp,
      adviceQualityScore: quality,
      topicsCovered: [
        ["budgeting", "saving", "debt_management"][i % 3] as any,
      ],
      evaluation: {
        adviceQuality: quality,
        communicationEffectiveness: quality + Math.random() - 0.5,
        learningObjectives: quality + Math.random() - 0.5,
        characterProgression: quality + Math.random() - 0.5,
        wasEmpathetic: quality >= 7,
        wasActionable: quality >= 6,
        wasAccurate: quality >= 7,
      },
      financialProjection: {
        monthlySavings: 100 + Math.random() * 200,
        totalSaved: 1000 + Math.random() * 5000,
        savingsRate: 0.1 + Math.random() * 0.2,
        totalDebtReduced: 500 + Math.random() * 2000,
        monthsToGoal: 12,
        emergencyFundProgress: Math.random(),
        debtFreeProgress: Math.random(),
        projectionPeriodMonths: 12,
      },
      actualResult: undefined,
      coinsEarned: Math.floor(quality * 10),
    });
  }

  const advisorState: AdvisorState = {
    sessionId: "test-session",
    sessionHistory: sessions,
    totalSessions: sessions.length,
    reputation: 75,
    skillLevel: 6,
    topicsExpertise: {
      budgeting: 7,
      saving: 6,
      debt_management: 5,
      investing: 4,
      loans: 3,
      insurance: 3,
      retirement: 2,
      emergency_fund: 5,
      credit_score: 4,
      scam_awareness: 3,
    },
    lifetimeSavingsGenerated: 45000,
    lifetimeDebtCleared: 28000,
    advisorCoins: 1500,
    activeClients: [],
    activeThreads: [],
    conversationHistory: [],
    currentStreak: 3,
    currentGoal: null,
    achievementsUnlocked: ["first_client", "ten_clients", "skill_level_3"],
    careerTier: 2,
    lastReviewSession: 10,
  };

  return advisorState;
}

// Run tests
async function runAnalyticsTests() {
  console.log("🧪 Testing Analytics System\n");
  console.log("═".repeat(60));

  const advisorState = createMockAdvisorState();

  // Test 1: Performance Stats
  console.log("\n1️⃣  Performance Statistics");
  console.log("─".repeat(60));
  const performance = calculatePerformanceStats(advisorState);
  console.log(`Total Sessions: ${performance.totalSessions}`);
  console.log(`Average Quality: ${performance.averageQualityScore.toFixed(2)}/10`);
  console.log(`Success Rate: ${performance.overallSuccessRate.toFixed(2)}%`);
  console.log(`Trend: ${performance.qualityTrend} (${performance.trendPercentage.toFixed(1)}%)`);
  console.log(`Current Streak: ${performance.currentStreak}`);
  console.log(`Longest Streak: ${performance.longestStreak}`);

  // Test 2: Topic Expertise
  console.log("\n2️⃣  Topic Expertise");
  console.log("─".repeat(60));
  const expertise = calculateTopicExpertise(advisorState);
  console.log(`Overall Expertise: ${expertise.overallExpertise.toFixed(2)}/10`);
  console.log(`Strongest Topic: ${expertise.strongestTopic}`);
  console.log(`Weakest Topic: ${expertise.weakestTopic}`);
  console.log(`\nTop 3 Topics by Expertise:`);
  expertise.topics
    .sort((a, b) => b.expertiseLevel - a.expertiseLevel)
    .slice(0, 3)
    .forEach((topic, i) => {
      console.log(
        `  ${i + 1}. ${topic.topic}: ${topic.expertiseLevel.toFixed(1)}/10 (${topic.sessionCount} sessions, ${topic.successRate.toFixed(0)}% success)`
      );
    });

  // Test 3: Character Analytics
  console.log("\n3️⃣  Character Success Rates");
  console.log("─".repeat(60));
  const characters = calculateCharacterAnalytics(advisorState);
  console.log(`Average Success Rate: ${characters.averageSuccessRate.toFixed(2)}%`);
  console.log(`Active Relationships: ${characters.totalActiveRelationships}`);
  console.log(`Most Successful: ${characters.mostSuccessfulCharacter}`);
  console.log(`Most Challenging: ${characters.mostChallengingCharacter}`);
  console.log(`\nCharacter Breakdown:`);
  characters.byCharacter.slice(0, 3).forEach((char) => {
    console.log(
      `  ${char.characterName}: ${char.successRate.toFixed(0)}% success, ${char.totalSessions} sessions, ${char.relationshipStrength} relationship`
    );
  });

  // Test 4: Financial Impact
  console.log("\n4️⃣  Financial Impact");
  console.log("─".repeat(60));
  const financial = calculateFinancialImpact(advisorState);
  console.log(`Lifetime Savings: €${financial.lifetimeSavingsGenerated.toFixed(0)}`);
  console.log(`Lifetime Debt Cleared: €${financial.lifetimeDebtCleared.toFixed(0)}`);
  console.log(`Total Clients Helped: ${financial.totalClientsHelped}`);
  console.log(`Avg Savings/Session: €${financial.avgSavingsPerSession.toFixed(0)}`);
  console.log(`Total Coins Earned: ${financial.totalCoinsEarned}`);
  console.log(`Avg Coins/Session: ${financial.avgCoinsPerSession.toFixed(1)}`);

  // Test 5: Complete Dashboard
  console.log("\n5️⃣  Complete Analytics Dashboard");
  console.log("─".repeat(60));
  const dashboard = calculateAnalyticsDashboard(advisorState);
  console.log(`Dashboard Generated: ${new Date(dashboard.generatedAt).toLocaleString()}`);
  console.log(`Advisor ID: ${dashboard.advisorId}`);
  console.log(`Career Tier: ${dashboard.careerTier}`);
  console.log(`Current Reputation: ${dashboard.currentReputation}/100`);
  console.log(`Current Skill Level: ${dashboard.currentSkillLevel}/10`);

  // Test 6: Insights & Recommendations
  console.log("\n6️⃣  Insights & Recommendations");
  console.log("─".repeat(60));
  const insights = generateAnalyticsInsights(dashboard);
  console.log(`Total Insights: ${insights.insights.length}`);
  console.log(`\nInsights:`);
  insights.insights.forEach((insight, i) => {
    const icon =
      insight.type === "success"
        ? "✅"
        : insight.type === "warning"
          ? "⚠️"
          : insight.type === "info"
            ? "ℹ️"
            : "💡";
    console.log(`  ${icon} [${insight.category}] ${insight.title}: ${insight.message}`);
    if (insight.actionable) {
      console.log(`     → ${insight.actionable}`);
    }
  });

  console.log(`\nFocus Areas: ${insights.focusAreas.join(", ")}`);
  console.log(`Strength Areas: ${insights.strengthAreas.join(", ")}`);

  // Test 7: Export to JSON
  console.log("\n7️⃣  JSON Export Test");
  console.log("─".repeat(60));
  const json = JSON.stringify(dashboard, null, 2);
  console.log(`JSON Length: ${json.length} characters`);
  console.log(`Successfully exported dashboard to JSON ✓`);

  console.log("\n═".repeat(60));
  console.log("✅ All analytics tests completed successfully!\n");
}

// Run the tests
runAnalyticsTests().catch(console.error);
