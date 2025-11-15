/**
 * Elämäpeli 2025 - Financial Simulation System
 * Type Definitions for Transaction-Based Simulation
 *
 * Implements realistic granular transaction history with personality-driven spending
 */

import type { FinancialTopic } from "../types/game-types.ts";

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

export interface Transaction {
  id: string; // "txn_char_jukka_002_001"
  characterId: string; // FK to character
  date: string; // ISO date: "2025-01-01"
  type: TransactionType;
  category: TransactionCategory;
  amount: number; // Negative for expenses, positive for income
  balanceAfter: number; // Account balance after transaction
  description: string; // "Coffee - Espresso House"
  merchantName?: string; // "Espresso House", "Temu", "S-Market"
  adviceInfluenced: boolean; // True if caused by advisor's advice
  metadata?: Record<string, any>; // Extra data (e.g., debtId for payments)
  createdAt: string; // When record was created
}

export type TransactionType =
  | "income" // Salary, bonus, refund
  | "expense" // Rent, groceries, entertainment
  | "subscription" // Netflix, Spotify, gym
  | "debt_payment" // Loan, credit card payment
  | "interest_charged" // Debt/CC interest accrued
  | "interest_earned" // Savings interest (future)
  | "impulse_purchase" // Personality-driven random purchase
  | "advice_action"; // Direct result of advisor's advice

export type TransactionCategory =
  | "salary"
  | "bonus"
  | "tax_refund" // Income
  | "rent"
  | "groceries"
  | "transportation"
  | "utilities" // Fixed expenses
  | "entertainment"
  | "dining"
  | "shopping"
  | "other" // Variable expenses
  | "subscription_service" // Subscriptions
  | "debt_interest"
  | "debt_principal" // Debt
  | "credit_card_payment"
  | "credit_card_interest" // Credit cards
  | "coffee"; // Daily habits

// ============================================================================
// CHARACTER FINANCIAL STATE
// ============================================================================

export interface CharacterFinancialState {
  characterId: string;
  currentBalance: number; // Current bank account balance
  monthlyIncomeDay: number; // Day of month salary arrives (15-25)
  lastSimulatedDate: string; // Last date simulation ran
  spendingModel: SpendingModel; // Generated from personality
  createdAt: string;
  updatedAt: string;
}

export interface MonthSummary {
  characterId: string;
  month: string; // "2024-08"
  totalIncome: number;
  totalExpenses: number;
  endBalance: number;
  transactionCount: number;
  debtReduction: number;
  createdAt: string;
}

// ============================================================================
// SPENDING MODEL (Personality-Driven Behavior)
// ============================================================================

export interface SpendingModel {
  // Fixed monthly expenses (from character.financialProfile)
  rent: MonthlyExpense;
  utilities: MonthlyExpense;
  subscriptions: MonthlyExpense[];

  // Variable expenses (ranges based on personality)
  groceries: ExpenseRange;
  dining: ExpenseRange; // Restaurant/takeout
  coffee: CoffeeHabit; // Daily coffee purchases
  transportation: ExpenseRange;
  entertainment: ExpenseRange;
  onlineShopping: OnlineShoppingHabit; // Temu, Amazon, etc.

  // Personality-driven behavior
  impulsePurchaseChance: number; // 0-0.15 (0-15% per month)
  impulsePurchaseRange: [number, number]; // [5, 100] in euros
  savingsRate: number; // 0-0.3 (0-30% of income saved)
}

export interface MonthlyExpense {
  amount: number;
  dayOfMonth: number; // 1-28
  description: string;
}

export interface ExpenseRange {
  min: number; // Minimum monthly amount
  max: number; // Maximum monthly amount
  frequency: number; // Times per month (e.g., 4 for weekly)
}

export interface CoffeeHabit {
  hasDailyHabit: boolean; // Does character buy coffee regularly?
  frequency: number; // Times per month (15-22 for daily)
  amountRange: [number, number]; // [2.5, 5.0] €
}

export interface OnlineShoppingHabit {
  monthlyBudget: number; // How much to spend
  frequency: number; // How many purchases per month
  prefersCheapMarketplaces: boolean; // True = Temu/AliExpress, False = Amazon/Zalando
}

// ============================================================================
// ADVICE EFFECTS
// ============================================================================

export interface AdviceEffect {
  id: string;
  characterId: string;
  adviceSessionId: string; // Links to ConsultationSession
  effectType: AdviceEffectType;
  strength: number; // 0-1 multiplier
  appliedDate: string; // When it started
  expiresDate?: string; // Some effects fade (optional)
  isActive: boolean; // Can be deactivated
  metadata?: Record<string, any>; // Effect-specific data
  createdAt: string;
}

export type AdviceEffectType =
  | "cancel_subscription" // Remove specific subscription
  | "reduce_expense_category" // Reduce groceries/entertainment by X%
  | "increase_debt_payment" // Pay extra toward debt
  | "start_tracking" // Reduce impulse purchases
  | "create_budget" // Stricter spending limits
  | "avoid_impulse"; // Reduce impulse chance

// ============================================================================
// SIMULATION RESULTS
// ============================================================================

export interface SimulatedMonth {
  month: string; // "2025-01"
  characterId: string;
  transactions: Transaction[];
  startBalance: number;
  endBalance: number;
  incomeTotal: number;
  expensesTotal: number;
  debtReduction: number;
}

// ============================================================================
// MERCHANT DATABASE TYPES
// ============================================================================

export interface MerchantCategory {
  category: string;
  merchants: string[];
  personalityFilters?: {
    impulsive?: string[];
    budget_conscious?: string[];
    premium?: string[];
  };
}

// ============================================================================
// DEBT & INTEREST TYPES
// ============================================================================

export interface DebtState {
  debtId: string;
  characterId: string;
  remainingBalance: number;
  monthlyInterestRate: number; // Annual rate / 12
  monthlyPayment: number;
  lastCalculatedDate: string;
}

export interface InterestCharge {
  debtId: string;
  month: string;
  principalBefore: number;
  interestAmount: number;
  paymentAmount: number;
  principalAfter: number;
}

// ============================================================================
// ADVICE ACTION EXTRACTION
// ============================================================================

export interface ExtractedAdviceAction {
  actionType: AdviceEffectType;
  targetCategory?: TransactionCategory;
  reductionPercent?: number;
  specificSubscription?: string;
  extraDebtPayment?: number;
  confidence: number; // 0-1: How confident we are in this extraction
}

// ============================================================================
// SIMULATION ENGINE TYPES
// ============================================================================

export interface SimulationConfig {
  monthsToSimulate: number;
  startDate: string; // ISO date
  generateHistory: boolean; // True for initial history generation
  applyAdviceEffects: boolean; // Whether to apply active advice
}

export interface SimulationResult {
  characterId: string;
  monthsSimulated: number;
  totalTransactions: number;
  finalBalance: number;
  monthlySummaries: MonthSummary[];
  errors: string[];
}

// ============================================================================
// DATABASE QUERY TYPES
// ============================================================================

export interface TransactionQuery {
  characterId: string;
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
  category?: TransactionCategory;
  limit?: number;
  offset?: number;
}

export interface AdviceEffectQuery {
  characterId: string;
  isActive?: boolean;
  effectType?: AdviceEffectType;
}
