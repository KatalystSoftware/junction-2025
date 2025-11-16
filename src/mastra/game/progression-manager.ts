/**
 * Client Progression Manager
 *
 * Handles character stage transitions, progression tracking, and success path selection
 */

import type { Character, Scenario } from "../types/game-types.ts";
import {
  type CharacterFinancialState,
  type FinancialStage,
  type ProgressionMetrics,
  type StageTransitionCriteria,
  type SuccessPath,
  type SuccessPathWeights,
  FinancialStage as Stage,
  STAGE_DEFINITIONS,
  STAGE_TRANSITION_CRITERIA,
  SUCCESS_PATH_DESCRIPTIONS,
} from "../types/progression-types.ts";

/**
 * Check if character is ready to transition to next stage
 */
export function checkStageTransition(character: Character): {
  ready: boolean;
  blockers: string[];
  progress: number; // 0-1
} {
  const currentStage =
    character.financialState?.currentStage ?? Stage.INSTABILITY;

  // Already at max stage
  if (currentStage === Stage.EXTREME_SUCCESS) {
    return {
      ready: false,
      blockers: ["Already at maximum stage"],
      progress: 1,
    };
  }

  const criteria = STAGE_TRANSITION_CRITERIA[currentStage];
  const blockers: string[] = [];
  let metricsCount = 0;
  let metricsPassed = 0;

  // Check financial state exists
  if (!character.financialState) {
    return {
      ready: false,
      blockers: ["No financial state initialized"],
      progress: 0,
    };
  }

  // Check net worth
  metricsCount++;
  if (character.financialState.netWorth < criteria.minNetWorth) {
    const needed = criteria.minNetWorth - character.financialState.netWorth;
    blockers.push(`Need €${needed.toLocaleString("fi-FI")} more net worth`);
  } else {
    metricsPassed++;
  }

  // Check monthly income (if specified)
  if (criteria.minMonthlyIncome !== undefined) {
    metricsCount++;
    if (character.financialState.monthlyIncome < criteria.minMonthlyIncome) {
      const needed =
        criteria.minMonthlyIncome - character.financialState.monthlyIncome;
      blockers.push(
        `Need €${needed.toLocaleString("fi-FI")}/month more income`,
      );
    } else {
      metricsPassed++;
    }
  }

  // Check debt ratio (if specified)
  if (criteria.maxDebtRatio !== undefined) {
    metricsCount++;
    const annualIncome = character.financialState.monthlyIncome * 12;
    const debtRatio =
      annualIncome > 0 ? character.financialState.totalDebt / annualIncome : 0;

    if (debtRatio > criteria.maxDebtRatio) {
      const excessDebt =
        character.financialState.totalDebt -
        annualIncome * criteria.maxDebtRatio;
      blockers.push(
        `Debt too high - reduce by €${excessDebt.toLocaleString("fi-FI")}`,
      );
    } else {
      metricsPassed++;
    }
  }

  // Check scenario completions for current stage
  metricsCount++;
  const completedScenariosAtStage =
    character.completedScenarios?.filter(
      (s) =>
        s.difficulty !== undefined && s.difficulty <= (currentStage + 1) / 7,
    ).length ?? 0;

  if (completedScenariosAtStage < criteria.minScenarioCompletions) {
    const needed = criteria.minScenarioCompletions - completedScenariosAtStage;
    blockers.push(`Complete ${needed} more consultation(s) successfully`);
  } else {
    metricsPassed++;
  }

  // Check advice success rate (recent sessions)
  metricsCount++;
  const recentAdvice = (character.adviceHistory ?? []).slice(
    -criteria.recentSessionsToEvaluate,
  );

  if (recentAdvice.length >= Math.min(2, criteria.recentSessionsToEvaluate)) {
    const successCount = recentAdvice.filter(
      (a) => a.outcome === "positive",
    ).length;
    const successRate = successCount / recentAdvice.length;

    if (successRate < criteria.minAdviceSuccessRate) {
      const needed = Math.ceil(criteria.minAdviceSuccessRate * 100);
      blockers.push(
        `Need ${needed}% success rate in recent sessions (currently ${Math.round(successRate * 100)}%)`,
      );
    } else {
      metricsPassed++;
    }
  } else {
    // Not enough data - don't penalize, but note it
    blockers.push(
      `Need ${criteria.recentSessionsToEvaluate} consultations for evaluation`,
    );
  }

  // Check time in current stage
  metricsCount++;
  const monthsInStage = character.financialState?.monthsInCurrentStage ?? 0;

  if (monthsInStage < criteria.minMonthsInCurrentStage) {
    const needed = criteria.minMonthsInCurrentStage - monthsInStage;
    blockers.push(`Wait ${needed} more month(s) in current stage`);
  } else {
    metricsPassed++;
  }

  const progress = metricsCount > 0 ? metricsPassed / metricsCount : 0;
  const ready = blockers.length === 0;

  return { ready, blockers, progress };
}

/**
 * Transition character to next stage
 */
export function transitionToNextStage(character: Character): {
  success: boolean;
  newStage?: FinancialStage;
  message: string;
} {
  const currentStage =
    character.financialState?.currentStage ?? Stage.INSTABILITY;

  if (currentStage === Stage.EXTREME_SUCCESS) {
    return {
      success: false,
      message: "Already at maximum stage",
    };
  }

  const { ready, blockers } = checkStageTransition(character);

  if (!ready) {
    return {
      success: false,
      message: `Not ready to advance. Blockers: ${blockers.join("; ")}`,
    };
  }

  const newStage = (currentStage + 1) as FinancialStage;
  const stageDef = STAGE_DEFINITIONS[newStage];

  // Update character financial state
  if (!character.financialState) {
    return {
      success: false,
      message: "Character has no financial state",
    };
  }

  character.financialState.currentStage = newStage;
  character.financialState.stageEntryDate = new Date()
    .toISOString()
    .split("T")[0];
  character.financialState.monthsInCurrentStage = 0;
  character.financialState.readyForNextStage = false;

  // Record major event
  character.financialState.majorEvents =
    character.financialState.majorEvents ?? [];
  character.financialState.majorEvents.push({
    id: `stage_transition_${newStage}_${Date.now()}`,
    type: "career",
    name: `Reached ${stageDef.name}`,
    description: `Advanced from ${STAGE_DEFINITIONS[currentStage].name} to ${stageDef.name}`,
    date: new Date().toISOString().split("T")[0],
    financialImpact: {},
  });

  return {
    success: true,
    newStage,
    message: `🎉 Advanced to Stage ${newStage}: ${stageDef.name}!`,
  };
}

/**
 * Check for downward progression (bad advice consequences)
 */
export function checkDownwardProgression(character: Character): {
  shouldRegress: boolean;
  newStage?: FinancialStage;
  reason: string;
} {
  const currentStage =
    character.financialState?.currentStage ?? Stage.INSTABILITY;

  // Can't go below crisis
  if (currentStage === Stage.CRISIS) {
    return { shouldRegress: false, reason: "Already at minimum stage" };
  }

  // Check recent bad advice streak (3 out of 4 bad)
  const recentAdvice = (character.adviceHistory ?? []).slice(-4);
  const badAdviceCount = recentAdvice.filter(
    (a) => a.outcome === "negative",
  ).length;

  if (badAdviceCount >= 3 && recentAdvice.length >= 4) {
    return {
      shouldRegress: true,
      newStage: Math.max(Stage.CRISIS, currentStage - 1) as FinancialStage,
      reason: "Severe consequences from bad advice (3+ failures)",
    };
  }

  // Check financial deterioration (lost significant net worth)
  const initialNetWorth =
    character.financialState?.netWorthHistory?.[0]?.amount ?? 0;
  const currentNetWorth = character.financialState?.netWorth ?? 0;
  const netWorthLoss = initialNetWorth - currentNetWorth;

  if (netWorthLoss > 10000 && currentNetWorth < 0) {
    return {
      shouldRegress: true,
      newStage: Stage.CRISIS,
      reason: "Financial crisis - significant net worth loss",
    };
  }

  // Check debt spiral (debt > 50% of annual income)
  const annualIncome = (character.financialState?.monthlyIncome ?? 0) * 12;
  const debt = character.financialState?.totalDebt ?? 0;
  const debtRatio = annualIncome > 0 ? debt / annualIncome : 0;

  if (debtRatio > 0.5 && debt > 5000) {
    return {
      shouldRegress: true,
      newStage: Math.max(Stage.CRISIS, currentStage - 1) as FinancialStage,
      reason: "Debt spiral - debt exceeds 50% of annual income",
    };
  }

  return { shouldRegress: false, reason: "No regression triggers met" };
}

/**
 * Apply downward progression
 */
export function applyDownwardProgression(
  character: Character,
  newStage: FinancialStage,
  reason: string,
): void {
  const oldStage = character.financialState?.currentStage ?? Stage.INSTABILITY;

  if (!character.financialState) return;

  character.financialState.currentStage = newStage;
  character.financialState.stageEntryDate = new Date()
    .toISOString()
    .split("T")[0];
  character.financialState.monthsInCurrentStage = 0;
  character.financialState.readyForNextStage = false;

  // Record major event
  character.financialState.majorEvents =
    character.financialState.majorEvents ?? [];
  character.financialState.majorEvents.push({
    id: `stage_regression_${newStage}_${Date.now()}`,
    type: "setback",
    name: `Regressed to ${STAGE_DEFINITIONS[newStage].name}`,
    description: `Fell from ${STAGE_DEFINITIONS[oldStage].name} due to: ${reason}`,
    date: new Date().toISOString().split("T")[0],
    financialImpact: {},
  });
}

/**
 * Select success path based on character personality and progress
 */
export function selectSuccessPath(
  character: Character,
  weights?: SuccessPathWeights,
): SuccessPath {
  // If character already has a path, keep it
  if (character.financialState?.selectedSuccessPath) {
    return character.financialState.selectedSuccessPath;
  }

  // Use provided weights or calculate from personality
  const pathWeights = weights ?? calculateSuccessPathWeights(character);

  // Weighted random selection
  const totalWeight = Object.values(pathWeights).reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (const [path, weight] of Object.entries(pathWeights) as [
    SuccessPath,
    number,
  ][]) {
    random -= weight;
    if (random <= 0) {
      return path;
    }
  }

  // Fallback
  return "comfortable_stability";
}

/**
 * Calculate success path weights from character personality
 */
function calculateSuccessPathWeights(character: Character): SuccessPathWeights {
  const traits = character.personalityTraits;

  // Default weights
  const weights: SuccessPathWeights = {
    comfortable_stability: 0.3,
    corporate_career: 0.15,
    tech_entrepreneur: 0.1,
    real_estate_investor: 0.15,
    small_business_owner: 0.15,
    stock_market_investor: 0.15,
  };

  // Adjust based on personality traits
  if (traits.impulsiveness > 0.6 && traits.financial_literacy < 0.5) {
    // Impulsive with low literacy → prefer stability
    weights.comfortable_stability = 0.5;
    weights.tech_entrepreneur = 0.05;
    weights.stock_market_investor = 0.1;
  }

  if (traits.financial_literacy > 0.7 && traits.stubbornness < 0.4) {
    // High literacy, open-minded → investor paths
    weights.stock_market_investor = 0.3;
    weights.real_estate_investor = 0.25;
    weights.comfortable_stability = 0.15;
  }

  if (traits.impulsiveness > 0.7 && traits.financial_literacy > 0.6) {
    // High risk tolerance + smart → entrepreneur path
    weights.tech_entrepreneur = 0.25;
    weights.small_business_owner = 0.2;
    weights.comfortable_stability = 0.15;
  }

  if (traits.trustingness > 0.7 && traits.stubbornness < 0.3) {
    // Trusting and flexible → corporate career
    weights.corporate_career = 0.3;
    weights.comfortable_stability = 0.25;
  }

  return weights;
}

/**
 * Calculate progression metrics for display
 */
export function calculateProgressionMetrics(
  character: Character,
): ProgressionMetrics {
  const currentStage =
    character.financialState?.currentStage ?? Stage.INSTABILITY;
  const { ready, blockers, progress } = checkStageTransition(character);

  // Calculate progress to next stage components
  const criteria = STAGE_TRANSITION_CRITERIA[currentStage];

  if (!character.financialState) {
    // Return default metrics if no financial state
    return {
      characterId: character.characterId,
      currentStage,
      progressToNextStage: {
        netWorthProgress: 0,
        scenarioProgress: 0,
        adviceSuccessProgress: 0,
        timeProgress: 0,
        overall: 0,
        blockers: ["No financial state initialized"],
      },
      netWorthGrowth: {
        last3Months: 0,
        last12Months: 0,
        sinceStart: 0,
        percentageGain: 0,
      },
      incomeGrowth: {
        last12Months: 0,
        sinceStart: 0,
        percentageGain: 0,
      },
      stagesCompleted: 0,
      majorMilestones: [],
    };
  }

  const netWorthProgress = Math.min(
    1,
    character.financialState.netWorth / criteria.minNetWorth,
  );

  const completedScenarios = character.completedScenarios?.length ?? 0;
  const scenarioProgress = Math.min(
    1,
    completedScenarios / criteria.minScenarioCompletions,
  );

  const recentAdvice = (character.adviceHistory ?? []).slice(
    -criteria.recentSessionsToEvaluate,
  );
  const adviceSuccessProgress =
    recentAdvice.length > 0
      ? recentAdvice.filter((a) => a.outcome === "positive").length /
        recentAdvice.length
      : 0;

  const monthsInStage = character.financialState?.monthsInCurrentStage ?? 0;
  const timeProgress = Math.min(
    1,
    monthsInStage / criteria.minMonthsInCurrentStage,
  );

  // Calculate growth metrics
  const netWorthHistory = character.financialState?.netWorthHistory ?? [];
  const incomeHistory = character.financialState?.incomeHistory ?? [];

  const currentNetWorth = character.financialState.netWorth;
  const startNetWorth = netWorthHistory[0]?.amount ?? currentNetWorth;

  const currentIncome = character.financialState.monthlyIncome;
  const startIncome = incomeHistory[0]?.amount ?? currentIncome;

  // Get historical values
  const threeMonthsAgo =
    netWorthHistory[Math.max(0, netWorthHistory.length - 3)]?.amount ??
    currentNetWorth;
  const twelveMonthsAgo =
    netWorthHistory[Math.max(0, netWorthHistory.length - 12)]?.amount ??
    currentNetWorth;

  const twelveMonthsAgoIncome =
    incomeHistory[Math.max(0, incomeHistory.length - 12)]?.amount ??
    currentIncome;

  return {
    characterId: character.characterId,
    currentStage,

    progressToNextStage: {
      netWorthProgress,
      scenarioProgress,
      adviceSuccessProgress,
      timeProgress,
      overall: progress,
      blockers,
    },

    netWorthGrowth: {
      last3Months: currentNetWorth - threeMonthsAgo,
      last12Months: currentNetWorth - twelveMonthsAgo,
      sinceStart: currentNetWorth - startNetWorth,
      percentageGain:
        startNetWorth > 0
          ? ((currentNetWorth - startNetWorth) / startNetWorth) * 100
          : 0,
    },

    incomeGrowth: {
      last12Months: currentIncome - twelveMonthsAgoIncome,
      sinceStart: currentIncome - startIncome,
      percentageGain:
        startIncome > 0
          ? ((currentIncome - startIncome) / startIncome) * 100
          : 0,
    },

    stagesCompleted: currentStage,
    majorMilestones: (character.financialState?.majorEvents ?? []).map(
      (e) => e.name,
    ),
    successPathChosen: character.financialState?.selectedSuccessPath,
  };
}

/**
 * Get human-readable life stage description
 */
export function getLifeStageDescription(stage: FinancialStage): string {
  const def = STAGE_DEFINITIONS[stage];
  return `${def.name} - ${def.description}`;
}

/**
 * Get time acceleration for current stage (months per session)
 */
export function getTimeAccelerationForStage(stage: FinancialStage): number {
  return STAGE_DEFINITIONS[stage].timePerSession;
}

/**
 * Update character's time in current stage
 */
export function updateMonthsInStage(
  character: Character,
  monthsToAdd: number,
): void {
  if (!character.financialState) return;

  character.financialState.monthsInCurrentStage =
    (character.financialState.monthsInCurrentStage ?? 0) + monthsToAdd;

  // Check if ready for next stage
  const { ready } = checkStageTransition(character);
  character.financialState.readyForNextStage = ready;
}
