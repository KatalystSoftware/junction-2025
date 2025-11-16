/**
 * Analytics Service
 *
 * Simplified service for analytics data access
 */

import type { AdvisorState } from "../types/game-types.ts";
import type {
  AnalyticsDashboard,
  TopicExpertiseData,
} from "./analytics-types.ts";
import { calculateAnalyticsDashboard } from "./analytics-calculator.ts";

/**
 * Get complete analytics dashboard for advisor
 */
export function getAnalyticsDashboard(
  advisorState: AdvisorState,
): AnalyticsDashboard {
  return calculateAnalyticsDashboard(advisorState);
}

/**
 * Get topic expertise breakdown (for charts)
 */
export function getTopicBreakdown(
  advisorState: AdvisorState,
): TopicExpertiseData[] {
  const dashboard = calculateAnalyticsDashboard(advisorState);
  return dashboard.topicExpertise.topics;
}

/**
 * Get financial impact by topic
 */
export function getFinancialImpactByTopic(advisorState: AdvisorState) {
  const dashboard = calculateAnalyticsDashboard(advisorState);
  return dashboard.financialImpact.impactByTopic;
}
