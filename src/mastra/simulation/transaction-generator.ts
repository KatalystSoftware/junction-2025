/**
 * Elämäpeli 2025 - Transaction Generator
 * Generate realistic granular transactions with real merchants
 *
 * Creates 20-40 transactions per month including:
 * - Salary income
 * - Fixed expenses (rent, utilities, subscriptions)
 * - Variable expenses (groceries, dining, coffee, transport, entertainment)
 * - Online shopping (Temu, Amazon, Zalando)
 * - Personality-driven impulse purchases
 * - Debt payments and interest
 */

import { randomUUID } from "node:crypto";
import type { Character } from "../types/game-types.ts";
import type {
  Transaction,
  SpendingModel,
  TransactionCategory,
  ExpenseRange,
  CoffeeHabit,
  OnlineShoppingHabit,
} from "./simulation-types.ts";
import { selectMerchant, getRandomMerchant } from "./merchant-database.ts";

export class TransactionGenerator {
  /**
   * Generate unique transaction ID using UUID for guaranteed global uniqueness
   * Format: txn_<uuid> (e.g., txn_550e8400-e29b-41d4-a716-446655440000)
   *
   * This ensures no collisions even when multiple SimulationEngine instances
   * are created or when simulating the same month multiple times.
   */
  private generateTxnId(): string {
    return `txn_${randomUUID()}`;
  }

  /**
   * Generate all transactions for a single month
   */
  generateMonthTransactions(
    character: Character,
    month: string,
    spendingModel: SpendingModel,
    startBalance: number,
  ): Transaction[] {
    const transactions: Transaction[] = [];
    let currentBalance = startBalance;

    const year = parseInt(month.split("-")[0]);
    const monthNum = parseInt(month.split("-")[1]);

    // 1. INCOME (salary)
    const incomeDay =
      character.financialSimulation?.monthlyIncomeDay || randomDay(20, 25);
    const salaryTxn = this.createIncome(
      character,
      year,
      monthNum,
      incomeDay,
      currentBalance,
    );
    transactions.push(salaryTxn);
    currentBalance = salaryTxn.balanceAfter;

    // 2. FIXED EXPENSES - Rent
    if (spendingModel.rent.amount > 0) {
      const rentTxn = this.createFixedExpense(
        character,
        year,
        monthNum,
        spendingModel.rent.dayOfMonth,
        spendingModel.rent.amount,
        "rent",
        "Landlord",
        spendingModel.rent.description,
        currentBalance,
      );
      transactions.push(rentTxn);
      currentBalance = rentTxn.balanceAfter;
    }

    // 3. FIXED EXPENSES - Utilities
    if (spendingModel.utilities.amount > 0) {
      const utilitiesTxn = this.createFixedExpense(
        character,
        year,
        monthNum,
        spendingModel.utilities.dayOfMonth,
        spendingModel.utilities.amount,
        "utilities",
        selectMerchant("utilities", character.personality),
        spendingModel.utilities.description,
        currentBalance,
      );
      transactions.push(utilitiesTxn);
      currentBalance = utilitiesTxn.balanceAfter;
    }

    // 4. SUBSCRIPTIONS
    spendingModel.subscriptions.forEach((sub) => {
      const subTxn = this.createSubscription(
        character,
        year,
        monthNum,
        sub.dayOfMonth,
        sub.amount,
        sub.description,
        currentBalance,
      );
      transactions.push(subTxn);
      currentBalance = subTxn.balanceAfter;
    });

    // 5. DEBT PAYMENTS (if character has debts)
    if (
      character.financialProfile.debts &&
      character.financialProfile.debts.length > 0
    ) {
      character.financialProfile.debts.forEach((debt) => {
        const debtTxn = this.createDebtPayment(
          character,
          year,
          monthNum,
          15, // Mid-month
          debt.monthlyPayment,
          debt.debtId,
          currentBalance,
        );
        transactions.push(debtTxn);
        currentBalance = debtTxn.balanceAfter;
      });
    }

    // 6. GROCERIES (realistic weekly shopping)
    const groceryTxns = this.generateGroceryTransactions(
      character,
      year,
      monthNum,
      spendingModel.groceries,
      currentBalance,
    );
    transactions.push(...groceryTxns);
    currentBalance =
      groceryTxns[groceryTxns.length - 1]?.balanceAfter || currentBalance;

    // 7. DINING/RESTAURANTS
    const diningTxns = this.generateDiningTransactions(
      character,
      year,
      monthNum,
      spendingModel.dining,
      currentBalance,
    );
    transactions.push(...diningTxns);
    currentBalance =
      diningTxns[diningTxns.length - 1]?.balanceAfter || currentBalance;

    // 8. COFFEE PURCHASES
    const coffeeTxns = this.generateCoffeePurchases(
      character,
      year,
      monthNum,
      spendingModel.coffee,
      currentBalance,
    );
    transactions.push(...coffeeTxns);
    currentBalance =
      coffeeTxns[coffeeTxns.length - 1]?.balanceAfter || currentBalance;

    // 9. TRANSPORTATION
    const transportTxns = this.generateTransportTransactions(
      character,
      year,
      monthNum,
      spendingModel.transportation,
      currentBalance,
    );
    transactions.push(...transportTxns);
    currentBalance =
      transportTxns[transportTxns.length - 1]?.balanceAfter || currentBalance;

    // 10. ENTERTAINMENT (movies, games, events)
    const entertainmentTxns = this.generateEntertainmentTransactions(
      character,
      year,
      monthNum,
      spendingModel.entertainment,
      currentBalance,
    );
    transactions.push(...entertainmentTxns);
    currentBalance =
      entertainmentTxns[entertainmentTxns.length - 1]?.balanceAfter ||
      currentBalance;

    // 11. ONLINE SHOPPING (Temu, Amazon, Zalando, etc.)
    const onlineShoppingTxns = this.generateOnlineShoppingTransactions(
      character,
      year,
      monthNum,
      spendingModel.onlineShopping,
      currentBalance,
    );
    transactions.push(...onlineShoppingTxns);
    currentBalance =
      onlineShoppingTxns[onlineShoppingTxns.length - 1]?.balanceAfter ||
      currentBalance;

    // 12. IMPULSE PURCHASES (random personality-driven)
    if (Math.random() < spendingModel.impulsePurchaseChance) {
      const impulseTxn = this.createImpulsePurchase(
        character,
        year,
        monthNum,
        spendingModel.impulsePurchaseRange,
        currentBalance,
      );
      transactions.push(impulseTxn);
      currentBalance = impulseTxn.balanceAfter;
    }

    // Sort by date
    transactions.sort((a, b) => a.date.localeCompare(b.date));

    return transactions;
  }

  // ============================================================================
  // INCOME
  // ============================================================================

  private createIncome(
    character: Character,
    year: number,
    month: number,
    day: number,
    currentBalance: number,
  ): Transaction {
    const amount = character.financialProfile.typicalMonthlyIncome;
    return {
      id: this.generateTxnId(),
      characterId: character.characterId,
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      type: "income",
      category: "salary",
      amount: amount,
      balanceAfter: currentBalance + amount,
      description: `Monthly salary - ${character.occupation}`,
      merchantName: "Employer",
      adviceInfluenced: false,
      createdAt: new Date().toISOString(),
    };
  }

  // ============================================================================
  // FIXED EXPENSES
  // ============================================================================

  private createFixedExpense(
    character: Character,
    year: number,
    month: number,
    day: number,
    amount: number,
    category: TransactionCategory,
    merchantName: string,
    description: string,
    currentBalance: number,
  ): Transaction {
    // Prevent overdraft beyond -200€
    const newBalance = currentBalance - amount;
    const effectiveAmount = newBalance < -200 ? currentBalance + 200 : amount;

    return {
      id: this.generateTxnId(),
      characterId: character.characterId,
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      type: "expense",
      category,
      amount: -effectiveAmount,
      balanceAfter: currentBalance - effectiveAmount,
      description,
      merchantName,
      adviceInfluenced: false,
      createdAt: new Date().toISOString(),
    };
  }

  private createSubscription(
    character: Character,
    year: number,
    month: number,
    day: number,
    amount: number,
    serviceName: string,
    currentBalance: number,
  ): Transaction {
    return {
      id: this.generateTxnId(),
      characterId: character.characterId,
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      type: "subscription",
      category: "subscription_service",
      amount: -amount,
      balanceAfter: currentBalance - amount,
      description: serviceName,
      merchantName: serviceName,
      adviceInfluenced: false,
      createdAt: new Date().toISOString(),
    };
  }

  private createDebtPayment(
    character: Character,
    year: number,
    month: number,
    day: number,
    amount: number,
    debtId: string,
    currentBalance: number,
  ): Transaction {
    return {
      id: this.generateTxnId(),
      characterId: character.characterId,
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      type: "debt_payment",
      category: "debt_principal",
      amount: -amount,
      balanceAfter: currentBalance - amount,
      description: `Debt payment - ${debtId}`,
      merchantName: "Bank",
      adviceInfluenced: false,
      metadata: { debtId },
      createdAt: new Date().toISOString(),
    };
  }

  // ============================================================================
  // GROCERIES
  // ============================================================================

  private generateGroceryTransactions(
    character: Character,
    year: number,
    month: number,
    range: ExpenseRange,
    startBalance: number,
  ): Transaction[] {
    const transactions: Transaction[] = [];
    let currentBalance = startBalance;
    const totalAmount = Math.random() * (range.max - range.min) + range.min;
    const perTrip = totalAmount / range.frequency;

    for (let i = 0; i < range.frequency; i++) {
      const merchant = selectMerchant("groceries", character.personality);
      const amount = perTrip * (0.8 + Math.random() * 0.4); // +/- 20% variance
      const day = Math.floor((i + 1) * (28 / range.frequency)); // Spread evenly

      const txn = this.createFixedExpense(
        character,
        year,
        month,
        day,
        amount,
        "groceries",
        merchant,
        `Groceries - ${merchant}`,
        currentBalance,
      );
      transactions.push(txn);
      currentBalance = txn.balanceAfter;
    }

    return transactions;
  }

  // ============================================================================
  // DINING/RESTAURANTS
  // ============================================================================

  private generateDiningTransactions(
    character: Character,
    year: number,
    month: number,
    range: ExpenseRange,
    startBalance: number,
  ): Transaction[] {
    const transactions: Transaction[] = [];
    let currentBalance = startBalance;
    const totalBudget = Math.random() * (range.max - range.min) + range.min;

    for (let i = 0; i < range.frequency; i++) {
      const merchant = selectMerchant("dining", character.personality);
      const amount =
        (totalBudget / range.frequency) * (0.7 + Math.random() * 0.6);
      const day = randomDay(1, 28);

      const description =
        merchant.includes("Wolt") || merchant.includes("Foodora")
          ? `Food delivery - ${merchant}`
          : `Dining - ${merchant}`;

      const txn = this.createFixedExpense(
        character,
        year,
        month,
        day,
        amount,
        "dining",
        merchant,
        description,
        currentBalance,
      );
      transactions.push(txn);
      currentBalance = txn.balanceAfter;
    }

    return transactions;
  }

  // ============================================================================
  // COFFEE
  // ============================================================================

  private generateCoffeePurchases(
    character: Character,
    year: number,
    month: number,
    coffeeHabit: CoffeeHabit,
    startBalance: number,
  ): Transaction[] {
    if (!coffeeHabit.hasDailyHabit) return [];

    const transactions: Transaction[] = [];
    let currentBalance = startBalance;

    for (let i = 0; i < coffeeHabit.frequency; i++) {
      const merchant = selectMerchant("coffee", character.personality);
      const amount =
        coffeeHabit.amountRange[0] +
        Math.random() *
          (coffeeHabit.amountRange[1] - coffeeHabit.amountRange[0]);
      const day = randomDay(1, 28);

      const txn = this.createFixedExpense(
        character,
        year,
        month,
        day,
        amount,
        "coffee",
        merchant,
        `Coffee - ${merchant}`,
        currentBalance,
      );
      transactions.push(txn);
      currentBalance = txn.balanceAfter;
    }

    return transactions;
  }

  // ============================================================================
  // TRANSPORTATION
  // ============================================================================

  private generateTransportTransactions(
    character: Character,
    year: number,
    month: number,
    range: ExpenseRange,
    startBalance: number,
  ): Transaction[] {
    const transactions: Transaction[] = [];
    let currentBalance = startBalance;
    const totalAmount = Math.random() * (range.max - range.min) + range.min;
    const perTrip = totalAmount / range.frequency;

    for (let i = 0; i < range.frequency; i++) {
      const merchant = selectMerchant("transportation", character.personality);
      const amount = perTrip * (0.8 + Math.random() * 0.4);
      const day = randomDay(1, 28);

      const txn = this.createFixedExpense(
        character,
        year,
        month,
        day,
        amount,
        "transportation",
        merchant,
        `Transportation - ${merchant}`,
        currentBalance,
      );
      transactions.push(txn);
      currentBalance = txn.balanceAfter;
    }

    return transactions;
  }

  // ============================================================================
  // ENTERTAINMENT
  // ============================================================================

  private generateEntertainmentTransactions(
    character: Character,
    year: number,
    month: number,
    range: ExpenseRange,
    startBalance: number,
  ): Transaction[] {
    const transactions: Transaction[] = [];
    let currentBalance = startBalance;

    const entertainmentOptions = [
      { type: "venues", amountRange: [12, 45] },
      { type: "games", amountRange: [10, 60] },
      { type: "venues", amountRange: [25, 50] },
    ];

    for (let i = 0; i < range.frequency; i++) {
      const option =
        entertainmentOptions[
          Math.floor(Math.random() * entertainmentOptions.length)
        ];
      const merchant = selectMerchant("entertainment", character.personality);
      const amount =
        option.amountRange[0] +
        Math.random() * (option.amountRange[1] - option.amountRange[0]);
      const day = randomDay(1, 28);

      const txn = this.createFixedExpense(
        character,
        year,
        month,
        day,
        amount,
        "entertainment",
        merchant,
        `Entertainment - ${merchant}`,
        currentBalance,
      );
      transactions.push(txn);
      currentBalance = txn.balanceAfter;
    }

    return transactions;
  }

  // ============================================================================
  // ONLINE SHOPPING
  // ============================================================================

  private generateOnlineShoppingTransactions(
    character: Character,
    year: number,
    month: number,
    shopping: OnlineShoppingHabit,
    startBalance: number,
  ): Transaction[] {
    const transactions: Transaction[] = [];
    let currentBalance = startBalance;

    for (let i = 0; i < shopping.frequency; i++) {
      const merchant = selectMerchant("onlineShopping", character.personality);

      // Temu/AliExpress/Wish = cheaper purchases
      const isCheapMarketplace = ["Temu", "AliExpress", "Wish"].includes(
        merchant,
      );
      const amountRange = isCheapMarketplace ? [5, 30] : [20, 150];

      const amount =
        amountRange[0] + Math.random() * (amountRange[1] - amountRange[0]);
      const day = randomDay(1, 28);

      const txn = this.createFixedExpense(
        character,
        year,
        month,
        day,
        amount,
        "shopping",
        merchant,
        `Online purchase - ${merchant}`,
        currentBalance,
      );
      transactions.push(txn);
      currentBalance = txn.balanceAfter;
    }

    return transactions;
  }

  // ============================================================================
  // IMPULSE PURCHASES
  // ============================================================================

  private createImpulsePurchase(
    character: Character,
    year: number,
    month: number,
    range: [number, number],
    currentBalance: number,
  ): Transaction {
    const amount = range[0] + Math.random() * (range[1] - range[0]);
    const day = randomDay(1, 28);

    // Impulse purchases can be online or physical stores
    const merchant =
      Math.random() > 0.5
        ? selectMerchant("onlineShopping", character.personality)
        : getRandomMerchant();

    return {
      id: this.generateTxnId(),
      characterId: character.characterId,
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      type: "impulse_purchase",
      category: "shopping",
      amount: -amount,
      balanceAfter: currentBalance - amount,
      description: `Impulse purchase - ${merchant}`,
      merchantName: merchant,
      adviceInfluenced: false,
      createdAt: new Date().toISOString(),
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function randomDay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
