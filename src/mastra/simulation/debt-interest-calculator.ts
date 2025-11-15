/**
 * Elämäpeli 2025 - Debt & Interest Calculator
 * Calculate interest charges and debt principal reductions
 *
 * Handles:
 * - Monthly interest accrual on debts
 * - Principal vs interest breakdown
 * - Debt balance tracking
 * - Credit card interest
 */

import type { Debt } from "../types/game-types.ts";
import type {
  Transaction,
  DebtState,
  InterestCharge,
} from "./simulation-types.ts";

/**
 * Calculate monthly interest charge for a debt
 */
export function calculateMonthlyInterest(
  debt: Debt,
  currentMonth: string,
): InterestCharge {
  const monthlyRate = debt.interestRate / 12 / 100;
  const interestAmount = debt.remainingAmount * monthlyRate;

  // Breakdown of payment: interest vs principal
  const interestPortion = Math.min(interestAmount, debt.monthlyPayment);
  const principalPortion = debt.monthlyPayment - interestPortion;

  const principalAfter = Math.max(0, debt.remainingAmount - principalPortion);

  return {
    debtId: debt.debtId,
    month: currentMonth,
    principalBefore: debt.remainingAmount,
    interestAmount: interestPortion,
    paymentAmount: debt.monthlyPayment,
    principalAfter: principalAfter,
  };
}

/**
 * Create interest charge transaction
 */
export function createInterestTransaction(
  characterId: string,
  debt: Debt,
  interestCharge: InterestCharge,
  year: number,
  month: number,
  currentBalance: number,
): Transaction {
  const date = `${year}-${String(month).padStart(2, "0")}-01`;

  return {
    id: `txn_interest_${characterId}_${debt.debtId}_${year}_${month}`,
    characterId: characterId,
    date: date,
    type: "interest_charged",
    category: "debt_interest",
    amount: -interestCharge.interestAmount,
    balanceAfter: currentBalance - interestCharge.interestAmount,
    description: `Interest charge - ${debt.type}`,
    merchantName: debt.creditor,
    adviceInfluenced: false,
    metadata: {
      debtId: debt.debtId,
      principalBefore: interestCharge.principalBefore,
      principalAfter: interestCharge.principalAfter,
      interestRate: debt.interestRate,
    },
    createdAt: new Date().toISOString(),
  };
}

/**
 * Update debt after payment
 * Returns updated debt with new remaining amount
 */
export function applyDebtPayment(
  debt: Debt,
  interestCharge: InterestCharge,
): Debt {
  return {
    ...debt,
    remainingAmount: interestCharge.principalAfter,
  };
}

/**
 * Check if debt is paid off
 */
export function isDebtPaidOff(debt: Debt): boolean {
  return debt.remainingAmount <= 0.01; // Small epsilon for rounding
}

/**
 * Calculate total monthly debt payments for a character
 */
export function calculateTotalMonthlyDebtPayment(debts: Debt[]): number {
  return debts.reduce((total, debt) => total + debt.monthlyPayment, 0);
}

/**
 * Calculate total remaining debt for a character
 */
export function calculateTotalRemainingDebt(debts: Debt[]): number {
  return debts.reduce((total, debt) => total + debt.remainingAmount, 0);
}

/**
 * Get debt reduction for a month (principal paid down)
 */
export function getMonthlyDebtReduction(
  debts: Debt[],
  interestCharges: InterestCharge[],
): number {
  return interestCharges.reduce((total, charge) => {
    const principalPaid = charge.principalBefore - charge.principalAfter;
    return total + principalPaid;
  }, 0);
}

/**
 * Estimate months until debt is paid off (simple calculation)
 */
export function estimateMonthsToPayoff(debt: Debt): number {
  if (debt.monthlyPayment <= 0) return Infinity;

  const monthlyRate = debt.interestRate / 12 / 100;

  // If payment doesn't cover interest, debt grows forever
  const monthlyInterest = debt.remainingAmount * monthlyRate;
  if (debt.monthlyPayment <= monthlyInterest) return Infinity;

  // Use loan payoff formula: n = -log(1 - r*P/M) / log(1 + r)
  // Where: P = principal, r = monthly rate, M = monthly payment
  const numerator = Math.log(
    1 - (monthlyRate * debt.remainingAmount) / debt.monthlyPayment,
  );
  const denominator = Math.log(1 + monthlyRate);

  const months = -numerator / denominator;

  return Math.ceil(months);
}

/**
 * Calculate total interest that will be paid over life of debt
 */
export function calculateTotalInterestCost(debt: Debt): number {
  const monthsToPayoff = estimateMonthsToPayoff(debt);

  if (monthsToPayoff === Infinity) return Infinity;

  const totalPaid = debt.monthlyPayment * monthsToPayoff;
  const totalInterest = totalPaid - debt.remainingAmount;

  return Math.max(0, totalInterest);
}

/**
 * Simulate paying extra amount toward debt
 * Returns new monthly payment needed to pay off in target months
 */
export function calculateExtraPaymentAmount(
  debt: Debt,
  targetMonths: number,
): number {
  if (targetMonths <= 0) return debt.remainingAmount;

  const monthlyRate = debt.interestRate / 12 / 100;

  // Loan payment formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
  // Where: P = principal, r = monthly rate, n = number of months
  const numerator =
    debt.remainingAmount *
    monthlyRate *
    Math.pow(1 + monthlyRate, targetMonths);
  const denominator = Math.pow(1 + monthlyRate, targetMonths) - 1;

  const requiredPayment = numerator / denominator;

  return Math.max(0, requiredPayment - debt.monthlyPayment);
}
