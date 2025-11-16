import type { AdvisorState, FinancialProjection } from "../types/game-types.ts";

export interface EarningsCalculationResult {
  coinsEarned: number;
  updatedState: AdvisorState;
}

// Extended evaluation type that includes financial projection and outcome
// (these come from the tool execution but aren't in the base AdviceEvaluation type)
interface EvaluationWithFinancials {
  qualityScore: number;
  outcome?: "positive" | "neutral" | "negative";
  financialProjection?: FinancialProjection;
}

/**
 * Calculate coins earned and update advisor state based on advice evaluation.
 * This centralizes the earnings calculation logic that was previously duplicated
 * across handleAdvisorResponse and handleAdviceChoice.
 *
 * @param adviceEvaluation - The evaluation of the advice given
 * @param advisorState - Current advisor state (will be cloned, not mutated)
 * @returns Object containing coins earned and updated advisor state
 */
export function calculateCoinsEarned(
  adviceEvaluation: EvaluationWithFinancials,
  advisorState: AdvisorState,
): EarningsCalculationResult {
  let coinsEarned = 0;
  const updatedState = { ...advisorState };

  if (adviceEvaluation.financialProjection) {
    const projection = adviceEvaluation.financialProjection;

    // Base consultation fee - INCREASED for better pacing
    coinsEarned = 25;

    // Bonus for client financial results (projected)
    // For every 100€ client saves: +10 coins (DOUBLED from 5)
    const savingsBonus = Math.floor(projection.totalSaved / 100) * 10;
    coinsEarned += savingsBonus;

    // For every 500€ debt reduced: +15 coins (INCREASED from 10)
    const debtBonus = Math.floor(projection.totalDebtReduced / 500) * 15;
    coinsEarned += debtBonus;

    // Bonus for high quality advice - TRIPLED for better rewards
    if (adviceEvaluation.qualityScore >= 8) {
      coinsEarned += 15;
    }

    // Streak bonus - rewards consistency
    if (updatedState.currentStreak >= 10) {
      coinsEarned += 50; // 10+ streak bonus
    } else if (updatedState.currentStreak >= 5) {
      coinsEarned += 25; // 5+ streak bonus
    } else if (updatedState.currentStreak >= 3) {
      coinsEarned += 10; // 3+ streak bonus
    }

    // Penalty for poor outcomes
    if (adviceEvaluation.outcome === "negative") {
      coinsEarned = Math.max(0, coinsEarned - 20);
    }

    // Apply earnings
    updatedState.advisorCoins += coinsEarned;

    // Track lifetime stats
    updatedState.lifetimeSavingsGenerated += Math.round(projection.totalSaved);
    updatedState.lifetimeDebtCleared += Math.round(projection.totalDebtReduced);
  }

  return { coinsEarned, updatedState };
}

/**
 * Update current goal progress based on financial projection.
 *
 * @param advisorState - Current advisor state (will be mutated)
 * @param projection - Financial projection from advice evaluation
 */
export function updateGoalProgress(
  advisorState: AdvisorState,
  projection: FinancialProjection | undefined,
): void {
  if (!advisorState.currentGoal || !projection) return;

  const goal = advisorState.currentGoal;

  if (goal.type === "save_target") {
    goal.progress += Math.round(projection.totalSaved);
  } else if (goal.type === "debt_reduction") {
    goal.progress += Math.round(projection.totalDebtReduced);
  } else if (goal.type === "clients_helped") {
    goal.progress += 1;
  }

  goal.sessionsRemaining -= 1;
}
