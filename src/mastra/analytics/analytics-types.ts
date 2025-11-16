/**
 * Analytics Dashboard Types
 *
 * Backend data structures for analytics calculations
 */

import type { FinancialTopic } from "../types/game-types.ts";

// ============================================================================
// ADVISOR PERFORMANCE ANALYTICS
// ============================================================================

export interface PerformanceStats {
  // Overall metrics
  totalSessions: number;
  averageQualityScore: number;
  averageCommunicationScore: number;
  overallSuccessRate: number; // % of sessions with quality >= 7

  // Trends (last 10 sessions vs previous 10)
  qualityTrend: "improving" | "declining" | "stable";
  trendPercentage: number; // % change

  // Score distribution
  scoreDistribution: {
    excellent: number; // 9-10
    good: number; // 7-8
    average: number; // 5-6
    poor: number; // 0-4
  };

  // Session outcomes
  empathyRate: number; // % sessions marked empathetic
  actionabilityRate: number; // % sessions marked actionable
  accuracyRate: number; // % sessions marked accurate

  // Time-based metrics
  sessionsLast7Days: number;
  sessionsLast30Days: number;
  currentStreak: number;
  longestStreak: number;
}

// ============================================================================
// TOPIC EXPERTISE ANALYTICS
// ============================================================================

export interface TopicExpertiseData {
  topic: FinancialTopic;
  expertiseLevel: number; // 0-10
  sessionCount: number;
  averageQuality: number;
  successRate: number; // % of sessions with quality >= 7
  totalImpact: number; // Total financial impact in EUR
  lastPracticed?: string; // ISO timestamp
}

export interface TopicRadarChartData {
  topics: TopicExpertiseData[];
  overallExpertise: number; // Average across all topics
  strongestTopic: FinancialTopic;
  weakestTopic: FinancialTopic;
  topicsNeedingPractice: FinancialTopic[]; // Topics not practiced recently
}

// ============================================================================
// CHARACTER TYPE SUCCESS RATES
// ============================================================================

export interface CharacterTypeStats {
  characterId: string;
  characterName: string;
  totalSessions: number;
  averageQuality: number;
  successRate: number;
  trustLevel: number;
  trustTier: string;

  // Relationship metrics
  visitCount: number;
  relationshipStrength: "weak" | "moderate" | "strong" | "excellent";

  // Outcomes
  adviceFollowed: number; // Count of advice they followed
  positiveOutcomes: number;
  neutralOutcomes: number;
  negativeOutcomes: number;

  // Financial impact on this character
  totalSavingsGenerated: number;
  totalDebtCleared: number;
}

export interface CharacterAnalytics {
  byCharacter: CharacterTypeStats[];
  mostSuccessfulCharacter: string;
  mostChallengingCharacter: string;
  averageSuccessRate: number;
  totalActiveRelationships: number;
}

// ============================================================================
// FINANCIAL IMPACT ANALYTICS
// ============================================================================

export interface FinancialImpactStats {
  // Lifetime totals
  lifetimeSavingsGenerated: number;
  lifetimeDebtCleared: number;
  lifetimeInterestSaved: number;
  totalClientsHelped: number;

  // Average impact per session
  avgSavingsPerSession: number;
  avgDebtClearedPerSession: number;

  // Impact by topic
  impactByTopic: {
    topic: FinancialTopic;
    totalSavings: number;
    totalDebtCleared: number;
    sessionCount: number;
  }[];

  // Recent trends
  savingsLast30Days: number;
  debtClearedLast30Days: number;

  // Projections vs actuals
  projectionAccuracy: number; // % accuracy between projected and actual outcomes

  // ROI metrics
  totalCoinsEarned: number;
  avgCoinsPerSession: number;
  coinsByQuality: {
    qualityRange: string; // e.g., "9-10", "7-8"
    avgCoins: number;
  }[];
}

// ============================================================================
// TIME-SERIES DATA FOR TRENDS
// ============================================================================

export interface TrendDataPoint {
  timestamp: string; // ISO date
  sessionNumber: number;
  qualityScore: number;
  reputation: number;
  skillLevel: number;
  coinsEarned: number;
  savingsGenerated: number;
  debtCleared: number;
}

export interface TrendAnalytics {
  dataPoints: TrendDataPoint[];
  qualityTrend: number[]; // Last N quality scores
  reputationTrend: number[]; // Last N reputation values
  skillTrend: number[]; // Last N skill levels

  // Moving averages
  qualityMA7: number; // 7-session moving average
  qualityMA30: number; // 30-session moving average
}

// ============================================================================
// COMPREHENSIVE ANALYTICS DASHBOARD
// ============================================================================

export interface AnalyticsDashboard {
  performance: PerformanceStats;
  topicExpertise: TopicRadarChartData;
  characterSuccess: CharacterAnalytics;
  financialImpact: FinancialImpactStats;
  trends: TrendAnalytics;

  // Metadata
  generatedAt: string; // ISO timestamp
  advisorId: string;
  careerTier: number;
  currentReputation: number;
  currentSkillLevel: number;
}

// ============================================================================
// INSIGHTS & RECOMMENDATIONS
// ============================================================================

export interface AnalyticsInsight {
  type: "success" | "warning" | "info" | "tip";
  category: "performance" | "expertise" | "relationships" | "financial";
  title: string;
  message: string;
  actionable?: string; // Suggested action
  priority: "high" | "medium" | "low";
}

export interface AnalyticsRecommendations {
  insights: AnalyticsInsight[];
  focusAreas: FinancialTopic[]; // Topics to improve
  strengthAreas: FinancialTopic[]; // Topics you excel at
  relationshipsToNurture: string[]; // Character IDs to focus on
}
