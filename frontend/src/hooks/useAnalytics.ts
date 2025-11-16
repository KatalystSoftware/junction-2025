import { useQuery } from "@tanstack/react-query";
import { getSessionId } from "../services/sessionManager";

interface PerformanceStats {
  totalSessions: number;
  averageQualityScore: number;
  averageCommunicationScore: number;
  overallSuccessRate: number;
  qualityTrend: "improving" | "declining" | "stable";
  trendPercentage: number;
  scoreDistribution: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
  };
  empathyRate: number;
  actionabilityRate: number;
  accuracyRate: number;
  sessionsLast7Days: number;
  sessionsLast30Days: number;
  currentStreak: number;
  longestStreak: number;
}

interface TopicExpertiseData {
  topic: string;
  expertiseLevel: number;
  sessionCount: number;
  averageQuality: number;
  successRate: number;
  totalImpact: number;
  lastPracticed?: string;
}

interface TopicRadarChartData {
  topics: TopicExpertiseData[];
  overallExpertise: number;
  strongestTopic: string;
  weakestTopic: string;
  topicsNeedingPractice: string[];
}

interface FinancialImpactStats {
  lifetimeSavingsGenerated: number;
  lifetimeDebtCleared: number;
  lifetimeInterestSaved: number;
  totalClientsHelped: number;
  avgSavingsPerSession: number;
  avgDebtClearedPerSession: number;
  impactByTopic: Array<{
    topic: string;
    totalSavings: number;
    totalDebtCleared: number;
    sessionCount: number;
  }>;
  savingsLast30Days: number;
  debtClearedLast30Days: number;
  projectionAccuracy: number;
  totalCoinsEarned: number;
  avgCoinsPerSession: number;
}

interface AnalyticsDashboard {
  performance: PerformanceStats;
  topicExpertise: TopicRadarChartData;
  financialImpact: FinancialImpactStats;
  generatedAt: string;
  careerTier: number;
  currentReputation: number;
  currentSkillLevel: number;
}

export function useAnalytics() {
  const sessionId = getSessionId();

  return useQuery<AnalyticsDashboard>({
    queryKey: ["analytics", sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/game/analytics/${sessionId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }
      return response.json();
    },
    enabled: !!sessionId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

export type {
  AnalyticsDashboard,
  PerformanceStats,
  TopicExpertiseData,
  TopicRadarChartData,
  FinancialImpactStats,
};
