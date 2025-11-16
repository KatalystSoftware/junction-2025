/**
 * Client Progression System - Type Definitions
 *
 * Defines the 7-stage financial progression system for characters
 */

/**
 * Financial life stages (0-7)
 */
export const FinancialStage = {
  CRISIS: 0, // Negative net worth, severe debt, emergency mode
  INSTABILITY: 1, // €0-10k, struggling to make ends meet
  STABILITY: 2, // €10-30k, making ends meet with breathing room
  SAVING: 3, // €30-100k, building wealth, early investing
  ACTIVE_INVESTING: 4, // €100-300k, wealth building momentum
  PROSPERITY: 5, // €300k-1M, financially independent
  WEALTH: 6, // €1M-10M, managing complex portfolio
  EXTREME_SUCCESS: 7, // €10M+, billionaire territory (absurdist humor)
} as const;

export type FinancialStage =
  (typeof FinancialStage)[keyof typeof FinancialStage];

/**
 * Stage definition with thresholds and characteristics
 */
export interface StageDefinition {
  stage: FinancialStage;
  name: string;
  description: string;
  netWorthRange: { min: number; max: number };
  incomeRange: { min: number; max: number };
  typicalDebtLevel: string;
  timePerSession: number; // How many months pass per consultation session
}

/**
 * Criteria for transitioning to next stage
 */
export interface StageTransitionCriteria {
  targetStage: FinancialStage;

  // Financial thresholds
  minNetWorth: number;
  minMonthlyIncome?: number;
  maxDebtRatio?: number; // Debt as % of annual income

  // Scenario completion requirements
  minScenarioCompletions: number; // Core scenarios at current stage

  // Advice success requirements
  minAdviceSuccessRate: number; // Recent success rate (0-1)
  recentSessionsToEvaluate: number; // How many recent sessions to check

  // Time requirements
  minMonthsInCurrentStage: number;
}

/**
 * Success path types - different ways characters can progress
 */
export type SuccessPath =
  | "comfortable_stability" // Stage 3-4, work-life balance focused
  | "corporate_career" // Stage 5-6, climbing corporate ladder
  | "tech_entrepreneur" // Stage 4-7, high risk/reward startup path
  | "real_estate_investor" // Stage 5-6, property portfolio building
  | "small_business_owner" // Stage 4-5, local business ownership
  | "stock_market_investor"; // Stage 4-6, wealth through investing

/**
 * Success path weights for character (sum should be ~1.0)
 */
export interface SuccessPathWeights {
  comfortable_stability: number;
  corporate_career: number;
  tech_entrepreneur: number;
  real_estate_investor: number;
  small_business_owner: number;
  stock_market_investor: number;
}

/**
 * Character's financial state (dynamic, updated after each consultation)
 */
export interface CharacterFinancialState {
  // Current snapshot
  currentStage: FinancialStage;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  totalDebt: number;
  liquidSavings: number;
  investmentPortfolio: number;
  realEstateValue: number;
  currentOccupation: string;

  // Progression tracking
  stageEntryDate: string; // ISO date when entered current stage
  monthsInCurrentStage: number;
  readyForNextStage: boolean;
  selectedSuccessPath?: SuccessPath;

  // Historical data
  netWorthHistory: Array<{ date: string; amount: number }>;
  incomeHistory: Array<{ date: string; amount: number }>;
  majorEvents: LifeEvent[];
}

/**
 * Life event types
 */
export type LifeEventType =
  | "career" // Promotion, job loss, bonus, side gig
  | "personal" // Marriage, divorce, children, health
  | "windfall" // Inheritance, lottery, tax refund, gift
  | "setback" // Car breaks, home emergency, scam, theft
  | "opportunity"; // Business offer, investment tip, real estate

/**
 * Life event definition
 */
export interface LifeEvent {
  id: string;
  type: LifeEventType;
  name: string;
  description: string;
  date: string; // ISO date when event occurred

  // Financial impact
  financialImpact: {
    oneTime?: number; // One-time cash change (€5000 bonus)
    monthlyIncome?: number; // Change to monthly income (+€500 promotion)
    monthlyExpense?: number; // Change to monthly expenses (+€300 baby)
    netWorthChange?: number; // Direct net worth change (-€10k crash)
  };

  // Scenario effects
  scenarioCreated?: string; // Follow-up scenario ID
  unlocks?: string[]; // New scenario IDs unlocked
  locks?: string[]; // Scenarios no longer relevant
}

/**
 * Life event pool configuration for a stage
 */
export interface LifeEventPoolConfig {
  stage: FinancialStage;
  events: LifeEventDefinition[];
  baseProbability: number; // Base chance per consultation (0-1)
}

/**
 * Life event definition (template for generating events)
 */
export interface LifeEventDefinition {
  id: string;
  type: LifeEventType;
  name: string;
  description: string;
  probability: number; // Relative probability within category

  // Financial impact ranges
  financialImpact: {
    oneTimeRange?: { min: number; max: number };
    monthlyIncomeRange?: { min: number; max: number };
    monthlyExpenseRange?: { min: number; max: number };
    netWorthChangeRange?: { min: number; max: number };
  };

  // Requirements
  minStage?: FinancialStage;
  maxStage?: FinancialStage;
  requiresSuccessPath?: SuccessPath[];

  // Effects
  scenarioTemplate?: string; // Template ID for creating follow-up scenario
  unlocksScenarios?: string[];
  locksScenarios?: string[];
}

/**
 * Progression metrics for analysis/display
 */
export interface ProgressionMetrics {
  characterId: string;
  currentStage: FinancialStage;

  // Progress to next stage
  progressToNextStage: {
    netWorthProgress: number; // % of net worth requirement met
    scenarioProgress: number; // % of scenario requirements met
    adviceSuccessProgress: number; // Recent advice success rate
    timeProgress: number; // % of minimum time requirement met
    overall: number; // Overall progress (0-1)
    blockers: string[]; // What's blocking progression?
  };

  // Historical growth
  netWorthGrowth: {
    last3Months: number; // €
    last12Months: number; // €
    sinceStart: number; // €
    percentageGain: number; // %
  };

  incomeGrowth: {
    last12Months: number; // €/month
    sinceStart: number; // €/month
    percentageGain: number; // %
  };

  // Achievements
  stagesCompleted: number;
  majorMilestones: string[];
  successPathChosen?: SuccessPath;
}

/**
 * Stage definitions (constants)
 */
export const STAGE_DEFINITIONS: Record<FinancialStage, StageDefinition> = {
  [FinancialStage.CRISIS]: {
    stage: FinancialStage.CRISIS,
    name: "Crisis",
    description: "Emergency mode, survival",
    netWorthRange: { min: -50000, max: 0 },
    incomeRange: { min: 0, max: 1000 },
    typicalDebtLevel: "Severe (>50% of income)",
    timePerSession: 1, // 1 month per session - frequent check-ins needed
  },

  [FinancialStage.INSTABILITY]: {
    stage: FinancialStage.INSTABILITY,
    name: "Instability",
    description: "Struggling to make ends meet",
    netWorthRange: { min: 0, max: 10000 },
    incomeRange: { min: 800, max: 2000 },
    typicalDebtLevel: "Moderate (credit cards, small loans)",
    timePerSession: 1, // 1 month - still need frequent guidance
  },

  [FinancialStage.STABILITY]: {
    stage: FinancialStage.STABILITY,
    name: "Stability",
    description: "Making ends meet with breathing room",
    netWorthRange: { min: 10000, max: 30000 },
    incomeRange: { min: 2000, max: 3500 },
    typicalDebtLevel: "Low or manageable",
    timePerSession: 2, // 2 months - quarterly reviews
  },

  [FinancialStage.SAVING]: {
    stage: FinancialStage.SAVING,
    name: "Saving & Early Investing",
    description: "Building wealth, investing regularly",
    netWorthRange: { min: 30000, max: 100000 },
    incomeRange: { min: 3000, max: 5000 },
    typicalDebtLevel: "Minimal or strategic (low-interest mortgage)",
    timePerSession: 3, // 3 months - building habits takes time
  },

  [FinancialStage.ACTIVE_INVESTING]: {
    stage: FinancialStage.ACTIVE_INVESTING,
    name: "Active Investing",
    description: "Wealth building momentum, multiple income streams",
    netWorthRange: { min: 100000, max: 300000 },
    incomeRange: { min: 4000, max: 8000 },
    typicalDebtLevel: "Strategic only (leveraged investments)",
    timePerSession: 6, // 6 months - long-term focus
  },

  [FinancialStage.PROSPERITY]: {
    stage: FinancialStage.PROSPERITY,
    name: "Prosperity",
    description: "Financially independent, abundant choices",
    netWorthRange: { min: 300000, max: 1000000 },
    incomeRange: { min: 6000, max: 15000 },
    typicalDebtLevel: "None or highly strategic",
    timePerSession: 12, // 12 months - annual reviews
  },

  [FinancialStage.WEALTH]: {
    stage: FinancialStage.WEALTH,
    name: "Wealth",
    description: "Wealthy, managing complex portfolio",
    netWorthRange: { min: 1000000, max: 10000000 },
    incomeRange: { min: 15000, max: 50000 },
    typicalDebtLevel: "None",
    timePerSession: 12, // 12 months - strategic decisions
  },

  [FinancialStage.EXTREME_SUCCESS]: {
    stage: FinancialStage.EXTREME_SUCCESS,
    name: "Extreme Success",
    description: "Billionaire territory (absurdist humor)",
    netWorthRange: { min: 10000000, max: 1000000000 },
    incomeRange: { min: 100000, max: 1000000 },
    typicalDebtLevel: "N/A",
    timePerSession: 24, // 24 months - slow strategic changes
  },
};

/**
 * Stage transition criteria (constants)
 */
export const STAGE_TRANSITION_CRITERIA: Record<
  FinancialStage,
  StageTransitionCriteria
> = {
  [FinancialStage.CRISIS]: {
    targetStage: FinancialStage.INSTABILITY,
    minNetWorth: 0,
    maxDebtRatio: 0.8,
    minScenarioCompletions: 2,
    minAdviceSuccessRate: 0.5,
    recentSessionsToEvaluate: 3,
    minMonthsInCurrentStage: 2,
  },

  [FinancialStage.INSTABILITY]: {
    targetStage: FinancialStage.STABILITY,
    minNetWorth: 10000,
    maxDebtRatio: 0.4,
    minScenarioCompletions: 3,
    minAdviceSuccessRate: 0.5,
    recentSessionsToEvaluate: 4,
    minMonthsInCurrentStage: 3,
  },

  [FinancialStage.STABILITY]: {
    targetStage: FinancialStage.SAVING,
    minNetWorth: 30000,
    minMonthlyIncome: 2500,
    maxDebtRatio: 0.2,
    minScenarioCompletions: 4,
    minAdviceSuccessRate: 0.6,
    recentSessionsToEvaluate: 5,
    minMonthsInCurrentStage: 6,
  },

  [FinancialStage.SAVING]: {
    targetStage: FinancialStage.ACTIVE_INVESTING,
    minNetWorth: 100000,
    minMonthlyIncome: 3500,
    maxDebtRatio: 0.15,
    minScenarioCompletions: 5,
    minAdviceSuccessRate: 0.65,
    recentSessionsToEvaluate: 6,
    minMonthsInCurrentStage: 12,
  },

  [FinancialStage.ACTIVE_INVESTING]: {
    targetStage: FinancialStage.PROSPERITY,
    minNetWorth: 300000,
    minMonthlyIncome: 5000,
    maxDebtRatio: 0.1,
    minScenarioCompletions: 6,
    minAdviceSuccessRate: 0.7,
    recentSessionsToEvaluate: 7,
    minMonthsInCurrentStage: 18,
  },

  [FinancialStage.PROSPERITY]: {
    targetStage: FinancialStage.WEALTH,
    minNetWorth: 1000000,
    minMonthlyIncome: 8000,
    maxDebtRatio: 0.05,
    minScenarioCompletions: 7,
    minAdviceSuccessRate: 0.75,
    recentSessionsToEvaluate: 8,
    minMonthsInCurrentStage: 24,
  },

  [FinancialStage.WEALTH]: {
    targetStage: FinancialStage.EXTREME_SUCCESS,
    minNetWorth: 10000000,
    minMonthlyIncome: 20000,
    maxDebtRatio: 0,
    minScenarioCompletions: 8,
    minAdviceSuccessRate: 0.8,
    recentSessionsToEvaluate: 10,
    minMonthsInCurrentStage: 36,
  },

  // No transition beyond Stage 7
  [FinancialStage.EXTREME_SUCCESS]: {
    targetStage: FinancialStage.EXTREME_SUCCESS,
    minNetWorth: Infinity,
    minScenarioCompletions: Infinity,
    minAdviceSuccessRate: 1,
    recentSessionsToEvaluate: 1,
    minMonthsInCurrentStage: Infinity,
  },
};

/**
 * Success path descriptions
 */
export const SUCCESS_PATH_DESCRIPTIONS: Record<
  SuccessPath,
  { name: string; description: string; targetStage: FinancialStage }
> = {
  comfortable_stability: {
    name: "Comfortable Stability",
    description: "Work-life balance, modest retirement, no financial stress",
    targetStage: FinancialStage.STABILITY,
  },
  corporate_career: {
    name: "Corporate Career",
    description: "Climbing the corporate ladder to executive level",
    targetStage: FinancialStage.PROSPERITY,
  },
  tech_entrepreneur: {
    name: "Tech Entrepreneur",
    description: "High risk/reward startup path, potential billionaire",
    targetStage: FinancialStage.EXTREME_SUCCESS,
  },
  real_estate_investor: {
    name: "Real Estate Investor",
    description: "Build wealth through property portfolio",
    targetStage: FinancialStage.WEALTH,
  },
  small_business_owner: {
    name: "Small Business Owner",
    description: "Own and operate local business",
    targetStage: FinancialStage.PROSPERITY,
  },
  stock_market_investor: {
    name: "Stock Market Investor",
    description: "Build wealth through investing and dividends",
    targetStage: FinancialStage.WEALTH,
  },
};
