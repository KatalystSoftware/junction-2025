/**
 * Career Progression Manager
 * Handles tier advancement, tier rewards, and progression tracking
 */

import type { AdvisorState, CareerTier, Milestone } from "../types/game-types.ts";
import { leaderboardService } from "../persistence/leaderboard-service.ts";

export interface TierAdvancement {
  newTier: CareerTier;
  previousTier: CareerTier;
  coinBonus: number;
  milestone: Milestone;
}

/**
 * Check if advisor has advanced to a new tier
 */
export async function checkTierAdvancement(
  advisorState: AdvisorState
): Promise<TierAdvancement | null> {
  const currentTier = await leaderboardService.calculateAdvisorTier(advisorState);

  // Check if this is a new tier
  if (currentTier.tierLevel === advisorState.careerTier) {
    return null; // No advancement
  }

  if (currentTier.tierLevel <= advisorState.careerTier) {
    return null; // No advancement (can't go backwards)
  }

  // Get the previous tier
  const allTiers = await leaderboardService.getCareerTiers();
  const previousTier = allTiers.find((t) => t.tierLevel === advisorState.careerTier);

  if (!previousTier) {
    return null;
  }

  // Create milestone for tier advancement
  const milestone: Milestone = {
    id: `tier_${currentTier.tierLevel}`,
    title: `${currentTier.tierEmoji} Career Advancement!`,
    message: `You've been promoted to ${currentTier.tierName}! ${currentTier.unlockDescription || ""}`,
    icon: currentTier.tierEmoji,
    type: "achievement",
  };

  return {
    newTier: currentTier,
    previousTier,
    coinBonus: currentTier.coinBonus,
    milestone,
  };
}

/**
 * Apply tier advancement rewards
 */
export function applyTierAdvancement(
  advisorState: AdvisorState,
  advancement: TierAdvancement
): AdvisorState {
  return {
    ...advisorState,
    careerTier: advancement.newTier.tierLevel,
    advisorCoins: advisorState.advisorCoins + advancement.coinBonus,
  };
}

/**
 * Get tier progress breakdown
 */
export async function getTierProgressBreakdown(advisorState: AdvisorState): Promise<{
  currentTier: CareerTier;
  nextTier: CareerTier | null;
  progress: {
    reputation: { current: number; required: number; percentage: number };
    skillLevel: { current: number; required: number; percentage: number };
    clients: { current: number; required: number; percentage: number };
    sessions: { current: number; required: number; percentage: number };
    achievements: { current: number; required: number; percentage: number };
    savingsImpact: { current: number; required: number; percentage: number };
  };
  overallProgress: number;
}> {
  const tierProgress = await leaderboardService.getNextTierProgress(advisorState);

  if (!tierProgress.nextTier) {
    return {
      currentTier: tierProgress.currentTier,
      nextTier: null,
      progress: {
        reputation: { current: advisorState.reputation, required: 100, percentage: 100 },
        skillLevel: { current: advisorState.skillLevel, required: 10, percentage: 100 },
        clients: { current: advisorState.totalClientsHelped, required: 100, percentage: 100 },
        sessions: { current: advisorState.totalSessions, required: 200, percentage: 100 },
        achievements: {
          current: advisorState.achievementsUnlocked.length,
          required: 18,
          percentage: 100,
        },
        savingsImpact: {
          current: advisorState.lifetimeSavingsGenerated,
          required: 500000,
          percentage: 100,
        },
      },
      overallProgress: 100,
    };
  }

  const nextTier = tierProgress.nextTier;

  const progress = {
    reputation: {
      current: advisorState.reputation,
      required: nextTier.minReputation,
      percentage: Math.min(100, (advisorState.reputation / nextTier.minReputation) * 100),
    },
    skillLevel: {
      current: advisorState.skillLevel,
      required: nextTier.minSkillLevel,
      percentage: Math.min(100, (advisorState.skillLevel / nextTier.minSkillLevel) * 100),
    },
    clients: {
      current: advisorState.totalClientsHelped,
      required: nextTier.minClients,
      percentage: Math.min(100, (advisorState.totalClientsHelped / nextTier.minClients) * 100),
    },
    sessions: {
      current: advisorState.totalSessions,
      required: nextTier.minSessions,
      percentage: Math.min(100, (advisorState.totalSessions / nextTier.minSessions) * 100),
    },
    achievements: {
      current: advisorState.achievementsUnlocked.length,
      required: nextTier.minAchievements,
      percentage: Math.min(
        100,
        (advisorState.achievementsUnlocked.length / nextTier.minAchievements) * 100
      ),
    },
    savingsImpact: {
      current: advisorState.lifetimeSavingsGenerated,
      required: nextTier.minSavingsImpact,
      percentage: Math.min(
        100,
        (advisorState.lifetimeSavingsGenerated / nextTier.minSavingsImpact) * 100
      ),
    },
  };

  // Calculate overall progress (average of all requirements)
  const percentages = [
    progress.reputation.percentage,
    progress.skillLevel.percentage,
    progress.clients.percentage,
    progress.sessions.percentage,
    progress.achievements.percentage,
    progress.savingsImpact.percentage,
  ];
  const overallProgress = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;

  return {
    currentTier: tierProgress.currentTier,
    nextTier,
    progress,
    overallProgress,
  };
}

/**
 * Get all tiers with completion status
 */
export async function getAllTiersWithStatus(advisorState: AdvisorState): Promise<
  Array<{
    tier: CareerTier;
    isUnlocked: boolean;
    isCurrent: boolean;
    isNext: boolean;
  }>
> {
  const allTiers = await leaderboardService.getCareerTiers();
  const currentTier = await leaderboardService.calculateAdvisorTier(advisorState);

  return allTiers.map((tier) => ({
    tier,
    isUnlocked: tier.tierLevel <= currentTier.tierLevel,
    isCurrent: tier.tierLevel === currentTier.tierLevel,
    isNext: tier.tierLevel === currentTier.tierLevel + 1,
  }));
}

/**
 * Get tier benefits display text
 */
export function getTierBenefits(tier: CareerTier): string[] {
  const benefits: string[] = [];

  if (tier.coinBonus > 0) {
    benefits.push(`+${tier.coinBonus} coins bonus`);
  }

  if (tier.unlockDescription) {
    benefits.push(tier.unlockDescription);
  }

  // Add tier-specific benefits
  switch (tier.tierLevel) {
    case 2:
      benefits.push("Unlock advanced client scenarios");
      break;
    case 3:
      benefits.push("Access to investment advisory cases");
      break;
    case 4:
      benefits.push("Mentor junior advisors (coming soon)");
      break;
    case 5:
      benefits.push("Elite status and exclusive challenges");
      break;
  }

  return benefits;
}
