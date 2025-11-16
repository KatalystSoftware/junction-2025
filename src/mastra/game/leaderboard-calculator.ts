/**
 * Leaderboard Calculator
 * Utilities for calculating scores, rankings, and challenge progress
 */

import type {
  AdvisorState,
  LeaderboardEntry,
  CommunityChallenge,
  ChallengeParticipation,
} from "../types/game-types.ts";

/**
 * Calculate global score for an advisor (used for overall ranking)
 * Weighted formula:
 * - Reputation: 30%
 * - Skill Level: 20%
 * - Average Advice Quality: 20%
 * - Financial Impact: 15%
 * - Achievements: 15%
 */
export function calculateGlobalScore(entry: LeaderboardEntry): number {
  const reputationScore = entry.reputation * 0.3; // Max 30
  const skillScore = entry.skillLevel * 10 * 0.2; // Max 20
  const adviceScore = entry.averageAdviceScore * 10 * 0.2; // Max 20
  const impactScore =
    ((entry.lifetimeSavingsGenerated + entry.lifetimeDebtCleared) / 1000) *
    0.15; // €1000 = 0.15 points
  const achievementScore = entry.achievementCount * 5 * 0.15; // 5 points per achievement * 15%

  return (
    reputationScore + skillScore + adviceScore + impactScore + achievementScore
  );
}

/**
 * Calculate advisor tier score (used for career progression)
 */
export function calculateTierScore(advisorState: AdvisorState): {
  score: number;
  breakdown: {
    reputation: number;
    skillLevel: number;
    clients: number;
    sessions: number;
    achievements: number;
    savingsImpact: number;
  };
} {
  return {
    score:
      advisorState.reputation +
      advisorState.skillLevel * 10 +
      advisorState.totalClientsHelped * 2 +
      advisorState.totalSessions +
      advisorState.achievementsUnlocked.length * 5 +
      advisorState.lifetimeSavingsGenerated / 1000,
    breakdown: {
      reputation: advisorState.reputation,
      skillLevel: advisorState.skillLevel * 10,
      clients: advisorState.totalClientsHelped * 2,
      sessions: advisorState.totalSessions,
      achievements: advisorState.achievementsUnlocked.length * 5,
      savingsImpact: advisorState.lifetimeSavingsGenerated / 1000,
    },
  };
}

/**
 * Calculate challenge progress for an advisor
 */
export function calculateChallengeProgress(
  challenge: CommunityChallenge,
  advisorState: AdvisorState,
): number {
  switch (challenge.metricType) {
    case "sessions":
      return advisorState.totalSessions;

    case "savings":
      return advisorState.lifetimeSavingsGenerated;

    case "clients":
      return advisorState.totalClientsHelped;

    case "streak": {
      // Calculate max streak from session history
      let maxStreak = 0;
      let currentStreakCalc = 0;

      for (const session of advisorState.sessionHistory) {
        if (session.adviceQualityScore >= 7) {
          currentStreakCalc++;
          maxStreak = Math.max(maxStreak, currentStreakCalc);
        } else if (session.adviceQualityScore <= 4) {
          currentStreakCalc = 0;
        }
      }

      return maxStreak;
    }

    case "expertise": {
      // Return highest expertise level across all topics
      const expertiseLevels = Object.values(advisorState.topicsExpertise);
      return Math.max(...expertiseLevels);
    }

    default:
      return 0;
  }
}

/**
 * Generate community challenges for the current period
 */
export function generateWeeklyChallenges(): Omit<CommunityChallenge, "id">[] {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return [
    {
      challengeName: "Session Marathon",
      challengeNameFi: "Istuntomaraton",
      challengeDescription: "Complete 10 consultation sessions this week",
      challengeDescriptionFi: "Suorita 10 konsultaatioistuntoa tällä viikolla",
      challengeType: "weekly",
      metricType: "sessions",
      targetValue: 10,
      difficulty: "easy",
      coinReward: 500,
      badgeEmoji: "🏃",
      startDate: weekStart.toISOString(),
      endDate: weekEnd.toISOString(),
      isActive: true,
    },
    {
      challengeName: "Financial Hero",
      challengeNameFi: "Taloudellinen sankari",
      challengeDescription: "Help clients save €5,000 total",
      challengeDescriptionFi: "Auta asiakkaita säästämään yhteensä 5 000 €",
      challengeType: "weekly",
      metricType: "savings",
      targetValue: 5000,
      difficulty: "medium",
      coinReward: 1000,
      badgeEmoji: "💰",
      startDate: weekStart.toISOString(),
      endDate: weekEnd.toISOString(),
      isActive: true,
    },
    {
      challengeName: "Perfect Streak",
      challengeNameFi: "Täydellinen putki",
      challengeDescription: "Maintain a streak of 5 high-quality sessions",
      challengeDescriptionFi: "Pidä yllä 5 korkealaatuisen istunnon putkea",
      challengeType: "weekly",
      metricType: "streak",
      targetValue: 5,
      difficulty: "hard",
      coinReward: 1500,
      achievementId: "weekly_perfect_streak",
      badgeEmoji: "🔥",
      startDate: weekStart.toISOString(),
      endDate: weekEnd.toISOString(),
      isActive: true,
    },
  ];
}

/**
 * Generate monthly challenges
 */
export function generateMonthlyChallenges(): Omit<CommunityChallenge, "id">[] {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return [
    {
      challengeName: "Master Advisor",
      challengeNameFi: "Mestari-neuvoja",
      challengeDescription: "Help 50 unique clients this month",
      challengeDescriptionFi: "Auta 50 yksilöllistä asiakasta tässä kuussa",
      challengeType: "monthly",
      metricType: "clients",
      targetValue: 50,
      difficulty: "hard",
      coinReward: 5000,
      achievementId: "monthly_master_advisor",
      badgeEmoji: "👑",
      startDate: monthStart.toISOString(),
      endDate: monthEnd.toISOString(),
      isActive: true,
    },
    {
      challengeName: "Debt Destroyer",
      challengeNameFi: "Velkojen tuhoaja",
      challengeDescription: "Help clients eliminate €25,000 in debt",
      challengeDescriptionFi: "Auta asiakkaita poistamaan 25 000 € velkaa",
      challengeType: "monthly",
      metricType: "savings",
      targetValue: 25000,
      difficulty: "extreme",
      coinReward: 10000,
      achievementId: "monthly_debt_destroyer",
      badgeEmoji: "⚔️",
      startDate: monthStart.toISOString(),
      endDate: monthEnd.toISOString(),
      isActive: true,
    },
    {
      challengeName: "Topic Expert",
      challengeNameFi: "Aihe-asiantuntija",
      challengeDescription: "Reach expertise level 8 in any financial topic",
      challengeDescriptionFi:
        "Saavuta asiantuntemustaso 8 missä tahansa talousaiheessa",
      challengeType: "monthly",
      metricType: "expertise",
      targetValue: 8,
      difficulty: "medium",
      coinReward: 3000,
      badgeEmoji: "🎓",
      startDate: monthStart.toISOString(),
      endDate: monthEnd.toISOString(),
      isActive: true,
    },
  ];
}

/**
 * Format financial impact for display
 */
export function formatFinancialImpact(amount: number): string {
  if (amount >= 1000000) {
    return `€${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `€${(amount / 1000).toFixed(1)}k`;
  } else {
    return `€${amount.toFixed(0)}`;
  }
}

/**
 * Format rank with medal emojis
 */
export function formatRank(rank: number): string {
  switch (rank) {
    case 1:
      return "🥇 #1";
    case 2:
      return "🥈 #2";
    case 3:
      return "🥉 #3";
    default:
      return `#${rank}`;
  }
}

/**
 * Get tier emoji and color
 */
export function getTierDisplay(tierLevel: number): {
  emoji: string;
  name: string;
  color: string;
} {
  const tiers = [
    { emoji: "🌱", name: "Junior", color: "green" },
    { emoji: "📈", name: "Associate", color: "blue" },
    { emoji: "💼", name: "Senior", color: "cyan" },
    { emoji: "🏆", name: "Expert", color: "yellow" },
    { emoji: "👑", name: "Master", color: "magenta" },
  ];

  return tiers[tierLevel - 1] || tiers[0];
}

/**
 * Calculate percentile rank
 */
export function calculatePercentile(
  rank: number,
  totalParticipants: number,
): number {
  if (totalParticipants === 0) return 100;
  return Math.round(((totalParticipants - rank + 1) / totalParticipants) * 100);
}

/**
 * Get motivational message based on rank
 */
export function getMotivationalMessage(
  rank: number,
  totalParticipants: number,
): string {
  const percentile = calculatePercentile(rank, totalParticipants);

  if (rank === 1) {
    return "You're the top advisor! 🎉";
  } else if (rank <= 3) {
    return "You're in the top 3! Keep it up! 🌟";
  } else if (rank <= 10) {
    return "You're in the top 10! Excellent work! 💪";
  } else if (percentile >= 90) {
    return "You're in the top 10%! Outstanding! 🚀";
  } else if (percentile >= 75) {
    return "You're in the top 25%! Great job! ⭐";
  } else if (percentile >= 50) {
    return "You're in the top half! Keep pushing! 📈";
  } else {
    return "Keep learning and growing! 🌱";
  }
}

/**
 * Calculate progress bar
 */
export function getProgressBar(
  current: number,
  target: number,
  width = 20,
): string {
  const percentage = Math.min(1, current / target);
  const filled = Math.round(percentage * width);
  const empty = width - filled;

  return "█".repeat(filled) + "░".repeat(empty);
}

/**
 * Get challenge difficulty color
 */
export function getChallengeDifficultyColor(
  difficulty: "easy" | "medium" | "hard" | "extreme",
): string {
  switch (difficulty) {
    case "easy":
      return "green";
    case "medium":
      return "yellow";
    case "hard":
      return "red";
    case "extreme":
      return "magenta";
  }
}
