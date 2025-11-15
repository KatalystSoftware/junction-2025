/**
 * Analytics Module
 *
 * Comprehensive analytics system for advisor performance tracking
 */

// Export types
export type {
  AnalyticsDashboard,
  PerformanceStats,
  TopicRadarChartData,
  TopicExpertiseData,
  CharacterAnalytics,
  CharacterTypeStats,
  FinancialImpactStats,
  TrendAnalytics,
  TrendDataPoint,
  AnalyticsInsight,
  AnalyticsRecommendations,
} from "./analytics-types.ts";

// Export calculator functions
export {
  calculateAnalyticsDashboard,
  calculatePerformanceStats,
  calculateTopicExpertise,
  calculateCharacterAnalytics,
  calculateFinancialImpact,
  calculateTrends,
  generateAnalyticsInsights,
} from "./analytics-calculator.ts";

// Export service
export {
  AnalyticsService,
  getAnalyticsService,
  getAnalyticsForSession,
  getAnalyticsSummaryForSession,
  compareAnalytics,
} from "./analytics-service.ts";

// Export TUI components
export {
  renderAnalyticsDashboard,
  renderPerformancePanel,
  renderTopicExpertisePanel,
  renderCharacterStatsPanel,
  renderFinancialImpactPanel,
} from "./analytics-tui.tsx";
