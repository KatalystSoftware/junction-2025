/**
 * Financial Calculator System
 *
 * Calculates concrete financial outcomes from advisor's advice.
 * Projects money saved, debt reduced, interest saved, and time to goals.
 */

import type { Scenario } from "../types/game-types.ts";
import type { ExtractedAdviceAction } from "../simulation/simulation-types.ts";

export interface FinancialProjection {
  // Monthly changes
  monthlySavings: number; // € saved per month
  monthlyExpenseReduction: number; // € expenses reduced per month
  monthlyDebtPayment: number; // € debt paid per month

  // Total impact (over projection period)
  totalSaved: number; // Total € saved
  totalDebtReduced: number; // Total debt eliminated
  totalInterestSaved: number; // Interest saved vs no action

  // Time metrics
  monthsToGoal: number; // Months to reach financial goal
  projectionPeriodMonths: number; // Period this projection covers

  // Percentages
  savingsRate: number; // % of income saved
  debtReductionRate: number; // % of debt paid off

  // Goal achievement
  emergencyFundProgress: number; // % toward 3-month emergency fund
  debtFreeProgress: number; // % toward debt-free status

  // Category breakdown (NEW: Phase F enhancement)
  categorySavings?: Record<string, number>; // Savings per category
}

export interface ActualFinancialResult {
  // What actually happened
  moneySaved: number; // € saved in reality
  expenseReduction: number; // € expenses reduced
  debtReduced: number; // Debt actually paid off

  // Behavioral metrics
  budgetAdherence: number; // 0-1, how well they followed advice
  goalProgress: number; // 0-1, progress toward stated goal

  // Comparison
  projectedVsActual: {
    projected: number; // What was projected
    actual: number; // What actually happened
    difference: number; // actual - projected
    accuracy: number; // 0-1, how accurate was projection
  };
}

/**
 * Calculate projected financial outcome based on advice quality
 * Uses actual extracted actions for accurate projections instead of generic formulas
 */
export function calculateProjectedOutcome(
  scenario: Scenario,
  adviceQuality: number, // 0-10
  willFollow: boolean,
  willFollowConfidence: number, // 0-1
  extractedActions?: ExtractedAdviceAction[], // Actual extracted advice actions for accurate calculation
): FinancialProjection {
  const details = scenario.problemContext.specificDetails;

  // Extract financial details
  const monthlyIncome = details.monthlyIncome || 0;
  const currentSavings = details.currentSavings || 0;
  const totalDebt = details.totalDebt || 0;
  const interestRate = details.interestRate || 0;
  const minimumPayment = details.minimumPayment || 0;

  // Determine projection period based on scenario type
  const projectionPeriodMonths = getProjectionPeriod(scenario);

  // Calculate effectiveness multiplier (0-1) based on advice quality and follow-through
  const qualityMultiplier = adviceQuality / 10; // 0-1
  const followMultiplier = willFollow ? willFollowConfidence : 0.1; // Low if won't follow
  const effectivenessMultiplier = qualityMultiplier * followMultiplier;

  // Try action-based calculation first if actions were extracted
  if (extractedActions && extractedActions.length > 0) {
    const actionProjection = calculateActionBasedProjection(
      extractedActions,
      monthlyIncome,
      totalDebt,
      interestRate,
      effectivenessMultiplier,
      projectionPeriodMonths,
    );

    // If action-based calculation produced meaningful results, use it
    if (
      actionProjection.totalSaved > 0 ||
      actionProjection.totalDebtReduced > 0
    ) {
      return actionProjection;
    }
  }

  // Fallback to generic formula-based calculation
  let projection: FinancialProjection;

  switch (scenario.topic) {
    case "budgeting":
      projection = calculateBudgetingOutcome(
        monthlyIncome,
        currentSavings,
        effectivenessMultiplier,
        projectionPeriodMonths,
      );
      break;

    case "debt_management":
      projection = calculateDebtOutcome(
        totalDebt,
        interestRate,
        minimumPayment,
        monthlyIncome,
        effectivenessMultiplier,
        projectionPeriodMonths,
      );
      break;

    case "saving":
      projection = calculateSavingOutcome(
        monthlyIncome,
        currentSavings,
        effectivenessMultiplier,
        projectionPeriodMonths,
      );
      break;

    case "investing":
      projection = calculateInvestingOutcome(
        monthlyIncome,
        currentSavings,
        effectivenessMultiplier,
        projectionPeriodMonths,
      );
      break;

    case "scam_awareness":
      projection = calculateScamAvoidanceOutcome(
        monthlyIncome,
        effectivenessMultiplier,
        projectionPeriodMonths,
      );
      break;

    default:
      // Generic financial improvement
      projection = calculateGenericOutcome(
        monthlyIncome,
        effectivenessMultiplier,
        projectionPeriodMonths,
      );
  }

  return projection;
}

/**
 * Calculate projection based on actual extracted actions
 * Instead of generic formulas, sum up savings from concrete actions
 */
function calculateActionBasedProjection(
  actions: ExtractedAdviceAction[],
  monthlyIncome: number,
  totalDebt: number,
  interestRate: number,
  effectivenessMultiplier: number,
  projectionPeriodMonths: number,
): FinancialProjection {
  let monthlySavings = 0;
  let monthlyExpenseReduction = 0;
  let monthlyDebtPayment = 0;
  const categorySavings: Record<string, number> = {};

  // Process each action to calculate concrete savings
  for (const action of actions) {
    const actionConfidence = action.confidence * effectivenessMultiplier;

    switch (action.actionType) {
      case "cancel_subscription": {
        // Estimate average subscription cost: Netflix €12, Spotify €10, etc.
        const estimatedSubscriptionCost = 12; // €/month
        const savings = estimatedSubscriptionCost * actionConfidence;
        monthlySavings += savings;
        monthlyExpenseReduction += savings;

        // Track by category
        const category = action.specificSubscription || "subscriptions";
        categorySavings[category] = (categorySavings[category] || 0) + savings;
        break;
      }

      case "reduce_expense_category": {
        const category = action.targetCategory || "expenses";
        const reductionPercent = action.reductionPercent || 0.2;

        // Estimate category spending from typical budgets
        let estimatedCategorySpending = 0;
        const categoryStr = String(category); // Convert to string for comparison

        if (categoryStr === "coffee") {
          estimatedCategorySpending = monthlyIncome * 0.02; // 2% of income (~€16 for €800)
        } else if (categoryStr === "dining") {
          estimatedCategorySpending = monthlyIncome * 0.08; // 8% of income
        } else if (categoryStr === "groceries") {
          estimatedCategorySpending = monthlyIncome * 0.15; // 15% of income
        } else if (
          categoryStr === "shopping" ||
          categoryStr === "onlineShopping"
        ) {
          estimatedCategorySpending = monthlyIncome * 0.05; // 5% of income
        } else if (categoryStr === "entertainment") {
          estimatedCategorySpending = monthlyIncome * 0.05; // 5% of income
        } else {
          estimatedCategorySpending = monthlyIncome * 0.1; // 10% generic
        }

        const savings =
          estimatedCategorySpending * reductionPercent * actionConfidence;
        monthlySavings += savings;
        monthlyExpenseReduction += savings;
        categorySavings[category] = (categorySavings[category] || 0) + savings;
        break;
      }

      case "increase_debt_payment": {
        const extraPayment = action.extraDebtPayment || 0;
        monthlyDebtPayment += extraPayment * actionConfidence;
        break;
      }

      case "start_tracking":
      case "create_budget": {
        // Budget tracking typically reduces waste by 5-10%
        const wasteSavings = monthlyIncome * 0.075 * actionConfidence;
        monthlySavings += wasteSavings;
        monthlyExpenseReduction += wasteSavings;
        categorySavings["budgeting"] =
          (categorySavings["budgeting"] || 0) + wasteSavings;
        break;
      }

      case "avoid_impulse": {
        // Avoiding impulse purchases saves ~3% of income
        const impulseSavings = monthlyIncome * 0.03 * actionConfidence;
        monthlySavings += impulseSavings;
        monthlyExpenseReduction += impulseSavings;
        categorySavings["impulsePurchases"] =
          (categorySavings["impulsePurchases"] || 0) + impulseSavings;
        break;
      }
    }
  }

  // Calculate total impact over projection period
  const totalSaved = monthlySavings * projectionPeriodMonths;
  const totalDebtReduced = monthlyDebtPayment * projectionPeriodMonths;

  // Calculate interest saved if paying down debt
  let totalInterestSaved = 0;
  if (totalDebt > 0 && monthlyDebtPayment > 0) {
    const monthlyInterest = (totalDebt * interestRate) / 12;
    const baselineInterest = monthlyInterest * projectionPeriodMonths;
    totalInterestSaved = baselineInterest * 0.3 * effectivenessMultiplier; // ~30% interest reduction
  }

  // Calculate metrics
  const savingsRate = monthlyIncome > 0 ? monthlySavings / monthlyIncome : 0;
  const debtReductionRate = totalDebt > 0 ? totalDebtReduced / totalDebt : 0;

  // Emergency fund progress
  const emergencyFundTarget = monthlyIncome * 3;
  const emergencyFundProgress = Math.min(totalSaved / emergencyFundTarget, 1);

  // Debt-free progress
  const debtFreeProgress =
    totalDebt > 0
      ? Math.min(1, 1 - (totalDebt - totalDebtReduced) / totalDebt)
      : 1;

  // Time to goal
  const monthsToGoal =
    monthlySavings > 0 ? emergencyFundTarget / monthlySavings : 999;

  return {
    monthlySavings,
    monthlyExpenseReduction,
    monthlyDebtPayment,
    totalSaved,
    totalDebtReduced,
    totalInterestSaved,
    monthsToGoal,
    projectionPeriodMonths,
    savingsRate,
    debtReductionRate,
    emergencyFundProgress,
    debtFreeProgress,
    categorySavings, // Breakdown by category
  };
}

/**
 * Calculate budgeting scenario outcome
 */
function calculateBudgetingOutcome(
  monthlyIncome: number,
  currentSavings: number,
  effectivenessMultiplier: number,
  projectionPeriodMonths: number,
): FinancialProjection {
  // Good budgeting advice typically helps save 10-15% of income
  const potentialSavingsRate = 0.125; // 12.5% baseline
  const actualSavingsRate = potentialSavingsRate * effectivenessMultiplier;

  const monthlySavings = monthlyIncome * actualSavingsRate;
  const totalSaved = monthlySavings * projectionPeriodMonths;

  // Emergency fund target: 3 months of income
  const emergencyFundTarget = monthlyIncome * 3;
  const finalSavings = currentSavings + totalSaved;
  const emergencyFundProgress = Math.min(finalSavings / emergencyFundTarget, 1);

  // Expense reduction (typically 5-10% of income from cutting waste)
  const monthlyExpenseReduction =
    monthlyIncome * 0.075 * effectivenessMultiplier;

  return {
    monthlySavings,
    monthlyExpenseReduction,
    monthlyDebtPayment: 0,
    totalSaved,
    totalDebtReduced: 0,
    totalInterestSaved: 0,
    monthsToGoal: emergencyFundTarget / monthlySavings,
    projectionPeriodMonths,
    savingsRate: actualSavingsRate,
    debtReductionRate: 0,
    emergencyFundProgress,
    debtFreeProgress: 1, // Already debt-free
  };
}

/**
 * Calculate debt management outcome
 */
function calculateDebtOutcome(
  totalDebt: number,
  interestRate: number,
  minimumPayment: number,
  monthlyIncome: number,
  effectivenessMultiplier: number,
  projectionPeriodMonths: number,
): FinancialProjection {
  // Good debt advice typically increases payment by 30-50% of minimum
  const paymentIncreaseFactor = 1 + 0.4 * effectivenessMultiplier;
  const monthlyDebtPayment = minimumPayment * paymentIncreaseFactor;

  // Calculate debt reduction over period (simplified)
  const monthlyInterest = (totalDebt * interestRate) / 12;
  const principalPayment = monthlyDebtPayment - monthlyInterest;
  const totalDebtReduced = Math.min(
    principalPayment * projectionPeriodMonths,
    totalDebt,
  );

  // Interest saved by paying faster
  const baselineInterest = monthlyInterest * projectionPeriodMonths;
  const actualInterest = baselineInterest * (1 - 0.3 * effectivenessMultiplier);
  const totalInterestSaved = baselineInterest - actualInterest;

  // Time to debt-free
  const monthsToDebtFree =
    principalPayment > 0 ? totalDebt / principalPayment : 999;
  const debtFreeProgress = totalDebtReduced / totalDebt;

  return {
    monthlySavings: 0,
    monthlyExpenseReduction: 0,
    monthlyDebtPayment,
    totalSaved: 0,
    totalDebtReduced,
    totalInterestSaved,
    monthsToGoal: monthsToDebtFree,
    projectionPeriodMonths,
    savingsRate: 0,
    debtReductionRate: debtFreeProgress,
    emergencyFundProgress: 0,
    debtFreeProgress,
  };
}

/**
 * Calculate saving scenario outcome
 */
function calculateSavingOutcome(
  monthlyIncome: number,
  currentSavings: number,
  effectivenessMultiplier: number,
  projectionPeriodMonths: number,
): FinancialProjection {
  // Good saving advice helps save 15-20% of income
  const potentialSavingsRate = 0.175;
  const actualSavingsRate = potentialSavingsRate * effectivenessMultiplier;

  const monthlySavings = monthlyIncome * actualSavingsRate;
  const totalSaved = monthlySavings * projectionPeriodMonths;

  // Emergency fund progress
  const emergencyFundTarget = monthlyIncome * 3;
  const finalSavings = currentSavings + totalSaved;
  const emergencyFundProgress = Math.min(finalSavings / emergencyFundTarget, 1);

  return {
    monthlySavings,
    monthlyExpenseReduction: 0,
    monthlyDebtPayment: 0,
    totalSaved,
    totalDebtReduced: 0,
    totalInterestSaved: 0,
    monthsToGoal: emergencyFundTarget / monthlySavings,
    projectionPeriodMonths,
    savingsRate: actualSavingsRate,
    debtReductionRate: 0,
    emergencyFundProgress,
    debtFreeProgress: 1,
  };
}

/**
 * Calculate investing scenario outcome
 */
function calculateInvestingOutcome(
  monthlyIncome: number,
  currentSavings: number,
  effectivenessMultiplier: number,
  projectionPeriodMonths: number,
): FinancialProjection {
  // Good investing advice helps invest 10-15% of income
  const potentialInvestmentRate = 0.125;
  const actualInvestmentRate =
    potentialInvestmentRate * effectivenessMultiplier;

  const monthlyInvestment = monthlyIncome * actualInvestmentRate;

  // Assume 7% annual return (conservative)
  const monthlyReturn = 0.07 / 12;
  const futureValue = calculateFutureValue(
    monthlyInvestment,
    monthlyReturn,
    projectionPeriodMonths,
  );
  const totalInvested = monthlyInvestment * projectionPeriodMonths;
  const totalGains = futureValue - totalInvested;

  return {
    monthlySavings: monthlyInvestment,
    monthlyExpenseReduction: 0,
    monthlyDebtPayment: 0,
    totalSaved: futureValue, // Investment value
    totalDebtReduced: 0,
    totalInterestSaved: totalGains, // Investment gains
    monthsToGoal: 120, // 10 years to retirement savings goal
    projectionPeriodMonths,
    savingsRate: actualInvestmentRate,
    debtReductionRate: 0,
    emergencyFundProgress: 0,
    debtFreeProgress: 1,
  };
}

/**
 * Calculate scam avoidance outcome
 */
function calculateScamAvoidanceOutcome(
  monthlyIncome: number,
  effectivenessMultiplier: number,
  projectionPeriodMonths: number,
): FinancialProjection {
  // Good scam advice prevents potential losses (average scam: 2-3 months income)
  const potentialScamLoss = monthlyIncome * 2.5;
  const lossAvoided = potentialScamLoss * effectivenessMultiplier;

  return {
    monthlySavings: lossAvoided / projectionPeriodMonths,
    monthlyExpenseReduction: 0,
    monthlyDebtPayment: 0,
    totalSaved: lossAvoided,
    totalDebtReduced: 0,
    totalInterestSaved: 0,
    monthsToGoal: 0,
    projectionPeriodMonths,
    savingsRate: 0,
    debtReductionRate: 0,
    emergencyFundProgress: 0,
    debtFreeProgress: 1,
  };
}

/**
 * Calculate generic financial improvement
 */
function calculateGenericOutcome(
  monthlyIncome: number,
  effectivenessMultiplier: number,
  projectionPeriodMonths: number,
): FinancialProjection {
  const monthlySavings = monthlyIncome * 0.1 * effectivenessMultiplier;
  const totalSaved = monthlySavings * projectionPeriodMonths;

  return {
    monthlySavings,
    monthlyExpenseReduction: 0,
    monthlyDebtPayment: 0,
    totalSaved,
    totalDebtReduced: 0,
    totalInterestSaved: 0,
    monthsToGoal: 0,
    projectionPeriodMonths,
    savingsRate: 0.1 * effectivenessMultiplier,
    debtReductionRate: 0,
    emergencyFundProgress: 0,
    debtFreeProgress: 1,
  };
}

/**
 * Calculate future value of recurring investment
 */
function calculateFutureValue(
  monthlyPayment: number,
  monthlyRate: number,
  months: number,
): number {
  if (monthlyRate === 0) return monthlyPayment * months;

  return (
    (monthlyPayment * (Math.pow(1 + monthlyRate, months) - 1)) / monthlyRate
  );
}

/**
 * Get projection period based on scenario type
 */
function getProjectionPeriod(scenario: Scenario): number {
  // Default to 3 months (time until follow-up)
  const followUpDelay = scenario.followUpScenarios?.[0]?.delayInSessions || 3;

  // Assume 1 session = 1 month for simplicity
  return followUpDelay;
}

/**
 * Compare projected vs actual results
 */
export function compareProjectionToActual(
  projection: FinancialProjection,
  actual: ActualFinancialResult,
): number {
  // Calculate accuracy (0-1)
  const projected = projection.totalSaved + projection.totalDebtReduced;
  const actualTotal = actual.moneySaved + actual.debtReduced;

  if (projected === 0) return 0;

  const accuracy = 1 - Math.abs(projected - actualTotal) / projected;
  return Math.max(0, Math.min(1, accuracy)); // Clamp to 0-1
}

/**
 * Generate actual results based on projection and randomness
 * (Used for testing/demo - real results come from follow-up scenarios)
 */
export function simulateActualResult(
  projection: FinancialProjection,
  behavioralAdherence: number, // 0-1, how well they followed advice
): ActualFinancialResult {
  // Add some randomness (±15%)
  const randomFactor = 0.85 + Math.random() * 0.3;
  const adherenceFactor = behavioralAdherence;
  const combinedFactor = randomFactor * adherenceFactor;

  const actualSaved = Math.round(projection.totalSaved * combinedFactor);
  const actualDebtReduced = Math.round(
    projection.totalDebtReduced * combinedFactor,
  );

  const projected = projection.totalSaved + projection.totalDebtReduced;
  const actual = actualSaved + actualDebtReduced;
  const difference = actual - projected;
  const accuracy = compareProjectionToActual(projection, {
    moneySaved: actualSaved,
    expenseReduction: 0,
    debtReduced: actualDebtReduced,
    budgetAdherence: behavioralAdherence,
    goalProgress: 0,
    projectedVsActual: {
      projected,
      actual,
      difference,
      accuracy: 0,
    },
  });

  return {
    moneySaved: actualSaved,
    expenseReduction: Math.round(
      projection.monthlyExpenseReduction *
        projection.projectionPeriodMonths *
        combinedFactor,
    ),
    debtReduced: actualDebtReduced,
    budgetAdherence: behavioralAdherence,
    goalProgress: behavioralAdherence * 0.8,
    projectedVsActual: {
      projected: Math.round(projected),
      actual: Math.round(actual),
      difference: Math.round(difference),
      accuracy,
    },
  };
}
