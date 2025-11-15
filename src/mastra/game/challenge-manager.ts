/**
 * Challenge Manager
 * Manages community challenges, tracks progress, and handles rewards
 */

import type { AdvisorState, CommunityChallenge, ChallengeParticipation } from "../types/game-types.ts";
import { leaderboardService } from "../persistence/leaderboard-service.ts";
import {
  calculateChallengeProgress,
  generateWeeklyChallenges,
  generateMonthlyChallenges,
} from "./leaderboard-calculator.ts";

export interface ChallengeWithProgress {
  challenge: CommunityChallenge;
  participation: ChallengeParticipation | null;
  progressPercentage: number;
  isCompleted: boolean;
  timeRemaining: string;
}

/**
 * Initialize challenges for the current period
 */
export async function initializeChallenges(): Promise<void> {
  try {
    await leaderboardService.initialize();

    // Check if there are active challenges
    const activeChallenges = await leaderboardService.getActiveChallenges();

    // If no active challenges, create them
    if (activeChallenges.length === 0) {
      console.log("📋 Creating new community challenges...");

      // Create weekly challenges
      const weeklyChallenges = generateWeeklyChallenges();
      for (const challenge of weeklyChallenges) {
        await leaderboardService.createChallenge(challenge);
      }

      // Create monthly challenges
      const monthlyChallenges = generateMonthlyChallenges();
      for (const challenge of monthlyChallenges) {
        await leaderboardService.createChallenge(challenge);
      }

      console.log("✅ Community challenges created");
    } else {
      console.log(`📋 ${activeChallenges.length} active challenges found`);
    }
  } catch (error) {
    console.error("❌ Failed to initialize challenges:", error);
  }
}

/**
 * Update advisor's progress in all active challenges
 */
export async function updateChallengeProgress(advisorState: AdvisorState): Promise<void> {
  const activeChallenges = await leaderboardService.getActiveChallenges();

  for (const challenge of activeChallenges) {
    const progress = calculateChallengeProgress(challenge, advisorState);
    await leaderboardService.updateChallengeProgress(challenge.id, advisorState.advisorId, progress);
  }
}

/**
 * Get advisor's challenges with progress
 */
export async function getAdvisorChallengesWithProgress(
  advisorState: AdvisorState
): Promise<ChallengeWithProgress[]> {
  const activeChallenges = await leaderboardService.getActiveChallenges();
  const participations = await leaderboardService.getAdvisorChallenges(advisorState.advisorId);

  return activeChallenges.map((challenge) => {
    const participation = participations.find((p) => p.challengeId === challenge.id) || null;
    const currentProgress = participation?.currentProgress || 0;
    const progressPercentage = Math.min(100, (currentProgress / challenge.targetValue) * 100);
    const isCompleted = participation?.isCompleted || false;

    const timeRemaining = getTimeRemaining(challenge.endDate);

    return {
      challenge,
      participation,
      progressPercentage,
      isCompleted,
      timeRemaining,
    };
  });
}

/**
 * Get newly completed challenges since last check
 */
export async function getNewlyCompletedChallenges(
  advisorState: AdvisorState,
  previousParticipations: ChallengeParticipation[]
): Promise<CommunityChallenge[]> {
  const currentParticipations = await leaderboardService.getAdvisorChallenges(advisorState.advisorId);
  const newlyCompleted: CommunityChallenge[] = [];

  for (const current of currentParticipations) {
    if (!current.isCompleted) continue;

    const previous = previousParticipations.find((p) => p.challengeId === current.challengeId);

    // If it wasn't completed before but is now
    if (!previous || !previous.isCompleted) {
      const activeChallenges = await leaderboardService.getActiveChallenges();
      const challenge = activeChallenges.find((c) => c.id === current.challengeId);
      if (challenge) {
        newlyCompleted.push(challenge);
      }
    }
  }

  return newlyCompleted;
}

/**
 * Award challenge rewards
 */
export function awardChallengeRewards(
  advisorState: AdvisorState,
  completedChallenges: CommunityChallenge[]
): AdvisorState {
  let updatedState = { ...advisorState };

  for (const challenge of completedChallenges) {
    // Award coins
    updatedState.advisorCoins += challenge.coinReward;

    // Award achievement if specified
    if (challenge.achievementId && !updatedState.achievementsUnlocked.includes(challenge.achievementId)) {
      updatedState.achievementsUnlocked = [...updatedState.achievementsUnlocked, challenge.achievementId];
    }
  }

  return updatedState;
}

/**
 * Get challenge leaderboard with context
 */
export async function getChallengeLeaderboard(
  challengeId: number,
  advisorId?: string
): Promise<{
  topParticipants: ChallengeParticipation[];
  advisorRank: number | null;
  totalParticipants: number;
}> {
  const leaderboard = await leaderboardService.getChallengeLeaderboard(challengeId, 100);
  const totalParticipants = leaderboard.length;

  let advisorRank: number | null = null;
  if (advisorId) {
    const advisorEntry = leaderboard.find((p) => p.advisorId === advisorId);
    advisorRank = advisorEntry?.participantRank || null;
  }

  return {
    topParticipants: leaderboard.slice(0, 10),
    advisorRank,
    totalParticipants,
  };
}

/**
 * Get time remaining for a challenge
 */
function getTimeRemaining(endDate: string): string {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) {
    return "Ended";
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 1) {
    return `${days} days`;
  } else if (days === 1) {
    return `1 day, ${hours} hours`;
  } else if (hours > 1) {
    return `${hours} hours`;
  } else {
    return "Less than 1 hour";
  }
}

/**
 * Archive expired challenges and create new ones
 */
export async function archiveExpiredChallenges(): Promise<void> {
  const activeChallenges = await leaderboardService.getActiveChallenges();
  const now = new Date();

  for (const challenge of activeChallenges) {
    const endDate = new Date(challenge.endDate);
    if (endDate < now) {
      console.log(`📦 Archiving expired challenge: ${challenge.challengeName}`);
      // Note: Would need to add an archive method to the service
      // For now, challenges just become inactive via the is_active flag
    }
  }

  // Check if we need to create new challenges
  const currentActiveChallenges = activeChallenges.filter(
    (c) => new Date(c.endDate) >= now
  );

  if (currentActiveChallenges.length < 5) {
    // Create new batch
    console.log("📋 Creating new batch of challenges...");
    await initializeChallenges();
  }
}
