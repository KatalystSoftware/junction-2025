/**
 * Outcome Tracker - Phase D
 *
 * Tracks financial outcomes before/after advice to measure actual impact.
 * Compares baseline spending with post-advice spending to calculate savings.
 */

import type { Character } from "../types/game-types.ts";
import type { SimulationEngine } from "../simulation/simulation-engine.ts";
import type { MonthSummary } from "../simulation/simulation-types.ts";

export interface FinancialOutcome {
  characterId: string;
  sessionId: string;
  timestamp: string;

  // Baseline (before advice)
  baselineMonth: string;
  baselineIncome: number;
  baselineExpenses: number;
  baselineBalance: number;
  baselineSpending: Record<string, number>; // Category breakdown

  // Follow-up (after advice applied)
  followUpMonth?: string;
  followUpIncome?: number;
  followUpExpenses?: number;
  followUpBalance?: number;
  followUpSpending?: Record<string, number>;

  // Calculated results
  totalSaved?: number; // Positive = saved money, negative = spent more
  monthlySavings?: number; // Average per month
  categorySavings?: Record<string, number>; // Savings per category
  adviceFollowed?: boolean; // Did spending patterns change as advised?

  // Metrics
  savingsRate?: number; // Percentage of income saved
  spendingReduction?: number; // Percentage reduction in expenses
}

/**
 * Record baseline financial state before advice
 */
export async function recordBaseline(
  engine: SimulationEngine,
  character: Character,
  sessionId: string,
): Promise<FinancialOutcome | null> {
  try {
    const state = await engine.getCharacterState(character.characterId);
    if (!state) return null;

    const summaries = await engine.getMonthlySummaries(
      character.characterId,
      1,
    );
    const currentMonth = summaries[0];
    if (!currentMonth) return null;

    // Get category spending breakdown
    const db = engine.getDatabase();
    if (!db) return null;

    const spending = await db.getSpendingByCategory(
      character.characterId,
      currentMonth.month + "-01",
      currentMonth.month + "-31",
    );

    const outcome: FinancialOutcome = {
      characterId: character.characterId,
      sessionId,
      timestamp: new Date().toISOString(),
      baselineMonth: currentMonth.month,
      baselineIncome: currentMonth.totalIncome,
      baselineExpenses: currentMonth.totalExpenses,
      baselineBalance: state.currentBalance,
      baselineSpending: spending,
    };

    return outcome;
  } catch (error) {
    console.error("Failed to record baseline:", error);
    return null;
  }
}

/**
 * Update outcome with follow-up data and calculate savings
 */
export async function updateOutcomeWithFollowUp(
  engine: SimulationEngine,
  outcome: FinancialOutcome,
): Promise<FinancialOutcome> {
  try {
    const state = await engine.getCharacterState(outcome.characterId);
    if (!state) return outcome;

    const summaries = await engine.getMonthlySummaries(outcome.characterId, 1);
    const currentMonth = summaries[0];
    if (!currentMonth) return outcome;

    // Get follow-up category spending
    const db = engine.getDatabase();
    if (!db) return outcome;

    const followUpSpending = await db.getSpendingByCategory(
      outcome.characterId,
      currentMonth.month + "-01",
      currentMonth.month + "-31",
    );

    // Update outcome with follow-up data
    outcome.followUpMonth = currentMonth.month;
    outcome.followUpIncome = currentMonth.totalIncome;
    outcome.followUpExpenses = currentMonth.totalExpenses;
    outcome.followUpBalance = state.currentBalance;
    outcome.followUpSpending = followUpSpending;

    // Calculate savings
    const expenseReduction =
      outcome.baselineExpenses - currentMonth.totalExpenses;
    const balanceIncrease = state.currentBalance - outcome.baselineBalance;

    outcome.totalSaved = expenseReduction;
    outcome.monthlySavings = expenseReduction; // Single month for now

    // Calculate category-specific savings
    const categorySavings: Record<string, number> = {};
    for (const [category, baseAmount] of Object.entries(
      outcome.baselineSpending,
    )) {
      const followUpAmount = followUpSpending[category] || 0;
      const saved = Math.abs(baseAmount) - Math.abs(followUpAmount);
      if (Math.abs(saved) > 1) {
        // Only track significant changes
        categorySavings[category] = saved;
      }
    }
    outcome.categorySavings = categorySavings;

    // Calculate metrics
    if (currentMonth.totalIncome > 0) {
      const netIncome = currentMonth.totalIncome - currentMonth.totalExpenses;
      outcome.savingsRate = (netIncome / currentMonth.totalIncome) * 100;
    }

    if (outcome.baselineExpenses > 0) {
      outcome.spendingReduction =
        ((outcome.baselineExpenses - currentMonth.totalExpenses) /
          outcome.baselineExpenses) *
        100;
    }

    // Determine if advice was followed (spending actually changed)
    const significantChange = Math.abs(expenseReduction) > 20; // More than €20/month change
    outcome.adviceFollowed = significantChange;

    return outcome;
  } catch (error) {
    console.error("Failed to update outcome:", error);
    return outcome;
  }
}

/**
 * Calculate projected vs actual outcomes
 */
export function compareProjectedVsActual(
  projected: {
    totalSaved?: number;
    monthlySavings?: number;
    totalDebtReduced?: number;
  },
  actual: FinancialOutcome,
): {
  projectedSavings: number;
  actualSavings: number;
  difference: number;
  accuracyPercent: number;
  outperformed: boolean;
} {
  const projectedSavings = projected.totalSaved || 0;
  const actualSavings = actual.totalSaved || 0;
  const difference = actualSavings - projectedSavings;

  let accuracyPercent = 100;
  if (projectedSavings !== 0) {
    accuracyPercent = (actualSavings / projectedSavings) * 100;
  }

  return {
    projectedSavings,
    actualSavings,
    difference,
    accuracyPercent,
    outperformed: actualSavings > projectedSavings,
  };
}

/**
 * Update character's cumulative financial impact tracking
 *
 * @param character - Character to update
 * @param projectedSavings - Projected savings from advice (€)
 * @param projectedDebtReduction - Projected debt reduction (€)
 * @param actualSavings - Actual savings (if follow-up, otherwise undefined)
 * @param actualDebtReduction - Actual debt reduction (if follow-up, otherwise undefined)
 */
export function updateCharacterFinancialImpact(
  character: Character,
  projectedSavings: number,
  projectedDebtReduction: number,
  actualSavings?: number,
  actualDebtReduction?: number,
): void {
  // Initialize if not present (for backward compatibility)
  if (character.relationshipState.totalSavingsGenerated === undefined) {
    character.relationshipState.totalSavingsGenerated = 0;
  }
  if (character.relationshipState.totalDebtCleared === undefined) {
    character.relationshipState.totalDebtCleared = 0;
  }

  // If this is a follow-up with actual results, use actual values
  if (actualSavings !== undefined && actualDebtReduction !== undefined) {
    character.relationshipState.totalSavingsGenerated +=
      Math.round(actualSavings);
    character.relationshipState.totalDebtCleared +=
      Math.round(actualDebtReduction);

    // Update projection accuracy tracking
    if (!character.relationshipState.projectedVsActual) {
      character.relationshipState.projectedVsActual = {
        totalProjected: 0,
        totalActual: 0,
        accuracyRate: 1.0,
      };
    }

    character.relationshipState.projectedVsActual.totalProjected +=
      projectedSavings + projectedDebtReduction;
    character.relationshipState.projectedVsActual.totalActual +=
      actualSavings + actualDebtReduction;

    // Calculate accuracy rate (avoid division by zero)
    if (character.relationshipState.projectedVsActual.totalProjected > 0) {
      character.relationshipState.projectedVsActual.accuracyRate =
        character.relationshipState.projectedVsActual.totalActual /
        character.relationshipState.projectedVsActual.totalProjected;
    }
  } else {
    // This is an initial consultation (projection only)
    character.relationshipState.totalSavingsGenerated +=
      Math.round(projectedSavings);
    character.relationshipState.totalDebtCleared += Math.round(
      projectedDebtReduction,
    );
  }
}

/**
 * Format outcome for display
 */
export function formatOutcome(outcome: FinancialOutcome): string {
  if (!outcome.totalSaved) {
    return "Outcome data not yet available.";
  }

  const saved = outcome.totalSaved;
  let message = "";

  if (saved > 0) {
    message += `✅ SUCCESS: Saved €${saved.toFixed(2)}/month\n`;
    message += `💰 Spending reduced by ${outcome.spendingReduction?.toFixed(1) || 0}%\n`;

    if (
      outcome.categorySavings &&
      Object.keys(outcome.categorySavings).length > 0
    ) {
      message += `\nCategory savings:\n`;
      Object.entries(outcome.categorySavings)
        .filter(([_, amount]) => amount > 0)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, amount]) => {
          message += `  • ${cat}: €${amount.toFixed(2)}/month\n`;
        });
    }
  } else if (saved < 0) {
    message += `⚠️ CONCERN: Spending increased by €${Math.abs(saved).toFixed(2)}/month\n`;
    message += `The advice may not have been followed or wasn't effective.\n`;
  } else {
    message += `➡️ NEUTRAL: No significant change in spending patterns.\n`;
  }

  return message;
}
