/**
 * Analytics Service
 *
 * Service layer for accessing analytics data
 * Can be used by TUI, REST API, or future web frontend
 */

import type { AdvisorState } from "../types/game-types.ts";
import type {
  AnalyticsDashboard,
  PerformanceStats,
  TopicRadarChartData,
  CharacterAnalytics,
  FinancialImpactStats,
  TrendAnalytics,
  AnalyticsRecommendations,
} from "./analytics-types.ts";
import {
  calculateAnalyticsDashboard,
  calculatePerformanceStats,
  calculateTopicExpertise,
  calculateCharacterAnalytics,
  calculateFinancialImpact,
  calculateTrends,
  generateAnalyticsInsights,
} from "./analytics-calculator.ts";
import { loadSession } from "../persistence/session-store.ts";

// ============================================================================
// ANALYTICS SERVICE CLASS
// ============================================================================

export class AnalyticsService {
  private advisorState: AdvisorState | null = null;

  /**
   * Load advisor state from session store
   */
  async loadAdvisorState(sessionId: string): Promise<void> {
    this.advisorState = await loadSession(sessionId);
  }

  /**
   * Set advisor state directly (useful for in-memory updates)
   */
  setAdvisorState(state: AdvisorState): void {
    this.advisorState = state;
  }

  /**
   * Get current advisor state
   */
  getAdvisorState(): AdvisorState | null {
    return this.advisorState;
  }

  /**
   * Get complete analytics dashboard
   */
  getDashboard(): AnalyticsDashboard | null {
    if (!this.advisorState) return null;
    return calculateAnalyticsDashboard(this.advisorState);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): PerformanceStats | null {
    if (!this.advisorState) return null;
    return calculatePerformanceStats(this.advisorState);
  }

  /**
   * Get topic expertise data
   */
  getTopicExpertise(): TopicRadarChartData | null {
    if (!this.advisorState) return null;
    return calculateTopicExpertise(this.advisorState);
  }

  /**
   * Get character analytics
   */
  getCharacterAnalytics(): CharacterAnalytics | null {
    if (!this.advisorState) return null;
    return calculateCharacterAnalytics(this.advisorState);
  }

  /**
   * Get financial impact statistics
   */
  getFinancialImpact(): FinancialImpactStats | null {
    if (!this.advisorState) return null;
    return calculateFinancialImpact(this.advisorState);
  }

  /**
   * Get trend analytics
   */
  getTrends(): TrendAnalytics | null {
    if (!this.advisorState) return null;
    return calculateTrends(this.advisorState);
  }

  /**
   * Get insights and recommendations
   */
  getInsights(): AnalyticsRecommendations | null {
    if (!this.advisorState) return null;
    const dashboard = calculateAnalyticsDashboard(this.advisorState);
    return generateAnalyticsInsights(dashboard);
  }

  /**
   * Export analytics as JSON
   */
  exportAsJSON(): string | null {
    const dashboard = this.getDashboard();
    if (!dashboard) return null;
    return JSON.stringify(dashboard, null, 2);
  }

  /**
   * Get summary statistics (quick overview)
   */
  getSummary() {
    if (!this.advisorState) return null;

    const performance = calculatePerformanceStats(this.advisorState);
    const financial = calculateFinancialImpact(this.advisorState);
    const expertise = calculateTopicExpertise(this.advisorState);

    return {
      totalSessions: performance.totalSessions,
      averageQuality: performance.averageQualityScore,
      successRate: performance.overallSuccessRate,
      reputation: this.advisorState.reputation,
      skillLevel: this.advisorState.skillLevel,
      careerTier: this.advisorState.careerTier,
      totalCoins: this.advisorState.advisorCoins,
      savingsGenerated: financial.lifetimeSavingsGenerated,
      debtCleared: financial.lifetimeDebtCleared,
      clientsHelped: financial.totalClientsHelped,
      overallExpertise: expertise.overallExpertise,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE (optional - for global access)
// ============================================================================

let analyticsServiceInstance: AnalyticsService | null = null;

export function getAnalyticsService(): AnalyticsService {
  if (!analyticsServiceInstance) {
    analyticsServiceInstance = new AnalyticsService();
  }
  return analyticsServiceInstance;
}

// ============================================================================
// STANDALONE FUNCTIONS (for direct use without service instance)
// ============================================================================

/**
 * Get analytics dashboard for a specific session
 */
export async function getAnalyticsForSession(
  sessionId: string
): Promise<AnalyticsDashboard | null> {
  const advisorState = await loadSession(sessionId);
  if (!advisorState) return null;
  return calculateAnalyticsDashboard(advisorState);
}

/**
 * Get analytics summary for a specific session
 */
export async function getAnalyticsSummaryForSession(sessionId: string) {
  const advisorState = await loadSession(sessionId);
  if (!advisorState) return null;

  const performance = calculatePerformanceStats(advisorState);
  const financial = calculateFinancialImpact(advisorState);
  const expertise = calculateTopicExpertise(advisorState);

  return {
    totalSessions: performance.totalSessions,
    averageQuality: performance.averageQualityScore,
    successRate: performance.overallSuccessRate,
    reputation: advisorState.reputation,
    skillLevel: advisorState.skillLevel,
    careerTier: advisorState.careerTier,
    totalCoins: advisorState.advisorCoins,
    savingsGenerated: financial.lifetimeSavingsGenerated,
    debtCleared: financial.lifetimeDebtCleared,
    clientsHelped: financial.totalClientsHelped,
    overallExpertise: expertise.overallExpertise,
  };
}

/**
 * Compare two sessions
 */
export async function compareAnalytics(
  sessionId1: string,
  sessionId2: string
) {
  const [summary1, summary2] = await Promise.all([
    getAnalyticsSummaryForSession(sessionId1),
    getAnalyticsSummaryForSession(sessionId2),
  ]);

  if (!summary1 || !summary2) return null;

  return {
    session1: summary1,
    session2: summary2,
    differences: {
      sessions: summary2.totalSessions - summary1.totalSessions,
      quality: summary2.averageQuality - summary1.averageQuality,
      successRate: summary2.successRate - summary1.successRate,
      reputation: summary2.reputation - summary1.reputation,
      skillLevel: summary2.skillLevel - summary1.skillLevel,
      coins: summary2.totalCoins - summary1.totalCoins,
      savings: summary2.savingsGenerated - summary1.savingsGenerated,
      debtCleared: summary2.debtCleared - summary1.debtCleared,
    },
  };
}
