/**
 * Analytics TUI Components
 *
 * Terminal UI components for displaying analytics in the game
 */

import React from "react";
import { Box, Text } from "ink";
import type {
  AnalyticsDashboard,
  PerformanceStats,
  TopicRadarChartData,
  CharacterAnalytics,
  FinancialImpactStats,
} from "./analytics-types.ts";

// ============================================================================
// PERFORMANCE PANEL
// ============================================================================

export function renderPerformancePanel(stats: PerformanceStats) {
  const trendIcon =
    stats.qualityTrend === "improving"
      ? "📈"
      : stats.qualityTrend === "declining"
        ? "📉"
        : "➡️";
  const trendColor =
    stats.qualityTrend === "improving"
      ? "green"
      : stats.qualityTrend === "declining"
        ? "red"
        : "yellow";

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="cyan">
      <Text bold color="cyan">
        📊 Performance Statistics
      </Text>
      <Text dimColor>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>

      <Box flexDirection="row" justifyContent="space-between" marginTop={1}>
        <Box flexDirection="column" width="50%">
          <Text>
            <Text color="gray">Total Sessions:</Text>{" "}
            <Text bold>{stats.totalSessions}</Text>
          </Text>
          <Text>
            <Text color="gray">Avg Quality:</Text>{" "}
            <Text bold color="cyan">
              {stats.averageQualityScore.toFixed(1)}/10
            </Text>
          </Text>
          <Text>
            <Text color="gray">Success Rate:</Text>{" "}
            <Text bold color="green">
              {stats.overallSuccessRate.toFixed(1)}%
            </Text>
          </Text>
          <Text>
            <Text color="gray">Communication:</Text>{" "}
            <Text bold>{stats.averageCommunicationScore.toFixed(1)}/10</Text>
          </Text>
        </Box>

        <Box flexDirection="column" width="50%">
          <Text>
            <Text color="gray">Trend:</Text>{" "}
            <Text color={trendColor}>
              {trendIcon} {stats.qualityTrend} ({stats.trendPercentage > 0 ? "+" : ""}
              {stats.trendPercentage.toFixed(1)}%)
            </Text>
          </Text>
          <Text>
            <Text color="gray">Current Streak:</Text>{" "}
            <Text bold color="yellow">
              {stats.currentStreak}
            </Text>
          </Text>
          <Text>
            <Text color="gray">Longest Streak:</Text>{" "}
            <Text bold>{stats.longestStreak}</Text>
          </Text>
          <Text>
            <Text color="gray">Last 7 Days:</Text> <Text>{stats.sessionsLast7Days}</Text>
          </Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Score Distribution:</Text>
      </Box>
      <Box flexDirection="row" gap={1}>
        <Text>
          <Text color="green">💎 Excellent (9-10):</Text> {stats.scoreDistribution.excellent}
        </Text>
        <Text>
          <Text color="cyan">✨ Good (7-8):</Text> {stats.scoreDistribution.good}
        </Text>
      </Box>
      <Box flexDirection="row" gap={1}>
        <Text>
          <Text color="yellow">📝 Average (5-6):</Text> {stats.scoreDistribution.average}
        </Text>
        <Text>
          <Text color="red">⚠️  Poor (0-4):</Text> {stats.scoreDistribution.poor}
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Evaluation Rates:</Text>
      </Box>
      <Box flexDirection="row" gap={2}>
        <Text>
          ❤️  Empathy: <Text color="cyan">{stats.empathyRate.toFixed(0)}%</Text>
        </Text>
        <Text>
          🎯 Actionable: <Text color="cyan">{stats.actionabilityRate.toFixed(0)}%</Text>
        </Text>
        <Text>
          ✓ Accurate: <Text color="cyan">{stats.accuracyRate.toFixed(0)}%</Text>
        </Text>
      </Box>
    </Box>
  );
}

// ============================================================================
// TOPIC EXPERTISE PANEL
// ============================================================================

export function renderTopicExpertisePanel(expertise: TopicRadarChartData) {
  const topTopics = [...expertise.topics]
    .sort((a, b) => b.expertiseLevel - a.expertiseLevel)
    .slice(0, 5);

  const formatTopicName = (topic: string) => {
    return topic.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getExpertiseBar = (level: number) => {
    const filled = Math.round(level);
    const empty = 10 - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  };

  const getExpertiseColor = (level: number) => {
    if (level >= 8) return "green";
    if (level >= 6) return "cyan";
    if (level >= 4) return "yellow";
    return "red";
  };

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="magenta">
      <Text bold color="magenta">
        🎓 Topic Expertise
      </Text>
      <Text dimColor>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>

      <Box marginTop={1}>
        <Text>
          <Text color="gray">Overall Expertise:</Text>{" "}
          <Text bold color="cyan">
            {expertise.overallExpertise.toFixed(1)}/10
          </Text>
        </Text>
      </Box>
      <Box>
        <Text>
          <Text color="gray">Strongest:</Text>{" "}
          <Text bold color="green">
            {formatTopicName(expertise.strongestTopic)}
          </Text>
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text>
          <Text color="gray">Needs Work:</Text>{" "}
          <Text bold color="yellow">
            {formatTopicName(expertise.weakestTopic)}
          </Text>
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Top 5 Topics:</Text>
      </Box>
      {topTopics.map((topic) => (
        <Box key={topic.topic} flexDirection="column" marginTop={1}>
          <Box flexDirection="row" justifyContent="space-between">
            <Text>{formatTopicName(topic.topic)}</Text>
            <Text color={getExpertiseColor(topic.expertiseLevel)}>
              {topic.expertiseLevel.toFixed(1)}/10
            </Text>
          </Box>
          <Box flexDirection="row">
            <Text color={getExpertiseColor(topic.expertiseLevel)}>
              {getExpertiseBar(topic.expertiseLevel)}
            </Text>
            <Box marginLeft={1}>
              <Text color="gray">
                ({topic.sessionCount} sessions, {topic.successRate.toFixed(0)}% success)
              </Text>
            </Box>
          </Box>
        </Box>
      ))}

      {expertise.topicsNeedingPractice.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>Topics Needing Practice (30+ days):</Text>
          <Text color="yellow">
            {expertise.topicsNeedingPractice
              .slice(0, 3)
              .map(formatTopicName)
              .join(", ")}
          </Text>
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// CHARACTER STATS PANEL
// ============================================================================

export function renderCharacterStatsPanel(analytics: CharacterAnalytics) {
  const topCharacters = [...analytics.byCharacter]
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 5);

  const getTrustIcon = (tier: string) => {
    switch (tier) {
      case "best_friend":
        return "💖";
      case "close":
        return "💙";
      case "trusted":
        return "💚";
      case "acquaintance":
        return "💛";
      default:
        return "🤝";
    }
  };

  const getRelationshipColor = (strength: string) => {
    switch (strength) {
      case "excellent":
        return "green";
      case "strong":
        return "cyan";
      case "moderate":
        return "yellow";
      default:
        return "gray";
    }
  };

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="blue">
      <Text bold color="blue">
        👥 Character Success Rates
      </Text>
      <Text dimColor>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>

      <Box marginTop={1} flexDirection="row" justifyContent="space-between">
        <Text>
          <Text color="gray">Avg Success Rate:</Text>{" "}
          <Text bold color="cyan">
            {analytics.averageSuccessRate.toFixed(1)}%
          </Text>
        </Text>
        <Text>
          <Text color="gray">Active Relationships:</Text>{" "}
          <Text bold>{analytics.totalActiveRelationships}</Text>
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text>
          <Text color="gray">Most Successful:</Text>{" "}
          <Text bold color="green">
            {analytics.mostSuccessfulCharacter}
          </Text>
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text>
          <Text color="gray">Most Challenging:</Text>{" "}
          <Text bold color="yellow">
            {analytics.mostChallengingCharacter}
          </Text>
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Top Clients:</Text>
      </Box>
      {topCharacters.map((char) => (
        <Box key={char.characterId} flexDirection="column" marginTop={1}>
          <Box flexDirection="row" justifyContent="space-between">
            <Text>
              {getTrustIcon(char.trustTier)} {char.characterName}
            </Text>
            <Text color={char.successRate >= 70 ? "green" : "yellow"}>
              {char.successRate.toFixed(0)}% success
            </Text>
          </Box>
          <Box flexDirection="row" gap={2}>
            <Text color="gray" dimColor>
              {char.totalSessions} sessions
            </Text>
            <Text color={getRelationshipColor(char.relationshipStrength)}>
              {char.relationshipStrength}
            </Text>
            <Text color="gray" dimColor>
              Trust: {(char.trustLevel * 100).toFixed(0)}%
            </Text>
          </Box>
          {(char.totalSavingsGenerated > 0 || char.totalDebtCleared > 0) && (
            <Text color="green" dimColor>
              💰 €{char.totalSavingsGenerated.toFixed(0)} saved, €
              {char.totalDebtCleared.toFixed(0)} debt cleared
            </Text>
          )}
        </Box>
      ))}
    </Box>
  );
}

// ============================================================================
// FINANCIAL IMPACT PANEL
// ============================================================================

export function renderFinancialImpactPanel(impact: FinancialImpactStats) {
  const topTopics = [...impact.impactByTopic]
    .sort((a, b) => b.totalSavings + b.totalDebtCleared - (a.totalSavings + a.totalDebtCleared))
    .slice(0, 5);

  const formatTopicName = (topic: string) => {
    return topic.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `€${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `€${(amount / 1000).toFixed(1)}K`;
    return `€${amount.toFixed(0)}`;
  };

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="green">
      <Text bold color="green">
        💰 Financial Impact
      </Text>
      <Text dimColor>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</Text>

      <Box marginTop={1} flexDirection="row" justifyContent="space-between">
        <Box flexDirection="column" width="50%">
          <Text bold color="green">
            Lifetime Savings: {formatCurrency(impact.lifetimeSavingsGenerated)}
          </Text>
          <Text bold color="cyan">
            Debt Cleared: {formatCurrency(impact.lifetimeDebtCleared)}
          </Text>
          <Text bold color="yellow">
            Interest Saved: {formatCurrency(impact.lifetimeInterestSaved)}
          </Text>
        </Box>
        <Box flexDirection="column" width="50%">
          <Text>
            <Text color="gray">Clients Helped:</Text>{" "}
            <Text bold>{impact.totalClientsHelped}</Text>
          </Text>
          <Text>
            <Text color="gray">Avg per Session:</Text>{" "}
            <Text bold>{formatCurrency(impact.avgSavingsPerSession)}</Text>
          </Text>
          <Text>
            <Text color="gray">Total Coins:</Text>{" "}
            <Text bold color="yellow">
              {impact.totalCoinsEarned}
            </Text>
          </Text>
        </Box>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>Last 30 Days:</Text>
        <Box flexDirection="row" gap={2}>
          <Text>
            💰 Savings: <Text color="green">{formatCurrency(impact.savingsLast30Days)}</Text>
          </Text>
          <Text>
            💳 Debt Cleared: <Text color="cyan">{formatCurrency(impact.debtClearedLast30Days)}</Text>
          </Text>
        </Box>
      </Box>

      {impact.projectionAccuracy > 0 && (
        <Box marginTop={1}>
          <Text>
            <Text color="gray">Projection Accuracy:</Text>{" "}
            <Text bold color={impact.projectionAccuracy >= 70 ? "green" : "yellow"}>
              {impact.projectionAccuracy.toFixed(0)}%
            </Text>
          </Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>Top Impact by Topic:</Text>
      </Box>
      {topTopics.map((topic) => {
        const totalImpact = topic.totalSavings + topic.totalDebtCleared;
        return (
          <Box key={topic.topic} flexDirection="row" justifyContent="space-between">
            <Text>{formatTopicName(topic.topic)}</Text>
            <Text color="green">{formatCurrency(totalImpact)}</Text>
          </Box>
        );
      })}

      <Box marginTop={1}>
        <Text dimColor>Coins by Quality:</Text>
      </Box>
      {impact.coinsByQuality.map((range) => (
        <Box key={range.qualityRange} flexDirection="row" justifyContent="space-between">
          <Text color="gray">{range.qualityRange}</Text>
          <Text color="yellow">{range.avgCoins.toFixed(1)} coins avg</Text>
        </Box>
      ))}
    </Box>
  );
}

// ============================================================================
// FULL ANALYTICS DASHBOARD
// ============================================================================

export function renderAnalyticsDashboard(dashboard: AnalyticsDashboard) {
  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="double" borderColor="blue" padding={1} marginBottom={1}>
        <Text bold color="blue">
          📊 ANALYTICS DASHBOARD
        </Text>
        <Text color="gray">
          {" "}
          - Generated {new Date(dashboard.generatedAt).toLocaleString()}
        </Text>
      </Box>

      <Box flexDirection="row" gap={1}>
        <Text>
          <Text color="gray">Career Tier:</Text> <Text bold>{dashboard.careerTier}</Text>
        </Text>
        <Text>
          <Text color="gray">Reputation:</Text>{" "}
          <Text bold color="cyan">
            {dashboard.currentReputation}/100
          </Text>
        </Text>
        <Text>
          <Text color="gray">Skill Level:</Text>{" "}
          <Text bold color="green">
            {dashboard.currentSkillLevel}/10
          </Text>
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1} gap={1}>
        {renderPerformancePanel(dashboard.performance)}
        {renderTopicExpertisePanel(dashboard.topicExpertise)}
        {renderCharacterStatsPanel(dashboard.characterSuccess)}
        {renderFinancialImpactPanel(dashboard.financialImpact)}
      </Box>
    </Box>
  );
}
