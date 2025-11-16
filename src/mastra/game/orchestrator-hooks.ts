/**
 * Orchestrator Hooks
 * Integration points for global leaderboard
 */

import type {
  AdvisorState,
  GameResponse,
  LeaderboardCategory,
} from "../types/game-types.ts";
import { leaderboardService } from "../persistence/leaderboard-service.ts";

/**
 * Initialize leaderboard system on game start
 */
export async function initializeLeaderboard(): Promise<void> {
  try {
    await leaderboardService.initialize();
    console.log("✅ Leaderboard initialized");
  } catch (error) {
    console.error("❌ Failed to initialize leaderboard:", error);
  }
}

/**
 * Hook: After session completion
 * Updates leaderboard with latest advisor stats
 */
export async function afterSessionComplete(
  advisorState: AdvisorState,
  advisorName: string,
  gameResponse: GameResponse,
): Promise<GameResponse> {
  try {
    // Update leaderboard entry
    await leaderboardService.upsertLeaderboardEntry(advisorState, advisorName);

    // Recalculate rankings periodically to reduce DB load
    // Only recalculate every 10 sessions
    if (advisorState.totalSessions % 10 === 0) {
      await leaderboardService.recalculateRankings();
    }

    return gameResponse;
  } catch (error) {
    console.error("❌ Failed to update leaderboard after session:", error);
    // Return original response if something fails
    return gameResponse;
  }
}

/**
 * Get leaderboard data for UI display
 */
export async function getLeaderboardData(
  advisorId: string,
  category: LeaderboardCategory = "global",
) {
  try {
    const leaderboard = await leaderboardService.getLeaderboard(100);
    const surroundingAdvisors = await leaderboardService.getSurroundingAdvisors(
      advisorId,
      category,
      5,
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
 * Hook: On advisor initialization
 * Set up advisor in leaderboard system
 */
export async function onAdvisorInit(
  advisorState: AdvisorState,
  advisorName: string,
): Promise<void> {
  try {
    // Create or update leaderboard entry
    await leaderboardService.upsertLeaderboardEntry(advisorState, advisorName);
  } catch (error) {
    console.error("❌ Failed to initialize advisor in leaderboard:", error);
  }
}
