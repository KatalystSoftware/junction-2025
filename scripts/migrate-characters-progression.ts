/**
 * Migration Script: Add Progression System Fields to Characters
 *
 * This script updates all existing character JSON files to include the new
 * progression system fields (financial state, success path weights, etc.)
 *
 * Usage: node --env-file=.env scripts/migrate-characters-progression.ts
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Character } from "../src/mastra/types/game-types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INDIVIDUALS_DIR = path.join(__dirname, "..", "characters", "individuals");

// Financial stages (local copy to avoid enum import issues)
const FinancialStage = {
  CRISIS: 0,
  INSTABILITY: 1,
  STABILITY: 2,
  SAVING: 3,
  ACTIVE_INVESTING: 4,
  PROSPERITY: 5,
  WEALTH: 6,
  EXTREME_SUCCESS: 7,
} as const;

type FinancialStageValue = (typeof FinancialStage)[keyof typeof FinancialStage];

/**
 * Determine starting financial stage based on current profile
 */
function determineStartingStage(character: Character): FinancialStageValue {
  const income = character.financialProfile.typicalMonthlyIncome;
  const hasDebt = character.financialProfile.hasDebt;
  const savings = character.financialProfile.hasSavings;

  // Stage 0: Crisis (very low income + debt)
  if (income < 1000 && hasDebt) {
    return FinancialStage.CRISIS;
  }

  // Stage 1: Instability (low income)
  if (income < 2000) {
    return FinancialStage.INSTABILITY;
  }

  // Stage 2: Stability (moderate income, some savings)
  if (income < 3500 && savings !== "good") {
    return FinancialStage.STABILITY;
  }

  // Stage 3: Saving (good income, building wealth)
  return FinancialStage.SAVING;
}

/**
 * Calculate initial net worth from profile
 */
function calculateInitialNetWorth(character: Character): number {
  const savings = estimateSavings(character);
  const debt = character.financialProfile.hasDebt ? estimateDebt(character) : 0;
  return savings - debt;
}

/**
 * Estimate savings amount from savings level
 */
function estimateSavings(character: Character): number {
  const level = character.financialProfile.hasSavings;

  switch (level) {
    case "none":
    case "minimal":
      return Math.random() * 1000;
    case "moderate":
      return 3000 + Math.random() * 7000;
    case "good":
      return 10000 + Math.random() * 20000;
    default:
      return 500;
  }
}

/**
 * Estimate debt amount based on income level
 */
function estimateDebt(character: Character): number {
  const income = character.financialProfile.typicalMonthlyIncome;

  // Look for existing debt info
  if (
    character.financialProfile.debts &&
    character.financialProfile.debts.length > 0
  ) {
    return character.financialProfile.debts.reduce(
      (sum, debt) => sum + debt.remainingAmount,
      0,
    );
  }

  // Estimate based on income
  if (income < 1000) return 1000 + Math.random() * 3000;
  if (income < 2500) return 3000 + Math.random() * 7000;
  return 5000 + Math.random() * 15000;
}

/**
 * Calculate success path weights based on personality
 */
function calculateSuccessPathWeights(
  character: Character,
): Record<string, number> {
  const traits = character.personality;

  // Default weights
  const weights = {
    comfortable_stability: 0.3,
    corporate_career: 0.15,
    tech_entrepreneur: 0.1,
    real_estate_investor: 0.15,
    small_business_owner: 0.15,
    stock_market_investor: 0.15,
  };

  // Adjust based on personality
  if (traits.impulsiveness > 0.6 && traits.financial_literacy < 0.5) {
    // Impulsive with low literacy → prefer stability
    weights.comfortable_stability = 0.5;
    weights.tech_entrepreneur = 0.05;
    weights.stock_market_investor = 0.1;
  } else if (traits.financial_literacy > 0.7 && traits.stubbornness < 0.4) {
    // High literacy, open-minded → investor paths
    weights.stock_market_investor = 0.3;
    weights.real_estate_investor = 0.25;
    weights.comfortable_stability = 0.15;
  } else if (traits.impulsiveness > 0.7 && traits.financial_literacy > 0.6) {
    // High risk tolerance + smart → entrepreneur path
    weights.tech_entrepreneur = 0.25;
    weights.small_business_owner = 0.2;
    weights.comfortable_stability = 0.15;
  } else if (traits.trustingness > 0.7 && traits.stubbornness < 0.3) {
    // Trusting and flexible → corporate career
    weights.corporate_career = 0.3;
    weights.comfortable_stability = 0.25;
  }

  return weights;
}

/**
 * Main migration function
 */
async function migrateCharacters() {
  console.log("🚀 Starting character progression migration...\n");

  // Check if directory exists
  if (!fs.existsSync(INDIVIDUALS_DIR)) {
    console.error(`❌ Characters directory not found: ${INDIVIDUALS_DIR}`);
    return;
  }

  const files = fs
    .readdirSync(INDIVIDUALS_DIR)
    .filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    console.log("No character files found to migrate.");
    return;
  }

  console.log(`Found ${files.length} character file(s) to migrate...\n`);

  let successCount = 0;
  let skipCount = 0;

  for (const file of files) {
    const filePath = path.join(INDIVIDUALS_DIR, file);

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const character = JSON.parse(content) as Character;

      // Check if already migrated
      if (character.financialState) {
        console.log(
          `⏭️  ${character.name} (${file}) - Already migrated, skipping`,
        );
        skipCount++;
        continue;
      }

      // Determine starting stage
      const startingStage = determineStartingStage(character);
      const initialNetWorth = calculateInitialNetWorth(character);
      const successPathWeights = calculateSuccessPathWeights(character);

      // Create updated character with new fields
      const updated = {
        ...character,

        // Ensure personalityTraits alias exists
        personalityTraits: character.personality,

        // Financial state
        financialState: {
          currentStage: startingStage,
          netWorth: initialNetWorth,
          monthlyIncome: character.financialProfile.typicalMonthlyIncome,
          monthlyExpenses: Math.round(
            character.financialProfile.typicalMonthlyIncome * 0.8,
          ),
          totalDebt: character.financialProfile.hasDebt
            ? estimateDebt(character)
            : 0,
          liquidSavings: estimateSavings(character),
          investmentPortfolio: 0,
          realEstateValue: 0,
          currentOccupation: character.occupation,

          // Progression tracking
          stageEntryDate: new Date().toISOString().split("T")[0],
          monthsInCurrentStage: 0,
          readyForNextStage: false,

          // Historical data (initialize with current snapshot)
          netWorthHistory: [
            {
              date: new Date().toISOString().split("T")[0],
              amount: initialNetWorth,
            },
          ],
          incomeHistory: [
            {
              date: new Date().toISOString().split("T")[0],
              amount: character.financialProfile.typicalMonthlyIncome,
            },
          ],
          majorEvents: [],
        },

        // Success path weights (for future use)
        successPathWeights,

        // Initialize progression tracking arrays
        completedScenarios: [],
        adviceHistory: [],
      };

      // Write back to file
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf-8");

      console.log(`✅ ${character.name} (${file})`);
      console.log(
        `   Starting Stage: ${startingStage} (${getStageNameUnsafe(startingStage)})`,
      );
      console.log(`   Net Worth: €${initialNetWorth.toLocaleString("fi-FI")}`);
      console.log(
        `   Income: €${character.financialProfile.typicalMonthlyIncome}/month\n`,
      );

      successCount++;
    } catch (error) {
      console.error(`❌ Failed to migrate ${file}:`, error);
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🎉 Migration complete!`);
  console.log(`   ✅ Migrated: ${successCount}`);
  console.log(`   ⏭️  Skipped: ${skipCount}`);
  console.log(`   ❌ Failed: ${files.length - successCount - skipCount}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  if (successCount > 0) {
    console.log("Next steps:");
    console.log("1. Review changes: git diff characters/individuals/");
    console.log("2. Test game: pnpm play");
    console.log(
      '3. Commit: git add characters/individuals/ && git commit -m "Add progression system to characters"',
    );
  }
}

/**
 * Helper to get stage name (unsafe - doesn't import full enum)
 */
function getStageNameUnsafe(stage: number): string {
  const names = [
    "Crisis",
    "Instability",
    "Stability",
    "Saving",
    "Active Investing",
    "Prosperity",
    "Wealth",
    "Extreme Success",
  ];
  return names[stage] || "Unknown";
}

// Run migration
migrateCharacters().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
