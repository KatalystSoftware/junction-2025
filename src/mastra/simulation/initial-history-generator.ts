/**
 * Elämäpeli 2025 - Initial History Generator
 * Generate realistic 6-month transaction history when character first appears
 *
 * Creates backstory showing:
 * - How character got into their current financial situation
 * - Consistent spending patterns based on personality
 * - Debt accumulation (if applicable)
 * - Balance progression to current state
 */

import type { Character } from "../types/game-types.ts";
import type { SimulationConfig } from "./simulation-types.ts";
import { SimulationEngine } from "./simulation-engine.ts";

/**
 * Generate initial 6-month transaction history for a character
 */
export async function generateInitialHistory(
  character: Character,
  simulationEngine: SimulationEngine,
): Promise<void> {
  // Don't regenerate if already has history
  const existingState = await simulationEngine.getCharacterState(
    character.characterId,
  );
  if (existingState) {
    const existingTxns = await simulationEngine.getRecentTransactions(
      character.characterId,
      10,
    );
    if (existingTxns.length > 0) {
      return; // Already has history
    }
  }

  // Calculate starting month (6 months ago)
  const startMonth = getMonthsAgo(6);

  // Initialize character in simulation
  await simulationEngine.initializeCharacter(character);

  // Simulate 6 months of history
  const config: SimulationConfig = {
    monthsToSimulate: 6,
    startDate: startMonth,
    generateHistory: true,
    applyAdviceEffects: false, // No advice yet
  };

  await simulationEngine.simulateMonths(character, config);

  // Mark character as having history
  if (character.financialSimulation) {
    character.financialSimulation.hasSimulationHistory = true;
  }
}

/**
 * Generate initial history for multiple characters
 */
export function generateInitialHistoryForAll(characters: Character[]): void {
  const engine = new SimulationEngine();

  for (const character of characters) {
    try {
      generateInitialHistory(character, engine);
    } catch (error) {
      console.error(`Failed to generate history for ${character.name}:`, error);
    }
  }

  engine.close();
}

/**
 * Get month string N months ago
 */
function getMonthsAgo(monthsBack: number): string {
  const now = new Date();
  now.setMonth(now.getMonth() - monthsBack);

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Calculate appropriate starting balance based on character's financial profile
 * This ensures the character's current balance makes sense given their scenario
 */
export function calculateStartingBalance(character: Character): number {
  const { financialProfile } = character;

  // Base balance from bank account or typical income
  let baseBalance =
    financialProfile.bankAccounts.length > 0
      ? financialProfile.bankAccounts[0].balance
      : financialProfile.typicalMonthlyIncome * 0.5;

  // Adjust based on savings level
  switch (financialProfile.hasSavings) {
    case "none":
      // Character has been living paycheck to paycheck
      // Backtrack to show gradual depletion
      baseBalance = baseBalance + financialProfile.typicalMonthlyIncome * 1.5;
      break;

    case "minimal":
      // Character had some savings but used them
      baseBalance = baseBalance + financialProfile.typicalMonthlyIncome * 1.0;
      break;

    case "moderate":
      // Character has maintained some savings
      baseBalance = baseBalance + financialProfile.typicalMonthlyIncome * 0.5;
      break;

    case "good":
      // Character has been consistently saving
      baseBalance = baseBalance; // Already reflects good savings
      break;
  }

  // Ensure balance isn't negative at start of history
  return Math.max(baseBalance, 100);
}

/**
 * Adjust spending model for history generation to create realistic progression
 * For example, if character is in debt now, show how they got there
 */
export function adjustSpendingForHistory(
  character: Character,
  monthsAgo: number,
): number {
  // For characters with debt, show gradually increasing spending that led to debt
  if (character.financialProfile.hasDebt) {
    // Earlier months = more responsible spending
    const responsibilityFactor = monthsAgo / 6; // 1.0 six months ago, 0.0 now
    return 0.8 + responsibilityFactor * 0.2; // 80-100% of normal spending
  }

  // For characters with no savings, show consistent overspending
  if (character.financialProfile.hasSavings === "none") {
    return 1.1; // 110% of normal spending
  }

  // Normal spending pattern
  return 1.0;
}
