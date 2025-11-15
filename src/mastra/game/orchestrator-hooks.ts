/**
 * Orchestrator Hooks
 * Integration points for leaderboards, challenges, and social features
 */

import type { AdvisorState, GameResponse } from "../types/game-types.ts";
import { leaderboardService } from "../persistence/leaderboard-service.ts";
import { checkTierAdvancement, applyTierAdvancement } from "./career-progression.ts";
import {
  updateChallengeProgress,
  getNewlyCompletedChallenges,
  awardChallengeRewards,
  initializeChallenges,
} from "./challenge-manager.ts";

/**
 * Initialize social features on game start
 */
export async function initializeSocialFeatures(): Promise<void> {
  try {
    // Initialize database
    await leaderboardService.initialize();

    // Initialize challenges
    await initializeChallenges();

    console.log("✅ Social features initialized");
  } catch (error) {
    console.error("❌ Failed to initialize social features:", error);
  }
}

/**
 * Hook: After session completion
 * Updates leaderboards, checks tier advancement, updates challenge progress
 */
export async function afterSessionComplete(
  advisorState: AdvisorState,
  advisorName: string,
  gameResponse: GameResponse
): Promise<GameResponse> {
  try {
    let updatedState = { ...advisorState };

    // 1. Check for tier advancement
    const tierAdvancement = await checkTierAdvancement(updatedState);
    if (tierAdvancement) {
      updatedState = applyTierAdvancement(updatedState, tierAdvancement);

      // Add tier advancement to milestones
      if (!gameResponse.milestonesAchieved) {
        gameResponse.milestonesAchieved = [];
      }
      gameResponse.milestonesAchieved.push(tierAdvancement.milestone);

      console.log(
        `🎉 Tier advancement: ${tierAdvancement.previousTier.tierName} → ${tierAdvancement.newTier.tierName}`
      );
    }

    // 2. Get previous challenge participations
    const previousParticipations = await leaderboardService.getAdvisorChallenges(
      updatedState.advisorId
    );

    // 3. Update challenge progress
    await updateChallengeProgress(updatedState);

    // 4. Check for newly completed challenges
    const newlyCompleted = await getNewlyCompletedChallenges(
      updatedState,
      previousParticipations
    );

    if (newlyCompleted.length > 0) {
      updatedState = awardChallengeRewards(updatedState, newlyCompleted);

      // Add challenge completion to achievements
      for (const challenge of newlyCompleted) {
        console.log(`🎯 Challenge completed: ${challenge.challengeName}`);

        // You could add a notification to the game response here
        if (!gameResponse.milestonesAchieved) {
          gameResponse.milestonesAchieved = [];
        }

        gameResponse.milestonesAchieved.push({
          id: `challenge_${challenge.id}`,
          title: `${challenge.badgeEmoji} Challenge Complete!`,
          message: `${challenge.challengeName} - Earned ${challenge.coinReward} coins!`,
          icon: challenge.badgeEmoji || "🎯",
          type: "achievement",
        });
      }
    }

    // 5. Update leaderboard entry
    await leaderboardService.upsertLeaderboardEntry(updatedState, advisorName);

    // 6. Recalculate rankings (do this periodically, not every session)
    // Only recalculate every 10 sessions to reduce DB load
    if (updatedState.totalSessions % 10 === 0) {
      await leaderboardService.recalculateRankings();
    }

    // Return updated response with modified state
    return {
      ...gameResponse,
      stateUpdate: updatedState,
    };
  } catch (error) {
    console.error("❌ Failed to update social features after session:", error);
    // Return original response if something fails
    return gameResponse;
  }
}

/**
 * Get leaderboard data for UI display
 */
export async function getLeaderboardData(
  advisorId: string,
  category: "global" | "reputation" | "impact" | "expertise" | "coins" | "achievements" = "global"
) {
  try {
    const leaderboard = await leaderboardService.getLeaderboard(category, 100);
    const surroundingAdvisors = await leaderboardService.getSurroundingAdvisors(
      advisorId,
      category,
      5
    );

    return {
      leaderboard,
      surroundingAdvisors,
    };
  } catch (error) {
    console.error("❌ Failed to get leaderboard data:", error);
    return null;
  }
}

/**
 * Get career progression data for UI display
 */
export async function getCareerProgressionData(advisorState: AdvisorState) {
  try {
    const { getTierProgressBreakdown } = await import("./career-progression.ts");
    return await getTierProgressBreakdown(advisorState);
  } catch (error) {
    console.error("❌ Failed to get career progression data:", error);
    return null;
  }
}

/**
 * Get challenges data for UI display
 */
export async function getChallengesData(advisorState: AdvisorState) {
  try {
    const { getAdvisorChallengesWithProgress } = await import("./challenge-manager.ts");
    return await getAdvisorChallengesWithProgress(advisorState);
  } catch (error) {
    console.error("❌ Failed to get challenges data:", error);
    return [];
  }
}

/**
 * Hook: On game initialization
 * Set up advisor in leaderboard system
 */
export async function onAdvisorInit(
  advisorState: AdvisorState,
  advisorName: string
): Promise<void> {
  try {
    // Create or update leaderboard entry
    await leaderboardService.upsertLeaderboardEntry(advisorState, advisorName);

    // Update challenge progress (in case returning player)
    await updateChallengeProgress(advisorState);
  } catch (error) {
    console.error("❌ Failed to initialize advisor in social features:", error);
  }
}
