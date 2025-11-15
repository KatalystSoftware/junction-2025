/**
 * Elämäpeli 2025 - Simulation Engine
 * Monthly tick orchestrator for financial simulation
 *
 * Handles:
 * - Monthly time progression
 * - Transaction generation for all characters
 * - Advice effect application
 * - Debt interest calculation
 * - Balance updates
 * - Database persistence
 */

import type { Character } from "../types/game-types.ts";
import type {
  Transaction,
  SimulatedMonth,
  SimulationConfig,
  SimulationResult,
  MonthSummary,
  CharacterFinancialState,
  SpendingModel,
  AdviceEffect,
} from "./simulation-types.ts";
import { SimulationDatabaseManager } from "./database-manager.ts";
import { TransactionGenerator } from "./transaction-generator.ts";
import { generateSpendingModel } from "./spending-model.ts";
import {
  calculateMonthlyInterest,
  createInterestTransaction,
  applyDebtPayment,
  getMonthlyDebtReduction,
} from "./debt-interest-calculator.ts";

export class SimulationEngine {
  private db: SimulationDatabaseManager;
  private transactionGenerator: TransactionGenerator;

  constructor(connectionString: string) {
    this.db = new SimulationDatabaseManager(connectionString);
    this.transactionGenerator = new TransactionGenerator();
  }

  /**
   * Initialize character in simulation system
   * Called when character first appears in game
   */
  async initializeCharacter(character: Character): Promise<void> {
    // Check if already initialized
    const existing = await this.db.getCharacterState(character.characterId);
    if (existing) return;

    // Generate spending model from personality
    const spendingModel = generateSpendingModel(character);

    // Determine starting balance from bank accounts
    const startingBalance =
      character.financialProfile.bankAccounts.length > 0
        ? character.financialProfile.bankAccounts[0].balance
        : character.financialProfile.typicalMonthlyIncome * 0.5;

    // Create character financial state
    const state: CharacterFinancialState = {
      characterId: character.characterId,
      currentBalance: startingBalance,
      monthlyIncomeDay:
        character.financialSimulation?.monthlyIncomeDay || randomDay(20, 25),
      lastSimulatedDate: getCurrentMonth(),
      spendingModel: spendingModel,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.db.createCharacterState(state);
  }

  /**
   * Simulate one month for a character
   */
  async simulateMonth(
    character: Character,
    month: string,
    applyAdviceEffects: boolean = true,
  ): Promise<SimulatedMonth> {
    // Get character's financial state
    let state = await this.db.getCharacterState(character.characterId);
    if (!state) {
      await this.initializeCharacter(character);
      state = (await this.db.getCharacterState(character.characterId))!;
    }

    const startBalance = state.currentBalance;
    let spendingModel = { ...state.spendingModel };

    // Apply active advice effects to spending model
    if (applyAdviceEffects) {
      spendingModel = await this.applyAdviceEffectsToSpending(
        character.characterId,
        spendingModel,
      );
    }

    // Generate month's transactions
    const transactions = this.transactionGenerator.generateMonthTransactions(
      character,
      month,
      spendingModel,
      startBalance,
    );

    // Add debt interest transactions if character has debts
    if (character.financialProfile.debts) {
      const interestTxns = this.generateDebtInterestTransactions(
        character,
        month,
        transactions[transactions.length - 1]?.balanceAfter || startBalance,
      );
      transactions.push(...interestTxns);
    }

    // Sort transactions by date
    transactions.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate final balance and totals
    const endBalance =
      transactions[transactions.length - 1]?.balanceAfter || startBalance;

    const incomeTotal = transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const expensesTotal = transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const debtReduction = transactions
      .filter((t) => t.type === "debt_payment")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Save transactions to database
    await this.db.insertTransactionsBatch(transactions);

    // Update character state
    state.currentBalance = endBalance;
    state.lastSimulatedDate = month;
    state.updatedAt = new Date().toISOString();
    await this.db.updateCharacterState(state);

    // Save monthly summary
    const summary: MonthSummary = {
      characterId: character.characterId,
      month: month,
      totalIncome: incomeTotal,
      totalExpenses: expensesTotal,
      endBalance: endBalance,
      transactionCount: transactions.length,
      debtReduction: debtReduction,
      createdAt: new Date().toISOString(),
    };
    await this.db.insertMonthlySummary(summary);

    return {
      month,
      characterId: character.characterId,
      transactions,
      startBalance,
      endBalance,
      incomeTotal,
      expensesTotal,
      debtReduction,
    };
  }

  /**
   * Simulate multiple months for a character
   */
  async simulateMonths(
    character: Character,
    config: SimulationConfig,
  ): Promise<SimulationResult> {
    const results: SimulatedMonth[] = [];
    const errors: string[] = [];

    let currentMonth = config.startDate;

    for (let i = 0; i < config.monthsToSimulate; i++) {
      try {
        const monthResult = await this.simulateMonth(
          character,
          currentMonth,
          config.applyAdviceEffects,
        );
        results.push(monthResult);

        // Move to next month
        currentMonth = addMonths(currentMonth, 1);
      } catch (error) {
        errors.push(
          `Error simulating ${currentMonth}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const finalBalance = results[results.length - 1]?.endBalance || 0;
    const totalTransactions = results.reduce(
      (sum, r) => sum + r.transactions.length,
      0,
    );

    const summaries = await this.db.getMonthlySummaries(
      character.characterId,
      config.monthsToSimulate,
    );

    return {
      characterId: character.characterId,
      monthsSimulated: results.length,
      totalTransactions,
      finalBalance,
      monthlySummaries: summaries,
      errors,
    };
  }

  /**
   * Simulate all characters for multiple months (catch-up simulation)
   */
  async simulateAllCharacters(
    characters: Character[],
    monthsToSimulate: number,
    startMonth: string,
  ): Promise<Record<string, SimulationResult>> {
    const results: Record<string, SimulationResult> = {};

    for (const character of characters) {
      const config: SimulationConfig = {
        monthsToSimulate,
        startDate: startMonth,
        generateHistory: false,
        applyAdviceEffects: true,
      };

      results[character.characterId] = await this.simulateMonths(character, config);
    }

    return results;
  }

  /**
   * Get character's current financial state
   */
  async getCharacterState(characterId: string): Promise<CharacterFinancialState | null> {
    return await this.db.getCharacterState(characterId);
  }

  /**
   * Get recent transactions for character
   */
  async getRecentTransactions(
    characterId: string,
    limit: number = 100,
  ): Promise<Transaction[]> {
    return await this.db.getRecentTransactions(characterId, limit);
  }

  /**
   * Get monthly summaries for character
   */
  async getMonthlySummaries(characterId: string, limit?: number): Promise<MonthSummary[]> {
    return await this.db.getMonthlySummaries(characterId, limit);
  }

  /**
   * Apply advice effects to spending model
   */
  private async applyAdviceEffectsToSpending(
    characterId: string,
    baseSpending: SpendingModel,
  ): Promise<SpendingModel> {
    const activeEffects = await this.db.getActiveAdviceEffects(characterId);
    let modified = { ...baseSpending };

    for (const effect of activeEffects) {
      switch (effect.effectType) {
        case "cancel_subscription":
          // Remove specific subscription
          const subName = effect.metadata?.subscriptionName;
          if (subName) {
            modified.subscriptions = modified.subscriptions.filter(
              (sub) =>
                !sub.description.toLowerCase().includes(subName.toLowerCase()),
            );
          }
          break;

        case "reduce_expense_category":
          const category = effect.metadata?.category;
          const reduction = effect.metadata?.reductionPercent || 0.2;

          if (category === "groceries") {
            modified.groceries.min *= 1 - reduction * effect.strength;
            modified.groceries.max *= 1 - reduction * effect.strength;
          } else if (category === "entertainment") {
            modified.entertainment.min *= 1 - reduction * effect.strength;
            modified.entertainment.max *= 1 - reduction * effect.strength;
          } else if (category === "dining") {
            modified.dining.min *= 1 - reduction * effect.strength;
            modified.dining.max *= 1 - reduction * effect.strength;
          } else if (category === "shopping") {
            modified.onlineShopping.monthlyBudget *=
              1 - reduction * effect.strength;
          }
          break;

        case "start_tracking":
        case "create_budget":
          // Reduce all variable expenses slightly
          const strictness = effect.metadata?.strictness || 0.2;
          modified.groceries.max *= 1 - strictness * effect.strength;
          modified.dining.max *= 1 - strictness * effect.strength;
          modified.entertainment.max *= 1 - strictness * effect.strength;
          modified.onlineShopping.monthlyBudget *=
            1 - strictness * effect.strength;
          break;

        case "avoid_impulse":
          // Reduce impulse purchase chance
          const impReduction = effect.metadata?.impulsePurchaseReduction || 0.5;
          modified.impulsePurchaseChance *= 1 - impReduction * effect.strength;
          break;

        case "increase_debt_payment":
          // This is handled in debt payment logic, not spending model
          break;
      }
    }

    return modified;
  }

  /**
   * Generate debt interest transactions
   */
  private generateDebtInterestTransactions(
    character: Character,
    month: string,
    currentBalance: number,
  ): Transaction[] {
    const transactions: Transaction[] = [];
    const year = parseInt(month.split("-")[0]);
    const monthNum = parseInt(month.split("-")[1]);

    for (const debt of character.financialProfile.debts || []) {
      const interestCharge = calculateMonthlyInterest(debt, month);
      const interestTxn = createInterestTransaction(
        character.characterId,
        debt,
        interestCharge,
        year,
        monthNum,
        currentBalance,
      );

      transactions.push(interestTxn);
      currentBalance = interestTxn.balanceAfter;

      // Update debt amount
      const updatedDebt = applyDebtPayment(debt, interestCharge);
      // Note: In full implementation, would update character.financialProfile.debts
    }

    return transactions;
  }

  /**
   * Deactivate expired advice effects
   */
  async deactivateExpiredEffects(currentDate: string): Promise<void> {
    await this.db.deactivateExpiredEffects(currentDate);
  }

  /**
   * Get database instance (for advanced queries)
   */
  getDatabase(): SimulationDatabaseManager {
    return this.db;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.db.close();
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get current month in YYYY-MM format
 * NOTE: This fallback is only used during character initialization.
 * Game time progression is managed by orchestrator via currentGameMonth.
 */
function getCurrentMonth(): string {
  // Default starting month for character backstory generation
  return "2025-01";
}

/**
 * Add months to a YYYY-MM date string
 */
function addMonths(monthString: string, months: number): string {
  const [year, month] = monthString.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  date.setMonth(date.getMonth() + months);

  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, "0");
  return `${newYear}-${newMonth}`;
}

/**
 * Random day helper
 */
function randomDay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
