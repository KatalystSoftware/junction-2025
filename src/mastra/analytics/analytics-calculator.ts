/**
 * Analytics Calculator
 *
 * Core analytics calculation engine for the advisor dashboard
 */

import type {
  AdvisorState,
  ConsultationSession,
  FinancialTopic,
} from "../types/game-types.ts";
import type {
  AnalyticsDashboard,
  PerformanceStats,
  TopicRadarChartData,
  TopicExpertiseData,
  CharacterAnalytics,
  CharacterTypeStats,
  FinancialImpactStats,
  TrendAnalytics,
  TrendDataPoint,
  AnalyticsRecommendations,
  AnalyticsInsight,
} from "./analytics-types.ts";

// ============================================================================
// MAIN ANALYTICS CALCULATOR
// ============================================================================

export function calculateAnalyticsDashboard(
  advisorState: AdvisorState,
): AnalyticsDashboard {
  return {
    performance: calculatePerformanceStats(advisorState),
    topicExpertise: calculateTopicExpertise(advisorState),
    characterSuccess: calculateCharacterAnalytics(advisorState),
    financialImpact: calculateFinancialImpact(advisorState),
    trends: calculateTrends(advisorState),
    generatedAt: new Date().toISOString(),
    advisorId: "current", // Could be extended for multi-advisor support
    careerTier: advisorState.careerTier,
    currentReputation: advisorState.reputation,
    currentSkillLevel: advisorState.skillLevel,
  };
}

// ============================================================================
// PERFORMANCE STATISTICS
// ============================================================================

export function calculatePerformanceStats(
  advisorState: AdvisorState,
): PerformanceStats {
  const sessions = advisorState.sessionHistory;
  const totalSessions = sessions.length;

  if (totalSessions === 0) {
    return {
      totalSessions: 0,
      averageQualityScore: 0,
      averageCommunicationScore: 0,
      overallSuccessRate: 0,
      qualityTrend: "stable",
      trendPercentage: 0,
      scoreDistribution: { excellent: 0, good: 0, average: 0, poor: 0 },
      empathyRate: 0,
      actionabilityRate: 0,
      accuracyRate: 0,
      sessionsLast7Days: 0,
      sessionsLast30Days: 0,
      currentStreak: advisorState.currentStreak || 0,
      longestStreak: 0,
    };
  }

  // Calculate averages
  const avgQuality =
    sessions.reduce((sum, s) => sum + (s.adviceQualityScore || 0), 0) /
    totalSessions;
  const avgCommunication =
    sessions.reduce(
      (sum, s) =>
        sum + (s.evaluation?.dimensions?.communicationEffectiveness || 0),
      0,
    ) / totalSessions;

  // Success rate (quality >= 7)
  const successfulSessions = sessions.filter(
    (s) => (s.adviceQualityScore || 0) >= 7,
  ).length;
  const successRate = (successfulSessions / totalSessions) * 100;

  // Score distribution
  const excellent = sessions.filter(
    (s) => (s.adviceQualityScore || 0) >= 9,
  ).length;
  const good = sessions.filter(
    (s) => (s.adviceQualityScore || 0) >= 7 && (s.adviceQualityScore || 0) < 9,
  ).length;
  const average = sessions.filter(
    (s) => (s.adviceQualityScore || 0) >= 5 && (s.adviceQualityScore || 0) < 7,
  ).length;
  const poor = sessions.filter((s) => (s.adviceQualityScore || 0) < 5).length;

  // Trend analysis (last 10 vs previous 10)
  const { trend, percentage } = calculateQualityTrend(sessions);

  // Evaluation rates
  // Note: empathyRate calculated from communication effectiveness score as proxy
  const empathyRate =
    (sessions.filter(
      (s) => (s.evaluation?.dimensions?.communicationEffectiveness || 0) >= 7,
    ).length /
      totalSessions) *
    100;
  const actionabilityRate =
    (sessions.filter((s) => s.evaluation?.wasActionable).length /
      totalSessions) *
    100;
  const accuracyRate =
    (sessions.filter((s) => s.evaluation?.wasAccurate).length / totalSessions) *
    100;

  // Time-based metrics
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const sessionsLast7Days = sessions.filter(
    (s) => new Date(s.timestamp) >= sevenDaysAgo,
  ).length;
  const sessionsLast30Days = sessions.filter(
    (s) => new Date(s.timestamp) >= thirtyDaysAgo,
  ).length;

  // Calculate longest streak
  const longestStreak = calculateLongestStreak(sessions);

  return {
    totalSessions,
    averageQualityScore: parseFloat(avgQuality.toFixed(2)),
    averageCommunicationScore: parseFloat(avgCommunication.toFixed(2)),
    overallSuccessRate: parseFloat(successRate.toFixed(2)),
    qualityTrend: trend,
    trendPercentage: parseFloat(percentage.toFixed(2)),
    scoreDistribution: {
      excellent,
      good,
      average,
      poor,
    },
    empathyRate: parseFloat(empathyRate.toFixed(2)),
    actionabilityRate: parseFloat(actionabilityRate.toFixed(2)),
    accuracyRate: parseFloat(accuracyRate.toFixed(2)),
    sessionsLast7Days,
    sessionsLast30Days,
    currentStreak: advisorState.currentStreak || 0,
    longestStreak,
  };
}

function calculateQualityTrend(sessions: ConsultationSession[]): {
  trend: "improving" | "declining" | "stable";
  percentage: number;
} {
  if (sessions.length < 10) {
    return { trend: "stable", percentage: 0 };
  }

  const recentSessions = sessions.slice(-10);
  const previousSessions = sessions.slice(-20, -10);

  if (previousSessions.length === 0) {
    return { trend: "stable", percentage: 0 };
  }

  const recentAvg =
    recentSessions.reduce((sum, s) => sum + (s.adviceQualityScore || 0), 0) /
    recentSessions.length;
  const previousAvg =
    previousSessions.reduce((sum, s) => sum + (s.adviceQualityScore || 0), 0) /
    previousSessions.length;

  const percentage =
    previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

  let trend: "improving" | "declining" | "stable" = "stable";
  if (percentage > 5) trend = "improving";
  else if (percentage < -5) trend = "declining";

  return { trend, percentage };
}

function calculateLongestStreak(sessions: ConsultationSession[]): number {
  let currentStreak = 0;
  let maxStreak = 0;

  for (const session of sessions) {
    if ((session.adviceQualityScore || 0) >= 7) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
}

// ============================================================================
// TOPIC EXPERTISE ANALYTICS
// ============================================================================

export function calculateTopicExpertise(
  advisorState: AdvisorState,
): TopicRadarChartData {
  const allTopics: FinancialTopic[] = [
    "budgeting",
    "saving",
    "debt_management",
    "investing",
    "loans",
    "insurance",
    "retirement",
    "emergency_fund",
    "credit_score",
    "scam_awareness",
  ];

  const topicData: TopicExpertiseData[] = allTopics.map((topic) => {
    const topicSessions = advisorState.sessionHistory.filter((s) =>
      s.topicsCovered?.includes(topic),
    );

    const sessionCount = topicSessions.length;
    const avgQuality =
      sessionCount > 0
        ? topicSessions.reduce(
            (sum, s) => sum + (s.adviceQualityScore || 0),
            0,
          ) / sessionCount
        : 0;

    const successfulSessions = topicSessions.filter(
      (s) => (s.adviceQualityScore || 0) >= 7,
    ).length;
    const successRate =
      sessionCount > 0 ? (successfulSessions / sessionCount) * 100 : 0;

    const totalImpact = topicSessions.reduce((sum, s) => {
      const savings = s.financialProjection?.totalSaved || 0;
      const debtCleared = s.financialProjection?.totalDebtReduced || 0;
      return sum + savings + debtCleared;
    }, 0);

    const lastSession = topicSessions[topicSessions.length - 1];
    const lastPracticed = lastSession?.timestamp;

    return {
      topic,
      expertiseLevel: advisorState.topicsExpertise?.[topic] || 0,
      sessionCount,
      averageQuality: parseFloat(avgQuality.toFixed(2)),
      successRate: parseFloat(successRate.toFixed(2)),
      totalImpact: parseFloat(totalImpact.toFixed(2)),
      lastPracticed,
    };
  });

  const overallExpertise =
    topicData.reduce((sum, t) => sum + t.expertiseLevel, 0) / topicData.length;

  const sortedByExpertise = [...topicData].sort(
    (a, b) => b.expertiseLevel - a.expertiseLevel,
  );
  const strongestTopic = sortedByExpertise[0]?.topic || "budgeting";
  const weakestTopic =
    sortedByExpertise[sortedByExpertise.length - 1]?.topic || "budgeting";

  // Topics not practiced in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const topicsNeedingPractice = topicData
    .filter((t) => {
      if (!t.lastPracticed) return true;
      return new Date(t.lastPracticed) < thirtyDaysAgo;
    })
    .map((t) => t.topic);

  return {
    topics: topicData,
    overallExpertise: parseFloat(overallExpertise.toFixed(2)),
    strongestTopic,
    weakestTopic,
    topicsNeedingPractice,
  };
}

// ============================================================================
// CHARACTER ANALYTICS
// ============================================================================

export function calculateCharacterAnalytics(
  advisorState: AdvisorState,
): CharacterAnalytics {
  // Get unique character IDs from session history
  const characterIds = Array.from(
    new Set(advisorState.sessionHistory.map((s) => s.characterId)),
  );

  const characterStats: CharacterTypeStats[] = characterIds.map(
    (characterId) => {
      const characterSessions = advisorState.sessionHistory.filter(
        (s) => s.characterId === characterId,
      );

      const totalSessions = characterSessions.length;
      const avgQuality =
        totalSessions > 0
          ? characterSessions.reduce(
              (sum, s) => sum + (s.adviceQualityScore || 0),
              0,
            ) / totalSessions
          : 0;

      const successfulSessions = characterSessions.filter(
        (s) => (s.adviceQualityScore || 0) >= 7,
      ).length;
      const successRate =
        totalSessions > 0 ? (successfulSessions / totalSessions) * 100 : 0;

      // Get relationship data from character pool
      // Since conversationHistory is removed, we'll use default values
      // The actual relationship data should come from characterPool
      const trustLevel = 0; // This would need to be fetched from characterPool
      const trustTier = "stranger"; // Default tier
      const visitCount = totalSessions;

      // Relationship strength
      let relationshipStrength: "weak" | "moderate" | "strong" | "excellent" =
        "weak";
      if (trustLevel >= 0.8) relationshipStrength = "excellent";
      else if (trustLevel >= 0.6) relationshipStrength = "strong";
      else if (trustLevel >= 0.4) relationshipStrength = "moderate";

      // Count outcomes (this is simplified - could be enhanced with actual outcome tracking)
      const positiveOutcomes = characterSessions.filter(
        (s) => (s.adviceQualityScore || 0) >= 8,
      ).length;
      const neutralOutcomes = characterSessions.filter(
        (s) =>
          (s.adviceQualityScore || 0) >= 5 && (s.adviceQualityScore || 0) < 8,
      ).length;
      const negativeOutcomes = characterSessions.filter(
        (s) => (s.adviceQualityScore || 0) < 5,
      ).length;

      // Financial impact on this character
      const totalSavingsGenerated = characterSessions.reduce(
        (sum, s) => sum + (s.financialProjection?.totalSaved || 0),
        0,
      );
      const totalDebtCleared = characterSessions.reduce(
        (sum, s) => sum + (s.financialProjection?.totalDebtReduced || 0),
        0,
      );

      return {
        characterId,
        characterName: characterId
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        totalSessions,
        averageQuality: parseFloat(avgQuality.toFixed(2)),
        successRate: parseFloat(successRate.toFixed(2)),
        trustLevel: parseFloat(trustLevel.toFixed(2)),
        trustTier,
        visitCount,
        relationshipStrength,
        adviceFollowed: positiveOutcomes, // Simplified
        positiveOutcomes,
        neutralOutcomes,
        negativeOutcomes,
        totalSavingsGenerated: parseFloat(totalSavingsGenerated.toFixed(2)),
        totalDebtCleared: parseFloat(totalDebtCleared.toFixed(2)),
      };
    },
  );

  const sortedBySuccess = [...characterStats].sort(
    (a, b) => b.successRate - a.successRate,
  );
  const mostSuccessfulCharacter = sortedBySuccess[0]?.characterName || "None";
  const mostChallengingCharacter =
    sortedBySuccess[sortedBySuccess.length - 1]?.characterName || "None";

  const avgSuccessRate =
    characterStats.length > 0
      ? characterStats.reduce((sum, c) => sum + c.successRate, 0) /
        characterStats.length
      : 0;

  const totalActiveRelationships = characterStats.filter(
    (c) => c.trustLevel > 0.2,
  ).length;

  return {
    byCharacter: characterStats,
    mostSuccessfulCharacter,
    mostChallengingCharacter,
    averageSuccessRate: parseFloat(avgSuccessRate.toFixed(2)),
    totalActiveRelationships,
  };
}

// ============================================================================
// FINANCIAL IMPACT ANALYTICS
// ============================================================================

export function calculateFinancialImpact(
  advisorState: AdvisorState,
): FinancialImpactStats {
  const sessions = advisorState.sessionHistory;
  const totalSessions = sessions.length;

  const lifetimeSavingsGenerated = advisorState.lifetimeSavingsGenerated || 0;
  const lifetimeDebtCleared = advisorState.lifetimeDebtCleared || 0;

  // Calculate total interest saved (approximation)
  const lifetimeInterestSaved = sessions.reduce(
    (sum, s) => sum + (s.financialProjection?.totalInterestSaved || 0),
    0,
  );

  const totalClientsHelped = new Set(sessions.map((s) => s.characterId)).size;

  const avgSavingsPerSession =
    totalSessions > 0 ? lifetimeSavingsGenerated / totalSessions : 0;
  const avgDebtClearedPerSession =
    totalSessions > 0 ? lifetimeDebtCleared / totalSessions : 0;

  // Impact by topic
  const allTopics: FinancialTopic[] = [
    "budgeting",
    "saving",
    "debt_management",
    "investing",
    "loans",
    "insurance",
    "retirement",
    "emergency_fund",
    "credit_score",
    "scam_awareness",
  ];

  const impactByTopic = allTopics.map((topic) => {
    const topicSessions = sessions.filter((s) =>
      s.topicsCovered?.includes(topic),
    );
    const totalSavings = topicSessions.reduce(
      (sum, s) => sum + (s.financialProjection?.totalSaved || 0),
      0,
    );
    const totalDebtCleared = topicSessions.reduce(
      (sum, s) => sum + (s.financialProjection?.totalDebtReduced || 0),
      0,
    );

    return {
      topic,
      totalSavings: parseFloat(totalSavings.toFixed(2)),
      totalDebtCleared: parseFloat(totalDebtCleared.toFixed(2)),
      sessionCount: topicSessions.length,
    };
  });

  // Recent trends (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentSessions = sessions.filter(
    (s) => new Date(s.timestamp) >= thirtyDaysAgo,
  );

  const savingsLast30Days = recentSessions.reduce(
    (sum, s) => sum + (s.financialProjection?.totalSaved || 0),
    0,
  );
  const debtClearedLast30Days = recentSessions.reduce(
    (sum, s) => sum + (s.financialProjection?.totalDebtReduced || 0),
    0,
  );

  // Projection accuracy (if we have actual results)
  const sessionsWithActuals = sessions.filter((s) => s.actualResult);
  const projectionAccuracy =
    sessionsWithActuals.length > 0
      ? (sessionsWithActuals.filter((s) => {
          const projected = s.financialProjection?.totalSaved || 0;
          const actual = s.actualResult?.moneySaved || 0;
          const accuracy = projected > 0 ? Math.abs(1 - actual / projected) : 0;
          return accuracy <= 0.2; // Within 20% is considered accurate
        }).length /
          sessionsWithActuals.length) *
        100
      : 0;

  // Coins earned
  const totalCoinsEarned = advisorState.advisorCoins || 0;
  const avgCoinsPerSession =
    totalSessions > 0 ? totalCoinsEarned / totalSessions : 0;

  // Coins by quality ranges
  const qualityRanges = [
    { range: "9-10", min: 9, max: 10 },
    { range: "7-8", min: 7, max: 9 },
    { range: "5-6", min: 5, max: 7 },
    { range: "0-4", min: 0, max: 5 },
  ];

  const coinsByQuality = qualityRanges.map(({ range, min, max }) => {
    const rangeSessions = sessions.filter(
      (s) =>
        (s.adviceQualityScore || 0) >= min && (s.adviceQualityScore || 0) < max,
    );
    const avgCoins =
      rangeSessions.length > 0
        ? rangeSessions.reduce((sum, s) => sum + (s.coinsEarned || 0), 0) /
          rangeSessions.length
        : 0;

    return {
      qualityRange: range,
      avgCoins: parseFloat(avgCoins.toFixed(2)),
    };
  });

  return {
    lifetimeSavingsGenerated: parseFloat(lifetimeSavingsGenerated.toFixed(2)),
    lifetimeDebtCleared: parseFloat(lifetimeDebtCleared.toFixed(2)),
    lifetimeInterestSaved: parseFloat(lifetimeInterestSaved.toFixed(2)),
    totalClientsHelped,
    avgSavingsPerSession: parseFloat(avgSavingsPerSession.toFixed(2)),
    avgDebtClearedPerSession: parseFloat(avgDebtClearedPerSession.toFixed(2)),
    impactByTopic,
    savingsLast30Days: parseFloat(savingsLast30Days.toFixed(2)),
    debtClearedLast30Days: parseFloat(debtClearedLast30Days.toFixed(2)),
    projectionAccuracy: parseFloat(projectionAccuracy.toFixed(2)),
    totalCoinsEarned,
    avgCoinsPerSession: parseFloat(avgCoinsPerSession.toFixed(2)),
    coinsByQuality,
  };
}

// ============================================================================
// TREND ANALYTICS
// ============================================================================

export function calculateTrends(advisorState: AdvisorState): TrendAnalytics {
  const sessions = advisorState.sessionHistory;

  const dataPoints: TrendDataPoint[] = sessions.map((session, index) => ({
    timestamp: session.timestamp,
    sessionNumber: index + 1,
    qualityScore: session.adviceQualityScore || 0,
    reputation: advisorState.reputation, // This should ideally be tracked per session
    skillLevel: advisorState.skillLevel, // This should ideally be tracked per session
    coinsEarned: session.coinsEarned || 0,
    savingsGenerated: session.financialProjection?.totalSaved || 0,
    debtCleared: session.financialProjection?.totalDebtReduced || 0,
  }));

  const qualityTrend = sessions.map((s) => s.adviceQualityScore || 0);
  const reputationTrend = dataPoints.map((d) => d.reputation);
  const skillTrend = dataPoints.map((d) => d.skillLevel);

  // Moving averages
  const last7 = qualityTrend.slice(-7);
  const last30 = qualityTrend.slice(-30);

  const qualityMA7 =
    last7.length > 0 ? last7.reduce((sum, q) => sum + q, 0) / last7.length : 0;
  const qualityMA30 =
    last30.length > 0
      ? last30.reduce((sum, q) => sum + q, 0) / last30.length
      : 0;

  return {
    dataPoints,
    qualityTrend,
    reputationTrend,
    skillTrend,
    qualityMA7: parseFloat(qualityMA7.toFixed(2)),
    qualityMA30: parseFloat(qualityMA30.toFixed(2)),
  };
}

// ============================================================================
// INSIGHTS & RECOMMENDATIONS
// ============================================================================

export function generateAnalyticsInsights(
  dashboard: AnalyticsDashboard,
): AnalyticsRecommendations {
  const insights: AnalyticsInsight[] = [];

  // Performance insights
  if (dashboard.performance.qualityTrend === "improving") {
    insights.push({
      type: "success",
      category: "performance",
      title: "Quality Improving",
      message: `Your advice quality has improved by ${dashboard.performance.trendPercentage.toFixed(1)}% recently. Keep up the great work!`,
      priority: "low",
    });
  } else if (dashboard.performance.qualityTrend === "declining") {
    insights.push({
      type: "warning",
      category: "performance",
      title: "Quality Declining",
      message: `Your advice quality has decreased by ${Math.abs(dashboard.performance.trendPercentage).toFixed(1)}% recently.`,
      actionable: "Review recent sessions and focus on weak areas",
      priority: "high",
    });
  }

  // Topic expertise insights
  if (dashboard.topicExpertise.topicsNeedingPractice.length > 0) {
    insights.push({
      type: "info",
      category: "expertise",
      title: "Topics Need Practice",
      message: `You haven't practiced ${dashboard.topicExpertise.topicsNeedingPractice.length} topics in the last 30 days.`,
      actionable: `Focus on: ${dashboard.topicExpertise.topicsNeedingPractice.slice(0, 3).join(", ")}`,
      priority: "medium",
    });
  }

  // Character relationship insights
  if (dashboard.characterSuccess.totalActiveRelationships < 3) {
    insights.push({
      type: "tip",
      category: "relationships",
      title: "Build More Relationships",
      message: `You have ${dashboard.characterSuccess.totalActiveRelationships} active client relationships.`,
      actionable: "Try helping more diverse clients to build your network",
      priority: "medium",
    });
  }

  // Financial impact insights
  if (dashboard.financialImpact.lifetimeSavingsGenerated > 10000) {
    insights.push({
      type: "success",
      category: "financial",
      title: "Major Impact Milestone",
      message: `You've helped clients save €${dashboard.financialImpact.lifetimeSavingsGenerated.toFixed(0)}!`,
      priority: "low",
    });
  }

  // Focus areas (weakest topics)
  const sortedTopics = [...dashboard.topicExpertise.topics].sort(
    (a, b) => a.expertiseLevel - b.expertiseLevel,
  );
  const focusAreas = sortedTopics.slice(0, 3).map((t) => t.topic);

  // Strength areas (strongest topics)
  const strengthAreas = sortedTopics
    .slice(-3)
    .reverse()
    .map((t) => t.topic);

  // Relationships to nurture (lowest trust levels)
  const sortedCharacters = [...dashboard.characterSuccess.byCharacter].sort(
    (a, b) => a.trustLevel - b.trustLevel,
  );
  const relationshipsToNurture = sortedCharacters
    .slice(0, 3)
    .map((c) => c.characterId);

  return {
    insights,
    focusAreas,
    strengthAreas,
    relationshipsToNurture,
  };
}
